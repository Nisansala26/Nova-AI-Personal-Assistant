"""
Quick feature verification for Nova AI backend.
Run with: backend\\venv\\Scripts\\python check_features.py
"""
import urllib.request, urllib.error, json, sys, time

BASE = "http://127.0.0.1:8000"

def call(label, method, path, payload=None, timeout=8):
    url = BASE + path
    try:
        if payload:
            data = json.dumps(payload).encode()
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method=method)
        else:
            req = urllib.request.Request(url, method=method)
        resp = urllib.request.urlopen(req, timeout=timeout)
        d = json.loads(resp.read().decode())
        if isinstance(d, list):
            return f"OK  {label}: {len(d)} items"
        action = d.get("action", {})
        atype = action.get("type", action) if isinstance(action, dict) else str(action)
        success = action.get("success", True) if isinstance(action, dict) else True
        flag = "OK" if success else "FAIL"
        return f"{flag}  {label}: action={atype}"
    except urllib.error.HTTPError as e:
        return f"FAIL  {label}: HTTP {e.code}"
    except Exception as e:
        return f"FAIL  {label}: {e}"

checks = [
    ("Health",         "GET",  "/api/health",            None),
    ("Conversations",  "GET",  "/api/conversations",     None),
    ("Tasks List",     "GET",  "/api/tasks",             None),
    ("Notes List",     "GET",  "/api/notes",             None),
    ("Documents List", "GET",  "/api/documents",         None),
    ("Contacts List",  "GET",  "/api/contacts",          None),
    ("Analytics",      "GET",  "/api/analytics/stats",   None),
    ("Memory",         "GET",  "/api/memory",            None),
    ("YouTube Search", "POST", "/api/assistant",         {"command": "search youtube for python tutorials"}),
    ("Open Notepad",   "POST", "/api/assistant",         {"command": "open notepad"}),
    ("Create Task",    "POST", "/api/assistant",         {"command": "create task review code by friday"}),
    ("Set Reminder",   "POST", "/api/assistant",         {"command": "remind me to call team tomorrow"}),
    ("Take Note",      "POST", "/api/assistant",         {"command": "take a note: meeting at 3pm"}),
    ("WhatsApp",       "POST", "/api/assistant",         {"command": "message john saying I will be late"}),
    ("Weather",        "POST", "/api/assistant",         {"command": "weather in colombo"}),
    ("Google Search",  "POST", "/api/assistant",         {"command": "search google for fastapi tutorial"}),
    ("Open GitHub",    "POST", "/api/assistant",         {"command": "open github"}),
    ("AI Chat",        "POST", "/api/assistant",         {"command": "explain quantum computing in simple terms"}),
]

print("=" * 55)
print("  Nova AI Feature Verification")
print("=" * 55)
for label, method, path, payload in checks:
    result = call(label, method, path, payload)
    print(f"  {result}")
    time.sleep(0.05)
print("=" * 55)
