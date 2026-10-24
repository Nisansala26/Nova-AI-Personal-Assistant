import unittest
from app.services.website_service import parse_website_command, is_safe_web_url


class TestWebsiteRegistry(unittest.TestCase):
    def test_registered_sites_open_and_search(self):
        cases = [
            ("Nova, open YouTube.", "YouTube", None, "https://www.youtube.com"),
            ("Nova, search YouTube for Python tutorials", "YouTube", "Python tutorials", "https://www.youtube.com/results?search_query=Python+tutorials"),
            ("Nova, search Google for Java interview questions", "Google", "Java interview questions", "https://www.google.com/search?q=Java+interview+questions"),
            ("Nova, find React projects on GitHub", "GitHub", "React projects", "https://github.com/search?q=React+projects"),
            ("Nova, search Stack Overflow for Spring Boot errors", "Stack Overflow", "Spring Boot errors", "https://stackoverflow.com/search?q=Spring+Boot+errors"),
            ("Nova, open LinkedIn", "LinkedIn", None, "https://www.linkedin.com"),
            ("Nova, open Gmail", "Gmail", None, "https://mail.google.com"),
            ("Nova, search Wikipedia for Artificial intelligence", "Wikipedia", "Artificial intelligence", "https://en.wikipedia.org/wiki/Special:Search?search=Artificial+intelligence"),
            ("open chatgpt", "ChatGPT", None, "https://chatgpt.com"),
            ("open reddit and search for webdev", "Reddit", "webdev", "https://www.reddit.com/search/?q=webdev"),
        ]

        for cmd, exp_name, exp_q, exp_url in cases:
            is_browser, name, q, url = parse_website_command(cmd)
            self.assertTrue(is_browser, f"Failed for {cmd}")
            self.assertEqual(name, exp_name)
            self.assertEqual(q, exp_q)
            self.assertEqual(url, exp_url)

    def test_disallowed_schemes_rejected(self):
        unsafe = [
            "open javascript:alert(1)",
            "open data:text/html,<script>",
            "open file:///C:/Windows",
        ]
        for cmd in unsafe:
            is_browser, _, _, _ = parse_website_command(cmd)
            self.assertFalse(is_browser, f"Unsafe command allowed: {cmd}")

    def test_safe_url_checker(self):
        self.assertTrue(is_safe_web_url("https://fastapi.tiangolo.com"))
        self.assertTrue(is_safe_web_url("http://localhost:8000"))
        self.assertFalse(is_safe_web_url("javascript:void(0)"))
        self.assertFalse(is_safe_web_url("file:///etc/passwd"))


if __name__ == "__main__":
    unittest.main()
