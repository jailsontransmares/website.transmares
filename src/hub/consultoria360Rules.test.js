import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateConsortiumReference,
  calculateHealthPlan,
  calculatePriorityScores,
  calculateProtectionReference,
  compareHealthPlans,
  selectInvestigationPillars,
  triageToScores
} from './consultoria360Rules.js';

test('triagem e investigação abrem os três pilares quando não há corte', () => {
  const triage = triageToScores({});
  assert.deepEqual(triage, { protecao: 0, saude: 0, patrimonio: 0 });
  assert.deepEqual(selectInvestigationPillars({ triage }), { protecao: true, saude: true, patrimonio: true });
});

test('score de proteção considera reserva, capital, urgência e intenção', () => {
  const result = calculatePriorityScores({
    triage: { protecao: 7, saude: 0, patrimonio: 0 },
    reserveMonths: 0,
    existingProtection: 0,
    incomeImpact: 2,
    debt: 1000,
    mainInterest: 'protecao'
  });
  assert.equal(result.scores.protecao, 90);
  assert.equal(result.suggestedPriority, 'protecao');
});

test('dimensionador de proteção nunca retorna gap negativo', () => {
  const result = calculateProtectionReference({
    expenses: 10000,
    supportYears: 5,
    debt: 0,
    liquidReserve: 1000000,
    existingLife: 1000000,
    netIncome: 10000,
    replacementPct: 0.8,
    maintainedIncome: 10000,
    recoveryMonths: 12,
    disabilityYears: 10
  });
  assert.equal(result.familyGap, 0);
  assert.equal(result.monthlyIncomeGap, 0);
  assert.equal(result.dgRef, 120000);
  assert.equal(result.disabilityRef, 0);
});

test('comparador elimina alternativa sem rede essencial e alerta empate próximo', () => {
  const criteria = {
    budget: 1000,
    desiredScope: 'Nacional',
    desiredAccommodation: 'Apartamento',
    copayPreference: 'Talvez',
    essentialNetwork: 'Hospital X',
    weights: { network: 5, price: 5, scope: 5, accommodation: 5, copay: 5, reimbursement: 5 }
  };
  const result = compareHealthPlans({
    criteria,
    plans: [
      { name: 'A', price: 1000, network: 0, scope: 'Nacional', accommodation: 'Apartamento', copay: 'Sim', reimbursement: 3 },
      { name: 'B', price: 1000, network: 5, scope: 'Nacional', accommodation: 'Apartamento', copay: 'Sim', reimbursement: 3 },
      { name: 'C', price: 1000, network: 5, scope: 'Nacional', accommodation: 'Apartamento', copay: 'Não', reimbursement: 3 }
    ]
  });
  assert.equal(result.plans[0].name, 'C');
  assert.equal(result.plans[1].name, 'B');
  assert.equal(result.plans[2].incompatible, true);
  assert.equal(result.closeDecision, true);
});

test('simulador patrimonial trata crédito e prazo zerados sem erro', () => {
  const result = calculateConsortiumReference({ credit: 0, term: 0, adjustment: 0, bid: 0 });
  assert.equal(result.initial, 0);
  assert.equal(result.affordability, null);
  assert.equal(result.bidPct, 0);
  assert.equal(result.netCredit, 0);
});

test('lance embutido reduz apenas o crédito líquido ilustrativo', () => {
  const result = calculateConsortiumReference({ credit: 200000, term: 120, bid: 20000, bidType: 'embedded', comfort: 2000 });
  assert.equal(result.netCredit, 180000);
  assert.equal(result.bidPct, 10);
});
