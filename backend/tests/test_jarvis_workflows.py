import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.models import Contact, Note, Task
from app.services.action_planner import decompose_compound_command, execute_action_plan
from app.services.command_service import process_command
from app.services.contact_service import clean_phone_number, find_contact, to_whatsapp_digits
from app.services.desktop_service import parse_desktop_command, parse_notepad_voice_command
from app.services.email_service import parse_email_command
from app.services.reminder_service import format_due_string, parse_reminder_command
from app.services.website_service import parse_website_command
from app.services.whatsapp_service import parse_whatsapp_command


class TestJarvisWorkflows(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed test contacts
        self.contact = Contact(
            name="Devni",
            phone="+94771234567",
            relationship="friend",
            email="devni@example.com",
            notes="Best friend",
        )
        self.lecturer = Contact(
            name="Dr. Smith",
            phone="+14155552671",
            relationship="lecturer",
            email="smith@cs.edu",
            notes="Professor",
        )
        self.db.add_all([self.contact, self.lecturer])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_workflow_1_open_youtube(self):
        is_web, name, q, url = parse_website_command("Nova, open YouTube.")
        self.assertTrue(is_web)
        self.assertEqual(name, "YouTube")
        self.assertIsNone(q)
        self.assertEqual(url, "https://www.youtube.com")

    def test_workflow_2_search_google(self):
        is_web, name, q, url = parse_website_command("Nova, search Google for React tutorials.")
        self.assertTrue(is_web)
        self.assertEqual(name, "Google")
        self.assertEqual(q, "React tutorials")
        self.assertIn("React+tutorials", url)

    def test_workflow_3_open_calculator(self):
        is_desk, key, name = parse_desktop_command("Nova, open Calculator.")
        self.assertTrue(is_desk)
        self.assertEqual(key, "calculator")
        self.assertEqual(name, "Calculator")

    def test_workflow_4_write_note(self):
        is_note, content = parse_notepad_voice_command("Nova, write a note: Buy 5 kg of rice.")
        self.assertTrue(is_note)
        self.assertEqual(content, "Buy 5 kg of rice.")

    def test_workflow_5_whatsapp_devni(self):
        is_wa, res = parse_whatsapp_command(
            "Nova, prepare a WhatsApp message to Devni saying I'm fine.",
            self.db,
        )
        self.assertTrue(is_wa)
        self.assertIsNotNone(res)
        self.assertEqual(res["action"]["type"], "whatsapp_prepare")
        self.assertEqual(res["action"]["recipient_name"], "Devni")
        self.assertEqual(res["action"]["message"], "I'm fine")
        self.assertIn("94771234567", res["action"]["digits"])
        self.assertIn("https://wa.me/94771234567?text=I%27m+fine", res["action"]["url"])

    def test_workflow_6_reminder_tomorrow_8pm(self):
        is_rem, title, when = parse_reminder_command("Nova, remind me tomorrow at 8 PM to study Java.")
        self.assertTrue(is_rem)
        self.assertEqual(title, "study Java")
        self.assertEqual(when, "Tomorrow at 8:00 PM")

    def test_workflow_7_search_and_save_link_planner(self):
        segments = decompose_compound_command("Nova, search for Python tutorials and save the search link.")
        self.assertIsNotNone(segments)
        self.assertGreaterEqual(len(segments), 2)
        self.assertIn("search for Python tutorials", segments[0])
        self.assertIn("save the search link", segments[1])

    async def test_workflow_7_execution(self):
        segments = ["search for Python tutorials", "save the search link"]
        plan_res = await execute_action_plan(segments, self.db)
        self.assertIsNotNone(plan_res)
        self.assertTrue(plan_res.get("is_multistep"))
        self.assertEqual(len(plan_res["steps"]), 2)
        self.assertEqual(plan_res["steps"][0]["action"], "open_url")
        self.assertEqual(plan_res["steps"][1]["action"], "desktop_open")

    def test_email_parsing(self):
        is_email, rec, topic = parse_email_command("Nova, draft an email to my lecturer regarding assignment extension.")
        self.assertTrue(is_email)
        self.assertEqual(rec, "my lecturer")
        self.assertEqual(topic, "assignment extension")

        is_email2, _, topic2 = parse_email_command("Nova, write an email requesting an internship.")
        self.assertTrue(is_email2)
        self.assertEqual(topic2, "requesting an internship")

    def test_contact_lookup_and_phone(self):
        contact, _ = find_contact("Devni", self.db)
        self.assertIsNotNone(contact)
        self.assertEqual(contact.name, "Devni")

        digits = to_whatsapp_digits(contact.phone)
        self.assertEqual(digits, "94771234567")

        clean = clean_phone_number("+94 (77) 123-4567")
        self.assertEqual(clean, "+94771234567")


if __name__ == "__main__":
    unittest.main()
