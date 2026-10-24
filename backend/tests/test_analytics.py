import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.models.models import CommandHistory, Conversation, Task
from app.routes.analytics import router


class AnalyticsApiTests(unittest.TestCase):
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

    def test_analytics_returns_real_calculated_metrics(self):
        with self.session_factory() as db:
            db.add(Conversation(title="Chat 1"))
            db.add(Conversation(title="Chat 2"))
            db.add(Task(title="Task 1", completed=True))
            db.add(Task(title="Task 2", completed=False))
            db.add(CommandHistory(command="voice cmd", response="ok", is_voice=True, latency_ms=250.0))
            db.add(CommandHistory(command="text cmd", response="ok", is_voice=False, latency_ms=350.0))
            db.commit()

        res = self.client.get("/api/analytics/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["overview"]["total_conversations"], 2)
        self.assertEqual(data["overview"]["total_commands"], 2)
        self.assertEqual(data["overview"]["voice_commands"], 1)
        self.assertEqual(data["overview"]["typed_commands"], 1)
        self.assertEqual(data["overview"]["voice_percentage"], 50.0)

        self.assertEqual(data["tasks"]["total"], 2)
        self.assertEqual(data["tasks"]["completed"], 1)
        self.assertEqual(data["tasks"]["completion_rate"], 50.0)

        self.assertIn("recent_activity", data)
        self.assertGreaterEqual(len(data["recent_activity"]), 3)


if __name__ == "__main__":
    unittest.main()
