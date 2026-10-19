/* Складская система: приёмка, OCR, нераспознанные, хранение, услуги, партии, выдача */
const WH = {};
let RX = null; // состояние текущей приёмки
const whc = () => DB.session.whCountry;
const whParcels = () => DB.parcels.filter(p => p.country === whc());

WH.render = (parts, q) => {
  const page = parts[0] || 'dashboard';
  const ps = whParcels();
  const unid = ps.filter(p => p.status === 'unidentified').length;
  const tasks = DB.serviceRequests.filter(s => s.status === 'new' && parcelById(s.parcelIds[0])?.country === whc()).length;
  const ready = ps.filter(p => p.status === 'ready').length;
  const nav = [
    { group: 'Склад ' + flag(whc()) + ' ' + esc(countryBy(whc()).name) },
    { key: 'dashboard', icon: ic('layout-dashboard'), label: 'Сводка', short: 'Сводка' },
    { key: 'receive', icon: ic('package-plus'), label: 'Приёмка', short: 'Приёмка' },
    { key: 'ocr', icon: ic('scan-search'), label: 'OCR этикетки', short: 'OCR' },
    { key: 'unidentified', icon: ic('circle-help'), label: 'Нераспознанные', count: unid },
    { key: 'stock', icon: ic('archive'), label: 'Хранение', short: 'Склад' },
    { key: 'tasks', icon: ic('wrench'), label: 'Заявки на услуги', count: tasks },
    { key: 'batches', icon: ic('plane'), label: 'Партии', short: 'Партии', count: ready },
    { group: 'Казахстан' },
    { key: 'issue', icon: ic('store'), label: 'Выдача посылок', short: 'Выдача' },
  ];
  const pages = { dashboard: WH.dashboard, receive: WH.receive, ocr: WH.ocrPage, unidentified: WH.unidentified, stock: WH.stock, tasks: WH.tasks, batches: WH.batches, batch: WH.batch, issue: WH.issue };
  const sel = `<select data-change="wh-country" style="width:auto">${DB.countries.filter(c => c.active).map(c => `<option value="${c.code}" ${c.code === whc() ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
  const userCard = `<div class="user-card"><div class="muted small mb-s">Склад</div>${sel}<div class="row nowrap mt-s">${avatar(STAFF.warehouse(), 28)}<span class="small"><b>${esc(STAFF.warehouse())}</b><br><span class="muted">Оператор склада</span></span></div></div>`;
  const content = (pages[page] || WH.dashboard)(parts.slice(1), q);
  return cabinetLayout({ area: 'warehouse', brandSub: 'Складская система', nav, current: page === 'batch' ? 'batches' : page, content, userCard,
    mobileNav: [nav[1], nav[2], nav[3], nav[5], nav[7]].map(n => ({ ...n, short: n.short || n.label })), mobileRight: sel });
};
CH['wh-country'] = el => { DB.session.whCountry = el.value; RX = null; Store.save(); render(); };

WH.dashboard = () => {
  const ps = whParcels();
  const by = st => ps.filter(p => p.status === st).length;
  const today = DB.parcels.filter(p => p.country === whc() && p.history.some(h => h.status === 'received' && daysSince(h.date) < 1)).length;
  const old = ps.filter(p => ['received', 'unidentified'].includes(p.status) && storageDays(p) > DB.settings.storageFreeDays);
  const tasks = DB.serviceRequests.filter(s => s.status === 'new' && parcelById(s.parcelIds[0])?.country === whc());
  return `${pageHead(`Склад ${flag(whc())} ${esc(countryBy(whc()).name)}`, '', `<a class="btn lg" href="#/warehouse/receive">${ic('package-plus')} Начать приёмку</a>`)}
  <div class="grid g4 mb">
    ${[['Ожидается (предзаявки)', by('expected'), ic('clock')], ['Принято сегодня', today, ic('package-plus')], ['На хранении', by('received') + by('consolidating'), ic('archive')], ['Готово к отправке', by('ready'), ic('plane')]]
      .map(([l, v, i]) => `<div class="card"><div class="stat"><span class="l">${i} ${l}</span><span class="v">${v}</span></div></div>`).join('')}
  </div>
  <div class="grid g3">
    <div class="card"><div class="card-head"><h3>${ic('circle-help')} Нераспознанные</h3><a href="#/warehouse/unidentified">Открыть</a></div><div class="stat"><span class="v" style="color:var(--red)">${by('unidentified')}</span><span class="l">ждут привязки к клиенту</span></div></div>
    <div class="card"><div class="card-head"><h3>${ic('wrench')} Заявки на услуги</h3><a href="#/warehouse/tasks">Открыть</a></div>${tasks.slice(0, 4).map(s => `<div class="small mb-s">${SERVICES[s.type].icon} ${SERVICES[s.type].name} · ${s.parcelIds.join(', ')}</div>`).join('') || '<p class="muted">Нет новых</p>'}</div>
    <div class="card"><div class="card-head"><h3>${ic('alarm-clock')} Долгое хранение</h3></div>${old.map(p => `<div class="small mb-s">${p.id} · ${p.cell} · ${storageDays(p)} дн.</div>`).join('') || '<p class="muted">Нет посылок дольше ' + DB.settings.storageFreeDays + ' дней</p>'}</div>
  </div>`;
};

/* ---------- Приёмка ---------- */
function rxReset() { RX = { step: 'scan', track: '', parcel: null, clientId: null, source: '', weight: '', l: '', w: '', h: '', cell: suggestCell(), photos: [], labelText: '' }; }
function suggestCell() {
  const used = new Set(DB.parcels.filter(p => p.cell && !['delivered', 'merged'].includes(p.status)).map(p => p.cell));
  const zone = { US: 'A', GB: 'G', DE: 'D', ES: 'E', CN: 'C' }[whc()] || 'Z';
  for (let r = 1; r < 10; r++) for (let s = 1; s < 6; s++) { const c = `${zone}-0${r}-${s}`; if (!used.has(c)) return c; }
  return zone + '-99-1';
}
WH.receive = () => {
  if (!RX || RX.country !== whc()) { rxReset(); RX.country = whc(); }
  const expected = whParcels().filter(p => p.status === 'expected');
  const scanned = RX.step !== 'scan';
  const exp = RX.parcel;
  const client = clientById(RX.clientId);
  if (!scanned) onMount(() => $('#rx-track')?.focus());
  return `${pageHead(`${ic('package-plus')} Приёмка посылки`, `Склад ${flag(whc())}`, scanned ? '<button class="btn secondary" data-action="rx-reset">Новая приёмка</button>' : '')}
  <div class="grid g-side"><div>
    <div class="card mb"><h3>1. Сканирование трек-номера</h3>
      ${scanned ? `<div class="row between"><div><div class="mono" style="font-size:20px;font-weight:700">${esc(RX.track)}</div>${exp ? `<span class="badge green">${ic('check')} Найдена предзаявка ${exp.id}</span>` : '<span class="badge orange">Предзаявки нет</span>'}</div><button class="btn ghost sm" data-action="rx-reset">Изменить</button></div>`
      : `<form class="row nowrap" data-form="rx-scan"><input id="rx-track" name="track" class="big" placeholder="Сканируйте штрихкод или введите трек" autocomplete="off"><button class="btn lg">OK</button></form>
        <p class="muted small mt-s">Ручной сканер работает как клавиатура: считал → Enter. Предзаявки клиентов на этот склад:</p>
        <div class="chips">${expected.map(p => `<button class="chip mono" data-action="rx-fill" data-track="${p.track}">${p.track}</button>`).join('') || '<span class="muted small">нет</span>'}<button class="chip" data-action="rx-fill" data-track="NEW${Date.now().toString().slice(-9)}">${ic('plus')} без предзаявки</button></div>`}
    </div>
    ${scanned ? `
    <div class="card mb"><h3>2. Владелец посылки</h3>
      ${client ? `<div class="row between">${clientChip(client.id)}<div class="right"><span class="badge green">${esc(RX.source)}</span>${exp ? '' : '<br><button class="btn ghost sm mt-s" data-action="rx-client-clear">Сменить</button>'}</div></div>
        ${exp?.items.length ? `<div class="muted small mt">Декларация клиента: ${esc(exp.items.map(i => `${i.name} ×${i.qty}`).join(', '))}</div>` : ''}
        ${exp?.services.length ? `<div class="notice warn mt">Клиент заказал: ${exp.services.map(s => SERVICES[s.type].icon + ' ' + SERVICES[s.type].name).join(', ')}</div>` : ''}`
      : `<div class="notice warn mb">Клиент не добавил этот трек. Определите владельца по ID-коду на этикетке (строка Address 2) или распознайте фото этикетки.</div>
        <form class="row nowrap" data-form="rx-client"><input name="id" placeholder="WY-10427" class="mono" list="clients-dl"><datalist id="clients-dl">${DB.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</datalist><button class="btn secondary">Найти</button></form>
        <div class="row mt-s"><button class="btn accent" data-action="rx-ocr">${ic('camera')} Распознать этикетку по фото</button><span class="muted small">или примите как нераспознанную</span></div>`}
    </div>
    <div class="card mb"><h3>3. Взвешивание и замеры</h3>
      <div class="grid g4"><label class="field"><span>Вес, кг</span><input id="rx-weight" type="number" step="0.01" value="${RX.weight}" data-input="rx-field" data-k="weight"></label>
        <label class="field"><span>Длина, см</span><input type="number" value="${RX.l}" data-input="rx-field" data-k="l"></label><label class="field"><span>Ширина, см</span><input type="number" value="${RX.w}" data-input="rx-field" data-k="w"></label><label class="field"><span>Высота, см</span><input type="number" value="${RX.h}" data-input="rx-field" data-k="h"></label></div>
      <div class="row"><button class="btn secondary sm" data-action="rx-scale">${ic('scale')} Считать с весов</button><button class="btn secondary sm" data-action="rx-dims">${ic('ruler')} Сканер габаритов</button><span class="muted small" id="rx-calc"></span></div>
    </div>
    <div class="card mb"><h3>4. Фото и ячейка</h3>
      <div class="row mb"><label class="btn secondary"><input type="file" accept="image/*" capture="environment" multiple hidden data-change="rx-photo">${ic('camera')} Сделать фото</label><button class="btn ghost sm" data-action="rx-demo-photo">Демо-фото</button></div>
      <div class="photos mb">${RX.photos.map((ph, i) => `<img src="${photoSrc({ id: 'RX', track: RX.track, clientId: RX.clientId, cell: RX.cell, weight: RX.weight }, ph, i)}" data-action="zoom">`).join('') || '<span class="muted small">Минимум 1 фото — клиент увидит его в кабинете</span>'}</div>
      <label class="field" style="max-width:220px"><span>Ячейка хранения</span><input value="${RX.cell}" data-input="rx-field" data-k="cell" class="mono"></label>
    </div>
    <button class="btn ${client ? 'success' : 'danger'} lg block" data-action="rx-accept">${client ? `${ic('circle-check')} Принять на склад → ${client.id}` : `${ic('circle-help')} Принять как нераспознанную`}</button>` : ''}
  </div>
  <div><div class="card"><h4>Подсказка оператору</h4><ol class="muted small" style="padding-left:18px;line-height:1.9">
    <li>Отсканируйте трек — система найдёт предзаявку клиента.</li><li>Нет предзаявки → ищем ID-код WY-xxxxx на этикетке, вводим вручную или через OCR.</li>
    <li>Нет кода → OCR найдёт клиента по имени получателя.</li><li>Взвесьте, измерьте, сфотографируйте.</li><li>Наклейте внутренний стикер с ячейкой.</li></ol>
    <p class="small">Клиент мгновенно получит уведомление в Telegram/WhatsApp/Email/Push.</p></div>
    ${RX.labelText ? `<div class="card mt"><h4>Текст этикетки (OCR)</h4><div class="ocr-text">${esc(RX.labelText)}</div></div>` : ''}</div></div>`;
};
A['rx-reset'] = () => { rxReset(); RX.country = whc(); render(); };
A['rx-fill'] = el => F['rx-scan']({ track: el.dataset.track });
F['rx-scan'] = d => {
  const track = d.track.trim().toUpperCase();
  if (!track) return;
  const p = DB.parcels.find(x => x.track.toUpperCase() === track);
  if (p && p.status !== 'expected') return toast(`Трек уже принят: ${p.id} (${STATUS[p.status].label})`, 'err');
  if (p && p.country !== whc()) toast(`Внимание: предзаявка на склад ${flag(p.country)}, а вы на ${flag(whc())}`, 'err');
  Object.assign(RX, { step: 'measure', track, parcel: p || null, clientId: p?.clientId || null, source: p ? 'Предзаявка клиента' : '' });
  render();
};
F['rx-client'] = d => {
  const id = d.id.trim().toUpperCase().replace(/^WY(\d)/, 'WY-$1');
  const c = clientById(id) || DB.clients.find(x => x.name.toLowerCase().includes(d.id.trim().toLowerCase()) || x.latin.includes(d.id.trim().toUpperCase()));
  if (!c) return toast('Клиент не найден', 'err');
  RX.clientId = c.id; RX.source = 'Введён вручную'; render();
};
A['rx-client-clear'] = () => { RX.clientId = null; render(); };
A['rx-ocr'] = () => OCR.open(info => {
  if (info.clientId) { RX.clientId = info.clientId; RX.source = info.source; }
  RX.labelText = info.labelText;
  if (info.img && !RX.photos.length) RX.photos.push(info.img);
  render();
  if (!info.clientId) toast('Владелец не найден — посылка будет принята как нераспознанная');
});
CH['rx-field'] = el => {
  RX[el.dataset.k] = el.value;
  if (RX.weight) {
    const r = calcShipping(whc(), +RX.weight, { l: +RX.l, w: +RX.w, h: +RX.h });
    $('#rx-calc').textContent = `Объёмный: ${r.vol} кг · к оплате ${r.chargeable} кг · ${usd(r.cost)}`;
  }
};
A['rx-scale'] = () => { RX.weight = (0.3 + Math.random() * 4).toFixed(2); render(); toast(`${ic('scale')} Вес получен с весов (USB/Bluetooth): ` + RX.weight + ' кг'); };
A['rx-dims'] = () => { Object.assign(RX, { l: 20 + Math.round(Math.random() * 30), w: 15 + Math.round(Math.random() * 20), h: 5 + Math.round(Math.random() * 20) }); render(); };
A['rx-demo-photo'] = () => { RX.photos.push('gen:' + (RX.photos.length % 2 + 1)); render(); };
CH['rx-photo'] = async el => { for (const f of el.files) RX.photos.push(await readImage(f)); render(); };
A['rx-accept'] = () => {
  if (!(+RX.weight > 0)) return toast('Укажите вес', 'err');
  const c = clientById(RX.clientId);
  let p = RX.parcel;
  if (!p) {
    p = { id: 'P-' + (++DB.seq.parcel), track: RX.track, store: '—', clientId: c?.id || null, country: whc(), status: 'expected', items: [], createdAt: new Date().toISOString(), photos: [], batchId: null, paid: false, cost: null,
      delivery: c ? (c.defaultDelivery || { method: 'pickup', pointId: c.defaultPoint || 'PT-1' }) : null, services: [], history: [] };
    DB.parcels.unshift(p);
  }
  Object.assign(p, { weight: +RX.weight, dims: RX.l ? { l: +RX.l, w: +RX.w, h: +RX.h } : null, cell: RX.cell, photos: RX.photos.length ? RX.photos : ['gen:1', 'gen:2'], labelText: RX.labelText || p.labelText });
  if (c) {
    p.clientId = c.id;
    setParcelStatus(p, 'received', `Принята на склад ${countryBy(whc()).name}. ${RX.source}`);
    // запланированные при добавлении услуги — создаём заявки, оплата вместе с доставкой
    p.services.filter(s => s.status === 'planned').forEach(s => {
      const sv = SERVICES[s.type];
      const sr = { id: nextId('SR-', 'sr'), clientId: c.id, parcelIds: [p.id], type: s.type, status: 'new', createdAt: new Date().toISOString(), price: sv.price, comment: 'Заказано при добавлении посылки', paid: false };
      DB.serviceRequests.unshift(sr); s.status = 'new'; s.srId = sr.id;
    });
    // связь с выкупом
    const by = DB.buyouts.find(b => b.track && b.track.toUpperCase() === p.track.toUpperCase());
    if (by) { by.status = 'done'; p.store = p.store === '—' ? 'Выкуп ' + by.id : p.store; if (!p.items.length) p.items = by.items.map(i => ({ name: i.title, qty: i.qty, price: i.actual ?? i.price })); }
    notify(c.id, `Посылка ${p.id} (${p.store}) поступила на склад ${countryBy(whc()).name}: ${kg(p.weight)}, к оплате ${usd(parcelCost(p))}`);
  } else {
    setParcelStatus(p, 'unidentified', 'Владелец не определён');
  }
  logAction('warehouse', `Принята посылка ${p.track} → ${c ? c.id : 'НЕРАСПОЗНАННЫЕ'}, ${p.weight} кг, ячейка ${p.cell}`);
  Store.save();
  const done = p;
  rxReset(); RX.country = whc(); render();
  printSticker(done);
};
function printSticker(p) {
  const c = clientById(p.clientId);
  const bars = Array.from({ length: 46 }, (_, i) => `<rect x="${i * 6}" y="0" width="${(i * 7 + p.id.length) % 3 + 1.5}" height="50"/>`).join('');
  openModal(`${ic('circle-check')} Посылка принята`, `<div id="sticker" style="border:3px solid #111;border-radius:12px;padding:16px;max-width:340px;margin:0 auto;font-family:ui-monospace,monospace">
    <div class="row between"><b style="font-size:13px">WAY · ${p.country}</b><b style="font-size:13px">${fdate(new Date())}</b></div>
    <div style="font-size:42px;font-weight:800;text-align:center;margin:8px 0">${c ? c.id : '??????'}</div>
    <div class="row between"><span>Ячейка</span><b style="font-size:22px">${esc(p.cell)}</b></div><div class="row between"><span>Посылка</span><b>${p.id}</b></div><div class="row between"><span>Вес</span><b>${kg(p.weight)}</b></div>
    <svg viewBox="0 0 276 50" style="width:100%;margin-top:10px">${bars}</svg><div class="center small">${esc(p.track)}</div></div>
    <div class="modal-foot"><button class="btn secondary" data-action="modal-close">Закрыть</button><button class="btn" onclick="window.print()">${ic('printer')} Печать стикера</button></div>`);
}

/* ---------- OCR как отдельный экран ---------- */
WH.ocrPage = () => `${pageHead(`${ic('scan-search')} Распознавание этикетки`, 'Определение владельца посылки по фото')}
  <div class="notice mb">Сфотографируйте этикетку перевозчика. Система найдёт персональный ID-код (WY-xxxxx), а если его нет — сопоставит имя получателя с базой клиентов. Работает прямо в браузере на телефоне/планшете оператора (Tesseract OCR); в боевой версии можно подключить облачный OCR (Google Vision / Яндекс Vision) для рукописных этикеток.</div>
  <div class="card">${OCR.inline(info => {
    rxReset(); RX.country = whc();
    Object.assign(RX, { step: 'measure', track: info.track || ('NEW' + Date.now().toString().slice(-9)), clientId: info.clientId, source: info.clientId ? info.source : '', labelText: info.labelText, photos: info.img ? [info.img] : [] });
    location.hash = '#/warehouse/receive';
    toast(info.clientId ? 'Владелец определён — продолжите приёмку' : 'Продолжите приёмку как нераспознанную');
  })}</div>`;

/* ---------- Нераспознанные ---------- */
WH.unidentified = () => {
  const list = DB.parcels.filter(p => p.status === 'unidentified');
  return `${pageHead(`${ic('circle-help')} Нераспознанные посылки`, 'Все склады', '')}
  <div class="notice mb">Посылки без ID-кода и без совпадения по имени. Клиент может заявить посылку сам, указав трек-номер в кабинете, — привязка произойдёт автоматически.</div>
  ${list.map(p => {
    const sug = p.labelText ? matchLabel(p.labelText).names : [];
    return `<div class="card mb"><div class="grid" style="grid-template-columns:140px minmax(0,1fr) minmax(0,1fr);gap:16px">
      <img src="${photoSrc(p, p.photos[0], 0)}" style="width:140px;border-radius:10px" data-action="zoom">
      <div><div class="row"><b class="mono">${esc(p.track)}</b>${badge(p.status)}</div><div class="kv mt-s"><div>Склад</div><div>${flag(p.country)} ${p.cell}</div><div>Вес</div><div>${kg(p.weight)}</div><div>На складе</div><div>${storageDays(p)} дн.</div></div>
        ${p.labelText ? `<div class="ocr-text mt-s">${esc(p.labelText)}</div>` : ''}</div>
      <div><h4>Привязать к клиенту</h4>
        ${sug.length ? `<div class="muted small mb-s">Возможные владельцы по имени:</div>${sug.map(n => `<div class="match"><div class="score" style="font-size:14px;width:44px">${n.score}%</div><div class="grow small"><b>${esc(n.client.name)}</b><br><span class="mono muted">${n.client.id}</span></div><button class="btn secondary sm" data-action="unid-assign" data-id="${p.id}" data-client="${n.client.id}">Привязать</button></div>`).join('')}` : ''}
        <form class="row nowrap" data-form="unid-assign"><input type="hidden" name="pid" value="${p.id}"><input name="client" placeholder="WY-xxxxx" list="clients-dl2" class="mono"><button class="btn sm">OK</button></form>
        <datalist id="clients-dl2">${DB.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</datalist>
        <button class="btn ghost sm mt-s" data-action="unid-photo-ocr" data-id="${p.id}">${ic('scan-search')} Распознать новое фото этикетки</button>
      </div></div></div>`;
  }).join('') || `<div class="card">${empty(`Нераспознанных посылок нет ${ic('party-popper')}`, ic('circle-check'))}</div>`}`;
};
function assignUnid(pid, clientId, how) {
  const p = parcelById(pid), c = clientById(clientId);
  if (!c) return toast('Клиент не найден', 'err');
  p.clientId = c.id; p.delivery = c.defaultDelivery || { method: 'pickup', pointId: c.defaultPoint || 'PT-1' };
  setParcelStatus(p, 'received', 'Привязана к клиенту: ' + how);
  notify(c.id, `Найдена ваша посылка ${p.track} на складе ${countryBy(p.country).name}. Заполните декларацию и оплатите доставку.`);
  logAction('warehouse', `Нераспознанная ${p.id} привязана к ${c.id} (${how})`);
  Store.save(); render(); toast(`Посылка привязана к ${c.id}`, 'ok');
}
A['unid-assign'] = el => assignUnid(el.dataset.id, el.dataset.client, 'по имени с этикетки');
F['unid-assign'] = d => assignUnid(d.pid, d.client.trim().toUpperCase(), 'вручную');
A['unid-photo-ocr'] = el => OCR.open(info => { if (info.clientId) assignUnid(el.dataset.id, info.clientId, info.source); });

/* ---------- Хранение ---------- */
WH.stock = (_, q) => {
  const f = q.get('f') || '';
  const list = whParcels().filter(p => ['received', 'consolidating', 'ready', 'unidentified', 'in_batch'].includes(p.status))
    .filter(p => !f || [p.id, p.track, p.cell, p.clientId].join(' ').toLowerCase().includes(f.toLowerCase()));
  return `${pageHead(`${ic('archive')} Хранение`, `Склад ${flag(whc())}`, `<button class="btn secondary" data-action="export-xlsx" data-what="stock">${ic('download')} XLSX</button>`)}
  <form class="row nowrap mb" data-form="stock-search"><input name="f" value="${esc(f)}" placeholder="Поиск: трек, ячейка, ID клиента"><button class="btn secondary">Найти</button></form>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Ячейка</th><th>Посылка</th><th>Клиент</th><th>Вес</th><th>Статус</th><th>Хранение</th><th></th></tr></thead><tbody>
  ${list.map(p => { const d = storageDays(p); return `<tr><td><b class="mono">${esc(p.cell || '—')}</b></td><td><b>${p.id}</b><div class="muted small mono">${esc(p.track)}</div></td><td>${p.clientId ? clientChip(p.clientId) : '<span class="badge red">—</span>'}</td><td>${kg(p.weight)}</td><td>${badge(p.status)}</td>
    <td><span class="${d > DB.settings.storageFreeDays ? 'badge red' : ''}">${d} дн.</span></td><td><button class="btn ghost sm" data-action="move-cell" data-id="${p.id}">Переместить</button></td></tr>`; }).join('') || `<tr><td colspan="7">${empty('Пусто')}</td></tr>`}
  </tbody></table></div>`;
};
F['stock-search'] = d => { location.hash = '#/warehouse/stock?f=' + encodeURIComponent(d.f); };
A['move-cell'] = el => { const p = parcelById(el.dataset.id); const v = prompt('Новая ячейка для ' + p.id, p.cell); if (v) { logAction('warehouse', `${p.id}: ячейка ${p.cell} → ${v}`); p.cell = v.toUpperCase(); Store.save(); render(); } };

/* ---------- Заявки на услуги ---------- */
WH.tasks = () => {
  const list = DB.serviceRequests.filter(s => parcelById(s.parcelIds[0])?.country === whc()).sort((a, b) => (a.status === 'new' ? -1 : 1) - (b.status === 'new' ? -1 : 1));
  return `${pageHead(`${ic('wrench')} Заявки на услуги`, `Склад ${flag(whc())}`)}
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Заявка</th><th>Услуга</th><th>Посылки</th><th>Клиент</th><th>Комментарий</th><th>Статус</th><th></th></tr></thead><tbody>
  ${list.map(s => `<tr><td><b>${s.id}</b><div class="muted small">${fdt(s.createdAt)}</div></td><td>${SERVICES[s.type].icon} ${SERVICES[s.type].name}</td><td class="small">${s.parcelIds.map(id => { const p = parcelById(id); return `${id} <span class="mono muted">${p?.cell || ''}</span>`; }).join('<br>')}</td>
    <td>${clientChip(s.clientId)}</td><td class="small">${esc(s.comment || '—')}</td><td>${badge(s.status, SERVICE_REQ_STATUS)}</td><td>${s.status === 'new' ? `<button class="btn sm" data-action="task-do" data-id="${s.id}">Выполнить</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${empty('Заявок нет')}</td></tr>`}
  </tbody></table></div>`;
};
A['task-do'] = el => {
  const s = byId(DB.serviceRequests, el.dataset.id);
  const ps = s.parcelIds.map(parcelById);
  let body = '';
  // коробка для консолидации: самая большая из исходных, по высоте — сумма высот с уплотнением
  const box = { l: Math.max(...ps.map(p => p.dims?.l || 25)), w: Math.max(...ps.map(p => p.dims?.w || 20)), h: Math.round(ps.reduce((a, p) => a + (p.dims?.h || 10), 0) * 0.8) };
  if (s.type === 'consolidation') body = `<p>Соберите посылки из ячеек: ${ps.map(p => `<b class="mono">${p.cell}</b> (${p.id}, ${kg(p.weight)})`).join(', ')}.</p><p class="muted small">Сумма весов: ${kg(ps.reduce((a, p) => a + p.weight, 0))}. Укажите параметры новой коробки:</p>
    <div class="grid g4"><label class="field"><span>Вес, кг</span><input name="weight" type="number" step="0.01" required value="${(ps.reduce((a, p) => a + p.weight, 0) * 0.9).toFixed(2)}"></label><label class="field"><span>Д</span><input name="l" type="number" value="${box.l}"></label><label class="field"><span>Ш</span><input name="w" type="number" value="${box.w}"></label><label class="field"><span>В</span><input name="h" type="number" value="${box.h}"></label></div>
    <label class="field"><span>Новая ячейка</span><input name="cell" value="${suggestCell()}"></label>`;
  if (s.type === 'photo') body = `<p>Сделайте фото содержимого ${ps[0].id}.</p><label class="btn secondary"><input type="file" name="files" accept="image/*" capture="environment" multiple hidden>${ic('camera')} Добавить фото</label><p class="muted small mt-s">Если фото не выбрано — будут добавлены демо-фото.</p>`;
  if (s.type === 'check') body = `<label class="check"><input type="checkbox" name="ok" checked> Содержимое соответствует декларации</label><label class="field mt-s"><span>Результат проверки</span><textarea name="note">Товары целы, комплектация полная.</textarea></label>`;
  if (s.type === 'repack') body = `<label class="field"><span>Новый вес, кг</span><input name="weight" type="number" step="0.01" value="${(ps[0].weight * 0.85).toFixed(2)}"></label>`;
  if (s.type === 'return') body = `<label class="field"><span>Трек возврата</span><input name="note" value="RET${Date.now().toString().slice(-8)}"></label>`;
  openModal(`${SERVICES[s.type].icon} ${SERVICES[s.type].name} · ${s.id}`, `<form data-form="task-do"><input type="hidden" name="id" value="${s.id}">${s.comment ? `<div class="notice mb">${ic('message-circle')} ${esc(s.comment)}</div>` : ''}${body}<button class="btn success block mt">Готово</button></form>`);
};
F['task-do'] = async (d, form) => {
  const s = byId(DB.serviceRequests, d.id);
  const ps = s.parcelIds.map(parcelById);
  const c = clientById(s.clientId);
  if (s.type === 'consolidation') {
    const np = { id: 'P-' + (++DB.seq.parcel), track: 'CONS-' + s.id.slice(3) + '-' + whc(), store: 'Консолидация (' + ps.length + ')', clientId: c.id, country: ps[0].country, status: 'received', weight: +d.weight, dims: { l: +d.l, w: +d.w, h: +d.h },
      items: ps.flatMap(p => p.items), createdAt: new Date().toISOString(), photos: ['gen:2', 'gen:1'], cell: d.cell, batchId: null, paid: false, cost: null, delivery: ps[0].delivery, services: [], history: [] };
    setParcelStatus(np, 'received', `Объединены: ${ps.map(p => p.id).join(', ')}`);
    ps.forEach(p => { p.mergedInto = np.id; p.cell = null; setParcelStatus(p, 'merged', 'Объединена в ' + np.id); });
    DB.parcels.unshift(np);
    s.resultParcelId = np.id; // стоимость консолидации оплачивается вместе с доставкой новой посылки
    const before = ps.reduce((a, p) => a + calcShipping(p.country, p.weight, p.dims).cost, 0);
    const after = parcelCost(np);
    notify(c.id, `Посылки объединены в ${np.id}: ${kg(np.weight)}, доставка ${usd(after)}${after < before ? ` вместо ${usd(before)} — экономия ${usd(before - after)}` : ''}`);
  } else if (s.type === 'photo') {
    const files = form.querySelector('input[type=file]').files;
    const add = files.length ? await Promise.all([...files].map(f => readImage(f))) : ['gen:2', 'gen:1'];
    ps[0].photos.push(...add);
    notify(c.id, `Фотоотчёт по посылке ${ps[0].id} готов`);
  } else if (s.type === 'check') {
    ps[0].history.unshift({ status: ps[0].status, date: new Date().toISOString(), note: 'Проверка: ' + (d.ok ? '' : 'есть замечания. ') + d.note });
    notify(c.id, `Проверка посылки ${ps[0].id}: ${d.ok ? 'всё в порядке' : 'есть замечания'}`);
  } else if (s.type === 'repack') {
    ps[0].weight = +d.weight; ps[0].history.unshift({ status: ps[0].status, date: new Date().toISOString(), note: 'Переупакована, новый вес ' + d.weight + ' кг' });
    notify(c.id, `Посылка ${ps[0].id} переупакована, новый вес ${kg(ps[0].weight)}`);
  } else if (s.type === 'return') {
    setParcelStatus(ps[0], 'returned', 'Трек возврата ' + d.note); ps[0].cell = null;
    notify(c.id, `Посылка ${ps[0].id} отправлена продавцу, трек ${d.note}`);
  }
  s.status = 'done'; s.doneAt = new Date().toISOString();
  ps.forEach(p => p.services.forEach(x => { if (x.srId === s.id) x.status = 'done'; }));
  logAction('warehouse', `Выполнена услуга ${SERVICES[s.type].name} ${s.id}`);
  Store.save(); closeModal(); render(); toast('Готово', 'ok');
};

/* ---------- Партии ---------- */
WH.batches = (_, q, area = 'warehouse') => {
  const all = area === 'admin' ? q.get('c') : whc();
  const list = DB.batches.filter(b => !all || b.country === all).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ready = whParcels().filter(p => p.status === 'ready');
  return `${pageHead(`${ic('plane')} Партии`, area === 'admin' ? 'Все склады' : `Склад ${flag(whc())}`, area === 'warehouse' ? `<button class="btn" data-action="batch-new" ${ready.length ? '' : 'disabled'}>${ic('plus')} Сформировать партию (${ready.length} готово)</button>` : '')}
  <div class="card mb"><div class="row">${BATCH_FLOW.map((s, i) => `<span class="badge ${BATCH_STATUS[s].color}">${i + 1}. ${BATCH_STATUS[s].label}</span>${i < 3 ? '→' : ''}`).join(' ')}</div><p class="muted small mt-s">Статус партии меняет статусы всех посылок в ней и отправляет уведомления клиентам.</p></div>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Партия</th><th>Склад</th><th>Посылок</th><th>Вес</th><th>Перевозчик / AWB</th><th>Создана</th><th>Статус</th></tr></thead><tbody>
  ${list.map(b => { const ps = DB.parcels.filter(p => p.batchId === b.id); return `<tr class="click" data-action="go" data-href="#/${area}/batch/${b.id}"><td><b>${b.id}</b></td><td>${flag(b.country)}</td><td>${ps.length}</td><td>${kg(ps.reduce((a, p) => a + p.weight, 0))}</td><td class="small">${esc(b.carrier)}<br><span class="mono muted">${esc(b.awb || '—')}</span></td><td>${fdate(b.createdAt)}</td><td>${badge(b.status, BATCH_STATUS)}</td></tr>`; }).join('') || `<tr><td colspan="7">${empty('Партий нет')}</td></tr>`}
  </tbody></table></div>`;
};
A['batch-new'] = () => {
  const ready = whParcels().filter(p => p.status === 'ready');
  openModal('Новая партия ' + flag(whc()), `<form data-form="batch-new"><p class="muted">Выберите оплаченные посылки для отправки:</p>
    <div class="card flat pad-0" style="max-height:320px;overflow:auto">${ready.map(p => `<label class="parcel-item" style="cursor:pointer"><input type="checkbox" name="ids" value="${p.id}" checked><div class="meta"><b>${p.id} · ${esc(p.cell)}</b><div class="muted small">${esc(clientById(p.clientId)?.name)} · ${kg(p.weight)}</div></div></label>`).join('')}</div>
    <div class="grid g2 mt"><label class="field"><span>Перевозчик</span><select name="carrier"><option>Air cargo (Turkish Cargo)</option><option>Lufthansa Cargo</option><option>Авто (Хоргос)</option><option>Air Astana Cargo</option></select></label><label class="field"><span>AWB / накладная</span><input name="awb" placeholder="можно позже"></label></div>
    <button class="btn block">Сформировать</button></form>`);
};
F['batch-new'] = (d, form) => {
  const ids = new FormData(form).getAll('ids');
  if (!ids.length) return toast('Выберите посылки', 'err');
  const b = { id: `B-${whc()}-${String(++DB.seq.batch).padStart(4, '0')}`, country: whc(), status: 'origin', awb: d.awb, carrier: d.carrier, createdAt: new Date().toISOString(), history: [{ status: 'origin', date: new Date().toISOString() }] };
  DB.batches.unshift(b);
  ids.forEach(id => { const p = parcelById(id); p.batchId = b.id; setParcelStatus(p, 'in_batch', 'Партия ' + b.id); });
  logAction('warehouse', `Сформирована партия ${b.id} (${ids.length} посылок)`);
  Store.save(); closeModal(); location.hash = '#/warehouse/batch/' + b.id;
};
WH.batch = ([id], _, area = 'warehouse') => {
  const b = byId(DB.batches, id);
  if (!b) return empty('Партия не найдена');
  const ps = DB.parcels.filter(p => p.batchId === b.id);
  const idx = BATCH_FLOW.indexOf(b.status), next = BATCH_FLOW[idx + 1];
  return `${pageHead(`Партия ${b.id}`, `<a href="#/${area}/batches">Партии</a> / ${b.id}`, `<button class="btn secondary" onclick="window.print()">${ic('printer')} Манифест</button>${next ? `<button class="btn" data-action="batch-next" data-id="${b.id}">→ ${BATCH_STATUS[next].label}</button>` : ''}`)}
  <div class="card mb"><div class="stepper">${BATCH_FLOW.map((s, i) => { const h = b.history.find(x => x.status === s); return `<div class="st ${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}"><span class="dot">${i <= idx ? ic('check') : ''}</span>${BATCH_STATUS[s].label}${h ? `<br><span class="muted">${fdate(h.date)}</span>` : ''}</div>`; }).join('')}</div></div>
  <div class="grid g4 mb"><div class="card"><div class="stat"><span class="l">Посылок</span><span class="v">${ps.length}</span></div></div><div class="card"><div class="stat"><span class="l">Вес</span><span class="v">${kg(ps.reduce((a, p) => a + p.weight, 0))}</span></div></div>
    <div class="card"><div class="stat"><span class="l">Объявленная стоимость</span><span class="v">${usd(ps.reduce((a, p) => a + p.items.reduce((s, i) => s + i.price * i.qty, 0), 0))}</span></div></div>
    <div class="card"><div class="stat"><span class="l">AWB</span><span class="v" style="font-size:16px">${esc(b.awb || '—')}</span><button class="btn ghost sm" data-action="batch-awb" data-id="${b.id}">Изменить</button></div></div></div>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Посылка</th><th>Клиент</th><th>Вес</th><th>Декларация</th><th>Получение</th><th>Статус</th></tr></thead><tbody>
  ${ps.map(p => `<tr><td><b>${p.id}</b><div class="mono muted small">${esc(p.track)}</div></td><td>${clientChip(p.clientId)}</td><td>${kg(p.weight)}</td><td class="small">${esc(p.items.map(i => `${i.name} ×${i.qty}`).join(', '))}</td><td class="small">${p.delivery?.method === 'courier' ? `${ic('truck')} Курьер` : `${ic('store')} ` + esc(pointById(p.delivery?.pointId)?.address || '')}</td><td>${badge(p.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
};
A['batch-awb'] = el => { const b = byId(DB.batches, el.dataset.id); const v = prompt('AWB / номер накладной', b.awb); if (v != null) { b.awb = v; Store.save(); render(); } };
A['batch-next'] = el => {
  const b = byId(DB.batches, el.dataset.id);
  const next = BATCH_FLOW[BATCH_FLOW.indexOf(b.status) + 1];
  if (!next) return;
  b.status = next; b.history.push({ status: next, date: new Date().toISOString() });
  const ps = DB.parcels.filter(p => p.batchId === b.id && !['delivered'].includes(p.status));
  const msgs = { transit: 'отправлена в Казахстан', kz: 'прибыла в Казахстан и проходит сортировку', issue: 'готова к выдаче' };
  ps.forEach(p => {
    if (next === 'issue' && p.delivery?.method === 'courier') {
      setParcelStatus(p, 'courier', 'Передана в курьерскую службу');
      DB.courierRequests.unshift({ id: nextId('CR-', 'courier'), clientId: p.clientId, parcelIds: [p.id], address: p.delivery.address, date: new Date(Date.now() + DAY).toISOString(), slot: '10:00–14:00', status: 'new', extId: null, price: deliveryExtra(p) });
      notify(p.clientId, `Посылка ${p.id} передана курьеру — доставим завтра 10:00–14:00`, true);
    } else {
      setParcelStatus(p, BATCH_STATUS[next].parcel, 'Партия ' + b.id + ' · ' + BATCH_STATUS[next].label);
      const pt = pointById(p.delivery?.pointId);
      notify(p.clientId, `Посылка ${p.id} ${msgs[next]}${next === 'issue' && pt ? ': ' + pt.address : ''}`, true);
    }
  });
  logAction(location.hash.includes('admin') ? 'admin' : 'warehouse', `Партия ${b.id} → ${BATCH_STATUS[next].label} (${ps.length} посылок)`);
  Store.save(); render();
  toast(`Партия ${b.id}: «${BATCH_STATUS[next].label}». Отправлено ${ps.length} уведомлений клиентам`, 'info');
};

/* ---------- Выдача ---------- */
WH.issue = (_, q) => {
  const f = (q.get('c') || '').trim().toUpperCase();
  const c = f && (clientById(f) || DB.clients.find(x => x.phone.replace(/\D/g, '').endsWith(f.replace(/\D/g, '')) && f.replace(/\D/g, '').length >= 4));
  const list = c ? DB.parcels.filter(p => p.clientId === c.id && p.status === 'issue') : [];
  const waiting = DB.parcels.filter(p => p.status === 'issue');
  return `${pageHead(`${ic('store')} Выдача посылок`, 'Пункт выдачи в Казахстане')}
  <div class="grid g-side"><div>
    <div class="card mb"><form class="row nowrap" data-form="issue-find"><input name="c" class="big" value="${esc(f)}" placeholder="ID клиента или телефон" autofocus><button class="btn lg">Найти</button></form></div>
    ${c ? `<div class="card"><div class="card-head">${clientChip(c.id)}<span class="muted small">${esc(c.phone)}</span></div>
      ${list.length ? list.map(p => `<div class="parcel-item" style="cursor:default">${thumb(p)}<div class="meta"><b>${p.id} · ${esc(p.store)}</b><div class="muted small">${kg(p.weight)} · ${esc(pointById(p.delivery?.pointId)?.address || '')}</div></div><button class="btn success" data-action="issue-do" data-id="${p.id}">Выдать</button></div>`).join('') : empty('Нет посылок к выдаче')}</div>`
      : f ? '<div class="notice err">Клиент не найден</div>' : ''}
  </div><div class="card"><h3>Ожидают выдачи: ${waiting.length}</h3>${waiting.map(p => `<div class="row between small mb-s"><a href="#/warehouse/issue?c=${p.clientId}">${p.clientId}</a><span>${p.id}</span><span class="muted">${esc(pointById(p.delivery?.pointId)?.city || '')}</span></div>`).join('')}</div></div>`;
};
F['issue-find'] = d => { location.hash = '#/warehouse/issue?c=' + encodeURIComponent(d.c.trim()); };
A['issue-do'] = el => {
  const p = parcelById(el.dataset.id), c = clientById(p.clientId);
  const code = p.id.slice(-4) + c.id.slice(-2);
  openModal('Выдача ' + p.id, `<form data-form="issue-do"><input type="hidden" name="id" value="${p.id}"><p>Попросите клиента назвать код получения из приложения или SMS.</p>
    <input name="code" class="big center" placeholder="Код" required><p class="muted small mt-s">Демо-код: <b class="mono">${code}</b></p><label class="check"><input type="checkbox" required> Личность клиента проверена (удостоверение)</label><button class="btn success block lg mt">Подтвердить выдачу</button></form>`);
};
F['issue-do'] = d => {
  const p = parcelById(d.id), c = clientById(p.clientId);
  if (d.code.trim() !== p.id.slice(-4) + c.id.slice(-2)) return toast('Неверный код', 'err');
  setParcelStatus(p, 'delivered', 'Выдана в пункте ' + (pointById(p.delivery?.pointId)?.address || ''));
  p.cell = null;
  notify(c.id, `Посылка ${p.id} получена. Спасибо, что выбираете Way! Оцените сервис`, true);
  logAction('warehouse', `Выдана посылка ${p.id} клиенту ${c.id}`);
  Store.save(); closeModal(); render(); toast(`${ic('circle-check')} Посылка выдана`, 'ok');
};
