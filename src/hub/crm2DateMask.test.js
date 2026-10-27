import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCrm2DateForInput, isValidCrm2Date, maskCrm2Date, normalizeCrm2Date } from './crm2DateMask.js';

test('birth date input mask formats partial and complete digit entry as dd/mm/yyyy', () => {
  assert.equal(maskCrm2Date('3'), '3');
  assert.equal(maskCrm2Date('3108'), '31/08');
  assert.equal(maskCrm2Date('31081990'), '31/08/1990');
  assert.equal(maskCrm2Date('31/08/199012'), '31/08/1990');
});

test('Brazilian dates normalize to ISO only when the calendar date is valid', () => {
  assert.equal(normalizeCrm2Date('29/02/2024'), '2024-02-29');
  assert.equal(normalizeCrm2Date('29/02/2023'), '29/02/2023');
  assert.equal(isValidCrm2Date(normalizeCrm2Date('29/02/2024')), true);
  assert.equal(isValidCrm2Date(normalizeCrm2Date('29/02/2023')), false);
});

test('ISO values display as Brazilian dates and invalid values are not accepted', () => {
  assert.equal(formatCrm2DateForInput('2001-12-09'), '09/12/2001');
  assert.equal(normalizeCrm2Date('2001-12-09'), '2001-12-09');
  assert.equal(isValidCrm2Date('2026-02-30'), false);
  assert.equal(formatCrm2DateForInput('2026-02-30'), '2026-02-30');
});
