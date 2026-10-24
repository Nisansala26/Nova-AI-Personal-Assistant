import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.routes.auth import router


class AuthApiTests(unittest.TestCase):
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

    def test_register_and_login_flow(self):
        # 1. Register
        reg_res = self.client.post(
            "/api/auth/register",
            json={
                "email": "test@nova.ai",
                "username": "NovaTester",
                "password": "Password123!",
            },
        )
        self.assertEqual(reg_res.status_code, 201)
        data = reg_res.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "test@nova.ai")
        token = data["token"]

        # 2. Get profile with token
        me_res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(me_res.status_code, 200)
        self.assertTrue(me_res.json()["authenticated"])
        self.assertEqual(me_res.json()["user"]["username"], "NovaTester")

        # 3. Login with credentials
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "test@nova.ai", "password": "Password123!"},
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("token", login_res.json())

        # 4. Duplicate registration fails
        dup_res = self.client.post(
            "/api/auth/register",
            json={
                "email": "test@nova.ai",
                "username": "AnotherName",
                "password": "Password123!",
            },
        )
        self.assertEqual(dup_res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
