export const DIAGNOSTICO_RULES_VERSION = 'diagnostico-360-v1';
export const PROTECTION_RULES_VERSION = 'protection-v1';
export const HEALTH_MATCH_RULES_VERSION = 'health-match-v1';
export const CONSORTIUM_RULES_VERSION = 'consortium-v1';

const SCOPE_LEVELS = Object.freeze({ Maceió: 1, Alagoas: 2, Nordeste: 3, Nacional: 4 });

const numberOrZero = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const min3 = value => Math.min(3, numberOrZero(value));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, numberOrZero(value)));

export function triageToScores({ p1 = 0, p2 = 0, p3 = 0, p4 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0 } = {}) {
  return {
    protecao: numberOrZero(p1) + numberOrZero(p2) + numberOrZero(p3) + numberOrZero(p4),
    saude: numberOrZero(s1) + numberOrZero(s2) + numberOrZero(s3) + numberOrZero(s4),
    patrimonio: numberOrZero(c1) + Math.min(2, numberOrZero(c2)) + numberOrZero(c3) + numberOrZero(c4)
  };
}

export function selectInvestigationPillars({ triage = {}, mainInterest = '' } = {}) {
  const selected = {
    protecao: numberOrZero(triage.protecao) >= 2 || mainInterest === 'protecao',
    saude: numberOrZero(triage.saude) >= 2 || mainInterest === 'saude',
    patrimonio: numberOrZero(triage.patrimonio) >= 2 || mainInterest === 'patrimonio'
  };

  return Object.values(selected).some(Boolean)
    ? selected
    : { protecao: true, saude: true, patrimonio: true };
}

function statusForScore(score) {
  if (score >= 75) return 'Prioridade atual';
  if (score >= 50) return 'Planejar';
  if (score >= 26) return 'Acompanhar';
  return 'Sem necessidade atual';
}

export function calculatePriorityScores({
  triage = {},
  reserveMonths = 0,
  existingProtection = 0,
  incomeImpact = 0,
  debt = 0,
  mainInterest = '',
  healthHasPlan = 0,
  healthSatisfaction = 0,
  healthImprove = 0,
  healthIntent = 0,
  patrimonyHorizon = 0,
  patrimonyPlanning = 0,
  patrimonyMonthlyCapacity = 0,
  patrimonyProjectValue = 0,
  patrimonyFlexibility = 0,
  patrimonyReserve = 0
} = {}) {
  const pGap = min3((numberOrZero(reserveMonths) <= 2 ? 2 : numberOrZero(reserveMonths) <= 5 ? 1 : 0) + (numberOrZero(existingProtection) === 0 ? 1 : 0));
  const pNeed = min3(Math.round(numberOrZero(triage.protecao) / 3));
  const pUrg = min3(numberOrZero(incomeImpact) + (numberOrZero(debt) > 0 ? 1 : 0));
  const pIntent = mainInterest === 'protecao' ? 3 : numberOrZero(triage.protecao) >= 5 ? 2 : 1;
  const protecao = Math.round((pNeed / 3) * 30 + (pGap / 3) * 30 + (pUrg / 3) * 20 + (pIntent / 3) * 20);

  const sNeed = min3(Math.round(numberOrZero(triage.saude) / 3));
  const sGap = min3(numberOrZero(healthImprove) + Math.max(0, numberOrZero(healthSatisfaction) - 1));
  const sUrg = min3(numberOrZero(healthIntent) + (numberOrZero(healthHasPlan) === 2 ? 1 : 0));
  const sIntent = mainInterest === 'saude' ? 3 : numberOrZero(healthIntent) >= 2 ? 3 : numberOrZero(triage.saude) >= 5 ? 2 : 1;
  const saude = Math.round((sNeed / 3) * 30 + (sGap / 3) * 30 + (sUrg / 3) * 20 + (sIntent / 3) * 20);

  const cNeed = min3(Math.round(numberOrZero(triage.patrimonio) / 2.5));
  const cGap = min3(numberOrZero(patrimonyPlanning) + (numberOrZero(patrimonyMonthlyCapacity) > 0 ? 0 : 1));
  const cUrg = min3(numberOrZero(patrimonyHorizon) === 0 ? 3 : numberOrZero(patrimonyHorizon) === 1 ? 2 : 1);
  const cIntent = mainInterest === 'patrimonio' ? 3 : numberOrZero(patrimonyProjectValue) > 0 ? 2 : 1;
  const patrimonio = Math.round((cNeed / 3) * 30 + (cGap / 3) * 30 + (cUrg / 3) * 20 + (cIntent / 3) * 20);

  const scores = { protecao, saude, patrimonio };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return {
    scores,
    statuses: Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, statusForScore(score)])),
    suggestedPriority: sorted[0]?.[0] || 'protecao',
    suggestedScore: sorted[0]?.[1] || 0,
    consortiumFit: calculateConsortiumFit({
      flexibility: patrimonyFlexibility,
      horizon: patrimonyHorizon,
      monthlyCapacity: patrimonyMonthlyCapacity,
      reserve: patrimonyReserve
    }),
    components: {
      protecao: { need: pNeed, gap: pGap, urgency: pUrgencySafe(pUrg), intent: pIntent },
      saude: { need: sNeed, gap: sGap, urgency: sUrg, intent: sIntent },
      patrimonio: { need: cNeed, gap: cGap, urgency: cUrg, intent: cIntent }
    }
  };
}

function pUrgencySafe(value) {
  return min3(value);
}

export function calculateConsortiumFit({ flexibility = 0, horizon = 0, monthlyCapacity = 0, reserve = 0 } = {}) {
  return clamp(25 + numberOrZero(flexibility) * 25 + Math.min(20, numberOrZero(horizon) * 8) + (numberOrZero(monthlyCapacity) > 0 ? 15 : 0) + (numberOrZero(reserve) > 0 ? 10 : 0) - (numberOrZero(horizon) === 0 ? 35 : 0));
}

export function calculateProtectionReference({
  expenses = 0,
  supportYears = 0,
  debt = 0,
  education = 0,
  otherGoals = 0,
  immediateReserve = 0,
  liquidReserve = 0,
  existingLife = 0,
  netIncome = 0,
  maintainedIncome = 0,
  replacementPct = 0,
  recoveryMonths = 0,
  extraDG = 0,
  existingDG = 0,
  disabilityYears = 0
} = {}) {
  const familyGross = numberOrZero(expenses) * 12 * numberOrZero(supportYears) + numberOrZero(debt) + numberOrZero(education) + numberOrZero(otherGoals) + numberOrZero(immediateReserve);
  const familyGap = Math.max(0, familyGross - numberOrZero(liquidReserve) - numberOrZero(existingLife));
  const monthlyIncomeGap = Math.max(0, numberOrZero(netIncome) * numberOrZero(replacementPct) - numberOrZero(maintainedIncome));
  const dailyRef = monthlyIncomeGap / 30;
  const dgRef = Math.max(0, numberOrZero(expenses) * numberOrZero(recoveryMonths) + numberOrZero(extraDG) - numberOrZero(existingDG));
  const disabilityRef = Math.max(0, numberOrZero(expenses) * 12 * numberOrZero(disabilityYears) + numberOrZero(debt) - numberOrZero(liquidReserve) - numberOrZero(existingLife));

  return {
    familyGross,
    familyGap,
    monthlyIncomeGap,
    dailyRef,
    dgRef,
    disabilityRef,
    assumptions: { expenses, supportYears, debt, education, otherGoals, immediateReserve, liquidReserve, existingLife, netIncome, maintainedIncome, replacementPct, recoveryMonths, extraDG, existingDG, disabilityYears },
    rulesVersion: PROTECTION_RULES_VERSION
  };
}

export function priceScore(price, budget) {
  if (!numberOrZero(price) || !numberOrZero(budget)) return 3.5;
  const ratio = numberOrZero(price) / numberOrZero(budget);
  return ratio <= 1 ? 5 : ratio <= 1.1 ? 4 : ratio <= 1.2 ? 3 : ratio <= 1.35 ? 2 : ratio <= 1.5 ? 1 : 0;
}

export function scopeScore(plan, desired) {
  const planLevel = SCOPE_LEVELS[plan] || 1;
  const desiredLevel = SCOPE_LEVELS[desired] || 1;
  if (planLevel >= desiredLevel) return 5;
  return desiredLevel - planLevel === 1 ? 3 : 1;
}

export function accommodationScore(plan, desired) {
  if (desired === 'Indiferente' || plan === desired) return 5;
  if (desired === 'Enfermaria' && plan === 'Apartamento') return 5;
  return 1;
}

export function copayScore(plan, preference) {
  if (preference === 'Talvez') return plan === 'Sim' ? 4 : 5;
  if (preference === 'Sim') return plan === 'Sim' ? 5 : 4;
  return plan === 'Não' ? 5 : 1;
}

export function calculateHealthPlan({
  name = 'Alternativa',
  price = 0,
  network = 0,
  scope = '',
  accommodation = '',
  copay = '',
  reimbursement = 0,
  budget = 0,
  desiredScope = '',
  desiredAccommodation = 'Indiferente',
  copayPreference = 'Talvez',
  essentialNetwork = '',
  weights = {}
} = {}) {
  const normalizedWeights = {
    network: numberOrZero(weights.network),
    price: numberOrZero(weights.price),
    scope: numberOrZero(weights.scope),
    accommodation: numberOrZero(weights.accommodation),
    copay: numberOrZero(weights.copay),
    reimbursement: numberOrZero(weights.reimbursement ?? weights.reimb)
  };
  const requiredNetwork = String(essentialNetwork || '').trim().length > 0;
  const scores = {
    network: numberOrZero(network),
    price: priceScore(price, budget),
    scope: scopeScore(scope, desiredScope),
    accommodation: accommodationScore(accommodation, desiredAccommodation),
    copay: copayScore(copay, copayPreference),
    reimbursement: numberOrZero(reimbursement)
  };
  const weightSum = Object.values(normalizedWeights).reduce((sum, value) => sum + value, 0) || 1;
  const weighted = Object.entries(scores).reduce((sum, [key, score]) => sum + score * normalizedWeights[key], 0) / (5 * weightSum) * 100;

  return {
    name,
    price: numberOrZero(price),
    network: numberOrZero(network),
    scope,
    accommodation,
    copay,
    reimbursement: numberOrZero(reimbursement),
    incompatible: requiredNetwork && numberOrZero(network) === 0,
    score: Math.round(weighted),
    scores,
    rulesVersion: HEALTH_MATCH_RULES_VERSION
  };
}

export function compareHealthPlans({ criteria = {}, plans = [] } = {}) {
  const evaluated = plans
    .map(plan => calculateHealthPlan({ ...plan, ...criteria }))
    .filter(plan => plan.price > 0 || (plan.name && !/^Alternativa [ABC]$/.test(plan.name)));
  const ranked = [...evaluated].sort((a, b) => Number(a.incompatible) - Number(b.incompatible) || b.score - a.score);
  const eligible = ranked.filter(plan => !plan.incompatible);
  const recommended = eligible[0] || ranked[0] || null;
  const delta = eligible.length > 1 ? eligible[0].score - eligible[1].score : null;

  return {
    plans: ranked,
    recommended: recommended?.name || null,
    closeDecision: delta !== null && delta < 5,
    delta,
    rulesVersion: HEALTH_MATCH_RULES_VERSION
  };
}

export function simulateAdjustedInstallment(base, months, annualRate) {
  let total = 0;
  let last = numberOrZero(base);
  for (let month = 0; month < numberOrZero(months); month += 1) {
    last = numberOrZero(base) * Math.pow(1 + numberOrZero(annualRate), Math.floor(month / 12));
    total += last;
  }
  return { total, last };
}

export function calculateConsortiumReference({
  credit = 0,
  term = 0,
  adminFee = 0,
  reserveFund = 0,
  otherFee = 0,
  comfort = 0,
  bid = 0,
  bidType = 'own',
  adjustment = 0,
  targetMonths = 0,
  flexibility = 0,
  diagnosticFit = 50
} = {}) {
  const totalFee = numberOrZero(adminFee) + numberOrZero(reserveFund) + numberOrZero(otherFee);
  const nominalTotal = numberOrZero(credit) * (1 + totalFee);
  const initial = numberOrZero(term) ? nominalTotal / numberOrZero(term) : 0;
  const affordability = numberOrZero(comfort) ? initial / numberOrZero(comfort) : null;
  const maxCredit = numberOrZero(comfort) ? numberOrZero(comfort) * numberOrZero(term) / (1 + totalFee) : 0;
  const bidPct = numberOrZero(credit) ? numberOrZero(bid) / numberOrZero(credit) * 100 : 0;
  const netCredit = bidType === 'embedded' ? Math.max(0, numberOrZero(credit) - numberOrZero(bid)) : numberOrZero(credit);
  const stress = simulateAdjustedInstallment(initial, term, adjustment);
  const installment36 = initial * Math.pow(1 + numberOrZero(adjustment), 3);
  let adequacy = numberOrZero(diagnosticFit);
  if (affordability !== null) adequacy += affordability <= 1 ? 10 : affordability <= 1.15 ? 0 : -20;
  if (numberOrZero(targetMonths) && numberOrZero(targetMonths) < 12 && numberOrZero(flexibility) === 0) adequacy -= 20;
  if (numberOrZero(flexibility) >= 1) adequacy += 5;

  return {
    credit: numberOrZero(credit),
    term: numberOrZero(term),
    totalFee,
    nominalTotal,
    initial,
    affordability,
    maxCredit,
    bid: numberOrZero(bid),
    bidPct,
    bidType,
    netCredit,
    adjustment: numberOrZero(adjustment),
    stressTotal: stress.total,
    installment36,
    adequacy: Math.round(clamp(adequacy)),
    rulesVersion: CONSORTIUM_RULES_VERSION
  };
}

