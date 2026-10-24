import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.models import Contact


class TestContactsAPI(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        def override_get_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_create_and_list_contacts(self):
        res = self.client.post(
            "/api/contacts",
            json={
                "name": "Devni Silva",
                "phone": "+94 77 123 4567",
                "relationship": "friend",
                "email": "devni@example.com",
                "notes": "Close friend",
            },
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["name"], "Devni Silva")
        self.assertEqual(data["phone"], "+94771234567")

        list_res = self.client.get("/api/contacts")
        self.assertEqual(list_res.status_code, 200)
        contacts = list_res.json()
        self.assertEqual(len(contacts), 1)

    def test_invalid_phone_rejected(self):
        # 8 characters (passes min_length=7) but non-digits fails phone digit validation
        res = self.client.post(
            "/api/contacts",
            json={
                "name": "Invalid Contact",
                "phone": "invalid#num",
            },
        )
        self.assertIn(res.status_code, [400, 422])

    def test_update_and_delete_contact(self):
        create_res = self.client.post(
            "/api/contacts",
            json={"name": "Alex", "phone": "+14155552671", "relationship": "colleague"},
        )
        self.assertEqual(create_res.status_code, 201)
        cid = create_res.json()["id"]

        patch_res = self.client.patch(f"/api/contacts/{cid}", json={"relationship": "manager"})
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["relationship"], "manager")

        del_res = self.client.delete(f"/api/contacts/{cid}")
        self.assertEqual(del_res.status_code, 204)

        get_res = self.client.get(f"/api/contacts/{cid}")
        self.assertEqual(get_res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
