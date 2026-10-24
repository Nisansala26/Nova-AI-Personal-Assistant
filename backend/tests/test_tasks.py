import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.routes.tasks import router


class TaskApiTests(unittest.TestCase):
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

    def test_task_crud_lifecycle(self):
        # 1. Create task
        res = self.client.post(
            "/api/tasks",
            json={
                "title": "Build FastAPI production backend",
                "category": "Dev",
                "priority": "high",
                "due_date": "Tomorrow",
            },
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        task_id = data["id"]
        self.assertEqual(data["title"], "Build FastAPI production backend")
        self.assertEqual(data["priority"], "high")
        self.assertFalse(data["completed"])

        # 2. List tasks
        list_res = self.client.get("/api/tasks")
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()), 1)

        # 3. Filter by priority
        filter_res = self.client.get("/api/tasks?priority=high")
        self.assertEqual(len(filter_res.json()), 1)
        low_res = self.client.get("/api/tasks?priority=low")
        self.assertEqual(len(low_res.json()), 0)

        # 4. Mark completed
        patch_res = self.client.patch(
            f"/api/tasks/{task_id}",
            json={"completed": True},
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertTrue(patch_res.json()["completed"])

        # 5. Delete task
        del_res = self.client.delete(f"/api/tasks/{task_id}")
        self.assertEqual(del_res.status_code, 204)
        self.assertEqual(len(self.client.get("/api/tasks").json()), 0)


if __name__ == "__main__":
    unittest.main()
