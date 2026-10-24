import re
from typing import Optional, Tuple
from urllib.parse import quote_plus, urlparse

# Reusable website registry containing official home & search URL templates
WEBSITE_REGISTRY = {
    "google": {
        "name": "Google",
        "home": "https://www.google.com",
        "search": "https://www.google.com/search?q={query}",
        "aliases": ["google", "google search"],
    },
    "youtube": {
        "name": "YouTube",
        "home": "https://www.youtube.com",
        "search": "https://www.youtube.com/results?search_query={query}",
        "aliases": ["youtube", "yt"],
    },
    "github": {
        "name": "GitHub",
        "home": "https://github.com",
        "search": "https://github.com/search?q={query}",
        "aliases": ["github", "git hub"],
    },
    "linkedin": {
        "name": "LinkedIn",
        "home": "https://www.linkedin.com",
        "search": "https://www.linkedin.com/search/results/all/?keywords={query}",
        "aliases": ["linkedin", "linked in"],
    },
    "wikipedia": {
        "name": "Wikipedia",
        "home": "https://www.wikipedia.org",
        "search": "https://en.wikipedia.org/wiki/Special:Search?search={query}",
        "aliases": ["wikipedia", "wiki"],
    },
    "stackoverflow": {
        "name": "Stack Overflow",
        "home": "https://stackoverflow.com",
        "search": "https://stackoverflow.com/search?q={query}",
        "aliases": ["stackoverflow", "stack overflow"],
    },
    "gmail": {
        "name": "Gmail",
        "home": "https://mail.google.com",
        "search": "https://mail.google.com/mail/u/0/#search/{query}",
        "aliases": ["gmail", "google mail"],
    },
    "chatgpt": {
        "name": "ChatGPT",
        "home": "https://chatgpt.com",
        "search": "https://chatgpt.com/?q={query}",
        "aliases": ["chatgpt", "chat gpt", "openai"],
    },
    "reddit": {
        "name": "Reddit",
        "home": "https://www.reddit.com",
        "search": "https://www.reddit.com/search/?q={query}",
        "aliases": ["reddit"],
    },
}

DISALLOWED_SCHEMES = {"javascript", "data", "file", "vbscript", "about"}


def is_safe_web_url(url: str) -> bool:
    """Validate that URL uses safe http or https schemes without script injection."""
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() in DISALLOWED_SCHEMES:
            return False
        return parsed.scheme.lower() in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def clean_wake_and_punctuation(text: str) -> str:
    cleaned = text.strip(" '\"`")
    # Strip leading wake words: 'nova', 'hey nova', 'please', etc.
    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    return cleaned


def parse_website_command(command: str) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
    """
    Parses browser-related commands.
    Returns: (is_browser_cmd, target_name, extracted_query, url)
    """
    if not command or not command.strip():
        return False, None, None, None

    cleaned = clean_wake_and_punctuation(command)
    text = cleaned.lower()

    # 1. Match against registered sites
    for site_key, site in WEBSITE_REGISTRY.items():
        name = site["name"]
        for alias in site["aliases"]:
            # Pattern: "open [alias]" or "[alias]"
            open_home_pattern = rf"^(?:open|launch|go\s+to|visit)\s+{re.escape(alias)}[\s.?!]*$"
            if re.match(open_home_pattern, text):
                return True, name, None, site["home"]

            if text in [alias, f"open {alias}"]:
                return True, name, None, site["home"]

            # Pattern: "search [alias] for [query]", "find [query] on [alias]", "search on [alias] for [query]"
            search_patterns = [
                rf"^(?:search|look\s*up|find)\s+(?:on\s+)?{re.escape(alias)}\s+(?:for\s+)?(?P<q>.+)$",
                rf"^(?:open|go\s+to)\s+{re.escape(alias)}\s+(?:and|to)\s+(?:search\s+(?:for\s+)?|find\s+|look\s+up\s+)(?P<q>.+)$",
                rf"^{re.escape(alias)}\s+(?:search\s+(?:for\s+)?|find\s+|lookup\s+)(?P<q>.+)$",
                rf"^(?:search\s+for|search|find|look\s*up|look\s+for|play|watch|show\s+me|show)\s+(?P<q>.+?)\s+(?:on|in)\s+{re.escape(alias)}[\s.?!]*$",
                rf"^(?P<q>.+?)\s+(?:on|in)\s+{re.escape(alias)}[\s.?!]*$",
            ]
            for pat in search_patterns:
                match = re.match(pat, cleaned, re.IGNORECASE)
                if match:
                    extracted = match.group("q").strip(" '\"`?.!,:;")
                    if extracted.lower().startswith("for "):
                        extracted = extracted[4:].strip(" '\"`?.!,:;")
                    if extracted:
                        query_enc = quote_plus(extracted)
                        search_url = site["search"].format(query=query_enc)
                        return True, name, extracted, search_url
                    return True, name, None, site["home"]

    # 2. General URL or custom website open: "open example.com", "open https://fastapi.tiangolo.com"
    open_url_match = re.match(r"^(?:open|launch|visit|go\s+to)\s+(?P<target>[^\s]+)[\s.?!]*$", cleaned, re.IGNORECASE)
    if open_url_match:
        target = open_url_match.group("target").strip()
        lower_target = target.lower()
        if any(lower_target.startswith(scheme + ":") for scheme in DISALLOWED_SCHEMES):
            return False, None, None, None

        if lower_target.startswith(("http://", "https://")):
            if is_safe_web_url(target):
                return True, "Website", None, target
        elif "." in target and not target.endswith("."):
            full_url = f"https://{target}"
            if is_safe_web_url(full_url):
                return True, target, None, full_url

    # 3. Generic web search: "search google for [query]" or "search for [query] on the web"
    gen_search = re.match(r"^(?:search\s+(?:for\s+|the\s+web\s+for\s+)?|google\s+)(?P<q>.+)$", cleaned, re.IGNORECASE)
    if gen_search:
        extracted = gen_search.group("q").strip(" '\"`?.!,:;")
        if extracted and not any(k in extracted.lower() for k in ["task", "note", "reminder", "history"]):
            url = f"https://www.google.com/search?q={quote_plus(extracted)}"
            return True, "Google", extracted, url

    return False, None, None, None
