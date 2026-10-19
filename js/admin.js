/* Админ-панель */
const AD = {};

AD.render = (parts, q) => {
  const page = parts[0] || 'dashboard';
  const openT = DB.tickets.filter(x => x.status === 'open').length;
  const courierNew = DB.courierRequests.filter(x => x.status === 'new').length;
  const nav = [
    { key: 'dashboard', icon: ic('layout-dashboard'), label: 'Дашборд', short: 'Дашборд' },
    { group: 'Операции' },
    { key: 'parcels', icon: ic('package'), label: 'Посылки', short: 'Посылки' },
    { key: 'batches', icon: ic('plane'), label: 'Партии' },
    { key: 'buyouts', icon: ic('shopping-bag'), label: 'Выкуп', count: DB.buyouts.filter(b => b.status === 'new').length },
    { key: 'clients', icon: ic('users'), label: 'Клиенты', short: 'Клиенты' },
    { key: 'support', icon: ic('message-circle'), label: 'Поддержка', short: 'Чаты', count: openT },
    { key: 'points', icon: ic('map-pin'), label: 'ПВЗ и курьеры', count: courierNew },
    { group: 'Настройки' },
    { key: 'tariffs', icon: ic('badge-dollar-sign'), label: 'Тарифы и курсы' },
    { key: 'countries', icon: ic('globe'), label: 'Страны и склады' },
    { key: 'stores', icon: ic('building-2'), label: 'Каталог магазинов' },
    { key: 'integrations', icon: ic('plug'), label: 'Интеграции' },
    { group: 'Аналитика' },
    { key: 'reports', icon: ic('trending-up'), label: 'Отчёты', short: 'Отчёты' },
    { key: 'log', icon: ic('scroll-text'), label: 'Журнал действий' },
  ];
  const pages = { dashboard: AD.dashboard, parcels: AD.parcels, batches: (p, q) => WH.batches(p, q, 'admin'), batch: (p, q) => WH.batch(p, q, 'admin'), buyouts: AD.buyouts, clients: AD.clients, client: AD.client,
    support: AD.support, points: AD.points, tariffs: AD.tariffs, countries: AD.countries, stores: AD.stores, integrations: AD.integrations, reports: AD.reports, log: AD.log };
  const content = (pages[page] || AD.dashboard)(parts.slice(1), q);
  const userCard = `<div class="user-card"><div class="row nowrap">${avatar('Админ', 28)}<span class="small"><b>Администратор</b><br><span class="muted">Полный доступ</span></span></div></div>`;
  const cur = { batch: 'batches', client: 'clients' }[page] || page;
  return cabinetLayout({ area: 'admin', brandSub: 'Админ-панель', nav, current: cur, content, userCard,
    mobileNav: [nav[0], nav[2], nav[5], nav[6], nav[15]].map(n => ({ ...n, short: n.short || n.label })) });
};

/* ---------- Метрики ---------- */
function monthlySeries() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const base = 18000 + (11 - i) * 2100 + Math.sin(i * 1.3) * 2500;
    months.push({ label: d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''), revenue: Math.round(base), weight: Math.round(base / 9.2), parcels: Math.round(base / 21), profit: Math.round(base * 0.31) });
  }
  // текущий месяц дополняем реальными операциями из демо-базы
  const cur = DB.transactions.filter(x => x.type === 'charge' && daysSince(x.date) <= now.getDate()).reduce((s, x) => s - x.amount, 0);
  months[11].revenue += Math.round(cur); months[11].profit += Math.round(cur * 0.31);
  return months;
}
function kpis() {
  const s = monthlySeries(), m = s[11], p = s[10];
  const d = (a, b) => `<span class="d ${a >= b ? 'up' : 'down'}">${ic(a >= b ? 'trending-up' : 'trending-down')} ${Math.abs(((a - b) / b) * 100).toFixed(1)}% к прошлому месяцу</span>`;
  return { s, html: `<div class="grid g4 mb">
    <div class="card"><div class="stat"><span class="l">Оборот, месяц</span><span class="v">${usd(m.revenue).replace('.00', '')}</span>${d(m.revenue, p.revenue)}</div></div>
    <div class="card"><div class="stat"><span class="l">Отправлено, кг</span><span class="v">${m.weight.toLocaleString('ru-RU')}</span>${d(m.weight, p.weight)}</div></div>
    <div class="card"><div class="stat"><span class="l">Валовая прибыль</span><span class="v">${usd(m.profit).replace('.00', '')}</span>${d(m.profit, p.profit)}</div></div>
    <div class="card"><div class="stat"><span class="l">Клиентов</span><span class="v">${(4210 + DB.clients.length).toLocaleString('ru-RU')}</span><span class="d up">+${DB.clients.filter(c => daysSince(c.createdAt) < 30).length + 312} за 30 дней</span></div></div></div>` };
}
function barChart(series, key, fmt = v => v) {
  const max = Math.max(...series.map(x => x[key]));
  return `<div class="bars">${series.map((x, i) => `<div class="bar" title="${x.label}: ${fmt(x[key])}"><div class="${i === series.length - 1 ? 'cur' : ''}" style="height:${(x[key] / max) * 100}%"></div><span>${x.label}</span></div>`).join('')}</div>`;
}
function weightByCountry() {
  const rows = DB.countries.filter(c => c.active).map(c => ({ c, w: DB.parcels.filter(p => p.country === c.code && p.weight).reduce((s, p) => s + p.weight, 0) * 37 + c.perKg.base * 10 }));
  const max = Math.max(...rows.map(r => r.w));
  return rows.sort((a, b) => b.w - a.w).map(r => `<div class="hbar"><span>${flag(r.c.code)} ${esc(r.c.name)}</span><div class="track"><div style="width:${(r.w / max) * 100}%"></div></div><b class="right">${Math.round(r.w)} кг</b></div>`).join('');
}
function funnel() {
  const steps = [['Визиты на сайт', 48200], ['Регистрации', 1840], ['Добавили посылку', 1120], ['Первая отправка', 820], ['Повторная отправка', 512]];
  return `<div class="funnel">${steps.map(([l, v], i) => `<div class="lvl" style="width:${100 - i * 9}%;opacity:${1 - i * 0.12}"><span>${l}</span><span>${v.toLocaleString('ru-RU')}${i ? ` · ${((v / steps[i - 1][1]) * 100).toFixed(0)}%` : ''}</span></div>`).join('')}</div>`;
}

AD.dashboard = () => {
  const { s, html } = kpis();
  const st = k => DB.parcels.filter(p => p.status === k).length;
  return `${pageHead(`${ic('layout-dashboard')} Дашборд`, fdate(new Date()))}${html}
  <div class="grid g-side mb"><div class="card"><div class="card-head"><h3>Оборот по месяцам, $</h3><a href="#/admin/reports">Отчёты →</a></div>${barChart(s, 'revenue', usd)}</div>
    <div class="card"><h3>Вес по странам</h3>${weightByCountry()}</div></div>
  <div class="grid g3">
    <div class="card"><h3>Посылки сейчас</h3><div class="kv">${['expected', 'unidentified', 'received', 'ready', 'in_batch', 'transit', 'kz', 'issue'].map(k => `<div>${STATUS[k].icon} ${STATUS[k].short}</div><div><b>${st(k)}</b></div>`).join('')}</div></div>
    <div class="card"><h3>Воронка</h3>${funnel()}</div>
    <div class="card"><div class="card-head"><h3>Журнал</h3><a href="#/admin/log">Весь →</a></div>${DB.log.slice(0, 7).map(l => `<div class="small mb-s"><span class="muted">${fdt(l.date)}</span> · <b>${esc(l.user)}</b><br>${esc(l.text)}</div>`).join('')}</div>
  </div>`;
};

/* ---------- Посылки ---------- */
AD.parcels = (_, q) => {
  const f = { q: q.get('q') || '', c: q.get('c') || '', s: q.get('s') || '' };
  const list = DB.parcels.filter(p => (!f.c || p.country === f.c) && (!f.s || p.status === f.s) && (!f.q || [p.id, p.track, p.clientId, p.store, clientById(p.clientId)?.name].join(' ').toLowerCase().includes(f.q.toLowerCase())));
  return `${pageHead(`${ic('package')} Все посылки`, `${list.length} из ${DB.parcels.length}`, `<button class="btn secondary" data-action="export-xlsx" data-what="parcels">${ic('download')} XLSX</button>`)}
  <form class="card mb grid g4" data-form="ad-parcels"><input name="q" value="${esc(f.q)}" placeholder="Трек, ID, клиент, магазин"><select name="c">${countryOptions(f.c, false, true)}</select>
    <select name="s"><option value="">Все статусы</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f.s === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select><button class="btn">Фильтр</button></form>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Посылка</th><th>Клиент</th><th>Склад</th><th>Вес</th><th>Стоимость</th><th>Партия</th><th>Статус</th><th></th></tr></thead><tbody>
  ${list.map(p => `<tr><td><b>${p.id}</b><div class="mono muted small">${esc(p.track)}</div><div class="small">${esc(p.store)}</div></td><td>${p.clientId ? clientChip(p.clientId) : '<span class="badge red">—</span>'}</td><td>${flag(p.country)} <span class="mono small">${esc(p.cell || '')}</span></td><td>${p.weight ? kg(p.weight) : '—'}</td>
    <td>${parcelCost(p) ? usd(parcelCost(p)) + (p.paid ? ` <span class="badge green">${ic('check')}</span>` : '') : '—'}</td><td>${p.batchId ? `<a href="#/admin/batch/${p.batchId}">${p.batchId}</a>` : '—'}</td><td>${badge(p.status)}</td><td><button class="btn ghost sm" data-action="ad-parcel-status" data-id="${p.id}">Статус</button></td></tr>`).join('') || `<tr><td colspan="8">${empty('Ничего не найдено')}</td></tr>`}
  </tbody></table></div>`;
};
F['ad-parcels'] = d => { location.hash = `#/admin/parcels?q=${encodeURIComponent(d.q)}&c=${d.c}&s=${d.s}`; };
A['ad-parcel-status'] = el => {
  const p = parcelById(el.dataset.id);
  openModal('Ручная смена статуса ' + p.id, `<form data-form="ad-parcel-status"><input type="hidden" name="id" value="${p.id}"><label class="field"><span>Статус</span><select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    <label class="field"><span>Причина (в журнал)</span><input name="note" required placeholder="Например: исправление ошибки оператора"></label><label class="check"><input type="checkbox" name="notify" checked> Уведомить клиента</label><button class="btn block mt">Сохранить</button></form>
    <h4 class="mt">История</h4>${timelineHtml(p)}`);
};
F['ad-parcel-status'] = d => {
  const p = parcelById(d.id);
  setParcelStatus(p, d.status, 'Админ: ' + d.note);
  if (d.notify && p.clientId) notify(p.clientId, `Статус посылки ${p.id}: ${STATUS[d.status].label}`);
  logAction('admin', `Ручная смена статуса ${p.id} → ${STATUS[d.status].label}: ${d.note}`);
  Store.save(); closeModal(); render();
};

AD.buyouts = () => BY.list().replace(/#\/buyout\/request\//g, '#/buyout/request/') + `<p class="muted small mt">Работа с заявками — в кабинете <a href="#/buyout">менеджера выкупа</a>.</p>`;

/* ---------- Клиенты ---------- */
AD.clients = (_, q) => {
  const f = (q.get('q') || '').toLowerCase();
  const list = DB.clients.filter(c => !f || [c.id, c.name, c.latin, c.email, c.phone].join(' ').toLowerCase().includes(f));
  return `${pageHead(`${ic('users')} Клиенты`, `${list.length} в демо-базе`, `<button class="btn secondary" data-action="export-xlsx" data-what="clients">${ic('download')} XLSX</button>`)}
  <form class="row nowrap mb" data-form="ad-clients"><input name="q" value="${esc(f)}" placeholder="ID, имя, email, телефон"><button class="btn secondary">Найти</button></form>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Клиент</th><th>Контакты</th><th>Город</th><th>Уровень</th><th>Отправлено</th><th>Баланс</th><th>Посылок</th><th>Регистрация</th></tr></thead><tbody>
  ${list.map(c => `<tr class="click" data-action="go" data-href="#/admin/client/${c.id}"><td>${clientChip(c.id)}${c.blocked ? ' <span class="badge red">Заблокирован</span>' : ''}</td><td class="small">${esc(c.email)}<br>${esc(c.phone)}</td><td>${esc(c.city)}</td><td><span class="badge" style="background:${levelOf(c).color};color:#fff">${levelOf(c).name}</span></td><td>${kg(c.shippedKg)}</td><td>${usd(c.balance)}</td><td>${DB.parcels.filter(p => p.clientId === c.id).length}</td><td class="small">${fdate(c.createdAt)}<br><span class="muted">${esc(c.via || '')}</span></td></tr>`).join('')}
  </tbody></table></div>`;
};
F['ad-clients'] = d => { location.hash = '#/admin/clients?q=' + encodeURIComponent(d.q); };
AD.client = ([id]) => {
  const c = clientById(id);
  if (!c) return empty('Клиент не найден');
  const ps = DB.parcels.filter(p => p.clientId === c.id);
  const tx = DB.transactions.filter(x => x.clientId === c.id);
  return `${pageHead(esc(c.name), '<a href="#/admin/clients">Клиенты</a> / ' + c.id, `<button class="btn secondary" data-action="ad-impersonate" data-id="${c.id}">${ic('eye')} Открыть кабинет клиента</button>`)}
  <div class="grid g3 mb"><div class="card">${clientChip(c.id)}<div class="kv mt"><div>Латиницей</div><div>${esc(c.latin)}</div><div>Email</div><div>${esc(c.email)}</div><div>Телефон</div><div>${esc(c.phone)}</div><div>Город</div><div>${esc(c.city)}</div><div>Пригласил</div><div>${c.referrer || '—'}</div><div>Каналы</div><div class="small">${Object.entries(c.channels || {}).filter(([, v]) => v).map(([k]) => CHANNEL_NAME[k]).join(', ') || '—'}</div></div></div>
    <div class="card"><h3>Баланс: ${usd(c.balance)}</h3><form data-form="ad-adjust"><input type="hidden" name="id" value="${c.id}"><div class="inline-inputs"><label class="field"><span>Сумма ±$</span><input name="amount" type="number" step="0.01" required placeholder="+10 / -5"></label></div>
      <label class="field"><span>Причина</span><input name="note" required placeholder="Компенсация за задержку"></label><button class="btn">Корректировка</button></form></div>
    <div class="card"><h3>Уровень и доступ</h3><form data-form="ad-level"><input type="hidden" name="id" value="${c.id}"><label class="field"><span>Уровень (ручной)</span><select name="level">${DB.levels.map(l => `<option value="${l.id}" ${l.id === c.level ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label><button class="btn secondary">Сохранить</button></form>
      <button class="btn ${c.blocked ? 'success' : 'danger'} sm mt" data-action="ad-block" data-id="${c.id}">${c.blocked ? 'Разблокировать' : 'Заблокировать'}</button></div></div>
  <div class="grid g2"><div class="card pad-0"><div style="padding:16px 16px 0"><h3>Посылки (${ps.length})</h3></div><table class="t"><tbody>${ps.map(p => `<tr><td>${p.id}</td><td class="small">${esc(p.store)}</td><td>${badge(p.status)}</td></tr>`).join('')}</tbody></table></div>
    <div class="card pad-0"><div style="padding:16px 16px 0"><h3>Операции</h3></div><table class="t"><tbody>${tx.map(x => `<tr><td class="small nowrap">${fdate(x.date)}</td><td class="small">${esc(x.note)}</td><td class="right"><b>${x.amount > 0 ? '+' : ''}${usd(x.amount)}</b></td></tr>`).join('')}</tbody></table></div></div>`;
};
F['ad-adjust'] = d => {
  const amt = +d.amount;
  if (!amt) return;
  addTx(d.id, amt > 0 ? 'adjust' : 'adjust', amt, 'Корректировка: ' + d.note);
  notify(d.id, `Баланс скорректирован на ${amt > 0 ? '+' : ''}${usd(amt)}: ${d.note}`);
  logAction('admin', `Ручная корректировка баланса ${d.id}: ${amt > 0 ? '+' : ''}${usd(amt)} (${d.note})`);
  Store.save(); render(); toast('Баланс изменён', 'ok');
};
F['ad-level'] = d => { const c = clientById(d.id); logAction('admin', `Уровень ${c.id}: ${c.level} → ${d.level}`); c.level = d.level; Store.save(); render(); toast('Сохранено', 'ok'); };
A['ad-block'] = el => { const c = clientById(el.dataset.id); c.blocked = !c.blocked; logAction('admin', `${c.blocked ? 'Блокировка' : 'Разблокировка'} ${c.id}`); Store.save(); render(); };
A['ad-impersonate'] = el => { DB.session.clientId = el.dataset.id; logAction('admin', 'Вход в кабинет клиента ' + el.dataset.id); Store.save(); location.hash = '#/client'; };

/* ---------- Поддержка ---------- */
AD.support = ([id]) => {
  const cur = id && byId(DB.tickets, id);
  return `${pageHead(`${ic('message-circle')} Обращения в поддержку`)}
  <div class="grid g-side">${cur ? ticketView(cur, 'admin') : `<div class="card"><p class="muted">Выберите обращение</p><div class="notice">Единое окно: сообщения из кабинета, Telegram-бота и WhatsApp попадают сюда.</div></div>`}
  <div class="card pad-0">${DB.tickets.map(tk => `<div class="parcel-item ${cur?.id === tk.id ? '' : ''}" data-action="go" data-href="#/admin/support/${tk.id}">${avatar(clientById(tk.clientId)?.name || '?', 32)}<div class="meta"><b>${esc(tk.subject)}</b><div class="muted small">${tk.id} · ${tk.clientId} · ${fdt(tk.messages.at(-1).date)}</div></div>${tk.status === 'open' ? (tk.messages.at(-1).from === 'client' ? '<span class="badge red">Ждёт ответа</span>' : '<span class="badge orange">Открыто</span>') : '<span class="badge green">Закрыто</span>'}</div>`).join('')}</div></div>`;
};

/* ---------- ПВЗ и курьеры ---------- */
AD.points = () => `${pageHead(`${ic('map-pin')} Пункты выдачи, постаматы, курьеры`, '', `<button class="btn" data-action="ad-point-new">${ic('plus')} Добавить пункт</button>`)}
  <div class="card pad-0 table-wrap mb"><table class="t"><thead><tr><th>ID</th><th>Тип</th><th>Город</th><th>Адрес</th><th>Часы</th><th>К выдаче</th><th></th></tr></thead><tbody>
  ${DB.points.map(p => `<tr><td class="mono">${p.id}</td><td>${p.type === 'locker' ? `${ic('archive')} Постамат` : `${ic('store')} ПВЗ`}</td><td>${esc(p.city)}</td><td>${esc(p.address)}</td><td class="small">${esc(p.hours)}</td><td>${DB.parcels.filter(x => x.status === 'issue' && x.delivery?.pointId === p.id).length}</td><td><button class="icon-btn" data-action="ad-point-del" data-id="${p.id}">${ic('trash-2')}</button></td></tr>`).join('')}
  </tbody></table></div>
  <h3>${ic('truck')} Заявки на курьерскую доставку</h3>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Заявка</th><th>Клиент</th><th>Посылки</th><th>Адрес</th><th>Дата / слот</th><th>Служба</th><th>Статус</th></tr></thead><tbody>
  ${DB.courierRequests.map(r => `<tr><td><b>${r.id}</b></td><td>${clientChip(r.clientId)}</td><td class="small">${r.parcelIds.join(', ')}</td><td class="small">${esc(r.address)}</td><td class="small">${fdate(r.date)}<br>${r.slot}</td>
    <td>${r.extId ? `<span class="mono small">${r.extId}</span>` : `<button class="btn sm" data-action="ad-courier-send" data-id="${r.id}">Передать в службу</button>`}</td>
    <td>${r.status === 'done' ? '<span class="badge green">Доставлено</span>' : r.extId ? `<button class="btn success sm" data-action="ad-courier-done" data-id="${r.id}">Доставлено</button>` : '<span class="badge orange">Новая</span>'}</td></tr>`).join('') || `<tr><td colspan="7">${empty('Нет заявок')}</td></tr>`}
  </tbody></table></div>`;
A['ad-point-new'] = () => openModal('Новый пункт', `<form data-form="ad-point-new"><label class="field"><span>Тип</span><select name="type"><option value="pvz">Пункт выдачи</option><option value="locker">Постамат</option></select></label>
  <label class="field"><span>Город</span><input name="city" required></label><label class="field"><span>Адрес</span><input name="address" required></label><label class="field"><span>Часы работы</span><input name="hours" value="Пн–Сб 10:00–20:00"></label><button class="btn block">Добавить</button></form>`);
F['ad-point-new'] = d => { const p = { id: 'PT-' + (DB.points.length + 1 + Math.floor(Math.random() * 90)), ...d }; DB.points.push(p); logAction('admin', `Добавлен пункт ${p.id}: ${d.city}, ${d.address}`); Store.save(); closeModal(); render(); };
A['ad-point-del'] = el => { if (!confirm('Удалить пункт?')) return; DB.points = DB.points.filter(p => p.id !== el.dataset.id); logAction('admin', 'Удалён пункт ' + el.dataset.id); Store.save(); render(); };
A['ad-courier-send'] = el => {
  const r = byId(DB.courierRequests, el.dataset.id);
  el.disabled = true; el.innerHTML = '<span class="spinner"></span>';
  setTimeout(() => {
    r.extId = 'CS-' + Math.floor(1e6 + Math.random() * 9e6); r.status = 'sent';
    DB.integrationLog = DB.integrationLog || [];
    DB.integrationLog.unshift({ date: new Date().toISOString(), svc: 'Курьерская служба', dir: '→', text: `POST /orders ${r.id} → 201 Created, id=${r.extId}` });
    notify(r.clientId, `Курьер привезёт посылку ${fdate(r.date)}, ${r.slot}. Номер заказа ${r.extId}`);
    logAction('admin', `Курьерская заявка ${r.id} передана в службу (${r.extId})`);
    Store.save(); render();
  }, 900);
};
A['ad-courier-done'] = el => {
  const r = byId(DB.courierRequests, el.dataset.id);
  r.status = 'done';
  r.parcelIds.map(parcelById).filter(Boolean).forEach(p => { setParcelStatus(p, 'delivered', 'Доставлена курьером'); const c = clientById(p.clientId); c.shippedKg = Math.round((c.shippedKg + p.weight) * 10) / 10; c.level = levelForKg(c.shippedKg).id; });
  DB.integrationLog = DB.integrationLog || [];
  DB.integrationLog.unshift({ date: new Date().toISOString(), svc: 'Курьерская служба', dir: '←', text: `webhook order.delivered ${r.extId}` });
  notify(r.clientId, `Посылка доставлена курьером. Спасибо!`);
  logAction('admin', `Курьерская заявка ${r.id} доставлена`);
  Store.save(); render();
};

/* ---------- Тарифы ---------- */
AD.tariffs = () => {
  const st = DB.settings;
  return `${pageHead(`${ic('badge-dollar-sign')} Тарифы, уровни, курсы`)}
  <form data-form="ad-tariffs">
  <div class="card pad-0 table-wrap mb"><table class="t"><thead><tr><th>Страна</th>${DB.levels.map(l => `<th>${l.name}, $/кг</th>`).join('')}<th>Мин., $</th><th>Срок</th></tr></thead><tbody>
    ${DB.countries.map(c => `<tr><td><b>${flag(c.code)} ${esc(c.name)}</b>${c.active ? '' : ' <span class="badge">выкл.</span>'}</td>${DB.levels.map(l => `<td><input name="t_${c.code}_${l.id}" type="number" step="0.1" value="${c.perKg[l.id]}" style="width:84px"></td>`).join('')}<td><input name="m_${c.code}" type="number" step="0.5" value="${c.minCharge}" style="width:70px"></td><td><input name="tr_${c.code}" value="${esc(c.transit)}" style="width:110px"></td></tr>`).join('')}
  </tbody></table></div>
  <div class="grid g3 mb">
    <div class="card"><h3>Уровни лояльности</h3>${DB.levels.map(l => `<label class="field"><span>${l.name} — порог, кг</span><input name="lv_${l.id}" type="number" value="${l.fromKg}" ${l.fromKg === 0 ? 'readonly' : ''}></label>`).join('')}</div>
    <div class="card"><h3>Курсы валют (за 1 USD)</h3>${Object.entries(st.rates).map(([k, v]) => `<label class="field"><span>${k}</span><input name="r_${k}" type="number" step="0.01" value="${v}"></label>`).join('')}<button type="button" class="btn ghost sm" data-action="ad-rates-sync">${ic('refresh-cw')} Загрузить курс НБ РК</button></div>
    <div class="card"><h3>Доставка и хранение</h3>
      <label class="field"><span>Курьер по городу, $</span><input name="courierPrice" type="number" step="0.5" value="${st.courierPrice}"></label>
      <label class="field"><span>Бесплатный курьер от, $</span><input name="freeCourierFrom" type="number" value="${st.freeCourierFrom}"></label>
      <label class="field"><span>Бесплатное хранение, дней</span><input name="storageFreeDays" type="number" value="${st.storageFreeDays}"></label>
      <label class="field"><span>Платное хранение, $/день</span><input name="storageFeePerDay" type="number" step="0.05" value="${st.storageFeePerDay}"></label>
      <label class="field"><span>Делитель объёмного веса</span><input name="volumetricDivider" type="number" value="${st.volumetricDivider}"></label>
      <label class="field"><span>Реферальный бонус, $</span><input name="referralBonus" type="number" value="${st.referralBonus}"></label></div>
  </div><button class="btn lg">${ic('save')} Сохранить все изменения</button></form>`;
};
A['ad-rates-sync'] = () => { const v = (500 + Math.random() * 12).toFixed(2); $('input[name=r_KZT]').value = v; toast(`Курс НБ РК на ${fdate(new Date())}: 1 USD = ${v} ₸ (демо)`); };
F['ad-tariffs'] = d => {
  const changes = [];
  DB.countries.forEach(c => {
    DB.levels.forEach(l => { const v = +d[`t_${c.code}_${l.id}`]; if (v !== c.perKg[l.id]) { changes.push(`${c.code}/${l.name}: ${c.perKg[l.id]}→${v}`); c.perKg[l.id] = v; } });
    c.minCharge = +d['m_' + c.code]; c.transit = d['tr_' + c.code];
  });
  DB.levels.forEach(l => l.fromKg = +d['lv_' + l.id]);
  Object.keys(DB.settings.rates).forEach(k => { const v = +d['r_' + k]; if (v !== DB.settings.rates[k]) changes.push(`курс ${k}: ${DB.settings.rates[k]}→${v}`); DB.settings.rates[k] = v; });
  ['courierPrice', 'freeCourierFrom', 'storageFreeDays', 'storageFeePerDay', 'volumetricDivider', 'referralBonus'].forEach(k => DB.settings[k] = +d[k]);
  logAction('admin', 'Обновлены тарифы и настройки' + (changes.length ? ': ' + changes.slice(0, 6).join(', ') : ''));
  Store.save(); render(); toast('Тарифы сохранены — на сайте уже показаны новые цены', 'ok');
};

/* ---------- Страны ---------- */
AD.countries = () => `${pageHead(`${ic('globe')} Страны и адреса складов`, '', `<button class="btn" data-action="ad-country-edit">${ic('plus')} Добавить страну</button>`)}
  <div class="grid g3">${DB.countries.map(c => `<div class="card"><div class="row between"><h3 style="margin:0">${flag(c.code)} ${esc(c.name)}</h3><label class="check small"><input type="checkbox" data-change="ad-country-toggle" data-code="${c.code}" ${c.active ? 'checked' : ''}> Активна</label></div>
    <div class="small muted mt-s">${esc(c.address.line1)}, ${esc(c.address.city)} ${esc(c.address.zip)}<br>${esc(c.address.phone)}</div><div class="small mt-s">${c.transit} · от $${c.perKg.base}/кг</div>
    <button class="btn ghost sm mt-s" data-action="ad-country-edit" data-code="${c.code}">Редактировать</button></div>`).join('')}</div>
  <p class="muted small mt">Включённая страна сразу появляется у клиентов в «Мои адреса», в тарифах на сайте, каталоге и на складе.</p>`;
CH['ad-country-toggle'] = el => { const c = countryBy(el.dataset.code); c.active = el.checked; logAction('admin', `Страна ${c.name}: ${c.active ? 'включена' : 'выключена'}`); Store.save(); toast(`${flag(c.code)} ${c.name} ${c.active ? 'включена' : 'выключена'}`); };
A['ad-country-edit'] = el => {
  const c = countryBy(el.dataset.code) || { code: '', name: '', flag: '', transit: '7–12 дней', minCharge: 5, perKg: { base: 9, silver: 8.5, gold: 8, platinum: 7.5 }, address: { line1: '', line2: '{ID}', city: '', region: '', zip: '', phone: '' } };
  const a = c.address;
  openModal(c.code ? 'Редактирование: ' + c.name : 'Новая страна', `<form data-form="ad-country-save"><input type="hidden" name="orig" value="${c.code}">
    <div class="grid g3"><label class="field"><span>Код ISO</span><input name="code" value="${c.code}" required maxlength="2" ${c.code ? 'readonly' : ''} placeholder="IT"></label><label class="field"><span>Название</span><input name="name" value="${esc(c.name)}" required placeholder="Италия"></label></div>
    <label class="field"><span>Address line 1</span><input name="line1" value="${esc(a.line1)}" required></label><label class="field"><span>Address line 2 ({ID} заменится на код клиента)</span><input name="line2" value="${esc(a.line2)}"></label>
    <div class="grid g3"><label class="field"><span>Город</span><input name="city" value="${esc(a.city)}"></label><label class="field"><span>Регион</span><input name="region" value="${esc(a.region)}"></label><label class="field"><span>Индекс</span><input name="zip" value="${esc(a.zip)}"></label></div>
    <div class="grid g3"><label class="field"><span>Телефон</span><input name="phone" value="${esc(a.phone)}"></label><label class="field"><span>Срок доставки</span><input name="transit" value="${esc(c.transit)}"></label><label class="field"><span>Тариф Base, $/кг</span><input name="base" type="number" step="0.1" value="${c.perKg.base}"></label></div>
    <button class="btn block">Сохранить</button></form>`, { wide: true });
};
F['ad-country-save'] = d => {
  const code = d.code.toUpperCase();
  let c = countryBy(d.orig);
  if (!c) { if (countryBy(code)) return toast('Страна уже есть', 'err'); c = { code, active: true, minCharge: 5, perKg: {} }; DB.countries.push(c); }
  const base = +d.base;
  Object.assign(c, { name: d.name, transit: d.transit, address: { line1: d.line1, line2: d.line2 || '{ID}', city: d.city, region: d.region, zip: d.zip, phone: d.phone } });
  if (!d.orig || c.perKg.base !== base) c.perKg = { base, silver: +(base * 0.95).toFixed(1), gold: +(base * 0.9).toFixed(1), platinum: +(base * 0.85).toFixed(1) };
  logAction('admin', `${d.orig ? 'Изменена' : 'Добавлена'} страна ${c.name} (${code})`);
  Store.save(); closeModal(); render(); toast('Сохранено', 'ok');
};

/* ---------- Каталог магазинов ---------- */
AD.stores = () => `${pageHead(`${ic('building-2')} Каталог магазинов`, `${DB.stores.length} магазинов`, `<button class="btn" data-action="ad-store-new">${ic('plus')} Добавить</button>`)}
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Магазин</th><th>Страна</th><th>Категория</th><th>URL</th><th>Только выкуп</th><th></th></tr></thead><tbody>
  ${DB.stores.map(s => `<tr><td><div class="row nowrap"><div class="store-logo" style="background:${s.color};width:30px;height:30px;font-size:12px">${esc(s.name[0])}</div><b>${esc(s.name)}</b></div></td><td>${flag(s.country)}</td><td>${esc(s.category)}</td><td class="small">${esc(s.url)}</td><td><input type="checkbox" data-change="store-special" data-id="${s.id}" ${s.special ? 'checked' : ''}></td><td><button class="icon-btn" data-action="ad-store-del" data-id="${s.id}">${ic('trash-2')}</button></td></tr>`).join('')}
  </tbody></table></div>`;
A['ad-store-new'] = () => openModal('Новый магазин', `<form data-form="ad-store-new"><label class="field"><span>Название</span><input name="name" required></label><label class="field"><span>Страна</span><select name="country">${countryOptions('US', false)}</select></label>
  <label class="field"><span>Категория</span><input name="category" list="cat-dl" required><datalist id="cat-dl">${[...new Set(DB.stores.map(s => s.category))].map(c => `<option>${esc(c)}</option>`).join('')}</datalist></label><label class="field"><span>URL</span><input name="url" type="url" required placeholder="https://"></label>
  <label class="field"><span>Цвет логотипа</span><input name="color" type="color" value="#3456f5" style="height:42px"></label><label class="check"><input type="checkbox" name="special"> Только через выкуп</label><button class="btn block mt">Добавить</button></form>`);
F['ad-store-new'] = d => { DB.stores.unshift({ id: 'S' + Date.now(), name: d.name, country: d.country, category: d.category, url: d.url, color: d.color, special: !!d.special }); logAction('admin', 'Добавлен магазин ' + d.name); Store.save(); closeModal(); render(); };
A['ad-store-del'] = el => { const s = byId(DB.stores, el.dataset.id); if (!confirm('Удалить ' + s.name + '?')) return; DB.stores = DB.stores.filter(x => x !== s); logAction('admin', 'Удалён магазин ' + s.name); Store.save(); render(); };

/* ---------- Интеграции ---------- */
AD.integrations = () => {
  const I = DB.integrations;
  const card = (k, ico, name, desc, extra = '') => `<div class="card"><div class="row between nowrap" style="align-items:flex-start"><div class="row nowrap grow"><span class="icon-tile">${ico}</span><div class="grow"><b>${name}</b><div class="muted small">${desc}</div></div></div><input type="checkbox" data-change="ad-integ" data-k="${k}" ${I[k].on ? 'checked' : ''} style="width:20px;height:20px"></div>
    <div class="row mt-s">${I[k].on ? '<span class="badge green">● Подключено</span>' : '<span class="badge">Выключено</span>'}${I[k].mode === 'test' ? '<span class="badge orange">Тестовый режим</span>' : ''}${extra}</div></div>`;
  const log = (DB.integrationLog || []).concat([
    { date: new Date(Date.now() - 36e5).toISOString(), svc: 'Kaspi Pay', dir: '←', text: 'webhook payment.success order=TX-4998 amount=15150 KZT' },
    { date: new Date(Date.now() - 72e5).toISOString(), svc: 'Telegram Bot', dir: '→', text: 'sendMessage chat=WY-10427 «Посылка P-1005 готова к выдаче»' },
    { date: new Date(Date.now() - 9e6).toISOString(), svc: 'WhatsApp Business', dir: '→', text: 'template parcel_arrived → +7 701 *** ** 34 (delivered)' },
  ]);
  return `${pageHead(`${ic('plug')} Интеграции`)}
  <h3>Оплата</h3><div class="grid g3 mb">${card('kaspi', ic('qr-code'), 'Kaspi Pay', 'QR и оплата в приложении Kaspi.kz')}${card('cards', ic('credit-card'), 'Эквайринг банковских карт', esc(I.cards.provider) + ' · 3-D Secure')}</div>
  <h3>Доставка</h3><div class="grid g3 mb">${card('courier', ic('truck'), 'Курьерская служба', 'Создание заказов, статусы по webhook')}</div>
  <h3>Уведомления</h3><div class="grid g3 mb">${card('email', ic('mail'), 'Email', 'SMTP / транзакционные письма')}${card('sms', ic('message-circle'), 'SMS', 'SMS-шлюз для кодов и статусов')}${card('whatsapp', ic('message-circle-more'), 'WhatsApp Business API', 'Шаблонные сообщения')}${card('telegram', ic('plane'), 'Telegram-бот', esc(I.telegram.bot))}${card('push', ic('bell'), 'Web Push (PWA)', 'VAPID, Service Worker')}</div>
  <h3>Аналитика</h3><div class="grid g3 mb">${card('ga', ic('trending-up'), 'Google Analytics 4', I.ga.id)}${card('pixel', ic('megaphone'), 'Meta Pixel', I.pixel.id)}</div>
  <h3>Журнал обмена</h3><div class="card pad-0 table-wrap"><table class="t"><tbody>${log.map(l => `<tr><td class="small nowrap muted">${fdt(l.date)}</td><td><b>${esc(l.svc)}</b></td><td>${l.dir}</td><td class="mono small">${esc(l.text)}</td></tr>`).join('')}</tbody></table></div>`;
};
CH['ad-integ'] = el => { DB.integrations[el.dataset.k].on = el.checked; logAction('admin', `Интеграция ${el.dataset.k}: ${el.checked ? 'вкл' : 'выкл'}`); Store.save(); render(); };

/* ---------- Отчёты и экспорт ---------- */
AD.reports = () => {
  const s = monthlySeries();
  const total = k => s.reduce((a, x) => a + x[k], 0);
  return `${pageHead(`${ic('trending-up')} Отчёты`, 'Последние 12 месяцев', `<button class="btn" data-action="export-xlsx" data-what="report">${ic('download')} Экспорт в XLSX</button>`)}
  <div class="grid g4 mb">${[['Оборот', usd(total('revenue')).replace('.00', '')], ['Вес, кг', total('weight').toLocaleString('ru-RU')], ['Посылок', total('parcels').toLocaleString('ru-RU')], ['Прибыль', usd(total('profit')).replace('.00', '')]].map(([l, v]) => `<div class="card"><div class="stat"><span class="l">${l}</span><span class="v">${v}</span></div></div>`).join('')}</div>
  <div class="grid g2 mb"><div class="card"><h3>Прибыль, $</h3>${barChart(s, 'profit', usd)}</div><div class="card"><h3>Вес, кг</h3>${barChart(s, 'weight')}</div></div>
  <div class="grid g2 mb"><div class="card"><h3>Воронка клиентов</h3>${funnel()}</div><div class="card"><h3>Вес по странам</h3>${weightByCountry()}</div></div>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Месяц</th><th class="right">Оборот</th><th class="right">Вес, кг</th><th class="right">Посылок</th><th class="right">Прибыль</th><th class="right">Маржа</th></tr></thead><tbody>
    ${s.map(x => `<tr><td>${x.label}</td><td class="right">${usd(x.revenue)}</td><td class="right">${x.weight}</td><td class="right">${x.parcels}</td><td class="right">${usd(x.profit)}</td><td class="right">${((x.profit / x.revenue) * 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>
  <div class="row mt"><button class="btn secondary" data-action="export-xlsx" data-what="parcels">Посылки XLSX</button><button class="btn secondary" data-action="export-xlsx" data-what="clients">Клиенты XLSX</button><button class="btn secondary" data-action="export-xlsx" data-what="transactions">Финансы XLSX</button><button class="btn secondary" data-action="export-xlsx" data-what="log">Журнал XLSX</button></div>`;
};
A['export-xlsx'] = async el => {
  const what = el.dataset.what;
  const sheets = {
    parcels: () => DB.parcels.map(p => ({ 'Посылка': p.id, 'Трек': p.track, 'Магазин': p.store, 'Клиент': p.clientId || '', 'Страна': p.country, 'Статус': STATUS[p.status]?.label, 'Вес, кг': p.weight, 'Стоимость, $': parcelCost(p) || '', 'Оплачено': p.paid ? 'да' : 'нет', 'Партия': p.batchId || '', 'Ячейка': p.cell || '', 'Создана': fdate(p.createdAt) })),
    stock: () => whParcels().filter(p => ['received', 'consolidating', 'ready', 'unidentified'].includes(p.status)).map(p => ({ 'Ячейка': p.cell, 'Посылка': p.id, 'Трек': p.track, 'Клиент': p.clientId || '', 'Вес': p.weight, 'Статус': STATUS[p.status].label, 'Дней': storageDays(p) })),
    clients: () => DB.clients.map(c => ({ 'ID': c.id, 'Имя': c.name, 'Латиницей': c.latin, 'Email': c.email, 'Телефон': c.phone, 'Город': c.city, 'Уровень': levelOf(c).name, 'Отправлено, кг': c.shippedKg, 'Баланс, $': c.balance, 'Регистрация': fdate(c.createdAt) })),
    transactions: () => DB.transactions.map(x => ({ 'ID': x.id, 'Дата': fdt(x.date), 'Клиент': x.clientId, 'Тип': TX_TYPE[x.type][0], 'Сумма, $': x.amount, 'Способ': x.method || '', 'Описание': x.note })),
    buyouts: () => DB.buyouts.map(b => ({ 'Заявка': b.id, 'Клиент': b.clientId, 'Страна': b.country, 'Товары': b.items.map(i => i.title).join('; '), 'Сумма, $': b.total || '', 'Комиссия, $': b.total ? buyoutCalc(b).commission : '', 'Статус': BUYOUT_STATUS[b.status].label, 'Заказ': b.orderNo || '', 'Трек': b.track || '' })),
    log: () => DB.log.map(l => ({ 'Дата': fdt(l.date), 'Роль': l.role, 'Пользователь': l.user, 'Действие': l.text })),
    report: () => monthlySeries().map(x => ({ 'Месяц': x.label, 'Оборот, $': x.revenue, 'Вес, кг': x.weight, 'Посылок': x.parcels, 'Прибыль, $': x.profit })),
  };
  const rows = sheets[what]();
  const name = `way-${what}-${new Date().toISOString().slice(0, 10)}`;
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), what.slice(0, 30));
    if (what === 'report') XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.transactions()), 'transactions');
    XLSX.writeFile(wb, name + '.xlsx');
  } catch {
    const keys = Object.keys(rows[0] || {});
    const csv = '﻿' + [keys.join(';'), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name + '.csv'; a.click();
    toast('CDN недоступен — выгружен CSV', 'err');
  }
  logAction(location.hash.split('/')[1] || 'admin', `Экспорт ${what} (${rows.length} строк)`);
  Store.save();
};

/* ---------- Журнал ---------- */
AD.log = (_, q) => {
  const r = q.get('r') || '';
  const roles = [...new Set(DB.log.map(l => l.role))];
  const list = DB.log.filter(l => !r || l.role === r);
  return `${pageHead(`${ic('scroll-text')} Журнал действий`, `${list.length} записей`, `<button class="btn secondary" data-action="export-xlsx" data-what="log">${ic('download')} XLSX</button>`)}
  <div class="chips mb"><a class="chip ${!r ? 'active' : ''}" href="#/admin/log">Все</a>${roles.map(x => `<a class="chip ${r === x ? 'active' : ''}" href="#/admin/log?r=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Дата</th><th>Роль</th><th>Пользователь</th><th>Действие</th></tr></thead><tbody>
  ${list.map(l => `<tr><td class="nowrap small">${fdt(l.date)}</td><td><span class="badge">${esc(l.role)}</span></td><td>${esc(l.user)}</td><td>${esc(l.text)}</td></tr>`).join('')}</tbody></table></div>`;
};
