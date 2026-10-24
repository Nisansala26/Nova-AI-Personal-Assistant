import test from 'node:test';
import assert from 'node:assert/strict';

test('Wake word regex detection accurately identifies "Hey Nova"', () => {
  const wakeWordPattern = /^(?:hey|hi|hello|ok|okay)?\s*nova[,\s]*(.*)$/i;
  
  const testCases = [
    { input: 'Hey Nova what is the weather', expectedCommand: 'what is the weather' },
    { input: 'nova search for react tutorials', expectedCommand: 'search for react tutorials' },
    { input: 'Hello Nova set a reminder for 5pm', expectedCommand: 'set a reminder for 5pm' },
    { input: 'Okay Nova open YouTube', expectedCommand: 'open YouTube' },
    { input: 'Hi Nova summarize this document', expectedCommand: 'summarize this document' },
  ];

  for (const { input, expectedCommand } of testCases) {
    const match = input.match(wakeWordPattern);
    assert.ok(match, `Expected '${input}' to match wake word pattern`);
    assert.strictEqual(match[1].trim(), expectedCommand);
  }
});

test('Deduplication logic prevents repeated executions within 2500ms', () => {
  const recentCommands = new Map();
  const DEDUPE_WINDOW_MS = 2500;

  function shouldExecute(commandText, timestamp) {
    const normalized = commandText.trim().toLowerCase();
    const lastTimestamp = recentCommands.get(normalized);
    if (lastTimestamp && timestamp - lastTimestamp < DEDUPE_WINDOW_MS) {
      return false;
    }
    recentCommands.set(normalized, timestamp);
    return true;
  }

  const t0 = 10000;
  // First execution: allowed
  assert.strictEqual(shouldExecute('search youtube for python', t0), true);
  // Immediate duplicate: blocked
  assert.strictEqual(shouldExecute('search youtube for python', t0 + 500), false);
  // Within dedupe window: blocked
  assert.strictEqual(shouldExecute('search youtube for python', t0 + 2000), false);
  // After window expiration: allowed
  assert.strictEqual(shouldExecute('search youtube for python', t0 + 3000), true);
});

test('Action URL handling for YouTube and Web searches', () => {
  function buildYoutubeUrl(query) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }

  function buildGoogleUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  const ytQuery = 'Python & FastAPI tutorials!';
  const ytUrl = buildYoutubeUrl(ytQuery);
  assert.strictEqual(ytUrl, 'https://www.youtube.com/results?search_query=Python%20%26%20FastAPI%20tutorials!');

  const googleQuery = 'weather in Tokyo';
  const googleUrl = buildGoogleUrl(googleQuery);
  assert.strictEqual(googleUrl, 'https://www.google.com/search?q=weather%20in%20Tokyo');
});

test('Safe URL validator prevents javascript and unsafe schemes', () => {
  function isValidHttpUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  assert.strictEqual(isValidHttpUrl('https://youtube.com'), true);
  assert.strictEqual(isValidHttpUrl('http://localhost:8000'), true);
  assert.strictEqual(isValidHttpUrl('javascript:alert(1)'), false);
  assert.strictEqual(isValidHttpUrl('file:///C:/Windows/system32'), false);
  assert.strictEqual(isValidHttpUrl('data:text/html,<script>'), false);
});

test('Recognizes structured action { type: "open_url", url: "..." } and legacy actions', () => {
  function resolveAction(actionResult) {
    const actionObj =
      typeof actionResult.action === 'object' && actionResult.action !== null
        ? actionResult.action
        : { type: actionResult.action, url: actionResult.url };

    const isOpenUrl =
      actionObj.type === 'open_url' ||
      actionResult.action === 'open_url' ||
      actionResult.action === 'youtube_search' ||
      Boolean(actionResult.url);

    const targetUrl = actionObj.url || actionResult.url;
    const replyText = actionResult.reply || actionResult.response;

    return { isOpenUrl, targetUrl, replyText, type: actionObj.type };
  }

  // Structured action format (Requirement 5)
  const structuredRes = {
    reply: 'Opening YouTube search results for Python tutorials.',
    action: {
      type: 'open_url',
      url: 'https://www.youtube.com/results?search_query=Python+tutorials',
    },
  };
  const resolved1 = resolveAction(structuredRes);
  assert.strictEqual(resolved1.isOpenUrl, true);
  assert.strictEqual(resolved1.type, 'open_url');
  assert.strictEqual(resolved1.targetUrl, 'https://www.youtube.com/results?search_query=Python+tutorials');
  assert.strictEqual(resolved1.replyText, 'Opening YouTube search results for Python tutorials.');

  // Legacy action format
  const legacyRes = {
    response: 'Opening YouTube in a new tab.',
    action: 'open_url',
    url: 'https://www.youtube.com',
  };
  const resolved2 = resolveAction(legacyRes);
  assert.strictEqual(resolved2.isOpenUrl, true);
  assert.strictEqual(resolved2.targetUrl, 'https://www.youtube.com');
});

test('Navigation intent accurately identifies commands that should pre-open tabs', () => {
  function isNavigationIntent(command) {
    const lower = command.toLowerCase();
    return (
      lower.includes('youtube') ||
      lower.startsWith('open ') ||
      lower.startsWith('search ') ||
      lower.startsWith('google ') ||
      lower.startsWith('find ') ||
      lower.startsWith('play ') ||
      lower.startsWith('watch ')
    );
  }

  assert.strictEqual(isNavigationIntent('Search YouTube for Python tutorials'), true);
  assert.strictEqual(isNavigationIntent('Find Java tutorials on YouTube'), true);
  assert.strictEqual(isNavigationIntent('Nova, search React projects on YouTube'), true);
  assert.strictEqual(isNavigationIntent('Open YouTube'), true);
  assert.strictEqual(isNavigationIntent('Play Python tutorial on YouTube'), true);
  assert.strictEqual(isNavigationIntent('What is quantum computing?'), false);
  assert.strictEqual(isNavigationIntent('Weather in Colombo'), false);
});
