import { expect, test } from 'vitest';
import { createSlot, slotError } from '../src/features/manage-service/model/slotDates';

test('rejects invalid dates and malformed times', () => {
  expect(createSlot(1, '2026-02-30', '10:00', '11:00')).toBeNull();
  expect(createSlot(1, '2026-02-20', '25:00', '26:00')).toBeNull();
});

test('detects reversed and overlapping slots while allowing adjacent slots', () => {
  const existing = createSlot(1, '2026-02-20', '10:00', '11:00')!;
  expect(slotError(createSlot(1, '2026-02-20', '11:00', '10:00')!, [])).toMatch(/позже/);
  expect(slotError(createSlot(1, '2026-02-20', '10:30', '11:30')!, [existing])).toMatch(/пересекается/);
  expect(slotError(createSlot(1, '2026-02-20', '11:00', '12:00')!, [existing])).toBe('');
});
