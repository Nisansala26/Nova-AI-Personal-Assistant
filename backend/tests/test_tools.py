import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.services.tool_service import (
    ToolConfirmationRequired,
    ToolValidationError,
    execute_tool,
)


class ToolSystemTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db = self.session_factory()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    async def test_youtube_search_tool(self):
        res = await execute_tool("youtube_search", {"query": "FastAPI tutorials"}, db=self.db)
        action_type = res["action"]["type"] if isinstance(res["action"], dict) else res["action"]
        self.assertEqual(action_type, "open_url")
        self.assertIn("search_query=FastAPI+tutorials", res["url"])

    async def test_tool_allowlist_rejects_unknown_action(self):
        with self.assertRaises(ToolValidationError):
            await execute_tool("execute_bash_shell_script", {"cmd": "rm -rf /"}, db=self.db)

    async def test_open_website_validation(self):
        # Valid website
        res = await execute_tool("open_website", {"url": "https://fastapi.tiangolo.com"}, db=self.db)
        self.assertEqual(res["action"], "open_url")

        # Invalid protocol rejected
        with self.assertRaises(ToolValidationError):
            await execute_tool("open_website", {"url": "javascript:alert(1)"}, db=self.db)

    async def test_manage_tasks_tool(self):
        # Create
        created = await execute_tool(
            "manage_tasks",
            {"action": "create", "title": "Implement WebSockets", "priority": "high"},
            db=self.db,
        )
        self.assertEqual(created["action"], "task_created")
        task_id = created["task_id"]

        # List
        listed = await execute_tool("manage_tasks", {"action": "list"}, db=self.db)
        self.assertEqual(listed["action"], "task_list")
        self.assertIn("Implement WebSockets", listed["response"])

        # Delete requires confirmation when unconfirmed
        with self.assertRaises(ToolConfirmationRequired):
            await execute_tool("manage_tasks", {"action": "delete", "task_id": task_id, "confirmed": False}, db=self.db)

        # Delete succeeds when confirmed
        deleted = await execute_tool("manage_tasks", {"action": "delete", "task_id": task_id, "confirmed": True}, db=self.db)
        self.assertEqual(deleted["action"], "task_deleted")


if __name__ == "__main__":
    unittest.main()
