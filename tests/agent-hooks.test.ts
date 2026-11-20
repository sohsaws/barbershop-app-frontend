// @vitest-environment node
import { expect, test } from 'vitest';
import { needsTestCheck } from '../.codex/hooks/test-check.mjs';

test('agent checks are triggered by relevant edits and deletions', () => {
  expect(needsTestCheck({ hook_event_name: 'PostToolUse', tool_input: { command: '*** Update File: src/app/Layout.tsx' } })).toBe(true);
  expect(needsTestCheck({ hook_event_name: 'PostToolUse', tool_input: { command: '*** Delete File: tests/obsolete.test.ts' } })).toBe(true);
  expect(needsTestCheck({ hook_event_name: 'PostToolUse', tool_input: { file_path: 'C:\\project\\tests\\form.test.tsx' } })).toBe(true);
});

test('documentation reads and unrelated events do not run test checks', () => {
  expect(needsTestCheck({ hook_event_name: 'PostToolUse', tool_input: { command: '*** Update File: README.md' } })).toBe(false);
  expect(needsTestCheck({ hook_event_name: 'PostToolUse', tool_input: { command: 'git status' } })).toBe(false);
  expect(needsTestCheck({ hook_event_name: 'PreToolUse', tool_input: { file_path: 'src/app.ts' } })).toBe(false);
});

test('end-of-turn checks cover edits made through shell tools too', () => {
  expect(needsTestCheck({ hook_event_name: 'Stop' })).toBe(true);
});
