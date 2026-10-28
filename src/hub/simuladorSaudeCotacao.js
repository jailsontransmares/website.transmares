import './simuladorSaudeCotacao.css';
import { chamarApi } from './api.js';
import { SIMULADOR_SAUDE_ROUTE } from './simuladorSaudeRoutes.js';
import { obterBaseHub } from './routeConfig.js';
import { renderHubRecordHeader } from './recordWorkflow.js';
import { formatCoparticipacaoTable, isCoparticipacaoTable, normalizeCoparticipacaoTable } from './simuladorSaudeCoparticipacao.js';
import { normalizeCarenciaTable } from './simuladorSaudeCarencias.js';
import { consultarCnpj } from './services/cnpjService.js';

const BANDS = ['0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+'];
const ACCOMMODATIONS = ['Apartamento', 'Enfermaria', 'Ambulatorial'];
const quote = { id: '', code: '', version: 0, company: '', cnpj: '', city: '', citySource: 'unset', cnpjLookupLoading: false, cnpjLookupError: '', type: 'Empresarial (PJ)', effectiveDate: '', lives: [], plans: [], expandedGroups: new Set(), operatorFilter: '', accommodationFilter: '', copayFilter: '', modal: '', planPicker: { operatorId: '', coparticipacoes: ['true', 'false'], accommodations: [...ACCOMMODATIONS], selectedTableIds: [] }, manualIofPreview: null, manualPlanMode: false, manualPlanEditingId: '', manualPlanOperatorId: '', manualPlanCatalogId: '', inlineLives: [], batchEditingLives: false, removedInlineLifeIds: [], catalogError: '', catalog: { operators: [], plans: [], tables: [], bands: [] }, notice: '', saving: false, loading: false, savedSignature: '', initialized: false, importText: '', importPreview: null };
let context = {};
let quoteToastKey = '';
let cnpjLookupTimer = null;
let cnpjLookupRequestId = 0;
let manualOcrWorkerPromise = null;
let manualOcrBusy = false;

function esc(value = '') { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function normalizeCnpj(value) {
  const chars = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  return `${chars.slice(0, 12)}${chars.slice(12).replace(/\D/g, '').slice(0, 2)}`;
}
function maskCnpj(value) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
function cnpjCaretPosition(masked, charCount) {
  if (!charCount) return 0;
  let count = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (/[A-Z0-9]/.test(masked[index])) count += 1;
    if (count >= charCount) return index + 1;
  }
  return masked.length;
}
function today() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
function dateLabel(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'; }
function money(value) { return Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'; }
function parseManualPrice(value) {
  let normalized = String(value ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  const price = Number(normalized);
  return Number.isFinite(price) ? price : NaN;
}
function manualOcrBandPattern(band) {
  if (band === '59+') return /\b[5S]9(?!\d)(?:\s*(?:\+|anos?\s*(?:ou|e)\s*mais|[o0]u\s+mais|e\s+mais))?/i;
  const [start, end] = band.split('-');
  const fuzzy = digits => digits.split('').map(digit => ({ 0: '[0Oo]', 1: '[1Il|]', 5: '[5S]' })[digit] || digit).join('');
  const startPattern = `0?${fuzzy(start)}`;
  const endPattern = `0?${fuzzy(end)}`;
  const separated = `${startPattern}\\s*(?:anos?\\s*)?(?:-|/|\\\\|\\.|:|~|a(?:te)?|\\s+)\\s*${endPattern}`;
  const compact = `${startPattern}(?:2)?${endPattern}`;
  return new RegExp(`\\b(?:${separated}|${compact})(?!\\d)`, 'i');
}
function normalizeManualOcrNumericText(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[–—−‐‑‒]/g, '-')
    .replace(/[Oo](?=[\d\s\-.,/+])/g, '0')
    .replace(/[Il|](?=[\d\s\-.,/+])/g, '1')
    .replace(/[Ss](?=\s*\$?\s*\d)/g, '5');
}
function parseManualOcrPrice(value) {
  let normalized = String(value || '').replace(/R\s*[$S5]\s*/i, '').replace(/\s/g, '');
  const comma = normalized.lastIndexOf(',');
  const period = normalized.lastIndexOf('.');
  if (comma >= 0 && period >= 0) {
    normalized = comma > period
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (comma >= 0) {
    normalized = /,\d{3}$/.test(normalized) ? normalized.replace(/,/g, '') : normalized.replace(',', '.');
  } else if (period >= 0 && /\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }
  const price = Number(normalized);
  return Number.isFinite(price) ? price : NaN;
}
function manualOcrRows(data) {
  const lines = (data?.blocks || []).flatMap(block => (block.paragraphs || []).flatMap(paragraph => (paragraph.lines || []).map(line => ({
    text: line.text || (line.words || []).map(word => word.text).join(' '),
    x0: line.bbox?.x0 ?? Math.min(...(line.words || []).map(word => word.bbox?.x0 ?? 0)),
    y0: line.bbox?.y0 ?? Math.min(...(line.words || []).map(word => word.bbox?.y0 ?? 0)),
    y1: line.bbox?.y1 ?? Math.max(...(line.words || []).map(word => word.bbox?.y1 ?? 0))
  })))).filter(line => line.text.trim());
  if (!lines.length) return String(data?.text || '').split(/\r?\n/).filter(line => line.trim());
  lines.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows = [];
  lines.forEach(line => {
    const height = Math.max(1, line.y1 - line.y0);
    const center = (line.y0 + line.y1) / 2;
    const row = rows.find(candidate => {
      const overlap = Math.min(candidate.y1, line.y1) - Math.max(candidate.y0, line.y0);
      const centerDistance = Math.abs(candidate.center - center);
      return overlap / Math.min(candidate.height, height) >= 0.4
        || centerDistance <= Math.max(7, Math.min(candidate.height, height) * 1.35);
    });
    if (row) {
      row.parts.push(line);
      row.y0 = Math.min(row.y0, line.y0);
      row.y1 = Math.max(row.y1, line.y1);
      row.center = (row.center * (row.parts.length - 1) + center) / row.parts.length;
      row.height = Math.max(row.height, height);
    } else rows.push({ y0: line.y0, y1: line.y1, center, height, parts: [line] });
  });
  return rows.map(row => [...new Map(row.parts.sort((a, b) => a.x0 - b.x0).map(part => [part.text.trim(), part.text.trim()])).values()].join(' '));
}
function manualOcrPositionedRows(data) {
  const words = (data?.blocks || []).flatMap(block => (block.paragraphs || []).flatMap(paragraph => (paragraph.lines || []).flatMap(line => {
    const lineWords = (line.words || []).filter(word => word.text?.trim() && word.bbox);
    if (lineWords.length) return lineWords.map(word => ({ text: word.text.trim(), ...word.bbox }));
    return line.text?.trim() && line.bbox ? [{ text: line.text.trim(), ...line.bbox }] : [];
  }))).filter(word => Number.isFinite(word.x0) && Number.isFinite(word.x1) && Number.isFinite(word.y0) && Number.isFinite(word.y1));
  if (!words.length) return [];
  words.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows = [];
  words.forEach(word => {
    const height = Math.max(1, word.y1 - word.y0);
    const center = (word.y0 + word.y1) / 2;
    const row = rows.find(candidate => {
      const overlap = Math.min(candidate.y1, word.y1) - Math.max(candidate.y0, word.y0);
      return overlap / Math.min(candidate.height, height) >= 0.35
        || Math.abs(candidate.center - center) <= Math.max(5, Math.min(candidate.height, height) * 0.9);
    });
    if (row) {
      row.words.push(word);
      row.y0 = Math.min(row.y0, word.y0);
      row.y1 = Math.max(row.y1, word.y1);
      row.center = (row.center * (row.words.length - 1) + center) / row.words.length;
      row.height = Math.max(row.height, height);
    } else rows.push({ y0: word.y0, y1: word.y1, center, height, words: [word] });
  });
  return rows.map(row => {
    let offset = 0;
    const tokens = row.words.sort((a, b) => a.x0 - b.x0).map(word => {
      const token = { ...word, start: offset, end: offset + word.text.length };
      offset = token.end + 1;
      return token;
    });
    return { ...row, tokens, text: tokens.map(token => token.text).join(' ') };
  });
}
function manualOcrPositionForSpan(row, start, end) {
  const tokens = row.tokens.filter(token => token.end > start && token.start < end);
  if (!tokens.length) return null;
  return tokens.reduce((sum, token) => sum + (token.x0 + token.x1) / 2, 0) / tokens.length;
}
function parseManualOcrColumnPrices(data) {
  const rows = manualOcrPositionedRows(data).map(row => ({ ...row, normalized: normalizeManualOcrNumericText(row.text) }));
  const header = rows.map(row => ({
    row,
    bands: BANDS.flatMap(band => {
      const match = manualOcrBandPattern(band).exec(row.normalized);
      if (!match) return [];
      const x = manualOcrPositionForSpan(row, match.index, match.index + match[0].length);
      return x === null ? [] : [{ band, x }];
    })
  })).filter(item => item.bands.length >= 2).sort((a, b) => b.bands.length - a.bands.length)[0];
  if (!header) return {};

  const amountsByBand = Object.fromEntries(BANDS.map(band => [band, []]));
  const currencyPattern = /R\s*[$S5]\s*((?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d{1,2})?)/gi;
  const decimalPattern = /(?:\d{1,3}(?:[.\s]\d{3})+|\d+)[,.]\d{1,2}/g;
  const headerBands = [...header.bands].sort((a, b) => a.x - b.x);
  for (const row of rows) {
    if (row.y0 <= header.row.y1) continue;
    const currencyMatches = [...row.normalized.matchAll(currencyPattern)];
    const matches = currencyMatches.length ? currencyMatches : [...row.normalized.matchAll(decimalPattern)];
    for (const match of matches) {
      const start = match.index + (currencyMatches.length ? match[0].lastIndexOf(match[1]) : 0);
      const x = manualOcrPositionForSpan(row, start, start + (currencyMatches.length ? match[1].length : match[0].length));
      if (x === null) continue;
      const closestIndex = headerBands.reduce((best, item, index) => Math.abs(item.x - x) < Math.abs(headerBands[best].x - x) ? index : best, 0);
      const band = headerBands[closestIndex].band;
      const amount = parseManualOcrPrice(currencyMatches.length ? match[1] : match[0]);
      if (Number.isFinite(amount) && amount >= 0) amountsByBand[band].push({ amount, distance: Math.abs(row.center - header.row.y1) });
    }
  }
  return Object.fromEntries(BANDS.flatMap(band => {
    const candidates = amountsByBand[band].sort((a, b) => a.distance - b.distance);
    return candidates.length ? [[band, candidates[0].amount]] : [];
  }));
}
function manualOcrDetectedBands(data) {
  return new Set(manualOcrRows(data).flatMap(row => {
    const line = normalizeManualOcrNumericText(row);
    return BANDS.filter(band => manualOcrBandPattern(band).test(line));
  }));
}
function parseManualOcrPrices(data) {
  const candidates = Object.fromEntries(BANDS.map(band => [band, []]));
  const ocrAmount = '((?:\\d{1,3}(?:[.\\s]\\d{3})+|\\d+)(?:[,.]\\d{1,2})?)';
  const perLifePattern = new RegExp(`(?:R\\s*[$S5]\\s*)?${ocrAmount}\\s*(?:/|por)\\s*v[i1l|]d[a4]`, 'i');
  const currencyPattern = /R\s*[$S5]\s*((?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d{1,2})?)/gi;
  const decimalPattern = /(?:\d{1,3}(?:[.\s]\d{3})+|\d+)[,.]\d{1,2}/g;
  for (const originalLine of manualOcrRows(data)) {
    const line = normalizeManualOcrNumericText(originalLine);
    const rowBands = BANDS.flatMap(band => {
      const pattern = manualOcrBandPattern(band);
      const match = pattern.exec(line);
      return match ? [{ band, match }] : [];
    });
    if (rowBands.length !== 1) continue;
    const [{ band, match: bandMatch }] = rowBands;
    const remaining = `${line.slice(0, bandMatch.index)} ${line.slice(bandMatch.index + bandMatch[0].length)}`;
    const perLifeMatch = perLifePattern.exec(remaining);
    const currencyMatches = [...remaining.matchAll(currencyPattern)];
    const decimalMatches = [...remaining.matchAll(decimalPattern)];
    currencyPattern.lastIndex = 0;
    decimalPattern.lastIndex = 0;
    let rawAmount = perLifeMatch?.[1] || (currencyMatches.length ? currencyMatches.at(-1)?.[1] : decimalMatches.at(-1)?.[0]) || '';
    if (!rawAmount) {
      const integers = [...remaining.matchAll(/\b\d{2,6}\b/g)];
      if (integers.length === 1) rawAmount = integers[0][0];
    }
    let amount = parseManualOcrPrice(rawAmount);
    if (rawAmount && Number.isFinite(amount) && amount >= 0) candidates[band].push(amount);
  }
  const rowPrices = Object.fromEntries(BANDS.flatMap(band => {
    const values = [...new Set(candidates[band])];
    return values.length === 1 ? [[band, values[0]]] : [];
  }));
  return { ...rowPrices, ...parseManualOcrColumnPrices(data) };
}
function setManualOcrStatus(message, isError = false) {
  const status = document.querySelector('[data-manual-ocr-status]');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}
function fillManualOcrPrices(prices) {
  const form = document.querySelector('.saude-manual-plan-modal');
  if (!form) return 0;
  let applied = 0;
  BANDS.forEach((band, index) => {
    if (!Object.hasOwn(prices || {}, band)) return;
    const input = form.querySelector(`[name="price_${index}"]`);
    if (!input) return;
    input.value = prices[band].toFixed(2).replace('.', ',');
    applied += 1;
  });
  if (applied) window.saudeQuoteManualPriceChanged();
  return applied;
}
function renderManualPriceTable(currentPrices, requiredBands) {
  const ageHeading = band => `<th class="${requiredBands.has(band) ? 'is-required' : ''}">${band}</th>`;
  const priceInput = (band, index) => `<input class="saude-manual-price-input" name="price_${index}" type="text" oninput="saudeQuoteManualPriceChanged()" inputmode="decimal" placeholder="0,00" aria-label="Valor original da faixa ${band}${requiredBands.has(band) ? ', necessária conforme as idades informadas' : ''}" value="${Number.isFinite(Number(currentPrices[band])) ? esc(currentPrices[band]) : ''}">`;
  const iofToggle = `<label class="saude-manual-iof-toggle"><input type="checkbox" data-manual-iof-toggle onchange="saudeQuoteToggleManualIOF(this.checked)" ${quote.manualIofPreview ? 'checked' : ''}><span>Valor com IOF</span></label>`;
  const iofValue = band => quote.manualIofPreview && Number.isFinite(quote.manualIofPreview.values[band]) ? money(quote.manualIofPreview.values[band]) : '';
  return `<table class="saude-manual-price-table"><thead><tr><th>Faixa etária</th><th>Valor original</th><th>${iofToggle}</th></tr></thead><tbody>${BANDS.map((band, index) => `<tr class="${requiredBands.has(band) ? 'is-required' : ''}"><th><span>${band}</span></th><td>${priceInput(band, index)}</td><td class="saude-manual-iof-value" data-manual-iof-value="${esc(band)}">${iofValue(band)}</td></tr>`).join('')}</tbody></table>`;
}
async function manualOcrOpenAiImage(canvas) {
  let source = canvas;
  let blob = await new Promise(resolve => source.toBlob(resolve, 'image/jpeg', 0.86));
  for (let attempt = 0; blob && blob.size > 3_800_000 && attempt < 2; attempt += 1) {
    const scale = 0.75;
    const resized = document.createElement('canvas');
    resized.width = Math.max(1, Math.round(source.width * scale));
    resized.height = Math.max(1, Math.round(source.height * scale));
    const context = resized.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, resized.width, resized.height);
    source = resized;
    blob = await new Promise(resolve => source.toBlob(resolve, 'image/jpeg', 0.78));
  }
  if (!blob) throw new Error('Não foi possível preparar a imagem para análise.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return { imageBase64: btoa(binary), mimeType: 'image/jpeg' };
}
async function getManualOcrWorker() {
  if (!manualOcrWorkerPromise) {
    manualOcrWorkerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('por', 1, {
        logger: progress => {
          if (!document.querySelector('.saude-manual-plan-modal')) return;
          const percent = Number.isFinite(progress.progress) ? ` ${Math.round(progress.progress * 100)}%` : '';
          const label = progress.status === 'recognizing text' ? 'Lendo texto da imagem' : 'Preparando reconhecimento';
          setManualOcrStatus(`${label}${percent}…`);
        }
      }))
      .catch(error => {
        manualOcrWorkerPromise = null;
        throw error;
      });
  }
  return manualOcrWorkerPromise;
}
async function createManualOcrVariants(file) {
  const bitmap = await createImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const scale = Math.min(2.2, 2800 / Math.max(sourceWidth, sourceHeight), Math.sqrt(7_500_000 / (sourceWidth * sourceHeight)));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const enhanced = document.createElement('canvas');
  enhanced.width = width;
  enhanced.height = height;
  const context = enhanced.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const pixels = context.getImageData(0, 0, width, height);
  const histogram = new Uint32Array(256);
  const grayValues = new Uint8Array(width * height);
  for (let index = 0, pixel = 0; index < pixels.data.length; index += 4, pixel += 1) {
    const gray = Math.max(0, Math.min(255, Math.round((pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114 - 128) * 1.35 + 128)));
    grayValues[pixel] = gray;
    histogram[gray] += 1;
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = gray;
  }
  context.putImageData(pixels, 0, 0);
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * histogram[value];
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = 0;
  let threshold = 170;
  const total = grayValues.length;
  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value];
    if (!backgroundWeight) continue;
    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += value * histogram[value];
    const meanBackground = backgroundSum / backgroundWeight;
    const meanForeground = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) { bestVariance = variance; threshold = value; }
  }
  const thresholded = document.createElement('canvas');
  thresholded.width = width;
  thresholded.height = height;
  const thresholdContext = thresholded.getContext('2d');
  const binary = thresholdContext.createImageData(width, height);
  for (let pixel = 0; pixel < grayValues.length; pixel += 1) {
    const value = grayValues[pixel] > threshold ? 255 : 0;
    const index = pixel * 4;
    binary.data[index] = binary.data[index + 1] = binary.data[index + 2] = value;
    binary.data[index + 3] = 255;
  }
  thresholdContext.putImageData(binary, 0, 0);
  return [enhanced, thresholded];
}
async function recognizeManualPriceImage(file) {
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
    setManualOcrStatus('Selecione uma imagem PNG, JPEG ou WebP.', true);
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    setManualOcrStatus('A imagem deve ter no máximo 12 MB.', true);
    return;
  }
  if (manualOcrBusy) return;
  manualOcrBusy = true;
  const details = document.querySelector('[data-manual-ocr-details]');
  const transcript = document.querySelector('[data-manual-ocr-text]');
  if (details) details.hidden = true;
  if (transcript) transcript.textContent = '';
  setManualOcrStatus('Ajustando contraste e resolução da imagem…');
  try {
    const variants = await createManualOcrVariants(file);
    const readings = [];
    let aiPrices = {};
    let aiUnavailable = false;
    try {
      setManualOcrStatus('Analisando a tabela com ChatGPT…');
      const image = await manualOcrOpenAiImage(variants[0]);
      const response = await chamarApi('recognizeManualPlanPrices', image);
      if (!response.ok) throw new Error(response.message || 'ChatGPT indisponível.');
      aiPrices = Object.fromEntries(Object.entries(response.data?.prices || {}).filter(([band, price]) => BANDS.includes(band) && Number.isFinite(Number(price)) && Number(price) >= 0));
    } catch {
      aiUnavailable = true;
    }

    try {
      const worker = await getManualOcrWorker();
      for (let imageIndex = 0; imageIndex < variants.length; imageIndex += 1) {
        for (const pageMode of ['6', '11']) {
          setManualOcrStatus(`Tentativa ${imageIndex * 2 + (pageMode === '6' ? 1 : 2)} de 4: ${Object.keys(aiPrices).length ? 'conferindo a leitura' : 'lendo tabela'}…`);
          await worker.setParameters({ tessedit_pageseg_mode: pageMode, preserve_interword_spaces: '1' });
          try {
            const result = await worker.recognize(variants[imageIndex], { rotateAuto: true }, { text: true, blocks: true });
            readings.push(result.data);
          } catch {
            // Uma tentativa com outra segmentação/processamento ainda pode reconhecer a tabela.
          }
        }
      }
    } catch (error) {
      if (!Object.keys(aiPrices).length) throw error;
    }
    if (!readings.length && !Object.keys(aiPrices).length) throw new Error('Nenhuma leitura OCR foi concluída.');
    const possibleValues = Object.fromEntries(BANDS.map(band => [band, new Set()]));
    const detectedBands = new Set();
    readings.forEach(data => {
      const prices = parseManualOcrPrices(data);
      Object.entries(prices).forEach(([band, price]) => possibleValues[band].add(price));
      manualOcrDetectedBands(data).forEach(band => detectedBands.add(band));
    });
    Object.keys(aiPrices).forEach(band => detectedBands.add(band));
    const localPrices = Object.fromEntries(BANDS.flatMap(band => possibleValues[band].size === 1 ? [[band, [...possibleValues[band]][0]]] : []));
    // Quando o OCR local associa um valor de forma consistente à faixa, esse é
    // o valor impresso na tabela. Não deixe a interpretação do modelo (que pode
    // confundir "2 vidas" com uma instrução para dividir) sobrescrevê-lo.
    const recognizedPrices = { ...aiPrices, ...localPrices };
    const bestReading = readings.sort((a, b) => parseManualOcrPrices(b).length - parseManualOcrPrices(a).length)[0];
    if (details && transcript) { transcript.textContent = bestReading?.text || 'Nenhum texto foi reconhecido.'; details.hidden = false; }
    const form = document.querySelector('.saude-manual-plan-modal');
    if (!form) return;
    const appliedCount = fillManualOcrPrices(recognizedPrices);
    const unmatchedBands = [...detectedBands].filter(band => !Object.hasOwn(recognizedPrices, band)).length;
    const recognizedCount = Object.keys(recognizedPrices).length;
    const fallbackNote = aiUnavailable ? ' ChatGPT indisponível; usei o reconhecimento local.' : '';
    setManualOcrStatus(appliedCount
      ? `${appliedCount} valor(es) preenchidos automaticamente.${unmatchedBands ? ` Não associei preço a ${unmatchedBands} faixa(s); confira os campos restantes.` : ''} Confira os valores antes de salvar.${fallbackNote}`
      : detectedBands.size
        ? `Reconheci as faixas, mas não consegui associar os preços. Confira o texto reconhecido ou preencha manualmente.${fallbackNote}`
        : `Não consegui relacionar valores às faixas. Tente uma imagem mais nítida ou preencha os campos manualmente.${fallbackNote}`, !recognizedCount);
  } catch (error) {
    setManualOcrStatus('Não foi possível reconhecer a imagem. Confira sua conexão e tente novamente.', true);
  } finally {
    manualOcrBusy = false;
  }
}
window.saudeQuoteOpenManualImagePicker = () => document.querySelector('.saude-manual-ocr-input')?.click();
window.saudeQuoteManualImageSelected = event => {
  const input = event.currentTarget;
  const file = input?.files?.[0];
  if (file) recognizeManualPriceImage(file);
  if (input) input.value = '';
};
window.saudeQuotePasteManualImage = event => {
  const image = [...(event.clipboardData?.items || [])]
    .find(item => item.kind === 'file' && item.type.startsWith('image/'))
    ?.getAsFile();
  if (!image) return;
  event.preventDefault();
  recognizeManualPriceImage(image);
};
window.saudeQuoteDropManualImage = event => {
  event.preventDefault();
  const image = [...(event.dataTransfer?.files || [])].find(file => file.type.startsWith('image/'));
  if (!image) {
    setManualOcrStatus('Solte um arquivo de imagem para reconhecer os valores.', true);
    return;
  }
  recognizeManualPriceImage(image);
};
function proposalDetail(item, key) {
  const value = item.plan?.detalhes?.[key] ?? item.table?.condicoes?.[key];
  if (key === 'coparticipacao') {
    const tableText = formatCoparticipacaoTable(value);
    if (tableText !== null) return tableText;
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(entry => {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry !== 'object') return String(entry ?? '');
    if (entry.prazo || entry.cobertura) return `${entry.prazo || ''}: ${entry.cobertura || ''}`.trim();
    return [entry.nome || entry.procedimento, entry.descricao || entry.endereco, entry.valor_por_vida != null ? `${money(Number(entry.valor_por_vida))} por vida` : ''].filter(Boolean).join(' · ');
  }).filter(Boolean).join(['coparticipacao', 'carencias'].includes(key) ? '\n' : ' · ');
  if (value && typeof value === 'object') {
    if (value.observacao) return value.observacao;
    return Object.entries(value).filter(([name]) => name !== 'observacao').map(([name, rule]) => {
      if (!rule || typeof rule !== 'object') return `${name}: ${rule}`;
      return `${name}: ${rule.valor != null ? money(Number(rule.valor)) : `${rule.percentual ?? ''}%${rule.limite != null ? `, limite ${money(Number(rule.limite))}` : ''}`}`;
    }).join(['coparticipacao', 'carencias'].includes(key) ? '\n' : ' · ');
  }
  return '';
}
function proposalDetailCellWidth(columnSpan = 1) {
  const planCount = Math.max(quote.plans.filter(item => item.selected).length, 1);
  return Math.max(36, (1047 * 0.76 / planCount) * Math.max(columnSpan, 1) - 10);
}
function coparticipacaoProposalTable(value, columnSpan = 1) {
  if (value == null || value === '') return '';
  const table = normalizeCoparticipacaoTable(value);
  const columns = table.colunas.filter(column => column.label || table.linhas.some(row => String(row.celulas[column.id] || '').trim()));
  const rows = table.linhas.filter(row => columns.some(column => String(row.celulas[column.id] || '').trim()));
  if (!columns.length || !rows.length) return '';
  const procedureIndex = Math.max(0, columns.findIndex(column => column.id === 'procedimento' || /procedimento/i.test(column.label)));
  const procedureWidth = columns.length > 1 ? 58 : 100;
  const otherColumnWidth = columns.length > 1 ? (100 - procedureWidth) / (columns.length - 1) : 0;
  const availableWidth = proposalDetailCellWidth(columnSpan);
  const widths = columns.map((_, index) => index === procedureIndex ? procedureWidth : otherColumnWidth);
  const fitFont = (text, width) => Math.min(6, Math.max(2.8, (availableWidth * width / 100 - 5) / (String(text || '—').length * 0.56)));
  return `<div class="copay-detail-table-wrap"><table class="copay-detail-table copay-procedure-detail-table"><colgroup>${widths.map(width => `<col style="width:${width}%">`).join('')}</colgroup><thead><tr>${columns.map((column, index) => `<th style="font-size:${fitFont(column.label || '—', widths[index]).toFixed(1)}px">${esc(column.label || '—')}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map((column, index) => {
    const cell = row.celulas[column.id] || '';
    return `<td style="font-size:${fitFont(cell, widths[index]).toFixed(1)}px">${esc(cell)}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function carenciaProposalTable(value, columnSpan = 1) {
  if (value == null || value === '') return '';
  const table = normalizeCarenciaTable(value);
  const rows = table.linhas.filter(row => row.celulas.prazo.trim() || row.celulas.regra.trim());
  if (!rows.length) return '';
  const availableWidth = proposalDetailCellWidth(columnSpan);
  const fitFont = (text, width) => Math.min(6, Math.max(2.8, (availableWidth * width / 100 - 5) / (String(text || '—').length * 0.56)));
  return `<div class="copay-detail-table-wrap"><table class="copay-detail-table carencia-detail-table"><colgroup><col class="carencia-procedure-column"><col class="carencia-term-column"></colgroup><thead><tr><th style="font-size:${fitFont('Procedimento', 82).toFixed(1)}px">Procedimento</th><th style="font-size:${fitFont('Prazo', 18).toFixed(1)}px">Prazo</th></tr></thead><tbody>${rows.map(row => {
    const procedure = row.celulas.regra || '—';
    return `<tr><td style="font-size:${fitFont(procedure, 82).toFixed(1)}px">${esc(procedure)}</td><td style="font-size:${fitFont(row.celulas.prazo, 18).toFixed(1)}px">${esc(row.celulas.prazo || '—')}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function carenciasForProposal(item) {
  const catalogPlanId = item.plan?.catalog_plan_id || item.table?.plano_id || item.plan?.id;
  const catalogPlan = quote.catalog.plans.find(plan => plan.id === catalogPlanId);
  const candidates = [catalogPlan?.detalhes?.carencias, item.plan?.detalhes?.carencias, item.table?.condicoes?.carencias];
  const hasRows = value => normalizeCarenciaTable(value).linhas.some(row => row.celulas.regra.trim() || row.celulas.prazo.trim());
  return candidates.find(value => value != null && hasRows(value)) ?? candidates.find(value => value != null) ?? null;
}
function ageOf(birth, reference = quote.effectiveDate || today()) {
  if (!birth) return null;
  const born = new Date(`${birth}T12:00:00`); const at = new Date(`${reference}T12:00:00`);
  if (Number.isNaN(born.getTime()) || born > at) return null;
  let age = at.getFullYear() - born.getFullYear();
  if (at.getMonth() < born.getMonth() || (at.getMonth() === born.getMonth() && at.getDate() < born.getDate())) age -= 1;
  return age;
}
function normalizeManualBirthDate(value) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText); const month = Number(monthText); const year = Number(yearText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return '';
  return `${yearText}-${monthText}-${dayText}`;
}
function formatBirthDateInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
function formatBirthDateTyping(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function parseManualAge(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const age = Number(text);
  return Number.isSafeInteger(age) ? age : null;
}
function lifeDisplayName(life) { return String(life?.nome || '').trim() || (life?.tipo === 'titular' ? 'Titular' : 'Dependente'); }
function inlineLifeDraft(life = {}, groupId = '') {
  const nascimento = life.nascimento || '';
  const idadeNascimento = nascimento ? ageOf(nascimento) : null;
  const idadeSalva = parseManualAge(life.idade);
  return { nome: life.nome || '', nascimento, nascimentoTexto: formatBirthDateInput(nascimento), idade: idadeNascimento ?? idadeSalva ?? '', ageSource: nascimento ? 'nascimento' : idadeSalva !== null ? 'idade' : 'nascimento', grupo_id: life.grupo_id || groupId };
}
function ageBand(age) {
  if (!Number.isInteger(age) || age < 0) return '';
  if (age <= 18) return BANDS[0]; if (age <= 23) return BANDS[1]; if (age <= 28) return BANDS[2]; if (age <= 33) return BANDS[3]; if (age <= 38) return BANDS[4]; if (age <= 43) return BANDS[5]; if (age <= 48) return BANDS[6]; if (age <= 53) return BANDS[7]; if (age <= 58) return BANDS[8]; return BANDS[9];
}
function nextId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function quotePlanEntry(tableId) { return quote.plans.find(item => item.tableId === tableId) || {}; }
function accommodationVariants() {
  return quote.catalog.tables.flatMap(table => {
    const accommodations = [...new Set((Array.isArray(table.acomodacoes) ? table.acomodacoes : []).filter(Boolean))];
    return accommodations.map(acomodacao => ({ ...table, id: `${table.id}::${acomodacao}`, tabela_preco_id: table.id, acomodacao }));
  });
}
function planFor(tableId) { return quotePlanEntry(tableId).table_snapshot || accommodationVariants().find(table => table.id === tableId) || quote.catalog.tables.find(table => table.id === tableId) || {}; }
function planInfo(table) { return quotePlanEntry(table.id).plan_snapshot || quote.catalog.plans.find(plan => plan.id === table.plano_id) || {}; }
function operatorInfo(plan) {
  const entry = quote.plans.find(item => item.plan_snapshot?.id === plan.id);
  const catalogOperator = quote.catalog.operators.find(operator => operator.id === plan.operadora_id) || {};
  const snapshot = entry?.operator_snapshot || {};
  return { ...catalogOperator, ...snapshot, logo_url: snapshot.logo_url || catalogOperator.logo_url, cor_marca: snapshot.cor_marca || catalogOperator.cor_marca };
}
function operatorForEntry(item, plan = planInfo(planFor(item.tableId))) {
  const catalogOperator = quote.catalog.operators.find(operator => operator.id === plan.operadora_id) || {};
  const snapshot = item.operator_snapshot || {};
  return { ...catalogOperator, ...snapshot, logo_url: snapshot.logo_url || catalogOperator.logo_url, cor_marca: snapshot.cor_marca || catalogOperator.cor_marca };
}
function normalizeQuotePlanEntry(entry) {
  const table = { ...(entry.table_snapshot || {}) };
  const plan = { ...(entry.plan_snapshot || {}) };
  if (table.acomodacao == null && plan.acomodacao != null) table.acomodacao = plan.acomodacao;
  if (table.coparticipacao == null && plan.coparticipacao != null) table.coparticipacao = plan.coparticipacao;
  if (!table.codigo_interno && plan.codigo_interno != null) table.codigo_interno = plan.codigo_interno;
  delete plan.acomodacao;
  delete plan.coparticipacao;
  delete plan.codigo_interno;
  return { ...entry, table_snapshot: table, plan_snapshot: plan };
}
function pricesFor(tableId) {
  const saved = quotePlanEntry(tableId).prices_snapshot;
  if (saved) return saved;
  const table = planFor(tableId);
  const parentTableId = table.tabela_preco_id || table.id;
  const rows = quote.catalog.bands.filter(item => item.tabela_preco_id === parentTableId && item.acomodacao === table.acomodacao);
  if (table.tipo_contratacao === 'Individual') {
    return Object.fromEntries(['uma_vida', 'duas_ou_mais'].map(rule => [rule, Object.fromEntries(rows.filter(item => item.regra_vidas === rule).map(item => [item.faixa_etaria, Number(item.valor)]))]));
  }
  return { geral: Object.fromEntries(rows.map(item => [item.faixa_etaria, Number(item.valor)])) };
}
function displayCatalogStatus(table) { return table.status === 'vigente' && (!table.vigencia_fim || table.vigencia_fim >= (quote.effectiveDate || today())) && table.vigencia_inicio <= (quote.effectiveDate || today()); }
function validCatalogTables() { return accommodationVariants().filter(table => table.status === 'vigente' && displayCatalogStatus(table) && quote.catalog.plans.some(plan => plan.id === table.plano_id && plan.status === 'ativo') && (table.tipo_contratacao || 'Empresarial (PJ)') === quote.type); }
function planPickerTables() {
  const picker = quote.planPicker;
  return validCatalogTables().filter(table => {
    if (quote.plans.some(item => item.tableId === table.id)) return false;
    if (!picker.accommodations.includes(table.acomodacao)) return false;
    if (!picker.coparticipacoes.includes(String(Boolean(table.coparticipacao)))) return false;
    return true;
  });
}
function lifeAge(life) { return life.nascimento ? ageOf(life.nascimento) : parseManualAge(life.idade); }
function lifeBand(life) { return ageBand(lifeAge(life)); }
function groupNumber(groupId) { const index = quote.lives.filter(life => life.tipo === 'titular').findIndex(life => life.id === groupId); return String(index + 1).padStart(2, '0'); }
function livesInGroup(groupId) { return quote.lives.filter(life => life.grupo_id === groupId).sort((a, b) => a.tipo === b.tipo ? String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR') : a.tipo === 'titular' ? -1 : 1); }
function groupHead(groupId) { return quote.lives.find(life => life.id === groupId && life.tipo === 'titular'); }
function groupIds() { return quote.lives.filter(life => life.tipo === 'titular').map(life => life.id); }
function planPrice(tableId, life) {
  const band = lifeBand(life); const prices = pricesFor(tableId);
  if (!band) return null;
  if (prices[band] !== '' && Number.isFinite(Number(prices[band]))) return Number(prices[band]); // cotações históricas e tabelas avulsas
  const hasMultiLifeRate = Object.values(prices.duas_ou_mais || {}).some(value => value !== '' && value != null && Number.isFinite(Number(value)));
  const rules = quote.type === 'Individual'
    ? (quote.lives.length >= 2 && hasMultiLifeRate ? prices.duas_ou_mais : prices.uma_vida)
    : prices.geral;
  return rules?.[band] !== '' && Number.isFinite(Number(rules?.[band])) ? Number(rules[band]) : null;
}
function totalsFor(tableId, groupId) { const members = livesInGroup(groupId); const values = members.map(life => planPrice(tableId, life)); return { total: values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) : null, incomplete: members.filter((life, index) => !Number.isFinite(values[index])).map(life => `${lifeDisplayName(life)} (${lifeBand(life) || 'idade inválida'})`) }; }
function planTotal(tableId) { if (!quote.lives.length) return null; const totals = groupIds().map(id => totalsFor(tableId, id)); return totals.every(item => Number.isFinite(item.total)) ? totals.reduce((sum, item) => sum + item.total, 0) : null; }
function selectedPlans() {
  return quote.plans.map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: operatorForEntry(item) }))
    .filter(item => item.table.id)
    .filter(item => !quote.operatorFilter || item.operator.id === quote.operatorFilter)
    .filter(item => !quote.accommodationFilter || item.table.acomodacao === quote.accommodationFilter)
    .filter(item => !quote.copayFilter || String(item.table.coparticipacao) === quote.copayFilter);
}
function quoteOperators() {
  const operators = [...quote.catalog.operators, ...quote.plans.map(item => operatorForEntry(item))];
  const seen = new Set();
  return operators.filter(operator => operator?.id && !seen.has(operator.id) && seen.add(operator.id));
}
function clearQuoteToast() {
  window.hubToast?.dismiss('simulador-saude-quote');
}
function showQuoteToast(message, { isError = false, retry = false } = {}) {
  window.hubToast?.show(message, {
    type: isError ? 'error' : 'success',
    dedupeKey: 'simulador-saude-quote',
    action: retry ? { label: 'Tentar novamente', onClick: () => { quoteToastKey = ''; window.saudeQuoteReloadCatalog(); } } : undefined
  });
  window.setTimeout(() => {
    if (!isError && quote.notice === message) { quote.notice = ''; quoteToastKey = ''; }
  }, 5000);
}
function syncQuoteToast() {
  const isError = Boolean(quote.cnpjLookupError || quote.catalogError);
  const message = quote.cnpjLookupError || (quote.catalogError ? `Catálogo indisponível. ${quote.catalogError}` : quote.notice);
  if (!message) { quoteToastKey = ''; clearQuoteToast(); return; }
  const key = `${isError ? 'error' : 'notice'}:${message}`;
  if (key === quoteToastKey) return;
  quoteToastKey = key;
  showQuoteToast(message, { isError, retry: Boolean(quote.catalogError) && !quote.cnpjLookupError, isCorner: Boolean(quote.cnpjLookupError) });
}
function setCnpjLookupStatus(message = '') {
  const status = document.querySelector('[data-saude-cnpj-lookup-status]');
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  const button = document.querySelector('[data-saude-cnpj-lookup-button]');
  if (button) button.disabled = Boolean(message);
}
function cancelCnpjLookup() {
  cnpjLookupRequestId += 1;
  if (cnpjLookupTimer) window.clearTimeout(cnpjLookupTimer);
  cnpjLookupTimer = null;
  quote.cnpjLookupLoading = false;
  setCnpjLookupStatus();
  return cnpjLookupRequestId;
}
function queueCnpjLookup(cnpj, delay = 450) {
  const requestId = cancelCnpjLookup();
  quote.cnpjLookupError = '';
  syncQuoteToast();
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return;
  cnpjLookupTimer = window.setTimeout(() => {
    cnpjLookupTimer = null;
    lookupCnpj(cnpj, requestId);
  }, delay);
}
async function lookupCnpj(cnpj, requestId) {
  if (requestId !== cnpjLookupRequestId || quote.cnpj !== cnpj) return;
  quote.cnpjLookupLoading = true;
  setCnpjLookupStatus('Consultando CNPJ…');
  try {
    const result = await consultarCnpj(cnpj);
    if (!result.found || !result.data) throw new Error('CNPJ não localizado na consulta.');
    if (requestId !== cnpjLookupRequestId || quote.cnpj !== cnpj) return;
    const municipality = String(result.data.municipio || '').trim();
    const state = String(result.data.uf || '').trim().toUpperCase();
    if (!municipality || !state) throw new Error('Cidade não retornada');
    if (!quote.city.trim() || quote.citySource === 'unset' || quote.citySource === 'cnpj') {
      quote.city = `${municipality} / ${state}`;
      quote.citySource = 'cnpj';
      const cityInput = document.querySelector('[data-saude-quote-city]');
      if (cityInput) cityInput.value = quote.city;
    }
  } catch (error) {
    if (requestId !== cnpjLookupRequestId || quote.cnpj !== cnpj) return;
    const detail = error instanceof Error ? error.message.trim() : '';
    quote.cnpjLookupError = `${detail || 'Não foi possível consultar o CNPJ.'} Preencha Cidade / UF manualmente.`;
    syncQuoteToast();
  } finally {
    if (requestId === cnpjLookupRequestId) {
      quote.cnpjLookupLoading = false;
      setCnpjLookupStatus();
    }
  }
}

function renderHeader() {
  const canSave = quote.id
    ? Boolean(context.pode?.('simulador_saude', 'view'))
    : Boolean(context.pode?.('simulador_saude', 'create'));
  const actions = `<button class="secondary-btn" type="button" onclick="saudeQuoteClear()"><i data-lucide="eraser" aria-hidden="true"></i> Limpar</button><button class="secondary-btn" type="button" onclick="saudeQuoteSave()" ${quote.saving || !canSave ? 'disabled' : ''}><i data-lucide="file-text" aria-hidden="true"></i> ${quote.saving ? 'Salvando…' : 'Salvar'}</button><button class="save-btn" type="button" onclick="saudeQuoteProposal()" ${quote.saving || !canSave ? 'disabled' : ''}><i data-lucide="file-text" aria-hidden="true"></i> Gerar Proposta</button>`;
  return renderHubRecordHeader({
    onBack: 'saudeQuoteBackToList()',
    backAriaLabel: 'Voltar às cotações',
    className: 'saude-quote-header hub-record-header',
    backClassName: 'icon-btn hub-record-back-button',
    contentClassName: 'hub-record-header-content saude-quote-title',
    actionsClassName: 'hub-record-header-actions saude-quote-header-actions',
    content: `<span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><h2>Cotação de Plano de Saúde</h2>${quote.code ? `<p>Cotação #${quote.code} · versão ${quote.version}</p>` : ''}</div>`,
    actions,
    disabled: quote.loading
  });
}

function renderCompany() {
  return `<section class="saude-quote-card"><header><h3><i data-lucide="landmark" aria-hidden="true"></i> Dados do Cliente / Empresa</h3></header><div class="saude-quote-company-grid"><label class="saude-quote-field"><span>Cliente / Razão Social</span><input value="${esc(quote.company)}" oninput="saudeQuoteField('company', this.value)"></label><label class="saude-quote-field saude-quote-cnpj-field"><span>CNPJ (se empresarial)</span><span class="saude-quote-cnpj-control"><input value="${esc(maskCnpj(quote.cnpj))}" inputmode="text" maxlength="18" autocomplete="off" placeholder="00.000.000/0000-00" aria-describedby="saude-quote-cnpj-status" oninput="saudeQuoteCnpjInput(this)"><button class="icon-btn saude-quote-cnpj-lookup" type="button" data-saude-cnpj-lookup-button aria-label="Consultar CNPJ" title="Consultar CNPJ" onclick="saudeQuoteLookupCnpj()"><i data-lucide="search" aria-hidden="true"></i></button></span><small id="saude-quote-cnpj-status" class="saude-quote-cnpj-status" data-saude-cnpj-lookup-status aria-live="polite" hidden></small></label><label class="saude-quote-field"><span>Cidade</span><input data-saude-quote-city value="${esc(quote.city)}" oninput="saudeQuoteField('city', this.value)"></label><label class="saude-quote-field"><span>Tipo de contratação</span><select onchange="saudeQuoteField('type', this.value)"><option value="Individual" ${quote.type === 'Individual' ? 'selected' : ''}>Individual</option><option value="Empresarial (PJ)" ${quote.type === 'Empresarial (PJ)' ? 'selected' : ''}>Empresarial</option></select></label><label class="saude-quote-field"><span>Vigência desejada</span><input data-saude-effective-date type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="DD/MM/AAAA" value="${esc(formatBirthDateInput(quote.effectiveDate))}" oninput="saudeQuoteEffectiveDateInput(this)"></label></div></section>`;
}

function renderImportModal() {
  if (quote.modal !== 'import') return '';
  const preview = quote.importPreview;
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><section class="saude-quote-modal saude-quote-import-modal" role="dialog" aria-modal="true" aria-labelledby="saude-import-title" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Planilha</span><h3 id="saude-import-title">Importar vidas do Excel</h3><p>Cole as células copiadas da planilha. Cabeçalho opcional: Grupo, Tipo, Nome, Nascimento.</p></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header>${preview ? `<div class="saude-import-results ${preview.errors.length ? 'has-errors' : ''}"><strong>${preview.validRows.length} linha(s) válida(s) · ${preview.errors.length} erro(s)</strong>${preview.errors.map(error => `<p>Linha ${error.line}: ${esc(error.message)}</p>`).join('') || '<p>Todos os grupos têm um titular e as datas estão válidas.</p>'}<div class="saude-import-preview">${preview.validRows.slice(0, 8).map(row => `<span>Grupo ${esc(row.grupo)} · ${esc(row.tipo)} · ${esc(row.nome)} · ${dateLabel(row.nascimento)}</span>`).join('')}</div></div>` : `<form onsubmit="saudeQuoteValidateImport(event)"><label class="saude-quote-field"><span>Dados copiados do Excel</span><textarea name="importText" rows="9" placeholder="Grupo&#9;Tipo&#9;Nome&#9;Nascimento">${esc(quote.importText)}</textarea></label><footer><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Cancelar</button><button class="save-btn" type="submit">Validar dados</button></footer></form>`}${preview ? `<footer><button class="secondary-btn" type="button" onclick="saudeQuoteRevisarImport()">Voltar</button><button class="save-btn" type="button" onclick="saudeQuoteCommitImport()" ${!preview.validRows.length || preview.errors.length ? 'disabled' : ''}>Adicionar vidas</button></footer>` : ''}</section></div>`;
}

function normalizeImportToken(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function normalizeImportDate(value) {
  const text = String(value || '').trim();
  let iso = text;
  if (/^\d+(?:\.\d+)?$/.test(text) && Number(text) > 10000) {
    const serial = Math.floor(Number(text)); const date = new Date(Date.UTC(1899, 11, 30 + serial));
    iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); if (!match) return '';
    iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  const [year, month, day] = iso.split('-').map(Number); const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? iso : '';
}
function previewLifeImport(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return { validRows: [], errors: [{ line: 1, message: 'Cole as linhas da planilha.' }] };
  const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
  const cells = line => line.split(delimiter).map(value => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
  const first = cells(lines[0]).map(normalizeImportToken);
  const headered = first.some(value => ['grupo', 'tipo', 'nome', 'nascimento'].includes(value));
  const headers = headered ? first : ['grupo', 'tipo', 'nome', 'nascimento'];
  const ix = key => headers.indexOf(key);
  const rows = []; const errors = [];
  lines.slice(headered ? 1 : 0).forEach((line, index) => {
    const values = cells(line); const get = key => { const position = ix(key); return position >= 0 ? values[position] || '' : ''; };
    const lineNumber = index + (headered ? 2 : 1); const originalGroup = get('grupo'); const group = originalGroup.replace(/^0+(?=\d)/, '') || '0';
    const rawType = normalizeImportToken(get('tipo')); const tipo = rawType === 'titular' ? 'titular' : rawType === 'dependente' ? 'dependente' : '';
    const nome = get('nome'); const nascimento = normalizeImportDate(get('nascimento')); const issues = [];
    if (!originalGroup) issues.push('grupo ausente'); if (!tipo) issues.push('tipo deve ser Titular ou Dependente'); if (!nome) issues.push('nome ausente'); if (!nascimento) issues.push('data de nascimento inválida'); else if (ageOf(nascimento, quote.effectiveDate || today()) === null) issues.push('data futura ou fora do intervalo válido');
    if (issues.length) errors.push({ line: lineNumber, message: issues.join('; ') }); else rows.push({ line: lineNumber, grupo: group, tipo, nome, nascimento });
  });
  const titularGroups = new Map();
  rows.filter(row => row.tipo === 'titular').forEach(row => titularGroups.set(row.grupo, (titularGroups.get(row.grupo) || 0) + 1));
  rows.forEach(row => { const count = titularGroups.get(row.grupo) || 0; if (count !== 1) errors.push({ line: row.line, message: count ? 'o grupo tem mais de um titular' : 'não há titular para este grupo' }); });
  return { validRows: rows, errors };
}

function renderLives() {
  const removedIds = new Set(quote.removedInlineLifeIds);
  const visibleLives = quote.lives.filter(item => !removedIds.has(item.id));
  const pendingAdds = quote.inlineLives.filter(item => item.mode === 'add');
  const groups = groupIds();
  const edits = new Map(quote.inlineLives.filter(item => item.mode === 'edit').map(item => [item.id, item]));
  const rows = groups.flatMap(groupId => livesInGroup(groupId).filter(life => !removedIds.has(life.id)).map(life => {
    const draft = edits.get(life.id);
    if (draft) return inlineLifeRow(draft, groupId);
    return `<tr><td>${String(groupNumber(groupId)).padStart(2, '0')}</td><td><span class="saude-life-badge ${life.tipo}">${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td><strong>${esc(lifeDisplayName(life))}</strong></td><td>${dateLabel(life.nascimento)}</td><td>${lifeAge(life) ?? '—'}</td><td>${lifeBand(life) || '—'}</td><td class="saude-life-remove-cell"></td></tr>`;
  }));
  rows.push(...pendingAdds.map(item => inlineLifeRow(item)));
  const titularOptions = inlineTitularOptions();
  const hasPendingInlineLives = quote.inlineLives.length || quote.removedInlineLifeIds.length;
  const editLivesButton = quote.id && !quote.batchEditingLives
    ? `<button class="icon-btn saude-edit-all-lives" type="button" title="Editar todas as vidas" aria-label="Editar todas as vidas" onclick="saudeQuoteEditAllLives()" ${!quote.lives.length || hasPendingInlineLives ? 'disabled' : ''}><i data-lucide="pencil" aria-hidden="true"></i></button>`
    : '';
  return `<section class="saude-quote-card"><header class="saude-lives-header"><div class="saude-lives-heading"><h3><i data-lucide="users-round" aria-hidden="true"></i> Distribuição de Vidas</h3><div class="saude-quote-count-chips"><span class="is-total">${visibleLives.length + pendingAdds.length} vidas</span></div></div><div class="saude-quote-actions">${hasPendingInlineLives ? '<button class="secondary-btn danger" type="button" onclick="saudeQuoteCancelAllInlineLives()">Cancelar</button><button class="save-btn" type="button" onclick="saudeQuoteSaveAllInlineLives()">Salvar</button>' : ''}${editLivesButton}<button class="save-btn" type="button" onclick="saudeQuoteAddInline(\'titular\')"><i data-lucide="plus" aria-hidden="true"></i> Titular</button><button class="secondary-btn" type="button" onclick="saudeQuoteAddInline(\'dependente\')" ${!titularOptions.length ? 'disabled' : ''}><i data-lucide="plus" aria-hidden="true"></i> Dependente</button><button class="secondary-btn" type="button" onclick="saudeQuoteOpenImport()" ${hasPendingInlineLives ? 'disabled' : ''}><i data-lucide="upload-cloud" aria-hidden="true"></i> Importar Excel</button></div></header><div class="saude-quote-lives-layout"><div class="admin-table-wrap saude-quote-table-wrap"><table class="admin-table saude-quote-lives-table"><colgroup><col class="saude-life-col-group"><col class="saude-life-col-type"><col class="saude-life-col-name"><col class="saude-life-col-birth"><col class="saude-life-col-age"><col class="saude-life-col-band"><col class="saude-life-col-remove"></colgroup><thead><tr><th>Grupo</th><th>Tipo</th><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Faixa Etária</th><th class="saude-life-remove-heading" aria-label="Remover"></th></tr></thead><tbody>${rows.length ? rows.join('') : '<tr><td colspan="7" class="saude-quote-empty">Adicione um titular para iniciar a cotação.</td></tr>'}</tbody></table></div></div></section>`;
}

function inlineTitularOptions() {
  const removedIds = new Set(quote.removedInlineLifeIds);
  return [
    ...quote.lives.filter(life => life.tipo === 'titular' && !removedIds.has(life.id)).map(life => ({ id: life.id, nome: life.nome || 'Titular' })),
    ...quote.inlineLives.filter(item => item.mode === 'add' && item.tipo === 'titular').map(item => ({ id: item.id, nome: item.draft.nome || 'Novo titular' }))
  ];
}

function inlineTitularNumber(id) {
  const savedIndex = quote.lives.filter(life => life.tipo === 'titular').findIndex(life => life.id === id);
  if (savedIndex >= 0) return String(savedIndex + 1).padStart(2, '0');
  const pendingIndex = quote.inlineLives.filter(item => item.mode === 'add' && item.tipo === 'titular').findIndex(item => item.id === id);
  return String(quote.lives.filter(life => life.tipo === 'titular').length + pendingIndex + 1).padStart(2, '0');
}

function inlineLifeRow(item, groupId = '') {
  const { key, id, mode, tipo, draft } = item;
  const selectedGroup = draft.grupo_id || groupId || inlineTitularOptions()[0]?.id || '';
  const draftAge = draft.idade !== '' && draft.idade != null ? draft.idade : ageOf(draft.nascimento);
  const groupCell = tipo === 'titular'
    ? `<td>${mode === 'edit' ? String(groupNumber(id)).padStart(2, '0') : 'Novo grupo'}</td>`
    : `<td><select class="saude-inline-input" data-inline-field="grupo_id" aria-label="Titular do grupo" onchange="saudeQuoteInlineField('${esc(key)}', 'grupo_id', this.value)">${inlineTitularOptions().map(option => `<option value="${esc(option.id)}" ${selectedGroup === option.id ? 'selected' : ''}>${inlineTitularNumber(option.id)} · ${esc(option.nome)}</option>`).join('')}</select></td>`;
  const rowControl = mode === 'edit' && quote.batchEditingLives
    ? `<button class="icon-btn danger saude-inline-remove-life" type="button" title="Remover vida" aria-label="Remover ${esc(draft.nome || 'vida')}" onclick="saudeQuoteRemoveInlineLife('${esc(key)}')"><i data-lucide="trash-2" aria-hidden="true"></i></button>`
    : `<button class="icon-btn danger saude-inline-remove-life" type="button" title="Cancelar inclusão" aria-label="Cancelar inclusão de ${esc(draft.nome || 'vida')}" onclick="saudeQuoteCancelInlineLife('${esc(key)}')"><i data-lucide="x" aria-hidden="true"></i></button>`;
  return `<tr class="saude-inline-life-row" data-inline-life="${esc(key)}">${groupCell}<td><span class="saude-life-badge ${tipo}">${tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td><div class="saude-inline-name-cell"><input class="saude-inline-input" data-inline-field="nome" aria-label="Nome" placeholder="${tipo === 'titular' ? 'Nome do titular' : 'Nome do dependente (opcional)'}" value="${esc(draft.nome || '')}" oninput="saudeQuoteInlineField('${esc(key)}', 'nome', this.value)" ${tipo === 'titular' ? 'required' : ''}></div></td><td><input class="saude-inline-input" data-inline-field="nascimento" aria-label="Nascimento (DD/MM/AAAA)" type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="DD/MM/AAAA" value="${esc(draft.nascimentoTexto ?? formatBirthDateInput(draft.nascimento))}" oninput="saudeQuoteInlineField('${esc(key)}', 'nascimento', this.value)"></td><td><input class="saude-inline-input" data-inline-field="idade" aria-label="Idade" type="number" min="0" step="1" inputmode="numeric" placeholder="Idade" value="${esc(draftAge ?? '')}" oninput="saudeQuoteInlineField('${esc(key)}', 'idade', this.value)"></td><td data-inline-band>${ageBand(draftAge === '' || draftAge == null ? null : Number(draftAge)) || '—'}</td><td class="saude-life-remove-cell">${rowControl}</td></tr>`;
}

function renderPlanPicker() {
  if (!quote.modal || quote.modal !== 'plan') return '';
  const available = planPickerTables();
  if (quote.manualPlanMode) {
    const editing = quote.manualPlanEditingId ? quotePlanEntry(quote.manualPlanEditingId) : null;
    const currentPlan = editing?.plan_snapshot || {};
    const currentTable = editing?.table_snapshot || {};
    const currentPrices = editing?.prices_base_snapshot || editing?.prices_snapshot || {};
    const requiredBands = new Set(quote.lives.map(lifeBand).filter(Boolean));
    const operators = quote.catalog.operators;
    const savedOperatorId = editing?.operator_snapshot?.id || currentPlan.operadora_id || '';
    const selectedOperatorId = operators.some(operator => operator.id === quote.manualPlanOperatorId) ? quote.manualPlanOperatorId : operators.some(operator => operator.id === savedOperatorId) ? savedOperatorId : operators[0]?.id || '';
    const availableManualPlans = quote.catalog.plans.filter(plan => plan.operadora_id === selectedOperatorId);
    const savedPlanId = currentPlan.catalog_plan_id || quote.catalog.plans.find(plan => plan.operadora_id === savedOperatorId && normalizeImportToken(plan.nome) === normalizeImportToken(currentPlan.nome))?.id || '';
    const selectedPlanId = availableManualPlans.some(plan => plan.id === quote.manualPlanCatalogId) ? quote.manualPlanCatalogId : availableManualPlans.some(plan => plan.id === savedPlanId) ? savedPlanId : editing ? '' : availableManualPlans[0]?.id || '';
    const selectedManualPlan = availableManualPlans.find(plan => plan.id === selectedPlanId) || {};
    quote.manualPlanOperatorId = selectedOperatorId;
    quote.manualPlanCatalogId = selectedPlanId;
    const operatorOptions = operators.map(operator => `<option value="${esc(operator.id)}" ${operator.id === selectedOperatorId ? 'selected' : ''}>${esc(operator.nome)}</option>`).join('');
    const planOptions = availableManualPlans.map(plan => `<option value="${esc(plan.id)}" ${plan.id === selectedPlanId ? 'selected' : ''}>${esc(plan.nome)}</option>`).join('');
    const operatorPlaceholder = operators.length ? 'Selecione uma operadora' : 'Nenhuma operadora cadastrada';
    const planPlaceholder = !selectedOperatorId ? 'Selecione uma operadora primeiro' : availableManualPlans.length ? 'Selecione um plano' : 'Nenhum plano cadastrado para esta operadora';
    const manualOcrControl = `<section class="saude-manual-ocr"><input class="saude-manual-ocr-input" type="file" accept="image/*" hidden onchange="saudeQuoteManualImageSelected(event)"><div class="saude-manual-ocr-dropzone" tabindex="0" role="group" aria-label="Área para colar ou soltar a imagem da tabela de preços" onpaste="saudeQuotePasteManualImage(event)" ondragover="event.preventDefault()" ondrop="saudeQuoteDropManualImage(event)"><i data-lucide="scan-text" aria-hidden="true"></i><span><strong>Preencher valores por imagem</strong><small>Selecione, cole (Ctrl+V) ou solte uma imagem da tabela.</small></span><button class="secondary-btn" type="button" onclick="saudeQuoteOpenManualImagePicker()">Selecionar imagem</button></div><p data-manual-ocr-status role="status" aria-live="polite">A imagem será reconhecida no navegador e os valores identificados serão preenchidos automaticamente.</p><details class="saude-manual-ocr-details" data-manual-ocr-details hidden><summary>Conferir texto reconhecido</summary><pre data-manual-ocr-text></pre></details></section>`;
    return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><form class="saude-quote-modal saude-manual-plan-modal" role="dialog" aria-modal="true" aria-labelledby="saude-manual-plan-title" onsubmit="saudeQuoteAddManualPlan(event)" onclick="event.stopPropagation()"><header><div><h3 id="saude-manual-plan-title">${editing ? 'Editar valores manuais' : 'Adicionar plano manualmente'}</h3></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header><div class="saude-manual-plan-fields"><label class="saude-quote-field"><span>Operadora *</span><select name="operatorId" required onchange="saudeQuoteManualOperatorChanged(this.value)" ${operators.length ? '' : 'disabled'}><option value="">${operatorPlaceholder}</option>${operatorOptions}</select></label><label class="saude-quote-field"><span>Nome do plano *</span><select name="planId" required onchange="saudeQuoteManualPlanChanged(this.value)" ${availableManualPlans.length ? '' : 'disabled'}><option value="">${planPlaceholder}</option>${planOptions}</select></label><label class="saude-quote-field"><span>Acomodação</span><select name="accommodation"><option value="" ${!currentTable.acomodacao ? 'selected' : ''}>Não informado</option><option ${currentTable.acomodacao === 'Apartamento' ? 'selected' : ''}>Apartamento</option><option ${currentTable.acomodacao === 'Enfermaria' ? 'selected' : ''}>Enfermaria</option><option ${currentTable.acomodacao === 'Ambulatorial' ? 'selected' : ''}>Ambulatorial</option></select></label><label class="saude-quote-field"><span>Coparticipação</span><select name="coparticipation"><option value="false" ${!currentTable.coparticipacao ? 'selected' : ''}>Não</option><option value="true" ${currentTable.coparticipacao ? 'selected' : ''}>Sim</option></select></label><label class="saude-quote-field"><span>Abrangência (opcional)</span><input name="coverage" maxlength="120" placeholder="Ex.: Nacional" value="${esc(selectedManualPlan.abrangencia || currentPlan.abrangencia || '')}"></label></div><section class="saude-manual-price-section"><header><h4>Preço por faixa etária</h4></header><div class="saude-manual-price-content"><div class="saude-manual-price-table-wrap">${renderManualPriceTable(currentPrices, requiredBands)}</div>${manualOcrControl}</div></section><footer><button class="secondary-btn" type="button" onclick="saudeQuoteManualPlanBack()">Voltar</button><button class="secondary-btn" type="button" onclick="saudeQuoteDuplicateManualPlan(this)" ${selectedPlanId ? '' : 'disabled'}><i data-lucide="copy" aria-hidden="true"></i> Duplicar plano</button><button class="save-btn" type="button" onclick="window.saudeQuoteAddManualPlan(this)" ${selectedPlanId ? '' : 'disabled'}>${editing ? 'Salvar alterações' : 'Adicionar à cotação'}</button></footer></form></div>`;
  }
  const picker = quote.planPicker;
  const operators = [...new Map(available.map(table => {
    const operator = operatorInfo(planInfo(table));
    return [operator.id, operator];
  }).filter(([id]) => id)).values()];
  const selectedOperator = operators.some(operator => operator.id === picker.operatorId) ? picker.operatorId : '';
  const operatorTables = selectedOperator ? available.filter(table => operatorInfo(planInfo(table)).id === selectedOperator) : [];
  const visibleTables = operatorTables.filter(table => picker.selectedTableIds.includes(table.id));
  const tableRows = operatorTables.map(table => {
    const plan = planInfo(table);
    return `<label class="saude-plan-option"><input type="checkbox" name="tableIds" value="${esc(table.id)}" ${picker.selectedTableIds.includes(table.id) ? 'checked' : ''} onchange="saudeQuotePlanPickerTable(this.value, this.checked)"><span><strong>${esc(plan.nome || 'Plano sem nome')}</strong><small>${esc(table.acomodacao || 'Acomodação não informada')} · ${table.coparticipacao ? 'Com coparticipação' : 'Sem coparticipação'} · Vigência ${dateLabel(table.vigencia_inicio)}</small></span></label>`;
  }).join('');
  const emptyMessage = !picker.coparticipacoes.length || !picker.accommodations.length
    ? 'Selecione ao menos uma opção de coparticipação e uma acomodação para ver as tabelas.'
    : !available.length
      ? `Não há tabelas vigentes para ${esc(quote.type)} com esses filtros. Confira a vigência ou o catálogo.`
      : !selectedOperator
        ? 'Selecione uma operadora para consultar os planos disponíveis.'
        : tableRows ? '' : 'Não há planos disponíveis para esta operadora com os filtros escolhidos.';
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><div class="saude-quote-modal saude-plan-catalog-modal" role="dialog" aria-modal="true" aria-labelledby="saude-plan-modal-title" onclick="event.stopPropagation()"><header><div><h3 id="saude-plan-modal-title">Adicionar planos</h3><p>Filtre as tabelas e escolha os planos para adicionar à cotação.</p></div><div class="saude-plan-header-actions"><button class="save-btn" type="button" onclick="saudeQuoteShowManualPlan()">Adicionar plano manual</button><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></div></header><form class="saude-plan-catalog-form" onsubmit="saudeQuoteAddPlan(event)"><div class="saude-plan-picker-filters"><fieldset class="saude-plan-accommodation-filter"><legend>Coparticipação</legend><div>${[['true', 'Sim'], ['false', 'Não']].map(([value, label]) => `<label><input type="checkbox" data-plan-picker-copay="${value}" value="${value}" ${picker.coparticipacoes.includes(value) ? 'checked' : ''} onchange="saudeQuotePlanPickerCopay(this.value, this.checked)"><span>${label}</span></label>`).join('')}</div></fieldset><fieldset class="saude-plan-accommodation-filter"><legend>Acomodação</legend><div>${ACCOMMODATIONS.map(value => `<label><input type="checkbox" data-plan-picker-accommodation="${esc(value)}" value="${esc(value)}" ${picker.accommodations.includes(value) ? 'checked' : ''} onchange="saudeQuotePlanPickerAccommodation(this.value, this.checked)"><span>${esc(value)}</span></label>`).join('')}</div></fieldset></div><label class="saude-quote-field saude-plan-operator-field"><span>Operadora</span><select name="operatorId" data-plan-picker-operator onchange="saudeQuotePlanPickerOperator(this.value)"><option value="">Selecione uma operadora</option>${operators.map(operator => `<option value="${esc(operator.id)}" ${selectedOperator === operator.id ? 'selected' : ''}>${esc(operator.nome)}</option>`).join('')}</select></label><section class="saude-plan-options-section"><h4>Planos disponíveis</h4>${tableRows ? `<div class="saude-plan-options">${tableRows}</div>` : `<p class="saude-quote-empty">${emptyMessage}</p>`}</section><footer><span class="saude-plan-selection-count">${visibleTables.length} tabela(s) selecionada(s)</span><button class="save-btn" type="submit" ${!visibleTables.length ? 'disabled' : ''}>Adicionar selecionados</button></footer></form></div></div>`;
}

function operatorVisualClass(name = '') {
  const token = normalizeImportToken(name);
  if (token.includes('sulamerica')) return 'sulamerica';
  if (token.includes('bradesco')) return 'bradesco';
  if (token.includes('hapvida')) return 'hapvida';
  if (token.includes('unimed')) return 'unimed';
  return 'default';
}
function proposalOperatorVisualClass(name = '') {
  const visualClass = operatorVisualClass(name);
  return visualClass === 'sulamerica' ? 'default' : visualClass;
}

function operatorMonogram(name = '') {
  const brand = operatorVisualClass(name);
  return ({ sulamerica: 'S', bradesco: 'B', hapvida: 'H', unimed: 'U', default: String(name).trim().slice(0, 1).toUpperCase() || 'O' })[brand];
}

function renderResult() {
  const plans = selectedPlans(); const allPlans = quote.plans.map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: operatorForEntry(item) }));
  const options = items => items.map(item => `<option value="${esc(item.value)}" ${item.value === item.current ? 'selected' : ''}>${esc(item.label)}</option>`).join('');
  const header = `<div class="saude-quote-result-tools"><div class="saude-result-title"><h3><i data-lucide="file-text" aria-hidden="true"></i> Resultado da Cotação</h3></div><div class="saude-quote-filters"><label><span>Operadoras</span><select onchange="saudeQuoteFilter('operatorFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.operatorFilter }, ...quoteOperators().map(item => ({ value: item.id, label: item.nome, current: quote.operatorFilter }))])}</select></label><label><span>Acomodação</span><select onchange="saudeQuoteFilter('accommodationFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.accommodationFilter }, ...['Apartamento', 'Enfermaria', 'Ambulatorial'].map(value => ({ value, label: value, current: quote.accommodationFilter }))])}</select></label><label><span>Coparticipação</span><select onchange="saudeQuoteFilter('copayFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.copayFilter }, { value: 'true', label: 'Sim', current: quote.copayFilter }, { value: 'false', label: 'Não', current: quote.copayFilter }])}</select></label><button class="save-btn" type="button" onclick="saudeQuoteOpenModal('plan')"><i data-lucide="plus" aria-hidden="true"></i> Plano</button></div></div>`;
  if (!allPlans.length) return `<section class="saude-quote-card">${header}<div class="saude-quote-empty">Adicione planos do catálogo vigente para comparar valores.</div></section>`;
  const columns = plans.map(item => {
    const brand = operatorVisualClass(item.operator.nome);
    const manualEditButton = item.table.origem === 'manual' ? `<button class="icon-btn saude-plan-edit" type="button" title="Editar valores" aria-label="Editar valores de ${esc(item.plan.nome || item.operator.nome || 'plano')}" onclick="saudeQuoteEditManualPlan('${esc(item.tableId)}')"><i data-lucide="pencil" aria-hidden="true"></i></button>` : '';
    return `<th class="saude-plan-heading"><div class="saude-plan-brand is-${brand}"><strong>${esc(item.operator.nome || 'Operadora')}</strong><div class="saude-plan-column-controls">${manualEditButton}<button class="icon-btn danger saude-plan-remove" type="button" title="Remover plano" aria-label="Remover plano ${esc(item.plan.nome || item.operator.nome || '')}" onclick="saudeQuoteRemovePlan('${esc(item.tableId)}')"><i data-lucide="x" aria-hidden="true"></i></button><label class="saude-plan-select" title="Incluir ou retirar este plano da cotação"><input type="checkbox" aria-label="Incluir ou retirar este plano da cotação" ${item.selected ? 'checked' : ''} onchange="saudeQuoteTogglePlan('${esc(item.tableId)}', this.checked)"></label></div></div><div class="saude-plan-total saude-price-${brand}">${planTotal(item.tableId) === null ? '<b class="is-incomplete">Cotação incompleta</b>' : `<b>${money(planTotal(item.tableId))}</b>`}</div></th>`;
  }).join('');
  const groups = groupIds();
  const titulares = quote.lives.filter(item => item.tipo === 'titular').length;
  const dependents = quote.lives.filter(item => item.tipo === 'dependente').length;
  const summaryRows = [
    ['Acomodação', item => item.table.acomodacao || 'Não informada'],
    ['Coparticipação', item => item.table.coparticipacao === true || item.table.coparticipacao === 'true' ? 'Sim' : 'Não'],
    ['Abrangência', item => item.plan.abrangencia || 'Não informada']
  ].map(([label, getValue]) => `<tr class="saude-quote-summary-row"><th scope="row">${esc(label)}</th>${plans.map(item => `<td class="saude-price-${operatorVisualClass(item.operator.nome)}">${esc(getValue(item))}</td>`).join('')}</tr>`).join('');
  const body = summaryRows + groups.map(groupId => {
    const members = livesInGroup(groupId); const expanded = quote.expandedGroups.has(groupId); const title = groupHead(groupId)?.nome || 'Titular';
    const values = plans.map(() => '<td></td>').join('');
    const detail = expanded ? `<tr class="saude-group-detail"><td colspan="${1 + plans.length}"><div class="saude-group-people"><table><colgroup><col style="width:65px"><col style="width:115px"><col style="width:55px">${plans.map(() => '<col>').join('')}</colgroup><thead><tr><th>Tipo</th><th>Nome</th><th>Idade</th>${plans.map(item => `<th>${esc(item.plan.nome || item.operator.nome)}</th>`).join('')}</tr></thead><tbody>${members.map(life => `<tr><td>${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</td><td>${esc(lifeDisplayName(life))}</td><td>${lifeAge(life) ?? '—'}</td>${plans.map(item => { const price = planPrice(item.tableId, life); return `<td class="saude-price-${operatorVisualClass(item.operator.nome)} ${price === null ? 'is-incomplete' : ''}">${price === null ? 'Preço indisponível' : money(price)}</td>`; }).join('')}</tr>`).join('')}<tr class="saude-group-total"><td colspan="3">Total do Grupo ${String(groupNumber(groupId)).padStart(2, '0')}</td>${plans.map(item => { const total = totalsFor(item.tableId, groupId).total; return `<td class="saude-price-${operatorVisualClass(item.operator.nome)}">${total === null ? 'Cotação incompleta' : money(total)}</td>`; }).join('')}</tr></tbody></table></div></td></tr>` : '';
    return `<tr class="saude-group-row"><td><button type="button" aria-expanded="${expanded}" onclick="saudeQuoteToggleGroup('${esc(groupId)}')">${expanded ? '▾' : '▸'} Grupo ${String(groupNumber(groupId)).padStart(2, '0')} · ${esc(title)}</button></td>${values}</tr>${detail}`;
  }).join('');
  return `<section class="saude-quote-card saude-quote-result-card">${header}<div class="admin-table-wrap saude-quote-table-wrap"><table class="admin-table saude-quote-results"><thead><tr><th class="saude-result-stub"><div class="saude-result-stub-content"><strong>Plano / Operadora</strong><small>${quote.lives.length} vidas · ${titulares} titulares · ${dependents} dependentes</small></div></th>${columns || `<th>Nenhum plano corresponde aos filtros.</th>`}</tr></thead><tbody>${body || `<tr><td colspan="${1 + plans.length}" class="saude-quote-empty">Adicione titulares para calcular a cotação.</td></tr>`}</tbody></table></div></section>`;
}

function renderPage() {
  if (!context.pode?.('simulador_saude', 'view')) return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar Simulador - Saúde.</p></section>' });
  if (quote.loading) return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Abrindo cotação salva.', classeConteudo: 'simulador-saude-page saude-quote-page', conteudo: '<section class="admin-panel"><section class="saude-quote-card"><div class="saude-quote-empty" role="status">Carregando cotação salva…</div></section></section>' });
  const content = `${renderHeader()}${renderCompany()}${renderLives()}${renderResult()}`;
  const overlays = `${renderPlanPicker()}${renderImportModal()}`;
  return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Monte e compare cotações de planos de saúde.', classeConteudo: 'simulador-saude-page saude-quote-page', conteudo: `<section class="admin-panel">${content}</section>${overlays}` });
}
function rerender() { const root = document.getElementById('app'); if (root) root.innerHTML = renderPage(); syncQuoteToast(); }
async function loadCatalog() { try { const response = await chamarApi('getSimuladorSaudeCatalog'); if (!response.ok) throw new Error(response.message); quote.catalog = response.data; quote.catalogError = ''; } catch (error) { quote.catalogError = error.message || 'Não foi possível carregar o catálogo de planos.'; } rerender(); }

function serializeSnapshot() {
  return {
    version: 1,
    cliente: { nome: quote.company, cnpj: quote.cnpj, cidade: quote.city, tipo_contratacao: quote.type, vigencia: quote.effectiveDate },
    vidas: quote.lives.map(life => ({ ...life })),
    planos: quote.plans.map(item => {
      const table = planFor(item.tableId); const plan = planInfo(table); const operator = operatorForEntry(item, plan);
      return { tableId: item.tableId, selected: Boolean(item.selected), table_snapshot: { ...table }, plan_snapshot: { ...plan }, operator_snapshot: { ...operator }, prices_snapshot: { ...pricesFor(item.tableId) }, ...(item.iof_applied ? { prices_base_snapshot: { ...(item.prices_base_snapshot || {}) }, iof_applied: true, iof_percent: item.iof_percent || 2.38 } : {}) };
    })
  };
}

function draftSignature() { return JSON.stringify(serializeSnapshot()); }

function resetQuoteDraft() {
  cancelCnpjLookup();
  quote.id = ''; quote.code = ''; quote.version = 0; quote.company = ''; quote.cnpj = ''; quote.city = ''; quote.citySource = 'unset'; quote.cnpjLookupError = ''; quote.type = 'Empresarial (PJ)'; quote.effectiveDate = ''; quote.lives = []; quote.plans = []; quote.expandedGroups = new Set(); quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = ''; quote.modal = ''; quote.manualIofPreview = null; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.inlineLives = []; quote.batchEditingLives = false; quote.removedInlineLifeIds = []; quote.notice = ''; quoteToastKey = ''; clearQuoteToast(); quote.importText = ''; quote.importPreview = null; quote.saving = false; quote.loading = false; quote.initialized = true;
  quote.savedSignature = draftSignature();
}

function applySavedQuote(record) {
  if (!record) return;
  const snapshot = record.snapshot || {}; const client = snapshot.cliente || {};
  quote.id = record.id; quote.code = record.codigo || ''; quote.version = record.snapshot_version || 1; quote.company = client.nome ?? record.cliente_nome ?? ''; quote.cnpj = normalizeCnpj(client.cnpj ?? record.cliente_cnpj ?? ''); quote.city = client.cidade ?? record.cliente_cidade ?? ''; quote.citySource = quote.city ? 'saved' : 'unset'; quote.cnpjLookupError = ''; quote.type = (client.tipo_contratacao ?? record.tipo_contratacao) === 'Familiar' ? 'Individual' : (client.tipo_contratacao ?? record.tipo_contratacao ?? 'Empresarial (PJ)'); quote.effectiveDate = client.vigencia ?? record.vigencia ?? '';
  quote.lives = Array.isArray(snapshot.vidas) ? snapshot.vidas.map(life => ({ ...life })) : [];
  quote.plans = Array.isArray(snapshot.planos) ? snapshot.planos.map(normalizeQuotePlanEntry) : [];
  quote.expandedGroups = new Set(); quote.modal = ''; quote.manualIofPreview = null; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.inlineLives = []; quote.batchEditingLives = false; quote.removedInlineLifeIds = []; quote.initialized = true; quote.savedSignature = draftSignature();
}

async function loadQuoteById(id) {
  const response = await chamarApi('getSimuladorSaudeQuoteById', { id });
  if (!response.ok) throw new Error(response.message || 'Não foi possível carregar a cotação.');
  if (!response.data) throw new Error('Cotação não encontrada ou sem acesso.');
  applySavedQuote(response.data);
  return response.data;
}

export async function mountSimuladorSaudeQuotePage(nextContext = {}) {
  context = { ...nextContext };
  resetQuoteDraft();
  const params = new URLSearchParams(window.location.search);
  const quoteId = params.get('quoteId');
  const duplicateQuoteId = params.get('duplicateQuoteId');
  const sourceQuoteId = quoteId || duplicateQuoteId;
  quote.loading = Boolean(sourceQuoteId);
  rerender();
  if (sourceQuoteId) {
    try {
      await loadQuoteById(sourceQuoteId);
      if (duplicateQuoteId && !quoteId) {
        const originalCode = quote.code;
        quote.id = ''; quote.code = ''; quote.version = 0;
        quote.notice = `Cópia da cotação #${originalCode || 'original'} pronta. Salve para criar uma nova cotação.`;
        quote.savedSignature = draftSignature();
      }
    }
    catch (error) { quote.notice = error.message || 'Não foi possível carregar a cotação.'; }
    finally { quote.loading = false; rerender(); }
  }
  await loadCatalog();
}

window.saudeQuoteBackToList = () => {
  if (draftSignature() !== quote.savedSignature && !window.confirm('Há alterações não salvas nesta cotação. Sair e descartá-las?')) return;
  context.navegarParaRota?.(`${obterBaseHub(window.location.pathname)}/${SIMULADOR_SAUDE_ROUTE}`);
};

window.saudeQuoteCnpjInput = input => {
  const raw = input.value;
  const cursor = input.selectionStart ?? raw.length;
  const charCount = normalizeCnpj(raw.slice(0, cursor)).length;
  const cnpj = normalizeCnpj(raw);
  input.value = maskCnpj(cnpj);
  const nextCursor = cnpjCaretPosition(input.value, Math.min(charCount, cnpj.length));
  input.setSelectionRange(nextCursor, nextCursor);
  if (cnpj === quote.cnpj) return;
  quote.cnpj = cnpj;
  if (quote.citySource === 'cnpj' || quote.citySource === 'saved') {
    quote.city = '';
    quote.citySource = 'unset';
    const cityInput = document.querySelector('[data-saude-quote-city]');
    if (cityInput) cityInput.value = '';
  }
  queueCnpjLookup(cnpj);
};

window.saudeQuoteLookupCnpj = () => {
  const cnpj = normalizeCnpj(quote.cnpj);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) {
    quote.cnpjLookupError = 'Digite os 14 caracteres do CNPJ antes de consultar.';
    syncQuoteToast();
    return;
  }
  quote.cnpj = cnpj;
  queueCnpjLookup(cnpj, 0);
};

window.saudeQuoteEffectiveDateInput = input => {
  const dateText = formatBirthDateTyping(input.value);
  input.value = dateText;
  const effectiveDate = normalizeManualBirthDate(dateText);
  quote.effectiveDate = effectiveDate;
  if (!effectiveDate) {
    quote.inlineLives.forEach(item => {
      if (item.draft.ageSource === 'nascimento') item.draft.idade = ageOf(item.draft.nascimento) ?? '';
    });
    return;
  }
  const cursor = input.selectionStart ?? dateText.length;
  window.saudeQuoteField('effectiveDate', effectiveDate);
  const updatedInput = document.querySelector('[data-saude-effective-date]');
  if (updatedInput) {
    updatedInput.focus();
    updatedInput.setSelectionRange(Math.min(cursor, dateText.length), Math.min(cursor, dateText.length));
  }
};

window.saudeQuoteField = (key, value) => {
  if (key === 'type' && value !== quote.type) { quote.plans = quote.plans.filter(item => item.table_snapshot?.origem === 'manual' || (planFor(item.tableId).tipo_contratacao || 'Empresarial (PJ)') === value); quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = ''; }
  if (key === 'city') quote.citySource = 'manual';
  quote[key] = value;
  if (key === 'effectiveDate') quote.inlineLives.forEach(item => {
    if (item.draft.ageSource === 'nascimento') item.draft.idade = ageOf(item.draft.nascimento) ?? '';
  });
  if (key === 'effectiveDate' || key === 'type') rerender();
};
window.saudeQuoteOpenModal = mode => { quote.modal = mode; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.manualIofPreview = null; if (mode === 'plan') quote.planPicker = { operatorId: '', coparticipacoes: ['true', 'false'], accommodations: [...ACCOMMODATIONS], selectedTableIds: [] }; rerender(); };
window.saudeQuoteCloseModal = () => { quote.modal = ''; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.manualIofPreview = null; rerender(); };
window.saudeQuoteOpenImport = () => { if (quote.inlineLives.length || quote.removedInlineLifeIds.length) { showQuoteToast('Salve ou cancele as linhas em edição antes de importar vidas.', { isError: true }); return; } quote.modal = 'import'; quote.importPreview = null; quote.importText = ''; rerender(); };
window.saudeQuoteValidateImport = event => { event.preventDefault(); quote.importText = new FormData(event.currentTarget).get('importText') || ''; quote.importPreview = previewLifeImport(quote.importText); rerender(); };
window.saudeQuoteRevisarImport = () => { quote.importPreview = null; rerender(); };
window.saudeQuoteCommitImport = () => { const preview = quote.importPreview; if (!preview?.validRows.length || preview.errors.length) return; const groupMap = new Map(); preview.validRows.filter(row => row.tipo === 'titular').forEach(row => groupMap.set(row.grupo, nextId())); const imported = preview.validRows.map(row => { const groupId = groupMap.get(row.grupo); return { id: nextId(), grupo_id: groupId, tipo: row.tipo, nome: row.nome.trim(), nascimento: row.nascimento, cpf: '' }; }); quote.lives.push(...imported); quote.modal = ''; quote.importPreview = null; quote.importText = ''; quote.notice = `${imported.length} vida(s) importada(s).`; rerender(); };
window.saudeQuoteAddInline = tipo => {
  const titulares = inlineTitularOptions();
  if (tipo === 'dependente' && !titulares.length) { showQuoteToast('Adicione um titular antes de incluir dependentes.', { isError: true }); return; }
  const id = nextId();
  quote.inlineLives.push({ key: nextId(), id, mode: 'add', tipo, draft: inlineLifeDraft({ grupo_id: tipo === 'titular' ? id : titulares[0].id }) });
  quote.notice = ''; rerender();
};
window.saudeQuoteEditLife = id => {
  if (!quote.id) return;
  if (quote.inlineLives.some(item => item.mode === 'edit' && item.id === id)) return;
  const life = quote.lives.find(item => item.id === id);
  if (!life) return;
  quote.inlineLives.push({ key: nextId(), id, mode: 'edit', tipo: life.tipo, draft: inlineLifeDraft(life) });
  quote.notice = ''; rerender();
};
window.saudeQuoteEditAllLives = () => {
  if (!quote.id || quote.inlineLives.length || quote.removedInlineLifeIds.length || !quote.lives.length) return;
  quote.inlineLives = quote.lives.map(life => ({ key: nextId(), id: life.id, mode: 'edit', tipo: life.tipo, draft: inlineLifeDraft(life) }));
  quote.batchEditingLives = true;
  quote.notice = '';
  rerender();
};
window.saudeQuoteInlineField = (key, field, value) => {
  const pending = quote.inlineLives.find(item => item.key === key);
  if (!pending) return;
  const row = [...document.querySelectorAll('.saude-inline-life-row')].find(item => item.dataset.inlineLife === key);
  if (field === 'nascimento') {
    const nascimentoTexto = formatBirthDateTyping(value);
    if (row) row.querySelector('[data-inline-field="nascimento"]').value = nascimentoTexto;
    const nascimento = normalizeManualBirthDate(nascimentoTexto);
    const idade = nascimento ? ageOf(nascimento) : '';
    pending.draft = { ...pending.draft, nascimento, nascimentoTexto, idade: idade ?? '', ageSource: 'nascimento' };
    if (row) {
      row.querySelector('[data-inline-field="idade"]').value = idade ?? '';
      row.querySelector('[data-inline-band]').textContent = ageBand(idade) || '—';
    }
    return;
  }
  if (field === 'idade') {
    const idade = String(value ?? '').trim();
    const idadeValida = parseManualAge(idade);
    pending.draft = { ...pending.draft, idade, nascimento: '', nascimentoTexto: '', ageSource: 'idade' };
    if (row) {
      row.querySelector('[data-inline-field="nascimento"]').value = '';
      row.querySelector('[data-inline-band]').textContent = ageBand(idadeValida) || '—';
    }
    return;
  }
  pending.draft = { ...pending.draft, [field]: value };
};
window.saudeQuoteCancelInlineLife = key => {
  const pending = quote.inlineLives.find(item => item.key === key);
  if (!pending) return;
  if (pending.mode === 'add' && pending.tipo === 'titular' && quote.inlineLives.some(item => item.tipo === 'dependente' && item.draft.grupo_id === pending.id)) {
    showQuoteToast('Reatribua ou cancele os dependentes deste novo titular antes de cancelar a linha.', { isError: true }); return;
  }
  quote.inlineLives = quote.inlineLives.filter(item => item.key !== key);
  quote.notice = ''; rerender();
};
window.saudeQuoteRemoveInlineLife = key => {
  const pending = quote.inlineLives.find(item => item.key === key && item.mode === 'edit');
  const life = pending && quote.lives.find(item => item.id === pending.id);
  if (!pending || !life) return;
  const removedIds = new Set([...quote.removedInlineLifeIds, life.id]);
  if (life.tipo === 'titular') {
    const remainingDependents = quote.inlineLives.some(item => item.mode === 'add' && item.tipo === 'dependente' && item.draft.grupo_id === life.id)
      || quote.lives.filter(item => item.tipo === 'dependente' && !removedIds.has(item.id)).some(dependent => {
      const dependentDraft = quote.inlineLives.find(item => item.mode === 'edit' && item.id === dependent.id);
      return (dependentDraft?.draft.grupo_id || dependent.grupo_id) === life.id;
    });
    if (remainingDependents) {
      showQuoteToast('Reatribua ou remova os dependentes deste titular antes de removê-lo.', { isError: true });
      return;
    }
  }
  if (!window.confirm(`Remover ${life.tipo === 'titular' ? 'titular' : 'dependente'} ${pending.draft.nome || life.nome || lifeDisplayName(life)}?`)) return;
  quote.inlineLives = quote.inlineLives.filter(item => item.key !== key);
  quote.removedInlineLifeIds = [...removedIds];
  quote.notice = '';
  rerender();
};
window.saudeQuoteSaveAllInlineLives = () => {
  if (!quote.inlineLives.length && !quote.removedInlineLifeIds.length) return;
  const removedIds = new Set(quote.removedInlineLifeIds);
  const pendingValues = [];
  for (const pending of quote.inlineLives) {
    const row = [...document.querySelectorAll('.saude-inline-life-row')].find(item => item.dataset.inlineLife === pending.key);
    const nome = String(row?.querySelector('[data-inline-field="nome"]')?.value ?? pending.draft.nome).trim();
    const nascimentoTexto = String(row?.querySelector('[data-inline-field="nascimento"]')?.value ?? pending.draft.nascimentoTexto ?? formatBirthDateInput(pending.draft.nascimento));
    const idadeTexto = String(row?.querySelector('[data-inline-field="idade"]')?.value ?? pending.draft.idade ?? '').trim();
    const grupo_id = pending.tipo === 'titular' ? pending.id : String(row?.querySelector('[data-inline-field="grupo_id"]')?.value ?? pending.draft.grupo_id);
    if (pending.tipo === 'titular' && !nome) { showQuoteToast('Informe o nome de todos os titulares antes de salvar.', { isError: true }); row?.querySelector('[data-inline-field="nome"]')?.focus(); return; }
    let nascimento = '';
    let idade = null;
    const idadeInformada = parseManualAge(idadeTexto);
    if (pending.draft.ageSource === 'idade') {
      idade = idadeInformada;
    } else {
      nascimento = normalizeManualBirthDate(nascimentoTexto);
      idade = nascimento ? ageOf(nascimento) : null;
    }
    if (idade === null) {
      showQuoteToast('Informe uma data de nascimento válida (DD/MM/AAAA) ou uma idade inteira maior ou igual a zero.', { isError: true });
      row?.querySelector(pending.draft.ageSource === 'idade' ? '[data-inline-field="idade"]' : '[data-inline-field="nascimento"]')?.focus();
      return;
    }
    pendingValues.push({ pending, nome, nascimento, idade, grupo_id });
  }
  const validTitularIds = new Set([
    ...quote.lives.filter(life => life.tipo === 'titular' && !removedIds.has(life.id)).map(life => life.id),
    ...pendingValues.filter(item => item.pending.mode === 'add' && item.pending.tipo === 'titular').map(item => item.pending.id)
  ]);
  const missingGroup = pendingValues.find(item => item.pending.tipo === 'dependente' && !validTitularIds.has(item.grupo_id));
  if (missingGroup) { showQuoteToast('Selecione um titular válido para cada dependente.', { isError: true }); return; }
  pendingValues.forEach(({ pending, nome, nascimento, idade, grupo_id }) => {
    if (pending.mode === 'edit') {
      const existing = quote.lives.find(life => life.id === pending.id);
      if (existing) Object.assign(existing, { nome, nascimento, idade, ...(pending.tipo === 'dependente' ? { grupo_id } : {}) });
    } else quote.lives.push({ id: pending.id, grupo_id: pending.tipo === 'titular' ? pending.id : grupo_id, tipo: pending.tipo, nome, nascimento, idade, cpf: '' });
  });
  quote.lives = quote.lives.filter(life => !removedIds.has(life.id));
  removedIds.forEach(id => quote.expandedGroups.delete(id));
  const savedCount = pendingValues.length;
  const removedCount = removedIds.size;
  quote.inlineLives = [];
  quote.batchEditingLives = false;
  quote.removedInlineLifeIds = [];
  quote.notice = removedCount ? `${removedCount} vida(s) removida(s); ${savedCount} vida(s) salva(s).` : `${savedCount} vida(s) salva(s) com sucesso.`;
  rerender();
};
window.saudeQuoteCancelAllInlineLives = () => {
  if (!quote.inlineLives.length && !quote.removedInlineLifeIds.length) return;
  quote.inlineLives = [];
  quote.batchEditingLives = false;
  quote.removedInlineLifeIds = [];
  quote.notice = '';
  rerender();
};
window.saudeQuoteDeleteLife = id => { if (quote.inlineLives.length || quote.removedInlineLifeIds.length) { showQuoteToast('Salve ou cancele as linhas em edição antes de excluir uma vida.', { isError: true }); return; } const life = quote.lives.find(item => item.id === id); if (!life) return; if (life.tipo === 'titular' && quote.lives.some(item => item.tipo === 'dependente' && item.grupo_id === id)) { quote.notice = 'Transfira ou exclua os dependentes antes de remover este titular.'; rerender(); return; } if (!window.confirm(`Excluir ${life.tipo === 'titular' ? 'titular' : 'dependente'} ${lifeDisplayName(life)}?`)) return; quote.lives = quote.lives.filter(item => item.id !== id); if (life.tipo === 'titular') quote.expandedGroups.delete(id); rerender(); };
window.saudeQuotePlanPickerCopay = (value, checked) => { const values = new Set(quote.planPicker.coparticipacoes); checked ? values.add(value) : values.delete(value); quote.planPicker.coparticipacoes = ['true', 'false'].filter(item => values.has(item)); quote.planPicker.operatorId = ''; quote.planPicker.selectedTableIds = []; rerender(); [...document.querySelectorAll('[data-plan-picker-copay]')].find(input => input.value === value)?.focus(); };
window.saudeQuotePlanPickerAccommodation = (value, checked) => { const values = new Set(quote.planPicker.accommodations); checked ? values.add(value) : values.delete(value); quote.planPicker.accommodations = ACCOMMODATIONS.filter(item => values.has(item)); quote.planPicker.operatorId = ''; quote.planPicker.selectedTableIds = []; rerender(); [...document.querySelectorAll('[data-plan-picker-accommodation]')].find(input => input.value === value)?.focus(); };
window.saudeQuotePlanPickerOperator = value => { quote.planPicker.operatorId = value; quote.planPicker.selectedTableIds = []; rerender(); document.querySelector('[data-plan-picker-operator]')?.focus(); };
window.saudeQuotePlanPickerTable = (tableId, checked) => { const selected = new Set(quote.planPicker.selectedTableIds); checked ? selected.add(tableId) : selected.delete(tableId); quote.planPicker.selectedTableIds = [...selected]; rerender(); [...document.querySelectorAll('.saude-plan-option input')].find(input => input.value === tableId)?.focus(); };
window.saudeQuoteAddPlan = event => {
  event.preventDefault();
  const availableIds = new Set(planPickerTables().filter(table => operatorInfo(planInfo(table)).id === quote.planPicker.operatorId).map(table => table.id));
  const tableIds = [...new Set(quote.planPicker.selectedTableIds)].filter(tableId => availableIds.has(tableId));
  if (!tableIds.length) return;
  quote.plans.push(...tableIds.map(tableId => ({ tableId, selected: true })));
  quote.modal = ''; quote.manualPlanMode = false; rerender();
};
window.saudeQuoteManualPriceChanged = () => {
  if (document.querySelector('[data-manual-iof-toggle]')?.checked) {
    window.saudeQuoteCalculateManualIOF({ silent: true });
    return;
  }
  quote.manualIofPreview = null;
  document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = ''; });
};
window.saudeQuoteCalculateManualIOF = ({ silent = false } = {}) => {
  const form = document.querySelector('.saude-manual-plan-modal');
  if (!form) return false;
  const formValues = new FormData(form);
  const base = {};
  let invalid = false;
  BANDS.forEach((band, index) => {
    const raw = String(formValues.get(`price_${index}`) ?? '').trim();
    if (!raw) return;
    const price = parseManualPrice(raw);
    if (!Number.isFinite(price) || price < 0) invalid = true;
    else base[band] = price;
  });
  if (invalid || !Object.keys(base).length) {
    quote.manualIofPreview = null;
    document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = ''; });
    if (!silent) showQuoteToast(invalid ? 'Confira os valores. Os preços precisam ser números iguais ou maiores que zero.' : 'Informe ao menos um valor por faixa etária antes de calcular o IOF.', { isError: true });
    return false;
  }
  const values = Object.fromEntries(Object.entries(base).map(([band, price]) => [band, Math.round((price * 1.0238 + Number.EPSILON) * 100) / 100]));
  quote.manualIofPreview = { base, values };
  document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = Number.isFinite(values[cell.dataset.manualIofValue]) ? money(values[cell.dataset.manualIofValue]) : ''; });
  return true;
};
window.saudeQuoteToggleManualIOF = checked => {
  if (!checked) {
    quote.manualIofPreview = null;
    document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = ''; });
    return;
  }
  if (!window.saudeQuoteCalculateManualIOF()) {
    const toggle = document.querySelector('[data-manual-iof-toggle]');
    if (toggle) toggle.checked = false;
  }
};
window.saudeQuoteDuplicateManualPlan = source => {
  const form = source?.closest?.('.saude-manual-plan-modal');
  if (!form) { showQuoteToast('Não foi possível localizar o formulário do plano manual.', { isError: true }); return; }
  const values = new FormData(form);
  const operatorId = String(values.get('operatorId') || '');
  const catalogOperator = quote.catalog.operators.find(operator => operator.id === operatorId);
  if (!catalogOperator) { showQuoteToast('Selecione uma operadora cadastrada antes de duplicar o plano.', { isError: true }); form.elements.operatorId?.focus(); return; }
  const catalogPlanId = String(values.get('planId') || '');
  const catalogPlan = quote.catalog.plans.find(plan => plan.id === catalogPlanId && plan.operadora_id === operatorId);
  if (!catalogPlan) { showQuoteToast('Selecione um plano cadastrado para esta operadora antes de duplicar.', { isError: true }); form.elements.planId?.focus(); return; }

  const basePrices = {};
  let invalidPrice = false;
  BANDS.forEach((band, index) => {
    const raw = String(values.get(`price_${index}`) ?? '').trim();
    if (!raw) return;
    const price = parseManualPrice(raw);
    if (!Number.isFinite(price) || price < 0) invalidPrice = true;
    else basePrices[band] = price;
  });
  if (invalidPrice) { showQuoteToast('Confira os valores antes de duplicar. Os preços precisam ser números iguais ou maiores que zero.', { isError: true }); return; }

  const hasCurrentIof = quote.manualIofPreview && JSON.stringify(quote.manualIofPreview.base) === JSON.stringify(basePrices);
  const prices = hasCurrentIof ? { ...quote.manualIofPreview.values } : { ...basePrices };
  const manualId = `manual-${nextId()}`;
  const table = { id: manualId, nome: 'Valores informados manualmente', acomodacao: String(values.get('accommodation') || ''), coparticipacao: values.get('coparticipation') === 'true', status: 'vigente', vigencia_inicio: quote.effectiveDate || today(), vigencia_fim: null, origem: 'manual' };
  const plan = { ...catalogPlan, id: `${manualId}-plan`, catalog_plan_id: catalogPlan.id, operadora_id: catalogOperator.id, nome: catalogPlan.nome, modalidade: quote.type, abrangencia: String(values.get('coverage') || '').trim() || catalogPlan.abrangencia || '', origem: 'manual' };
  quote.plans.push({ tableId: manualId, selected: true, table_snapshot: table, plan_snapshot: plan, operator_snapshot: { ...catalogOperator }, prices_snapshot: prices, prices_base_snapshot: { ...basePrices }, iof_applied: Boolean(hasCurrentIof), iof_percent: hasCurrentIof ? 2.38 : 0 });
  quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = '';
  quote.modal = ''; quote.manualPlanMode = false; quote.manualPlanEditingId = '';
  quote.manualPlanOperatorId = ''; quote.manualPlanCatalogId = ''; quote.manualIofPreview = null;
  quote.notice = `Plano manual da ${catalogOperator.nome} duplicado na cotação.`;
  rerender();
};
window.saudeQuoteManualOperatorChanged = operatorId => {
  quote.manualPlanOperatorId = String(operatorId || '');
  const plans = quote.catalog.plans.filter(plan => plan.operadora_id === quote.manualPlanOperatorId);
  quote.manualPlanCatalogId = plans[0]?.id || '';
  const select = document.querySelector('.saude-manual-plan-modal select[name="planId"]');
  if (!select) return;
  select.innerHTML = `<option value="">${quote.manualPlanOperatorId ? plans.length ? 'Selecione um plano' : 'Nenhum plano cadastrado para esta operadora' : 'Selecione uma operadora primeiro'}</option>${plans.map(plan => `<option value="${esc(plan.id)}" ${plan.id === quote.manualPlanCatalogId ? 'selected' : ''}>${esc(plan.nome)}</option>`).join('')}`;
  select.disabled = plans.length === 0;
  const coverage = document.querySelector('.saude-manual-plan-modal input[name="coverage"]');
  if (coverage) coverage.value = plans[0]?.abrangencia || '';
  const submit = document.querySelector('.saude-manual-plan-modal button[onclick*="saudeQuoteAddManualPlan"]');
  if (submit) submit.disabled = plans.length === 0;
};
window.saudeQuoteManualPlanChanged = planId => {
  quote.manualPlanCatalogId = String(planId || '');
  const plan = quote.catalog.plans.find(item => item.id === quote.manualPlanCatalogId);
  const coverage = document.querySelector('.saude-manual-plan-modal input[name="coverage"]');
  if (coverage) coverage.value = plan?.abrangencia || '';
};
window.saudeQuoteShowManualPlan = () => { quote.manualPlanEditingId = ''; quote.manualPlanOperatorId = ''; quote.manualPlanCatalogId = ''; quote.manualIofPreview = null; quote.manualPlanMode = true; quote.notice = ''; rerender(); };
window.saudeQuoteManualPlanBack = () => { quote.manualPlanEditingId = ''; quote.manualPlanOperatorId = ''; quote.manualPlanCatalogId = ''; quote.manualIofPreview = null; quote.manualPlanMode = false; rerender(); };
window.saudeQuoteAddManualPlan = source => {
  if (source instanceof Event) source.preventDefault();
  const form = source?.matches?.('.saude-manual-plan-modal')
    ? source
    : source?.currentTarget?.matches?.('.saude-manual-plan-modal')
      ? source.currentTarget
      : source?.form?.matches?.('.saude-manual-plan-modal')
        ? source.form
        : source?.closest?.('.saude-manual-plan-modal');
  if (!form) { showQuoteToast('Não foi possível localizar o formulário do plano manual.', { isError: true }); return; }
  try {
  const values = new FormData(form);
  const operatorId = String(values.get('operatorId') || '');
  if (!operatorId) { showQuoteToast('Selecione uma operadora para adicionar o plano.', { isError: true }); form.elements.operatorId?.focus(); return; }
  const catalogOperator = quote.catalog.operators.find(operator => operator.id === operatorId);
  if (!catalogOperator) { showQuoteToast('A operadora selecionada não está mais cadastrada no catálogo.', { isError: true }); form.elements.operatorId?.focus(); return; }
  const catalogPlanId = String(values.get('planId') || '');
  const catalogPlan = quote.catalog.plans.find(plan => plan.id === catalogPlanId && plan.operadora_id === operatorId);
  if (!catalogPlan) { showQuoteToast('Selecione um plano cadastrado para esta operadora.', { isError: true }); form.elements.planId?.focus(); return; }
  const planName = catalogPlan.nome;
  const operatorName = catalogOperator.nome;

  const basePrices = {};
  let invalidPrice = false;
  BANDS.forEach((band, index) => {
    const raw = String(values.get(`price_${index}`) ?? '').trim();
    if (!raw) return;
    const price = parseManualPrice(raw);
    if (!Number.isFinite(price) || price < 0) invalidPrice = true;
    else basePrices[band] = price;
  });
  if (invalidPrice) { showQuoteToast('Confira os valores. Os preços precisam ser números iguais ou maiores que zero.', { isError: true }); return; }
  const hasCurrentIof = quote.manualIofPreview && JSON.stringify(quote.manualIofPreview.base) === JSON.stringify(basePrices);
  const prices = hasCurrentIof ? { ...quote.manualIofPreview.values } : { ...basePrices };
  const pricingSnapshot = { prices_snapshot: prices, prices_base_snapshot: { ...basePrices }, iof_applied: Boolean(hasCurrentIof), iof_percent: hasCurrentIof ? 2.38 : 0 };

  const editingPlan = quote.manualPlanEditingId ? quotePlanEntry(quote.manualPlanEditingId) : null;
  const manualId = editingPlan?.tableId || `manual-${nextId()}`;
  const accommodation = String(values.get('accommodation') || '');
  const coparticipation = values.get('coparticipation') === 'true';
  const table = { id: manualId, nome: 'Valores informados manualmente', acomodacao: accommodation, coparticipacao: coparticipation, status: 'vigente', vigencia_inicio: quote.effectiveDate || today(), vigencia_fim: null, origem: 'manual' };
  const plan = { ...catalogPlan, id: `${manualId}-plan`, catalog_plan_id: catalogPlan.id, operadora_id: catalogOperator.id, nome: planName, modalidade: quote.type, abrangencia: String(values.get('coverage') || '').trim() || catalogPlan.abrangencia || '', origem: 'manual' };
  if (editingPlan) {
    Object.assign(editingPlan, { table_snapshot: table, plan_snapshot: plan, operator_snapshot: { id: catalogOperator.id, nome: catalogOperator.nome }, ...pricingSnapshot });
  } else {
    quote.plans.push({ tableId: manualId, selected: true, table_snapshot: table, plan_snapshot: plan, operator_snapshot: { id: catalogOperator.id, nome: catalogOperator.nome }, ...pricingSnapshot });
  }
  quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = '';
  quote.modal = '';
  quote.manualPlanMode = false;
  quote.manualPlanEditingId = '';
  quote.manualPlanOperatorId = '';
  quote.manualPlanCatalogId = '';
  quote.manualIofPreview = null;
  quote.notice = editingPlan ? `Valores manuais do plano da ${operatorName} atualizados.` : `Plano manual da ${operatorName} adicionado a esta cotação.`;
  rerender();
  } catch (error) {
    showQuoteToast(error?.message || 'Não foi possível adicionar o plano manual à cotação.', { isError: true });
  }
};
window.saudeQuoteEditManualPlan = tableId => {
  const entry = quotePlanEntry(tableId);
  if (!entry?.table_snapshot || entry.table_snapshot.origem !== 'manual') return;

  quote.manualPlanEditingId = tableId;
  quote.manualPlanOperatorId = entry.operator_snapshot?.id || entry.plan_snapshot.operadora_id || '';
  quote.manualPlanCatalogId = entry.plan_snapshot.catalog_plan_id || quote.catalog.plans.find(plan => plan.operadora_id === quote.manualPlanOperatorId && normalizeImportToken(plan.nome) === normalizeImportToken(entry.plan_snapshot.nome))?.id || '';
  quote.manualIofPreview = entry.iof_applied ? { base: { ...(entry.prices_base_snapshot || entry.prices_snapshot || {}) }, values: { ...(entry.prices_snapshot || {}) } } : null;
  quote.manualPlanMode = true;
  quote.modal = 'plan';
  rerender();
};
window.saudeQuoteGoCatalog = () => context.navegarParaRota?.(`${obterBaseHub(window.location.pathname)}/operacoes/corretora/simulador-saude/catalogo`);
window.saudeQuoteRemovePlan = id => { quote.plans = quote.plans.filter(item => item.tableId !== id); rerender(); };
window.saudeQuoteTogglePlan = (id, checked) => { const plan = quote.plans.find(item => item.tableId === id); if (plan) plan.selected = Boolean(checked); };
window.saudeQuoteToggleGroup = id => { quote.expandedGroups.has(id) ? quote.expandedGroups.delete(id) : quote.expandedGroups.add(id); rerender(); };
window.saudeQuoteFilter = (key, value) => { quote[key] = value; rerender(); };
window.saudeQuoteReloadCatalog = () => { quoteToastKey = ''; loadCatalog(); };
async function persistCurrentQuote(status = 'rascunho') {
  if (quote.inlineLives.length || quote.removedInlineLifeIds.length) throw new Error('Salve ou cancele as linhas de vidas antes de salvar a cotação.');
  if (!quote.lives.length) throw new Error('Adicione ao menos uma vida antes de salvar a cotação.');
  const response = await chamarApi('saveSimuladorSaudeQuote', {
    id: quote.id || null,
    cliente_nome: quote.company,
    cliente_cnpj: quote.cnpj,
    cliente_cidade: quote.city,
    tipo_contratacao: quote.type,
    vigencia: quote.effectiveDate,
    status,
    snapshot: serializeSnapshot()
  });
  if (!response.ok) throw new Error(response.message || 'Não foi possível salvar a cotação.');
  const wasNewQuote = !quote.id;
  quote.id = response.data.id; quote.code = response.data.codigo; quote.version = response.data.snapshot_version || quote.version + 1;
  if (wasNewQuote) {
    const url = new URL(window.location.href);
    url.searchParams.delete('duplicateQuoteId');
    url.searchParams.set('quoteId', quote.id);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  quote.savedSignature = draftSignature();
  return response.data;
}

window.saudeQuoteSave = async () => {
  if (quote.saving) return;
  quote.saving = true; quote.notice = ''; rerender();
  try {
    const saved = await persistCurrentQuote();
    quote.notice = `Cotação #${saved.codigo} salva com sucesso.`;
  }
  catch (error) { quote.notice = error.message || 'Não foi possível salvar a cotação.'; }
  finally { quote.saving = false; rerender(); }
};

window.saudeQuoteClear = () => {
  if (quote.lives.length || quote.plans.length || quote.company || quote.id) {
    if (!window.confirm('Limpar os dados desta cotação? A versão já salva permanecerá no histórico.')) return;
  }
  const hadQuoteId = Boolean(new URLSearchParams(window.location.search).get('quoteId'));
  resetQuoteDraft();
  quote.notice = 'Cotação limpa. A versão já salva foi preservada.';
  if (hadQuoteId) window.history.replaceState({}, '', window.location.pathname);
  rerender();
};

function proposalHtml(branding, saved, { autoPrint = true } = {}) {
  const plans = quote.plans.filter(item => item.selected).map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: operatorForEntry(item) }));
  const operatorClass = item => proposalOperatorVisualClass(item.operator.nome);
  const proposalOperatorKey = item => String(item.operator?.id || item.operator?.nome || '').trim().toLocaleLowerCase('pt-BR');
  const sameProposalOperator = (left, right) => proposalOperatorKey(left) === proposalOperatorKey(right);
  const plansForOperator = item => plans.filter(candidate => sameProposalOperator(candidate, item));
  const operatorGroupIsContiguous = item => {
    const group = plansForOperator(item);
    const first = plans.indexOf(group[0]);
    return plans.slice(first, first + group.length).every(candidate => sameProposalOperator(candidate, item));
  };
  const coparticipacaoSourceFor = item => plans.find(candidate => sameProposalOperator(candidate, item)
    && (candidate.table.coparticipacao === true || candidate.table.coparticipacao === 'true')
    && coparticipacaoProposalTable(candidate.plan?.detalhes?.coparticipacao ?? candidate.table?.condicoes?.coparticipacao))
    || plans.find(candidate => sameProposalOperator(candidate, item));
  const carenciasSourceFor = item => plans.find(candidate => sameProposalOperator(candidate, item)
    && carenciaProposalTable(carenciasForProposal(candidate)))
    || plans.find(candidate => sameProposalOperator(candidate, item));
  const brokerName = branding.nome_fantasia || branding.razao_social || 'Transmares Corretora de Seguros';
  const logo = branding.logo_url || document.querySelector('.brand-logo-slot img')?.src || '';
  const address = [branding.endereco_logradouro, branding.endereco_numero, branding.endereco_complemento, branding.endereco_bairro, [branding.endereco_cidade, branding.endereco_uf].filter(Boolean).join(' - '), branding.endereco_cep].filter(Boolean).join(', ');
  const footerCompanyName = String(branding.razao_social || branding.nome_fantasia || brokerName).toLocaleUpperCase('pt-BR');
  const footerLineOne = [footerCompanyName, branding.cnpj && `CNPJ ${branding.cnpj}`, branding.telefone && `Telefone ${branding.telefone}`, branding.whatsapp && `WhatsApp ${branding.whatsapp}`].filter(Boolean).join(' · ');
  const footerLineTwo = [branding.email, branding.site].filter(Boolean).join(' · ');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const selectedLives = quote.lives.filter(life => life.tipo === 'titular').length;
  const dependents = quote.lives.filter(life => life.tipo === 'dependente').length;
  const comparisonRows = groupIds().map(groupId => {
    const members = livesInGroup(groupId);
    const lifeRows = members.map(life => `<tr class="composition-life-row"><td class="group-cell">Grupo ${groupNumber(groupId)}</td><td>${esc(lifeDisplayName(life))}</td><td>${lifeBand(life) || '—'}</td>${plans.map(item => { const price = planPrice(item.tableId, life); return `<td class="price-${operatorClass(item)} ${price === null ? 'is-incomplete' : ''}">${price === null ? 'Preço indisponível' : money(price)}</td>`; }).join('')}</tr>`).join('');
    const groupTotals = plans.map(item => { const result = totalsFor(item.tableId, groupId); return `<td class="price-${operatorClass(item)} ${result.total === null ? 'is-incomplete' : ''}">${result.total === null ? 'Cotação incompleta' : money(result.total)}</td>`; }).join('');
    return `${lifeRows}<tr class="group-total"><td colspan="3">Total do Grupo ${groupNumber(groupId)} · ${members.length} vidas</td>${groupTotals}</tr>`;
  }).join('');
  const totalCells = plans.map(item => {
    const total = planTotal(item.tableId);
    const missing = quote.lives.filter(life => planPrice(item.tableId, life) === null).map(life => `${lifeDisplayName(life)} (${lifeBand(life) || 'idade inválida'})`);
    return `<td class="price-${operatorClass(item)} ${total === null ? 'is-incomplete' : ''}">${total === null ? `<strong>Cotação incompleta</strong><small>${esc(missing.join(', '))}</small>` : `<strong>${money(total)}</strong>`}</td>`;
  }).join('');
  const compositionDetailsWidth = (4 / (4 + plans.length)) * 60;
  const compositionPlanColumns = plans.map(() => `<col style="width:${(100 - compositionDetailsWidth) / Math.max(plans.length, 1)}%">`).join('');
  const comparisonHeaders = plans.map(item => `<th class="brand-${operatorClass(item)}"><span class="proposal-operator-name">${esc(item.operator.nome || 'Operadora')}</span><small class="proposal-plan-name">${esc(item.plan.nome || 'Plano')}</small></th>`).join('');
  const compositionOperatorHeaders = plans.map(item => {
    const brand = operatorClass(item);
    const mark = item.operator.logo_url
      ? `<img src="${esc(item.operator.logo_url)}" alt="Logomarca ${esc(item.operator.nome || 'operadora')}" class="composition-operator-logo">`
      : `<span class="operator-mark" style="background:${esc(item.operator.cor_marca || '#174A8B')}">${esc(operatorMonogram(item.operator.nome))}</span>`;
    return `<th class="composition-operator-header is-${brand}">${mark}</th>`;
  }).join('');
  const compositionSummaryRows = [
    ['Acomodação', item => item.table.acomodacao || 'Não informada'],
    ['Coparticipação', item => item.table.coparticipacao === true || item.table.coparticipacao === 'true' ? 'Sim' : 'Não'],
    ['Abrangência', item => item.plan.abrangencia || 'Não informada']
  ].map(([label, getValue]) => `<tr class="composition-condition-row"><th class="composition-condition-label" colspan="3" scope="row">${esc(label)}</th>${plans.map(item => `<td class="price-${operatorClass(item)}">${esc(getValue(item))}</td>`).join('')}</tr>`).join('');
  const networkRows = [
    ['Modalidade', item => item.plan.modalidade || 'Não informada'],
    ['Coberturas e serviços', item => proposalDetail(item, 'coberturas') || 'Não informadas.'],
    ['Adicionais', item => proposalDetail(item, 'adicionais') || 'Não informados neste plano.'],
    ['Prestadores e unidades', item => proposalDetail(item, 'rede') || 'A relação nominal não está cadastrada neste plano.'],
    ['Coparticipação por procedimento', item => proposalDetail(item, 'coparticipacao') || 'Não informados neste plano.'],
    ['Carências', item => proposalDetail(item, 'carencias') || 'Não informadas neste plano.']
  ].map(([label, getValue]) => `<tr><th>${esc(label)}</th>${plans.map(item => {
    if (label === 'Coparticipação por procedimento') {
      if (/hapvida/i.test(item.operator?.nome || '')) {
        const operatorPlans = plansForOperator(item);
        const firstOperatorPlan = operatorPlans[0];
        const contiguous = operatorGroupIsContiguous(item);
        if (contiguous) {
          if (item !== firstOperatorPlan) return '';
          const source = coparticipacaoSourceFor(item);
          const sourceValue = source.plan?.detalhes?.coparticipacao ?? source.table?.condicoes?.coparticipacao;
          const tableMarkup = coparticipacaoProposalTable(sourceValue, operatorPlans.length);
          const colspan = operatorPlans.length > 1 ? ` colspan="${operatorPlans.length}"` : '';
          return `<td class="copay-procedure-cell"${colspan}>${tableMarkup || '—'}</td>`;
        }
        if (coparticipacaoSourceFor(item) !== item) return '<td></td>';
      }
      if (item.table.coparticipacao !== true && item.table.coparticipacao !== 'true') return '<td>—</td>';
      const coparticipacao = item.plan?.detalhes?.coparticipacao ?? item.table?.condicoes?.coparticipacao;
      const tableMarkup = coparticipacaoProposalTable(coparticipacao);
      if (tableMarkup) return `<td class="copay-procedure-cell">${tableMarkup}</td>`;
    }
    if (label === 'Carências') {
      const operatorPlans = plansForOperator(item);
      const firstOperatorPlan = operatorPlans[0];
      const contiguous = operatorGroupIsContiguous(item);
      if (contiguous && item !== firstOperatorPlan) return '';
      const source = carenciasSourceFor(item);
      if (!contiguous && source !== item) return '<td></td>';
      const span = contiguous ? operatorPlans.length : 1;
      const carencias = carenciasForProposal(source);
      const tableMarkup = carenciaProposalTable(carencias, span);
      const colspan = span > 1 ? ` colspan="${span}"` : '';
      if (tableMarkup) return `<td class="copay-procedure-cell"${colspan}>${tableMarkup}</td>`;
      return `<td${colspan}>Não informadas neste plano.</td>`;
    }
    return `<td>${esc(getValue(item))}</td>`;
  }).join('')}</tr>`).join('');
  const logoMarkup = logo ? `<img src="${esc(logo)}" alt="Logo ${esc(brokerName)}" onerror="this.style.display='none'">` : `<strong class="brand-fallback">${esc(brokerName)}</strong>`;
  const header = (title, subtitle) => `<header class="proposal-header"><div class="proposal-brand">${logoMarkup}</div><div class="proposal-heading"><h1>${title}</h1><p>${subtitle}</p></div></header>`;
  const footer = page => `<footer class="proposal-footer"><div class="footer-lines"><strong>${esc(footerLineOne)}</strong>${footerLineTwo ? `<span>${esc(footerLineTwo)}</span>` : ''}${address ? `<span>${esc(address)}</span>` : ''}</div><span class="page-number">${page}/2</span></footer>`;
  const currentQuoteMeta = `${saved.codigo ? `Cotação #${esc(saved.codigo)}` : 'Cotação'} · Emitida em ${currentDate}`;
  const printOnLoad = autoPrint ? `<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))).then(()=>setTimeout(()=>window.print(),300))})</script>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposta de Plano de Saúde${quote.code ? ` - ${esc(quote.code)}` : ''}</title><style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{background:#f1f4f8;color:#0b1b3c;font-family:Arial,Helvetica,sans-serif;margin:0}.proposal-page{background:#fff;margin:18px auto;width:297mm;max-width:calc(100% - 32px);display:flex;flex-direction:column;min-height:210mm;padding:10mm 10mm 22mm;position:relative}.proposal-header{align-items:center;border-bottom:1px solid #dce5ef;display:flex;gap:20px;justify-content:space-between;margin-bottom:10px;padding:0 0 9px}.proposal-brand{align-items:center;display:flex;flex:0 0 220px;min-height:32px}.proposal-brand img{display:block;height:auto;max-height:36px;max-width:min(190px,100%);object-fit:contain;object-position:left center;width:auto}.brand-fallback{color:#294895;font-size:14px}.proposal-heading{text-align:right}.proposal-heading h1{font-size:20px;letter-spacing:-.3px;margin:0}.proposal-heading p{color:#536987;font-size:10px;margin:4px 0 0}.client-strip{background:linear-gradient(110deg,#f4f7fb,#f8fafc);border:1px solid #dce5ef;border-radius:7px;display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr;margin-bottom:10px;padding:7px 12px}.client-item{align-items:center;border-right:1px solid #e0e8f1;display:flex;gap:10px;min-width:0;padding:1px 12px}.client-item:first-child{padding-left:2px}.client-item:last-child{border:0}.client-icon{color:#244875;flex:0 0 21px;font-size:19px;font-weight:bold;text-align:center}.client-item span,.client-item strong{display:block}.client-item span{color:#536987;font-size:9px;margin-bottom:3px}.client-item strong{font-size:11px}.client-item small{color:#536987;display:block;font-size:8px;margin-top:2px}.section-heading{margin:11px 0 7px}.section-heading h2{font-size:16px;letter-spacing:-.2px;margin:0}.section-heading p{color:#536987;font-size:9px;margin:3px 0 0}.plan-grid{display:grid;gap:8px;grid-template-columns:repeat(var(--plan-columns,3),minmax(0,1fr));margin-bottom:11px}.plan-card{border:1px solid #dce5ef;border-radius:7px;min-width:0;overflow:hidden}.plan-card>header{align-items:center;background:#f4f7fb;display:flex;gap:7px;justify-content:center;min-height:36px;padding:6px 9px}.plan-card.is-unimed>header{background:#f0faf4}.plan-card.is-hapvida>header{background:#f1f8ff}.plan-card.is-bradesco>header{background:#fff3f4}.operator-mark{align-items:center;background:#294895;border-radius:50%;color:#fff;display:inline-flex;flex:0 0 22px;font-size:10px;font-weight:bold;height:22px;justify-content:center}.is-unimed .operator-mark{background:#079447}.is-hapvida .operator-mark{background:#268ee8}.is-bradesco .operator-mark{background:#c41426}.plan-card>header strong{font-size:11px}.plan-card>header small{color:#536987;flex:1;font-size:9px;font-weight:700;min-width:0;overflow:hidden;text-align:left;text-overflow:ellipsis;white-space:nowrap}.plan-price{color:#294895;font-size:20px;font-weight:800;line-height:1.1;padding:4px 9px 0;text-align:center}.plan-price small{color:#536987;font-size:9px;font-weight:400;margin-left:3px}.plan-card.is-unimed .plan-price{color:#078a3c}.plan-card.is-hapvida .plan-price{color:#075ed2}.plan-card.is-bradesco .plan-price{color:#d20d1b}.plan-price.is-incomplete{color:#9a6200!important;font-size:12px}.plan-features{border-top:1px solid #e5ebf2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:6px 3px}.plan-features>div{align-items:center;border-right:1px solid #e5ebf2;display:flex;gap:5px;min-width:0;padding:2px 5px}.plan-features>div:last-child{border:0}.feature-symbol{color:#244875;flex:0 0 14px;font-size:14px;text-align:center}.plan-features span:last-child{color:#536987;font-size:8px;line-height:1.2}.plan-features strong{color:#0b1b3c;display:block;font-size:8px;margin-top:2px}.proposal-table{border-collapse:collapse;table-layout:fixed;width:100%}.composition-table th,.composition-table td{line-height:1.1;padding:2px 4px}.composition-table th:nth-child(-n+3),.composition-table td:nth-child(-n+3){font-size:7px;padding:1px 2px}.composition-table .life-type{padding:2px 3px;white-space:normal}.proposal-table th,.proposal-table td{border:1px solid #dce5ef;font-size:8px;overflow-wrap:anywhere;padding:5px 6px;text-align:center;vertical-align:middle}.proposal-table thead th{background:#f0f4f9;color:#0b1b3c;font-size:8px}.proposal-table th:first-child,.proposal-table td:first-child{text-align:left}.proposal-table .brand-unimed{background:#079447;color:#fff}.proposal-table .brand-hapvida{background:#268ee8;color:#fff}.proposal-table .brand-bradesco{background:#c41426;color:#fff}.proposal-table .brand-default{background:#294895;color:#fff}.proposal-table thead small{display:block;font-size:7px;font-weight:500;margin-top:2px}.proposal-table .group-cell{font-weight:700;white-space:nowrap}.life-type{background:#dcecff;border-radius:4px;color:#0759c7;display:inline-block;padding:3px 6px}.life-type.dependente{background:#d9f7e5;color:#087b39}.price-unimed{color:#078a3c}.price-hapvida{color:#075ed2}.price-bradesco{color:#c41426}.proposal-table td.is-incomplete{color:#9a6200!important}.proposal-table .group-total td{background:#fff7e3;font-weight:700}.proposal-table .grand-total td{background:#f0f5fc;font-size:9px;font-weight:700}.proposal-table .grand-total td.price-unimed{background:#eaf7ef;color:#078a3c}.proposal-table .grand-total td.price-hapvida{background:#edf6ff;color:#075ed2}.proposal-table .grand-total td.price-bradesco{background:#fff0f2;color:#c41426}.proposal-table .grand-total small{display:block;font-size:7px;font-weight:400;margin-top:2px}.conditions-table th:first-child{width:21%}.conditions-table td{text-align:left;white-space:pre-line}.network-table th:first-child,.copay-table th:first-child{width:24%}.network-table td{text-align:left}.copay-table td{text-align:left;white-space:pre-line}.copay-table td.copay-procedure-cell,.conditions-table td.copay-procedure-cell{padding:3px;white-space:normal}.copay-detail-table{border-collapse:collapse;table-layout:fixed;width:100%}.copay-detail-table th,.copay-detail-table td{border:1px solid #dce5ef;font-size:7px;line-height:1.15;overflow-wrap:anywhere;padding:2px 3px;text-align:left;vertical-align:top}.copay-detail-table th{background:#f0f4f9;font-weight:700}.supplemental-grid{display:grid;grid-template-columns:1fr;margin-top:auto}.important-list{display:grid;grid-auto-flow:column;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,auto);column-gap:16px}.supplemental-card{border:1px solid #dce5ef;border-radius:6px;overflow:hidden}.supplemental-card h2{font-size:12px;margin:0;padding:5px 8px}.interpretation-list{list-style:none;margin:0;padding:0}.interpretation-list li{align-items:flex-start;border-top:1px solid #e5ebf2;display:flex;font-size:8px;gap:6px;line-height:1.2;padding:3px 8px}.interpretation-list b{align-items:center;background:#e8f2ff;border-radius:50%;color:#0759c7;display:flex;flex:0 0 14px;height:14px;justify-content:center}.important-list{list-style:none;margin:0;padding:0}.important-list li{border-top:1px solid #e5ebf2;font-size:8px;line-height:1.2;padding:3px 8px}.important-list li:before{color:#294895;content:'ⓘ';font-weight:bold;margin-right:6px}.info-note{background:#f2f7fc;border-left:3px solid #294895;color:#435977;font-size:8px;line-height:1.4;margin:8px 0;padding:7px 9px}.proposal-footer{align-items:end;border-top:1px solid #bfcfe0;bottom:10mm;color:#435977;display:flex;font-size:7px;justify-content:space-between;left:10mm;margin-top:0;padding-top:6px;position:absolute;right:10mm}.proposal-footer strong,.proposal-footer span{display:block}.proposal-footer .footer-lines{flex:1;min-width:0}.proposal-footer span{margin-top:2px;max-width:900px}.proposal-footer .footer-lines span{max-width:none}.page-number{font-size:9px!important;margin:0!important;white-space:nowrap}.actions{background:#fff;margin:12px auto;width:210mm;max-width:calc(100% - 32px);padding:8px 14mm;text-align:right}.actions button{background:#0864c9;border:0;border-radius:5px;color:white;cursor:pointer;font-size:11px;font-weight:bold;padding:9px 14px}@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.proposal-page{break-after:page;margin:0;width:auto;max-width:none;min-height:190mm;padding:0 0 14mm}.proposal-page:last-of-type{break-after:auto}.actions{display:none}.proposal-footer{bottom:0;left:0;right:0}.plan-card,.supplemental-card,.info-note{break-inside:avoid}.section-heading{break-after:avoid}.proposal-table thead{display:table-header-group}.proposal-table tr{break-inside:avoid}}@media screen{.proposal-page{box-shadow:0 3px 16px #1b345014}.actions{position:sticky;bottom:0}.client-strip{grid-template-columns:1.4fr 1.2fr 1fr 1fr}}@media screen and (max-width:760px){.proposal-page{padding:18px}.proposal-header{align-items:flex-start;flex-direction:column;gap:8px}.proposal-heading{text-align:left}.proposal-brand{flex-basis:auto}.client-strip{grid-template-columns:1fr 1fr}.client-item:nth-child(2){border-right:0}.plan-grid{grid-template-columns:1fr}.supplemental-grid{grid-template-columns:1fr}.important-list{grid-auto-flow:row;grid-template-columns:1fr;grid-template-rows:none}}
  </style></head><body>
    <section class="proposal-page">
      ${header('Proposta de Plano de Saúde', currentQuoteMeta)}
      <section class="client-strip"><div class="client-item"><span class="client-icon">▦</span><div><span>Cliente / Empresa</span><strong>${esc(quote.company || '—')}</strong><small>${quote.cnpj ? `CNPJ ${esc(quote.cnpj)}` : ''}${quote.city ? `${quote.cnpj ? ' · ' : ''}${esc(quote.city)}` : ''}</small></div></div><div class="client-item"><span class="client-icon">♟</span><div><span>Total de vidas</span><strong>${quote.lives.length}</strong><small>${selectedLives} titular${selectedLives === 1 ? '' : 'es'} · ${dependents} dependente${dependents === 1 ? '' : 's'}</small></div></div><div class="client-item"><span class="client-icon">▤</span><div><span>Tipo de contratação</span><strong>${esc(quote.type)}</strong></div></div><div class="client-item"><span class="client-icon">▣</span><div><span>Vigência desejada</span><strong>${dateLabel(quote.effectiveDate)}</strong></div></div></section>
      <section><div class="section-heading"><h2>Cotação</h2></div><div class="proposal-data-table-wrap"><table class="proposal-table composition-table"><colgroup><col style="width:${compositionDetailsWidth * 0.2}%"><col style="width:${compositionDetailsWidth * 0.45}%"><col style="width:${compositionDetailsWidth * 0.35}%">${compositionPlanColumns}</colgroup><thead><tr><th class="composition-plan-stub" colspan="3" aria-hidden="true"></th>${compositionOperatorHeaders}</tr></thead><tbody>${compositionSummaryRows}<tr class="composition-life-headers"><th>Grupo</th><th>Nome</th><th>Faixa Etária</th>${plans.map(item => `<th class="brand-${operatorClass(item)} proposal-plan-name-cell">${esc(item.plan.nome || 'Plano')}</th>`).join('')}</tr>${comparisonRows}<tr class="grand-total"><td colspan="2">Total da cotação</td><td>${quote.lives.length} vidas</td>${totalCells}</tr></tbody></table></div></section>
      <div class="info-note">Valores estimados conforme as faixas etárias e a tabela cadastrada. Os valores podem ser alterados sem aviso prévio, conforme condições de cada operadora. Consulte a página das condições de contratação.</div>
      <div class="supplemental-grid"><section class="supplemental-card supplemental-observations"><h2>Observações importantes</h2><ul class="important-list"><li>Esta proposta é indicativa e não constitui oferta vinculante de contratação.</li><li>A aceitação está sujeita à análise de elegibilidade e às regras comerciais da operadora.</li><li>Rede credenciada, carências e condições podem variar conforme região e contrato.</li><li>Confirme valores e disponibilidade na data efetiva da contratação.</li></ul></section></div>
      ${footer(1)}
    </section>
    <section class="proposal-page">
      ${header('Informações complementares', 'Página 2 · Condições dos planos')}
      <style>
        .proposal-data-table-wrap { border: 1px solid #dce5ef; border-radius: 10px; box-shadow: 0 3px 12px #0f27420d; overflow: hidden; }
        .proposal-data-table-wrap .proposal-table { border-collapse: collapse; table-layout: fixed; width: 100%; }
        .proposal-data-table-wrap .proposal-table th, .proposal-data-table-wrap .proposal-table td { border: 0; border-bottom: 1px solid #e5ebf2; font-size: 9px; line-height: 1.25; padding: 6px 8px; text-align: left; vertical-align: top; }
        .proposal-data-table-wrap .proposal-table thead th { font-size: 8px; font-weight: 700; letter-spacing: .04em; padding: 7px 8px; text-transform: uppercase; vertical-align: middle; }
        .composition-table thead .proposal-operator-name { font-weight: 400; }
        .composition-table thead .proposal-plan-name { font-weight: 700; }
        .composition-table thead .composition-operator-header { background: #f4f7fb !important; padding: 5px 6px !important; text-align: center; vertical-align: middle; }
        .composition-table thead .composition-operator-header.is-unimed { background: #f0faf4 !important; }
        .composition-table thead .composition-operator-header.is-hapvida { background: #f1f8ff !important; }
        .composition-table thead .composition-operator-header.is-bradesco { background: #fff3f4 !important; }
        .composition-operator-logo { display: block; height: auto; margin: 0 auto; max-height: 24px; max-width: min(76px, 100%); object-fit: contain; object-position: center; vertical-align: middle; width: auto; }
        .proposal-data-table-wrap .proposal-table thead th:not([class^="brand-"]) { background: #f3f6fa; color: #52657d; }
        .proposal-data-table-wrap .proposal-table tbody th { background: #f8fafc; color: #23415f; font-size: 9px; font-weight: 700; }
        .plan-price { font-size: 16px; }
        .composition-condition-label { background: #f8fafc; color: #23415f; font-size: 8px !important; font-weight: 500 !important; text-transform: uppercase; }
        .composition-condition-row td { font-size: 8px !important; font-weight: 500; }
        .composition-life-headers th, .composition-life-headers td { background: #f0f4f9 !important; color: #52657d; font-size: 8px !important; font-weight: 500 !important; letter-spacing: .04em; padding: 4px 6px !important; text-transform: uppercase; }
        .composition-life-headers .proposal-plan-name-cell { font-weight: 700 !important; }
        .composition-life-headers .brand-unimed { background: #079447 !important; color: #fff !important; }
        .composition-life-headers .brand-hapvida { background: #268ee8 !important; color: #fff !important; }
        .composition-life-headers .brand-bradesco { background: #c41426 !important; color: #fff !important; }
        .composition-life-headers .brand-default { background: #294895 !important; color: #fff !important; }
        .composition-life-headers td { border-bottom: 1px solid #e5ebf2; }
        .proposal-data-table-wrap .proposal-table td.copay-procedure-cell { padding: 3px; }
        .copay-procedure-detail-table { table-layout: fixed; width: 100%; }
        .copay-procedure-detail-table th, .copay-procedure-detail-table td { line-height: 1.05; overflow: visible; padding: 1px 2px; white-space: nowrap; }
        .carencia-detail-table { table-layout: fixed; width: 100%; }
        .carencia-detail-table .carencia-procedure-column { width: 82%; }
        .carencia-detail-table .carencia-term-column { width: 18%; }
        .carencia-detail-table th, .carencia-detail-table td { font-size: 6px; line-height: 1.05; padding: 1px 2px; white-space: nowrap; }
        .proposal-data-table-wrap .proposal-table tbody tr:not(.group-total):not(.grand-total):nth-child(even) td { background: #f8fafc; }
        .proposal-data-table-wrap .proposal-table tbody tr:last-child th, .proposal-data-table-wrap .proposal-table tbody tr:last-child td { border-bottom: 0; }
        @media screen and (max-width:760px) {
          .composition-table { min-width: 0; table-layout: fixed; width: 100%; }
          .composition-table col:nth-child(1), .composition-table col:nth-child(3), .composition-table col:nth-child(n+4) { display: none; }
          .composition-table col:nth-child(2) { width: 100% !important; }
          .composition-table thead { display: none; }
          .composition-table tbody .composition-life-headers th:not(:nth-child(2)), .composition-table tbody .composition-life-headers td, .composition-table tbody .composition-life-row td:not(:nth-child(2)) { display: none; }
          .composition-table tbody .composition-condition-row, .composition-table tbody .group-total, .composition-table tbody .grand-total { display: none; }
          .composition-table tbody .composition-life-row td:nth-child(2) { font-size: 10px; overflow-wrap: anywhere; text-align: left; }
        }
        @media print { .proposal-data-table-wrap { box-shadow: none; } }
      </style>
      <section><div class="section-heading"><h2>Principais condições do plano</h2><p>Características cadastradas para os planos comparados. A rede disponível deve ser confirmada para a região e o contrato.</p></div><div class="proposal-data-table-wrap"><table class="proposal-table network-table"><thead><tr><th>CARACTERÍSTICA</th>${comparisonHeaders}</tr></thead><tbody>${networkRows}</tbody></table></div></section>
      ${footer(2)}
    </section>
    <div class="actions"><button onclick="window.print()">▣ &nbsp; Imprimir / Salvar em PDF</button></div>
    ${printOnLoad}
  </body></html>`;
}

export async function carregarPropostaSalvaSimuladorSaude(id) {
  if (!id) throw new Error('Informe a cotação que deseja visualizar.');
  const quoteResponse = await chamarApi('getSimuladorSaudeQuoteById', { id });
  if (!quoteResponse.ok) throw new Error(quoteResponse.message || 'Não foi possível carregar a cotação.');
  if (!quoteResponse.data) throw new Error('Cotação não encontrada ou sem acesso.');
  const [catalogResponse, brandingResponse] = await Promise.all([
    chamarApi('getSimuladorSaudeCatalog'),
    chamarApi('getSimuladorSaudeBrokerBranding')
  ]);
  if (!catalogResponse.ok) throw new Error(catalogResponse.message || 'Não foi possível carregar o catálogo de planos.');

  const previousQuote = { ...quote };
  try {
    applySavedQuote(quoteResponse.data);
    quote.catalog = catalogResponse.data || { operators: [], plans: [], tables: [], bands: [] };
    const branding = brandingResponse.ok ? brandingResponse.data || {} : {};
    return proposalHtml(branding, quoteResponse.data, { autoPrint: false });
  } finally {
    Object.assign(quote, previousQuote);
  }
}

window.saudeQuoteProposal = async () => {
  const selected = quote.plans.filter(item => item.selected);
  if (!selected.length) { quote.notice = 'Selecione ao menos um plano para gerar a proposta.'; rerender(); return; }
  if (!quote.lives.length) { quote.notice = 'Adicione vidas antes de gerar a proposta.'; rerender(); return; }
  const incomplete = selected.some(item => planTotal(item.tableId) === null);
  if (incomplete && !window.confirm('Há planos com preços indisponíveis. A proposta os identificará como cotação incompleta. Deseja continuar?')) return;
  const proposalWindow = window.open('about:blank', '_blank');
  if (!proposalWindow) { quote.notice = 'Permita a abertura de nova janela para preparar o PDF.'; rerender(); return; }
  quote.saving = true; quote.notice = ''; rerender();
  try {
    const saved = await persistCurrentQuote('proposta');
    const brandingResponse = await chamarApi('getSimuladorSaudeBrokerBranding');
    const branding = brandingResponse.ok ? brandingResponse.data || {} : {};
    const proposalBlob = new Blob([proposalHtml(branding, saved)], { type: 'text/html;charset=utf-8' });
    const proposalUrl = URL.createObjectURL(proposalBlob);
    proposalWindow.location = proposalUrl;
    window.setTimeout(() => URL.revokeObjectURL(proposalUrl), 5 * 60 * 1000);
    quote.notice = 'Proposta pronta. Na janela aberta, escolha “Salvar como PDF” no diálogo de impressão.';
  } catch (error) {
    proposalWindow.close(); quote.notice = error.message || 'Não foi possível preparar a proposta.';
  } finally { quote.saving = false; rerender(); }
};
