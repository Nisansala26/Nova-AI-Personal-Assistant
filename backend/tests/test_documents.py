import unittest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.routes.documents import router


class DocumentApiTests(unittest.TestCase):
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

    def test_document_upload_and_inspect(self):
        content = "Nova AI is an intelligent assistant capable of speech recognition and synthesis."
        files = {"file": ("demo.txt", content.encode("utf-8"), "text/plain")}

        res = self.client.post("/api/documents/upload", files=files)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        doc_id = data["id"]
        self.assertEqual(data["filename"], "demo.txt")
        self.assertEqual(data["file_type"], "txt")
        self.assertGreater(data["word_count"], 5)

        # Retrieve doc detail
        detail = self.client.get(f"/api/documents/{doc_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["content_text"], content)

        # Summarize mock
        with patch("app.routes.documents.generate_document_summary", return_value="Summary: Nova AI is intelligent."):
            sum_res = self.client.post(f"/api/documents/{doc_id}/summarize")
            self.assertEqual(sum_res.status_code, 200)
            self.assertEqual(sum_res.json()["summary"], "Summary: Nova AI is intelligent.")

        # Ask question mock
        with patch("app.routes.documents.ask_document_question", return_value={"answer": "It is an assistant.", "references": ["Nova AI is an intelligent assistant"], "filename": "demo.txt"}):
            ask_res = self.client.post(f"/api/documents/{doc_id}/ask", json={"question": "What is Nova AI?"})
            self.assertEqual(ask_res.status_code, 200)
            self.assertIn("answer", ask_res.json())
            self.assertIn("references", ask_res.json())

        # Delete document
        del_res = self.client.delete(f"/api/documents/{doc_id}")
        self.assertEqual(del_res.status_code, 204)


if __name__ == "__main__":
    unittest.main()
