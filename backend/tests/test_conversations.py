import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.models.models import (
    CommandHistory,
    Conversation,
    ConversationMessage,
)
from app.routes.assistant import router


class ConversationApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine)

        def override_get_db():
            with self.session_factory() as db:
                yield db

        app = FastAPI()
        app.include_router(router, prefix="/api")
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self.app = app

    def tearDown(self):
        self.client.close()
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def test_conversation_lifecycle_persists_messages(self):
        created = self.client.post("/api/conversations", json={}).json()
        conversation_id = created["id"]

        response = self.client.post(
            "/api/assistant",
            json={"command": "hello", "conversation_id": conversation_id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["response"], "Hello! How can I help you?")

        detail = self.client.get(f"/api/conversations/{conversation_id}").json()
        self.assertEqual(detail["title"], "hello")
        self.assertEqual([message["role"] for message in detail["messages"]], ["user", "assistant"])

        renamed = self.client.patch(
            f"/api/conversations/{conversation_id}",
            json={"title": "Greeting"},
        )
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["title"], "Greeting")

        cleared = self.client.delete(f"/api/conversations/{conversation_id}/messages")
        self.assertEqual(cleared.json(), {"ok": True})
        self.assertEqual(
            self.client.get(f"/api/conversations/{conversation_id}").json()["messages"],
            [],
        )

        deleted = self.client.delete(f"/api/conversations/{conversation_id}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/conversations/{conversation_id}").status_code, 404)

    def test_regenerate_reuses_the_last_user_command(self):
        created = self.client.post("/api/conversations", json={}).json()
        conversation_id = created["id"]
        self.client.post(
            "/api/assistant",
            json={"command": "hello", "conversation_id": conversation_id},
        )

        response = self.client.post(f"/api/conversations/{conversation_id}/regenerate")

        self.assertEqual(response.status_code, 200)
        detail = self.client.get(f"/api/conversations/{conversation_id}").json()
        self.assertEqual([message["role"] for message in detail["messages"]], ["user", "assistant"])
        self.assertEqual(detail["messages"][-1]["content"], "Hello! How can I help you?")

    def test_assistant_receives_prior_turns_as_context(self):
        created = self.client.post("/api/conversations", json={}).json()
        conversation_id = created["id"]
        self.client.post(
            "/api/assistant",
            json={"command": "hello", "conversation_id": conversation_id},
        )
        captured = {}

        async def fake_process_command(command, db, history):
            captured["command"] = command
            captured["history"] = history
            return {"response": "Context received.", "action": "ai", "url": None}

        with patch("app.routes.assistant.process_command", side_effect=fake_process_command):
            response = self.client.post(
                "/api/assistant",
                json={"command": "What did I say?", "conversation_id": conversation_id},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            captured["history"],
            [
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "Hello! How can I help you?"},
            ],
        )

    def test_legacy_command_history_migrates_once_without_deleting_rows(self):
        with self.session_factory() as db:
            db.add(
                CommandHistory(
                    command="old command",
                    response="old response",
                    action="answer",
                )
            )
            db.commit()

        import app.database.migrations as migrations

        original_session_factory = migrations.SessionLocal
        migrations.SessionLocal = self.session_factory
        try:
            migrations.migrate_legacy_command_history()
            migrations.migrate_legacy_command_history()
        finally:
            migrations.SessionLocal = original_session_factory

        with self.session_factory() as db:
            self.assertEqual(db.query(CommandHistory).count(), 1)
            self.assertEqual(db.query(Conversation).count(), 1)
            migrated = db.query(ConversationMessage).order_by(ConversationMessage.id).all()
            self.assertEqual([message.content for message in migrated], ["old command", "old response"])
            self.assertEqual([message.role for message in migrated], ["user", "assistant"])

    def test_youtube_search_commands_return_structured_action(self):
        created = self.client.post("/api/conversations", json={}).json()
        cid = created["id"]

        test_cases = [
            (
                "Search YouTube for Python tutorials",
                "Python tutorials",
                "https://www.youtube.com/results?search_query=Python+tutorials",
            ),
            (
                "Find React tutorials on YouTube",
                "React tutorials",
                "https://www.youtube.com/results?search_query=React+tutorials",
            ),
            (
                "Open YouTube and search for Java programming",
                "Java programming",
                "https://www.youtube.com/results?search_query=Java+programming",
            ),
            (
                "Nova, search React projects on YouTube",
                "React projects",
                "https://www.youtube.com/results?search_query=React+projects",
            ),
            (
                "Play Python tutorial on YouTube",
                "Python tutorial",
                "https://www.youtube.com/results?search_query=Python+tutorial",
            ),
        ]

        for command, expected_query, expected_url in test_cases:
            res = self.client.post(
                "/api/assistant",
                json={"command": command, "conversation_id": cid},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            action_type = data["action"]["type"] if isinstance(data["action"], dict) else data["action"]
            self.assertEqual(action_type, "open_url")
            self.assertEqual(data["query"], expected_query)
            self.assertEqual(data["url"], expected_url)
            self.assertIn("YouTube", data["response"])
            self.assertIn(expected_query, data["response"])

    def test_open_youtube_without_query(self):
        created = self.client.post("/api/conversations", json={}).json()
        cid = created["id"]
        res = self.client.post(
            "/api/assistant",
            json={"command": "open youtube", "conversation_id": cid},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        action_type = data["action"]["type"] if isinstance(data["action"], dict) else data["action"]
        self.assertEqual(action_type, "open_url")
        self.assertEqual(data["url"], "https://www.youtube.com")
        self.assertIn("Opening YouTube", data["response"])


if __name__ == "__main__":
    unittest.main()
