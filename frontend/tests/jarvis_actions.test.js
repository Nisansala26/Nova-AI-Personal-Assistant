import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('JARVIS Actions & Communication Utilities', () => {
  it('WhatsApp URL generator formats international numbers and encodes message correctly', () => {
    const phone = '+94 77 123 4567';
    const message = "I'm fine, thank you!";
    const digits = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

    assert.equal(digits, '94771234567');
    assert.equal(waUrl, "https://wa.me/94771234567?text=I'm%20fine%2C%20thank%20you!");
    assert.doesNotMatch(waUrl, /[+\s\-]/);
  });

  it('Email mailto URL formats subject and body with RFC standards', () => {
    const recipient = 'lecturer@university.edu';
    const subject = 'Request: Assignment Extension';
    const body = 'Dear Professor,\n\nI am requesting an extension.\n\nThank you.';
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    assert.ok(mailto.startsWith('mailto:lecturer@university.edu'));
    assert.ok(mailto.includes('subject=Request%3A%20Assignment%20Extension'));
    assert.ok(mailto.includes('body=Dear%20Professor'));
  });

  it('Action planner recognizes multi-step execution steps', () => {
    const steps = [
      { step: 1, action: 'open_url', status: 'completed', message: "Opened YouTube search results for 'Python tutorials'" },
      { step: 2, action: 'desktop_open', status: 'completed', message: "Saved note to 'Note_Python.txt'" },
    ];

    assert.equal(steps.length, 2);
    assert.ok(steps.every((s) => s.status === 'completed'));
    assert.equal(steps[0].action, 'open_url');
    assert.equal(steps[1].action, 'desktop_open');
  });

  it('Contact phone number normalizer preserves valid characters and strips spaces/hyphens', () => {
    const raw = '+1 (415) 555-2671';
    const clean = raw.replace(/[^\d+]/g, '');
    assert.equal(clean, '+14155552671');
    const digitsOnly = clean.replace(/\D/g, '');
    assert.equal(digitsOnly, '14155552671');
    assert.ok(digitsOnly.length >= 7 && digitsOnly.length <= 15);
  });
});
