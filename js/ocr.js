/* Распознавание этикетки по фото: Tesseract.js в браузере + поиск владельца по ID-коду или имени */
const OCR = { state: null, worker: null, onPick: null, mode: 'modal' };

const DEMO_LABELS = [
  { key: 'id', title: 'С ID-кодом', carrier: 'UPS GROUND', track: '1Z999AA10400100001', from: ['AMAZON.COM SERVICES', '1850 MERCER RD', 'LEXINGTON KY 40511'], to: ['YERLAN SAPAROV', '1201 N ORANGE ST, SUITE 7', 'WY-10388', 'WILMINGTON DE 19801'] },
  { key: 'name', title: 'Без ID — только имя', carrier: 'USPS PRIORITY MAIL', track: '9400111899561234567890', from: ['IHERB LLC', '17400 LAGUNA CANYON RD', 'IRVINE CA 92618'], to: ['DINARA AKHMETOVA', '1201 N ORANGE ST', 'SUITE 7', 'WILMINGTON DE 19801'] },
  { key: 'typo', title: 'Имя с ошибкой', carrier: 'FEDEX HOME DELIVERY', track: '783456120987', from: ['SEPHORA USA INC', '350 MISSION ST', 'SAN FRANCISCO CA 94105'], to: ['MADINA ZHUMABAEVA', '1201 NORTH ORANGE STREET', 'WILMINGTON DE 19801'] },
  { key: 'unknown', title: 'Неизвестный получатель', carrier: 'UPS GROUND', track: '1Z999AA10400100099', from: ['EBAY SELLER 77', '45 MAIN ST', 'AUSTIN TX 78701'], to: ['JOHN SMITH', '1201 N ORANGE ST', 'WILMINGTON DE 19801'] },
];

function drawLabel(lbl) {
  const W = 760, H = 980, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#c9a26b'; g.fillRect(0, 0, W, H);                 // картон
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,80,30,${Math.random() * .08})`; g.fillRect(Math.random() * W, 0, 2, H); }
  const x0 = 50, y0 = 50, w = W - 100, h = H - 100;
  g.fillStyle = '#fff'; g.fillRect(x0, y0, w, h);
  g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(x0, y0, w, h);
  g.fillStyle = '#111';
  g.font = 'bold 44px Arial'; g.fillText(lbl.carrier, x0 + 24, y0 + 64);
  g.fillRect(x0, y0 + 90, w, 4);
  g.font = 'bold 20px Arial'; g.fillText('SHIP FROM:', x0 + 24, y0 + 128);
  g.font = '22px Arial'; lbl.from.forEach((l, i) => g.fillText(l, x0 + 24, y0 + 160 + i * 28));
  g.fillRect(x0, y0 + 260, w, 2);
  g.font = 'bold 24px Arial'; g.fillText('SHIP TO:', x0 + 24, y0 + 302);
  g.font = 'bold 40px Arial'; lbl.to.forEach((l, i) => g.fillText(l, x0 + 24, y0 + 356 + i * 52));
  const by = y0 + 600;
  g.fillRect(x0, by - 20, w, 4);
  g.font = 'bold 30px Arial'; g.fillText('TRACKING #: ' + lbl.track, x0 + 24, by + 30);
  let x = x0 + 40, s = lbl.track.split('').reduce((a, c) => a + c.charCodeAt(0), 7);
  while (x < x0 + w - 40) { s = (s * 9301 + 49297) % 233280; const bw = 2 + (s % 5); g.fillRect(x, by + 80, bw, 170); x += bw + 2 + (s % 4); }
  return cv.toDataURL('image/jpeg', 0.9);
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if ([...document.scripts].some(s => s.src === src)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Не удалось загрузить ' + src));
    document.head.appendChild(s);
  });
}

/* ---------- Сопоставление текста с клиентами ---------- */
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length);

function matchLabel(text) {
  const up = String(text).toUpperCase();
  const res = { ids: [], names: [], track: null, recipientBlock: up };
  // 1) ID-код: WY-12345 с поправкой на типичные ошибки OCR (O→0, I/L→1, S→5, B→8)
  const re = /W\s*[YV]\s*[-–—_.:\s]?\s*([0-9OILSBZ]{5})(?![0-9])/g;
  let m;
  while ((m = re.exec(up))) {
    const digits = m[1].replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
    const id = 'WY-' + digits, c = clientById(id);
    res.ids.push({ raw: m[0], id, client: c });
  }
  const tr = up.match(/(?:TRACKING\s*#?:?\s*)([A-Z0-9 ]{10,30})/);
  if (tr) res.track = tr[1].replace(/\s/g, '');
  // 2) Имя: берём блок получателя (после SHIP TO / TO:), игнорируя отправителя
  const toIdx = up.search(/SHIP\s*TO|\bTO\s*:|DELIVER\s*TO|RECIPIENT/);
  let block = toIdx >= 0 ? up.slice(toIdx).replace(/^(SHIP\s*TO|TO|DELIVER\s*TO|RECIPIENT)\s*:?/, '') : up;
  const trIdx = block.search(/TRACKING/);
  if (trIdx > 0) block = block.slice(0, trIdx);
  res.recipientBlock = block.trim();
  const tokens = block.replace(/[^A-Z\s.]/g, ' ').split(/\s+/).map(x => x.replace(/\./g, '')).filter(x => x.length >= 1);
  const stop = new Set(['ST', 'STE', 'SUITE', 'N', 'NORTH', 'ORANGE', 'STREET', 'RD', 'DE', 'WILMINGTON', 'UNIT', 'APT', 'USA', 'US']);
  const words = tokens.filter(x => !stop.has(x));
  for (const c of DB.clients) {
    const parts = c.latin.split(/\s+/);
    let total = 0;
    const hits = [];
    for (const part of parts) {
      let best = 0, bestTok = '';
      for (const tk of words) {
        let s = tk.length === 1 ? (tk === part[0] ? 0.55 : 0) : sim(tk, part);
        if (s > best) { best = s; bestTok = tk; }
      }
      total += best; hits.push(bestTok);
    }
    const score = Math.round((total / parts.length) * 100);
    if (score >= 55) res.names.push({ client: c, score, hits });
  }
  res.names.sort((a, b) => b.score - a.score);
  res.names = res.names.slice(0, 3);
  return res;
}

/* ---------- UI ---------- */
OCR.open = (onPick, opts = {}) => {
  OCR.onPick = onPick; OCR.mode = 'modal';
  OCR.state = { img: opts.img || null, demo: null, text: '', result: null, busy: false, progress: 0, status: '', simulated: false };
  openModal(`${ic('scan-search')} Распознавание этикетки по фото`, `<div id="ocr-panel"></div>`, { wide: true, noFocus: true });
  OCR.paint();
};
OCR.inline = (onPick) => {
  OCR.onPick = onPick; OCR.mode = 'inline';
  if (!OCR.state || OCR.state.mode !== 'inline') OCR.state = { mode: 'inline', img: null, demo: null, text: '', result: null, busy: false, progress: 0, status: '', simulated: false };
  onMount(OCR.paint);
  return `<div id="ocr-panel"></div>`;
};
OCR.paint = () => {
  const el = $('#ocr-panel');
  if (!el) return;
  const s = OCR.state;
  const r = s.result;
  let hl = esc(s.text);
  if (r) {
    r.ids.forEach(x => { hl = hl.split(esc(x.raw)).join(`<mark>${esc(x.raw)}</mark>`); });
    if (!r.ids.length) r.names[0]?.hits.forEach(h => { if (h.length > 2) hl = hl.replace(new RegExp(`\\b${h}\\b`, 'g'), `<mark>${h}</mark>`); });
  }
  let verdict = '';
  if (r) {
    const idHit = r.ids.find(x => x.client);
    if (idHit) {
      const nameOk = r.names.find(n => n.client.id === idHit.client.id);
      verdict = `<div class="notice ok mb">${ic('circle-check')} Найден ID-код <b class="mono">${idHit.id}</b> — владелец определён однозначно${nameOk ? ' (имя на этикетке совпадает)' : ''}.</div>${matchCard(idHit.client, 100, 'ID-код на этикетке', true)}`;
    } else if (r.names.length) {
      const top = r.names[0];
      verdict = `<div class="notice ${top.score >= 85 ? 'ok' : 'warn'} mb">${r.ids.length ? `${ic('triangle-alert')} Найден код <b>${esc(r.ids[0].id)}</b>, но такого клиента нет. ` : 'ID-код не найден. '}Ищем по имени получателя: ${top.score >= 85 ? 'уверенное совпадение.' : 'проверьте вручную.'}</div>
        ${r.names.map((n, i) => matchCard(n.client, n.score, 'Имя: ' + n.hits.join(' '), i === 0 && n.score >= 85)).join('')}`;
    } else {
      verdict = `<div class="notice err mb">${ic('circle-x')} Владелец не найден — ни ID-кода, ни похожего имени. Посылку можно отправить в «Нераспознанные»: клиент заявит её по трек-номеру.</div>
        <button class="btn danger" data-action="ocr-pick" data-id="">Отправить в нераспознанные</button>`;
    }
  }
  el.innerHTML = `<div class="grid g2">
    <div>
      <div class="scan-box">
        <div class="row mb-s"><label class="btn"><input type="file" accept="image/*" capture="environment" hidden data-change="ocr-file">${ic('camera')} Фото / загрузить</label><span class="muted small">или демо-этикетка:</span></div>
        <div class="chips">${DEMO_LABELS.map(l => `<button class="chip ${s.demo === l.key ? 'active' : ''}" data-action="ocr-demo" data-key="${l.key}">${l.title}</button>`).join('')}</div>
      </div>
      ${s.img ? `<img class="label-preview mt" src="${s.img}" alt="Этикетка">
        <button class="btn accent block lg mt" data-action="ocr-run" ${s.busy ? 'disabled' : ''}>${s.busy ? `<span class="spinner"></span> ${esc(s.status)} ${s.progress ? Math.round(s.progress * 100) + '%' : ''}` : `${ic('scan-search')} Распознать`}</button>`
      : `<div class="empty"><div class="ico">${ic('tag')}</div>Сфотографируйте этикетку посылки или выберите демо-пример</div>`}
    </div>
    <div>
      <h4>Распознанный текст ${s.simulated ? '<span class="badge orange">офлайн-симуляция</span>' : s.text ? '<span class="badge green">Tesseract OCR</span>' : ''}</h4>
      ${s.text ? `<div class="ocr-text">${hl}</div>` : '<div class="ocr-text" style="color:#64748b">— ожидание —</div>'}
      ${r?.track ? `<div class="small mt-s">Трек с этикетки: <b class="mono">${esc(r.track)}</b></div>` : ''}
      <h4 class="mt">Владелец посылки</h4>${verdict || '<p class="muted small">Алгоритм: 1) ищем ID-код вида WY-12345 (с исправлением типичных ошибок OCR: O→0, I→1, S→5); 2) если кода нет — нечётко сравниваем имя из блока «SHIP TO» с латинскими именами клиентов (расстояние Левенштейна, инициалы).</p>'}
    </div></div>`;
};
function matchCard(c, score, reason, best) {
  const color = score >= 85 ? 'var(--green)' : score >= 70 ? 'var(--orange)' : 'var(--red)';
  return `<div class="match ${best ? 'best' : ''}"><div class="score" style="color:${color}">${score}%</div>${avatar(c.name)}<div class="grow"><b>${esc(c.name)}</b> <span class="mono small">${c.id}</span><div class="muted small">${esc(c.latin)} · ${esc(reason)}</div></div>
    <button class="btn ${best ? 'success' : 'secondary'} sm" data-action="ocr-pick" data-id="${c.id}">Выбрать</button></div>`;
}
A['ocr-demo'] = el => {
  const l = DEMO_LABELS.find(x => x.key === el.dataset.key);
  Object.assign(OCR.state, { img: drawLabel(l), demo: l.key, text: '', result: null, simulated: false });
  OCR.paint();
};
CH['ocr-file'] = async el => {
  const f = el.files?.[0]; if (!f) return;
  Object.assign(OCR.state, { img: await readImage(f, 1600), demo: null, text: '', result: null, simulated: false });
  OCR.paint();
};
A['ocr-run'] = async () => {
  const s = OCR.state;
  if (!s.img || s.busy) return;
  s.busy = true; s.status = 'Загрузка OCR-движка…'; s.progress = 0; OCR.paint();
  try {
    await Promise.race([
      (async () => {
        await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
        if (!OCR.worker) {
          OCR.worker = await Tesseract.createWorker('eng', 1, {
            logger: m => { if (OCR.state) { OCR.state.status = m.status === 'recognizing text' ? 'Распознавание…' : 'Загрузка модели…'; OCR.state.progress = m.progress || 0; OCR.paint(); } },
          });
          // PSM 4 — «одна колонка текста переменного размера»: лучше всего подходит для этикеток перевозчиков
          await OCR.worker.setParameters({ tessedit_pageseg_mode: '4' });
        }
        const { data } = await OCR.worker.recognize(s.img);
        s.text = data.text.trim();
      })(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000)),
    ]);
  } catch (e) {
    console.warn('OCR fallback:', e);
    const l = DEMO_LABELS.find(x => x.key === s.demo);
    if (l) { s.text = [l.carrier, 'SHIP FROM:', ...l.from, 'SHIP TO:', ...l.to, 'TRACKING #: ' + l.track].join('\n'); s.simulated = true; toast('Нет доступа к OCR-движку (CDN) — показан симулированный результат', 'err'); }
    else { s.busy = false; OCR.paint(); return toast('Не удалось распознать: нет доступа к OCR-движку', 'err'); }
  }
  s.busy = false;
  s.result = matchLabel(s.text);
  const idHit = s.result.ids.find(x => x.client), top = s.result.names[0];
  logAction('warehouse', `OCR этикетки: ${idHit ? idHit.id + ' (по ID)' : top ? `${top.client.id} (по имени, ${top.score}%)` : 'владелец не найден'}`);
  OCR.paint();
};
A['ocr-pick'] = el => {
  const s = OCR.state;
  const info = { clientId: el.dataset.id || null, labelText: s.text, track: s.result?.track, source: s.result?.ids.find(x => x.client) ? 'ID-код (OCR)' : 'Имя (OCR)', img: s.img };
  if (OCR.mode === 'modal') closeModal();
  OCR.onPick?.(info);
};
