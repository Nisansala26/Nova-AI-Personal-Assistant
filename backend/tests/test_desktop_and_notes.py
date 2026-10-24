import os
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.models import Note
from app.services.desktop_service import (
    WINDOWS_APP_ALLOWLIST,
    create_and_open_note,
    ensure_notes_dir,
    is_windows_os,
    launch_windows_app,
    parse_desktop_command,
    parse_notepad_voice_command,
    verify_windows_desktop_environment,
)


class TestDesktopAndNotepadAutomation(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_desktop_command_parsing(self):
        cases = [
            ("Nova, open Notepad.", True, "notepad"),
            ("open notepad", True, "notepad"),
            ("Open Windows Notepad", True, "notepad"),
            ("open notepad.exe", True, "notepad"),
            ("Can you open notepad", True, "notepad"),
            ("Open the notepad please", True, "notepad"),
            ("open calculator", True, "calculator"),
            ("Nova, open File Explorer", True, "explorer"),
            ("open Downloads", True, "downloads"),
            ("open VS Code", True, "vscode"),
            ("open Chrome", True, "chrome"),
            ("Nova, open Documents", True, "documents"),
            ("what is python", False, None),
        ]
        for cmd, exp_is, exp_app in cases:
            is_d, app_key, app_name = parse_desktop_command(cmd)
            self.assertEqual(is_d, exp_is, f"Failed for {cmd}")
            if exp_is:
                self.assertEqual(app_key, exp_app)
                self.assertIn(app_key, WINDOWS_APP_ALLOWLIST)

    def test_verify_windows_desktop_environment(self):
        is_ok, err = verify_windows_desktop_environment()
        if os.name == "nt":
            self.assertTrue(is_ok)
            self.assertIsNone(err)
        else:
            self.assertFalse(is_ok)

    def test_launch_unapproved_app_rejected(self):
        success, msg, details = launch_windows_app("unapproved_app_xyz")
        self.assertFalse(success)
        self.assertIn("not in the approved desktop allowlist", msg)
        self.assertFalse(details["verified"])

    def test_notepad_voice_command_parsing(self):
        cases = [
            ("Nova, put a note: 5 rice", "5 rice"),
            ("Nova, write a note: Buy milk tomorrow", "Buy milk tomorrow"),
            ("Nova, open Notepad and write Hello World", "Hello World"),
            ("Nova, save a note: Complete my assignment", "Complete my assignment"),
            ("note: check server logs", "check server logs"),
        ]
        for cmd, exp_content in cases:
            is_note, content = parse_notepad_voice_command(cmd)
            self.assertTrue(is_note, f"Expected note command for '{cmd}'")
            self.assertEqual(content, exp_content)

    def test_create_and_open_note_generates_utf8_file_and_db_record(self):
        res = create_and_open_note("5 rice", self.db, title="Shopping List")
        self.assertTrue(res["success"])
        self.assertEqual(res["content"], "5 rice")
        self.assertTrue(os.path.exists(res["filepath"]))

        # Verify UTF-8 file content
        with open(res["filepath"], "r", encoding="utf-8") as f:
            read_back = f.read()
        self.assertEqual(read_back, "5 rice")

        # Verify database record
        saved_note = self.db.get(Note, res["note_id"])
        self.assertIsNotNone(saved_note)
        self.assertEqual(saved_note.content, "5 rice")
        self.assertEqual(saved_note.filename, res["filename"])

        # Clean up file created during test
        try:
            os.remove(res["filepath"])
        except OSError:
            pass


if __name__ == "__main__":
    unittest.main()
