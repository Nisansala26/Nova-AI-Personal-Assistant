import test from 'node:test';
import assert from 'node:assert/strict';

test('SSE Stream Event Parser correctly reconstructs chunked AI responses', () => {
  const simulatedRawChunks = [
    'data: {"chunk": "Hello", "is_complete": false}\n\n',
    'data: {"chunk": " there!", "is_complete": false}\n\n',
    'data: {"chunk": " I am Nova.", "is_complete": false}\n\n',
    'data: {"chunk": "", "is_complete": true, "audio_url": null}\n\n',
  ];

  let accumulatedText = '';
  let streamComplete = false;

  for (const rawChunk of simulatedRawChunks) {
    const lines = rawChunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = JSON.parse(line.slice(6));
        if (payload.chunk) {
          accumulatedText += payload.chunk;
        }
        if (payload.is_complete) {
          streamComplete = true;
        }
      }
    }
  }

  assert.strictEqual(accumulatedText, 'Hello there! I am Nova.');
  assert.strictEqual(streamComplete, true);
});

test('Task priority sorting and filtering logic', () => {
  const sampleTasks = [
    { id: 1, title: 'Low priority task', priority: 'low', completed: false },
    { id: 2, title: 'Urgent bug fix', priority: 'high', completed: false },
    { id: 3, title: 'Medium task', priority: 'medium', completed: true },
    { id: 4, title: 'Another high priority item', priority: 'high', completed: true },
  ];

  const priorityWeights = { high: 3, medium: 2, low: 1 };

  // Filter pending tasks
  const pendingTasks = sampleTasks.filter(t => !t.completed);
  assert.strictEqual(pendingTasks.length, 2);

  // Sort descending by priority weight
  const sortedPending = [...pendingTasks].sort(
    (a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0)
  );
  assert.strictEqual(sortedPending[0].title, 'Urgent bug fix');
  assert.strictEqual(sortedPending[1].title, 'Low priority task');
});

test('Document citation highlighter excerpts matching passages', () => {
  const fullDocumentText = `
  Nova AI personal assistant is designed to provide seamless voice interaction.
  The architecture relies on FastAPI for high-performance Python asynchronous APIs.
  Groq AI is integrated using ultra-low latency Llama-3 models.
  Document intelligence extracts content from PDF, DOCX, and TXT files.
  `;

  function findCitationSnippet(query, content, maxLength = 120) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerContent.indexOf(lowerQuery);
    if (idx === -1) return content.slice(0, maxLength).trim() + '...';
    
    const start = Math.max(0, idx - 20);
    const end = Math.min(content.length, idx + query.length + 60);
    return content.slice(start, end).replace(/\s+/g, ' ').trim();
  }

  const snippet = findCitationSnippet('FastAPI', fullDocumentText);
  assert.ok(snippet.includes('FastAPI'));
  assert.ok(snippet.includes('high-performance Python'));
});
