/* Кабинет клиента */
const Client = {};
const me = () => clientById(DB.session.clientId);
const myParcels = () => DB.parcels.filter(p => p.clientId === DB.session.clientId && p.status !== 'merged');

Client.render = (parts, q) => {
  const c = me();
  if (!c) return Client.loginGate();
  const page = parts[0] || 'dashboard';
  const unread = DB.notifications.filter(n => n.clientId === c.id && !n.read).length;
  const invoices = DB.buyouts.filter(b => b.clientId === c.id && b.status === 'invoiced').length;
  const toPay = myParcels().filter(p => p.status === 'received').length;
  const nav = [
    { key: 'dashboard', icon: ic('house'), label: t('c_dashboard'), short: t('c_dashboard') },
    { key: 'parcels', icon: ic('package'), label: t('c_parcels'), short: t('c_parcels'), count: toPay },
    { key: 'addresses', icon: ic('map-pin'), label: t('c_addresses'), short: 'Адреса' },
    { key: 'buyout', icon: ic('shopping-bag'), label: t('c_buyout'), short: 'Выкуп', count: invoices },
    { key: 'wallet', icon: ic('credit-card'), label: t('c_wallet'), short: t('c_wallet') },
    { key: 'delivery', icon: ic('truck'), label: t('c_delivery') },
    { key: 'loyalty', icon: ic('gift'), label: t('c_loyalty') },
    { key: 'support', icon: ic('message-circle'), label: t('c_support') },
    { key: 'notifications', icon: ic('bell'), label: 'Уведомления', count: unread },
    { key: 'settings', icon: ic('settings'), label: t('c_settings') },
  ];
  const pages = { dashboard: Client.dashboard, welcome: Client.welcome, addresses: Client.addresses, parcels: Client.parcels, parcel: Client.parcel, buyout: Client.buyout,
    wallet: Client.wallet, delivery: Client.delivery, loyalty: Client.loyalty, support: Client.support, notifications: Client.notifications, settings: Client.settings, more: Client.more };
  const content = (pages[page] || Client.dashboard)(parts.slice(1), q, c);
  const lvl = levelOf(c);
  const userCard = `<div class="user-card"><div class="row nowrap">${avatar(c.name)}<div class="grow"><b class="small">${esc(c.name)}</b><div class="muted small mono">${c.id} · <span style="color:${lvl.color}">${lvl.name}</span></div></div></div>
    <div class="row between mt-s small"><span class="muted">Баланс</span><b>${usd(c.balance)}</b></div>
    <button class="btn ghost sm block mt-s" data-action="logout">Выйти</button></div>`;
  const mobileNav = [nav[0], nav[1], nav[3], nav[4], { key: 'more', icon: ic('menu'), short: t('c_more') }];
  const mobileRight = `<div class="row nowrap" style="gap:4px"><a class="icon-btn bell" href="#/client/notifications" style="font-size:20px">${ic('bell')}${unread ? `<span class="cnt">${unread}</span>` : ''}</a></div>`;
  const cur = page === 'parcel' ? 'parcels' : page;
  return cabinetLayout({ area: 'client', brandSub: 'Личный кабинет', nav, current: cur, content, userCard, mobileNav, mobileRight });
};

Client.loginGate = () => `${siteHeader('')}<div class="container" style="padding:80px 20px;max-width:520px;text-align:center">
  <div class="icon-tile" style="width:72px;height:72px;font-size:34px;margin:0 auto 16px">${ic('lock')}</div><h1>Войдите в кабинет</h1><p class="muted">Чтобы получить адреса складов и отслеживать посылки</p>
  <div class="row" style="justify-content:center"><button class="btn lg" data-action="auth" data-force="1">Регистрация</button><button class="btn secondary lg" data-action="demo-login">Войти как демо-клиент</button></div></div>`;
A['demo-login'] = () => { DB.session.clientId = 'QB-10427'; Store.save(); render(); };
A['logout'] = () => { DB.session.clientId = null; Store.save(); location.hash = '#/'; toast('Вы вышли из кабинета'); };

Client.more = () => `${pageHead('Ещё')}<div class="card pad-0">${[['addresses', ic('map-pin'), t('c_addresses')], ['delivery', ic('truck'), t('c_delivery')], ['loyalty', ic('gift'), t('c_loyalty')], ['support', ic('message-circle'), t('c_support')], ['notifications', ic('bell'), 'Уведомления'], ['settings', ic('settings'), t('c_settings')]]
  .map(([k, i, l]) => `<a class="parcel-item" href="#/client/${k}" style="color:inherit;text-decoration:none"><span class="icon-tile" style="width:36px;height:36px;font-size:18px">${i}</span><b class="grow">${l}</b><span class="muted">${ic('chevron-right')}</span></a>`).join('')}
  <a class="parcel-item" data-action="logout" style="color:var(--red)"><span class="icon-tile" style="width:36px;height:36px;font-size:18px;background:var(--red-50);color:var(--red)">${ic('log-out')}</span><b class="grow">Выйти</b></a></div>
  <div class="row mt">${langSwitch()}</div>`;

Client.welcome = (_, __, c) => `${pageHead(`Добро пожаловать! ${ic('party-popper')}`)}
  <div class="grid g-side"><div>
    <div class="card id-card"><div class="small" style="opacity:.8">Ваш персональный код</div><div class="code">${c.id}</div><p style="opacity:.9;margin-top:8px">Указывайте его в каждом заказе в поле <b>Address line 2</b> — так склад мгновенно узнает вашу посылку.</p>
    <div class="row">${copyBtn(c.id, `<span class="btn secondary sm">${ic('copy')} Скопировать</span>`)}<a class="btn secondary sm" href="#/client/addresses">Мои адреса →</a></div></div>
    <div class="card mt"><h3>Что дальше?</h3><ol class="muted" style="padding-left:18px;line-height:2">
      <li>Откройте <a href="#/client/addresses">адрес склада</a> нужной страны и оформите заказ в магазине.</li>
      <li><a href="#/client/parcels/new">Добавьте трек-номер</a> — мы привяжем посылку автоматически.</li>
      <li><a href="#/client/wallet">Пополните кошелёк</a> через Kaspi или картой.</li>
      <li>Получите посылку в <a href="#/client/delivery">пункте выдачи, постамате или у курьера</a>.</li></ol></div>
  </div><div class="card"><h3>${ic('bell-ring')} Подключите уведомления</h3><p class="muted">Узнавайте о поступлении и выдаче посылок мгновенно.</p><a class="btn block" href="#/client/settings">Настроить</a></div></div>`;

/* ---------- Главная ---------- */
Client.dashboard = (_, __, c) => {
  const ps = myParcels();
  const cnt = g => ps.filter(p => STATUS_GROUPS[g].st.includes(p.status)).length;
  const lvl = levelOf(c), next = DB.levels[DB.levels.indexOf(lvl) + 1];
  const pct = next ? Math.min(100, ((c.shippedKg - lvl.fromKg) / (next.fromKg - lvl.fromKg)) * 100) : 100;
  const notes = DB.notifications.filter(n => n.clientId === c.id).slice(0, 4);
  const toPay = ps.filter(p => p.status === 'received');
  const inv = DB.buyouts.filter(b => b.clientId === c.id && b.status === 'invoiced');
  return `${pageHead(`Привет, ${esc(c.name.split(' ')[0])}! ${ic('hand')}`, '', `<a class="btn" href="#/client/parcels/new">${ic('plus')} Добавить посылку</a>`)}
  ${toPay.length ? `<div class="notice warn mb">${ic('lightbulb')} На складе ${toPay.length} посылк${toPay.length === 1 ? 'а ждёт' : 'и ждут'} оплаты доставки. <a href="#/client/parcels?g=stock">Оплатить →</a></div>` : ''}
  ${inv.length ? `<div class="notice mb">${ic('receipt')} Выставлен счёт на выкуп ${inv.map(b => `<a href="#/client/buyout/${b.id}">${b.id}</a>`).join(', ')}</div>` : ''}
  <div class="grid g3 mb">
    <div class="card id-card"><div class="small" style="opacity:.8">Персональный ID-код</div><div class="code">${c.id}</div>
      <div class="row mt-s">${copyBtn(c.id, `<span class="btn secondary sm">${ic('copy')} Копировать</span>`)}<a class="btn secondary sm" href="#/client/addresses">Адреса складов</a></div></div>
    <div class="card"><div class="stat"><span class="l">Баланс кошелька</span><span class="v">${usd(c.balance)}</span><span class="muted small">≈ ${kzt(c.balance)} · бонусы $${c.bonus}</span></div>
      <a class="btn block mt" href="#/client/wallet?topup=1">Пополнить</a></div>
    <div class="card"><div class="row between"><span class="muted">Уровень</span><span class="badge" style="background:${lvl.color};color:#fff">${lvl.name}</span></div>
      <div class="stat mt-s"><span class="v">${kg(c.shippedKg)}</span><span class="l">отправлено всего</span></div>
      <div class="progress mt-s"><div style="width:${pct}%"></div></div>
      <div class="muted small mt-s">${next ? `До ${next.name}: ${kg(next.fromKg - c.shippedKg)}` : 'Максимальный уровень'} · ${esc(lvl.perks)}</div></div>
  </div>
  <div class="grid g4 mb">${['expected', 'stock', 'way', 'issue'].map(g => `<a class="card" href="#/client/parcels?g=${g}" style="text-decoration:none;color:inherit"><div class="stat"><span class="v">${cnt(g)}</span><span class="l">${STATUS_GROUPS[g].label}</span></div></a>`).join('')}</div>
  <div class="grid g-side">
    <div class="card pad-0"><div class="card-head" style="padding:16px 16px 0"><h3>Последние посылки</h3><a href="#/client/parcels">Все →</a></div>${parcelList(ps.slice(0, 5))}</div>
    <div class="card"><div class="card-head"><h3>Уведомления</h3><a href="#/client/notifications">Все</a></div>
      ${notes.map(n => `<div class="small" style="padding:8px 0;border-bottom:1px solid var(--border)">${n.read ? '' : `${ic('dot')} `}${esc(n.text)}<div class="muted">${fdt(n.date)}</div></div>`).join('') || '<p class="muted">Пока пусто</p>'}
      <h3 class="mt">Склады</h3><div class="chips">${DB.countries.filter(x => x.active).map(x => `<a class="chip" href="#/client/addresses?c=${x.code}">${flag(x.code)} ${esc(x.name)}</a>`).join('')}</div></div>
  </div>`;
};

function parcelList(list, selectable = false) {
  if (!list.length) return empty('Посылок пока нет. <a href="#/client/parcels/new">Добавьте первую</a> или просто закажите на адрес склада.');
  return list.map(p => {
    const cost = parcelCost(p);
    const can = selectable && p.status === 'received';
    return `<div class="parcel-item" data-action="go" data-href="#/client/parcel/${p.id}">
      ${selectable ? `<input type="checkbox" class="sel-parcel" value="${p.id}" data-country="${p.country}" ${can ? '' : 'disabled'} onclick="event.stopPropagation()" title="${can ? 'Выбрать для консолидации' : ''}">` : ''}
      ${thumb(p)}
      <div class="meta"><b>${flag(p.country)} ${esc(p.store)} — ${esc(p.items.map(i => i.name).join(', ') || 'без декларации')}</b>
        <div class="muted small mono">${p.id} · ${esc(p.track)}</div></div>
      <div class="right">${badge(p.status)}<div class="small muted mt-s">${p.weight ? kg(p.weight) : ''}${cost && p.weight ? ' · ' + usd(cost) : ''}</div></div>
    </div>`;
  }).join('');
}

/* ---------- Адреса ---------- */
Client.addresses = (_, q, c) => {
  const list = DB.countries.filter(x => x.active);
  const cur = countryBy(q.get('c')) && countryBy(q.get('c')).active ? countryBy(q.get('c')) : list[0];
  const a = cur.address;
  const line = (k, v, hl) => `<div class="copy-line ${hl ? 'hl' : ''}"><span class="k">${k}</span><span class="v">${esc(v)}</span>${copyBtn(v)}</div>`;
  return `${pageHead('Адреса складов', '', '')}
  <div class="tabs">${list.map(x => `<a href="#/client/addresses?c=${x.code}" class="${x.code === cur.code ? 'active' : ''}">${flag(x.code)} ${esc(x.name)}</a>`).join('')}</div>
  <div class="grid g-side"><div class="card">
    <div class="card-head"><h3>${flag(cur.code)} Склад: ${esc(cur.name)}</h3><span class="badge">${cur.transit}</span></div>
    ${line('Full name', c.latin)}
    ${line('Address line 1', a.line1)}
    ${line('Address line 2', a.line2.replace('{ID}', c.id), true)}
    ${line('City', a.city)}${line('State / Region', a.region)}${line('ZIP / Postcode', a.zip)}${line('Country', { US: 'United States', GB: 'United Kingdom', DE: 'Germany', ES: 'Spain', CN: 'China', TR: 'Türkiye' }[cur.code] || cur.name)}${line('Phone', a.phone)}
    <button class="btn secondary mt-s" data-action="copy" data-text="${esc([c.latin, a.line1, a.line2.replace('{ID}', c.id), a.city, a.region, a.zip, a.phone].join(', '))}">${ic('copy')} Скопировать адрес целиком</button>
  </div><div>
    <div class="notice warn">${ic('triangle-alert')} Обязательно укажите <b>${c.id}</b> в Address line 2. Без кода посылка может попасть в «нераспознанные» — тогда мы найдём вас по имени с этикетки, но это займёт больше времени.</div>
    <div class="card mt"><h4>Тариф ${esc(cur.name)}</h4><div class="kv"><div>Ваш уровень</div><div>${levelOf(c).name}</div><div>Цена за кг</div><div><b>$${cur.perKg[c.level]}</b></div><div>Минимум</div><div>$${cur.minCharge}</div><div>Срок</div><div>${cur.transit}</div></div>
    <a class="btn ghost sm mt-s" href="#/stores">Магазины ${flag(cur.code)} →</a></div>
  </div></div>`;
};

/* ---------- Посылки ---------- */
Client.parcels = (parts, q, c) => {
  if (parts[0] === 'new') return Client.newParcel(q, c);
  const g = q.get('g') || 'all';
  const all = myParcels();
  const list = g === 'all' ? all : all.filter(p => STATUS_GROUPS[g].st.includes(p.status));
  return `${pageHead('Мои посылки', '', `<a class="btn" href="#/client/parcels/new">${ic('plus')} Добавить</a>`)}
    <div class="chips mb">${Object.entries(STATUS_GROUPS).map(([k, v]) => `<a class="chip ${g === k ? 'active' : ''}" href="#/client/parcels?g=${k}">${v.label}<span class="n">${k === 'all' ? all.length : all.filter(p => v.st.includes(p.status)).length}</span></a>`).join('')}</div>
    <div class="row mb"><span class="muted small">Отметьте посылки «На складе» одной страны, чтобы объединить их:</span><button class="btn secondary sm" data-action="consolidate">${ic('combine')} Объединить выбранные</button></div>
    <div class="card pad-0">${parcelList(list, true)}</div>`;
};
A['consolidate'] = () => {
  const sel = $$('.sel-parcel:checked');
  if (sel.length < 2) return toast('Выберите минимум 2 посылки со статусом «На складе»', 'err');
  if (new Set(sel.map(s => s.dataset.country)).size > 1) return toast('Объединять можно только посылки на складе одной страны', 'err');
  const ids = sel.map(s => s.value);
  const ps = ids.map(parcelById);
  openModal(`${ic('combine')} Консолидация посылок`, `<p>Объединим <b>${ids.length}</b> посылки в одну коробку на складе ${flag(ps[0].country)}.</p>
    <div class="kv mb"><div>Посылки</div><div>${ids.join(', ')}</div><div>Сумма весов</div><div>${kg(ps.reduce((s, p) => s + p.weight, 0))}</div>
    <div>Сейчас к оплате</div><div>${usd(ps.reduce((s, p) => s + parcelCost(p), 0))}</div><div>Стоимость услуги</div><div>${usd(SERVICES.consolidation.price)}</div></div>
    <div class="notice ok mb">Обычно консолидация экономит 20–40%: убираем лишние коробки и платите один минимальный тариф.</div>
    <form data-form="consolidate"><input type="hidden" name="ids" value="${ids.join(',')}"><label class="field"><span>Комментарий для склада</span><textarea name="comment" placeholder="Например: выбросить коробки от обуви"></textarea></label>
    <button class="btn block">Заказать за ${usd(SERVICES.consolidation.price)}</button></form>`);
};
F['consolidate'] = d => orderService(d.ids.split(','), 'consolidation', d.comment);

function orderService(ids, type, comment = '') {
  const c = me(), sv = SERVICES[type];
  if (c.balance < sv.price) { toast(`Недостаточно средств: нужно ${usd(sv.price)}. Пополните кошелёк.`, 'err'); closeModal(); location.hash = '#/client/wallet?topup=1'; return; }
  addTx(c.id, 'charge', -sv.price, `Услуга «${sv.name}» (${ids.join(', ')})`);
  const sr = { id: nextId('SR-', 'sr'), clientId: c.id, parcelIds: ids, type, status: 'new', createdAt: new Date().toISOString(), price: sv.price, comment };
  DB.serviceRequests.unshift(sr);
  ids.forEach(id => { const p = parcelById(id); p.services.push({ type, srId: sr.id, status: 'new' }); if (type === 'consolidation') setParcelStatus(p, 'consolidating', 'Заказана консолидация ' + sr.id); });
  logAction('client', `Заказана услуга «${sv.name}» ${sr.id} для ${ids.join(', ')}`);
  Store.save(); closeModal(); render();
  toast(`${ic('circle-check')} Заявка ${sr.id} передана на склад`, 'ok');
}

Client.newParcel = (q, c) => `${pageHead('Новая посылка', '<a href="#/client/parcels">Посылки</a> / Добавить')}
  <form class="grid g-side" data-form="new-parcel"><div class="card">
    <div class="grid g2"><label class="field"><span>Страна склада</span><select name="country">${countryOptions(q.get('country') || 'US')}</select></label>
    <label class="field"><span>Магазин</span><input name="store" list="stores-dl" required placeholder="Amazon"><datalist id="stores-dl">${DB.stores.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist></label></div>
    <label class="field"><span>Трек-номер (от магазина/курьера)</span><input name="track" required class="mono" placeholder="1Z999AA10123456784"></label>
    <h4 class="mt">Декларация товаров</h4><p class="muted small">Нужна для таможни. Указывайте реальную стоимость в USD.</p>
    <div id="decl-rows">${declRow()}</div>
    <button type="button" class="btn ghost sm" data-action="decl-add">${ic('plus')} Ещё товар</button>
    <label class="field mt"><span>Комментарий</span><textarea name="comment" placeholder="Необязательно"></textarea></label>
  </div><div>
    <div class="card"><h4>Сразу заказать услуги</h4>${Object.entries(SERVICES).filter(([k]) => !['consolidation', 'return'].includes(k)).map(([k, s]) => `<label class="check"><input type="checkbox" name="svc" value="${k}"> ${s.icon} ${s.name} <span class="muted">— ${usd(s.price)}</span></label>`).join('')}
    <p class="muted small mt-s">Списываются при поступлении посылки на склад.</p></div>
    <button class="btn block lg mt">Добавить посылку</button>
  </div></form>`;
const declRow = () => `<div class="inline-inputs decl-row mb-s"><input name="iname" placeholder="Наименование" required style="flex:3"><input name="iqty" type="number" min="1" value="1" placeholder="Кол-во"><input name="iprice" type="number" min="0" step="0.01" placeholder="Цена $" required><button type="button" class="icon-btn" data-action="decl-del" style="flex:0">${ic('x')}</button></div>`;
A['decl-add'] = () => $('#decl-rows').insertAdjacentHTML('beforeend', declRow());
A['decl-del'] = el => { if ($$('.decl-row').length > 1) el.closest('.decl-row').remove(); };
F['new-parcel'] = (d, form) => {
  const fd = new FormData(form);
  const names = fd.getAll('iname'), qtys = fd.getAll('iqty'), prices = fd.getAll('iprice');
  const track = d.track.trim().toUpperCase();
  const exist = DB.parcels.find(p => p.track.toUpperCase() === track);
  const items = names.map((n, i) => ({ name: n, qty: +qtys[i] || 1, price: +prices[i] || 0 }));
  if (exist && exist.status === 'unidentified') {
    // посылка уже лежит в нераспознанных — сразу привязываем
    exist.clientId = me().id; exist.items = items; setParcelStatus(exist, 'received', 'Заявлена клиентом по трек-номеру');
    logAction('client', `Клиент ${me().id} заявил нераспознанную посылку ${exist.id}`);
    Store.save(); toast(`${ic('party-popper')} Посылка уже на складе и привязана к вашему аккаунту!`, 'ok'); location.hash = '#/client/parcel/' + exist.id; return;
  }
  if (exist) return toast('Посылка с таким трек-номером уже добавлена', 'err');
  const p = { id: 'P-' + (++DB.seq.parcel), track, store: d.store, clientId: me().id, country: d.country, status: 'expected', weight: 0, dims: null, items, createdAt: new Date().toISOString(),
    photos: [], cell: null, batchId: null, paid: false, cost: null, delivery: { method: 'pickup', pointId: me().defaultPoint || 'PT-1' }, services: fd.getAll('svc').map(type => ({ type, status: 'planned' })), history: [], comment: d.comment };
  setParcelStatus(p, 'expected', 'Добавлена клиентом');
  DB.parcels.unshift(p);
  logAction('client', `Добавлена ожидаемая посылка ${p.id} (${track})`);
  Store.save(); toast('Посылка добавлена. Сообщим, когда она поступит на склад.', 'ok'); location.hash = '#/client/parcel/' + p.id;
};

Client.parcel = ([id], q, c) => {
  const p = parcelById(id);
  if (!p || p.clientId !== c.id) return empty('Посылка не найдена', ic('search'));
  const cost = parcelCost(p), extra = deliveryExtra(p);
  const editable = ['expected', 'received', 'consolidating'].includes(p.status);
  const pt = pointById(p.delivery?.pointId);
  const srs = DB.serviceRequests.filter(s => s.parcelIds.includes(p.id));
  const children = DB.parcels.filter(x => x.mergedInto === p.id);
  const calc = p.weight ? calcShipping(p.country, p.weight, p.dims, c.level) : null;
  return `${pageHead(`${flag(p.country)} ${esc(p.store)} · ${p.id}`, '<a href="#/client/parcels">Посылки</a> / ' + p.id, badge(p.status))}
  <div class="card mb">${stepper(p)}</div>
  ${p.status === 'received' ? `<div class="notice warn mb">${ic('credit-card')} Посылка на складе. Проверьте декларацию, выберите способ получения и оплатите доставку — мы отправим её в ближайшей партии.</div>` : ''}
  <div class="grid g-side"><div>
    <div class="card mb"><div class="card-head"><h3>Информация</h3>${copyBtn(p.track, `<span class="btn ghost sm">${ic('copy')} Трек</span>`)}</div>
      <div class="kv"><div>Трек-номер</div><div class="mono">${esc(p.track)}</div><div>Склад</div><div>${flag(p.country)} ${esc(countryBy(p.country)?.name)}</div>
      <div>Вес</div><div>${p.weight ? `${kg(p.weight)}${calc && calc.vol > p.weight ? ` <span class="muted">(объёмный ${calc.vol} кг)</span>` : ''}` : '—'}</div>
      <div>Габариты</div><div>${p.dims ? `${p.dims.l} × ${p.dims.w} × ${p.dims.h} см` : '—'}</div>
      ${p.batchId ? `<div>Партия</div><div>${p.batchId}</div>` : ''}
      ${children.length ? `<div>Объединена из</div><div>${children.map(x => `${x.id} (${esc(x.store)})`).join(', ')}</div>` : ''}
      <div>Добавлена</div><div>${fdate(p.createdAt)}</div></div></div>
    <div class="card mb"><h3>${ic('images')} Фото со склада</h3>${photosHtml(p)}</div>
    <div class="card mb"><div class="card-head"><h3>Декларация</h3>${editable ? '<button class="btn ghost sm" data-action="decl-edit" data-id="' + p.id + '">Изменить</button>' : ''}</div>
      ${p.items.length ? `<table class="t"><thead><tr><th>Товар</th><th>Кол-во</th><th class="right">Цена</th></tr></thead><tbody>${p.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td class="right">${usd(i.price * i.qty)}</td></tr>`).join('')}
      <tr><td colspan="2"><b>Итого</b></td><td class="right"><b>${usd(p.items.reduce((s, i) => s + i.price * i.qty, 0))}</b></td></tr></tbody></table>` : '<div class="notice warn">Заполните декларацию — без неё посылку нельзя отправить.</div>'}</div>
    <div class="card"><h3>История</h3>${timelineHtml(p)}</div>
  </div><div>
    <div class="card mb"><h3>${ic('wallet')} Стоимость</h3>
      ${cost ? `<div class="kv"><div>Доставка</div><div>${usd(cost)}${calc ? ` <span class="muted small">(${calc.chargeable} кг × $${calc.perKg})</span>` : ''}</div><div>Курьер</div><div>${p.delivery?.method === 'courier' ? (extra ? usd(extra) : 'бесплатно') : '—'}</div><div><b>Итого</b></div><div><b>${money(cost + extra)}</b></div></div>
        ${p.paid ? `<div class="notice ok mt">${ic('circle-check')} Оплачено</div>` : p.status === 'received' ? `<button class="btn accent block lg mt" data-action="pay-parcel" data-id="${p.id}">Оплатить ${usd(cost + extra)}</button><div class="muted small mt-s center">С баланса кошелька (${usd(c.balance)})</div>` : ''}`
        : '<p class="muted">Рассчитаем после взвешивания на складе.</p>'}
      ${storageDays(p) > DB.settings.storageFreeDays && !p.paid ? `<div class="notice err mt">Платное хранение: ${storageDays(p) - DB.settings.storageFreeDays} дн.</div>` : ''}
    </div>
    <div class="card mb"><div class="card-head"><h3>${ic('truck')} Получение</h3>${['expected', 'received', 'consolidating', 'ready', 'in_batch', 'transit'].includes(p.status) ? `<button class="btn ghost sm" data-action="delivery-edit" data-id="${p.id}">Изменить</button>` : ''}</div>
      ${p.delivery?.method === 'courier' ? `<div>${ic('truck')} <b>Курьер</b><div class="muted">${esc(p.delivery.address || 'адрес не указан')}</div></div>` : pt ? `<div>${pt.type === 'locker' ? `${ic('archive')} <b>Постамат</b>` : `${ic('store')} <b>Пункт выдачи</b>`}<div class="muted">${esc(pt.city)}, ${esc(pt.address)}<br>${esc(pt.hours)}</div></div>` : '<p class="muted">Не выбран</p>'}
      ${p.status === 'issue' ? `<div class="notice ok mt">Код получения: <b class="mono">${p.id.slice(-4)}${c.id.slice(-2)}</b><br>Покажите его в пункте выдачи${pt?.type === 'locker' ? ' или введите на экране постамата' : ''}.</div>` : ''}</div>
    <div class="card"><h3>${ic('wrench')} Спецуслуги</h3>
      ${srs.map(s => `<div class="row between small mb-s"><span>${SERVICES[s.type].icon} ${SERVICES[s.type].name} · ${s.id}</span>${badge(s.status, SERVICE_REQ_STATUS)}</div>`).join('')}
      ${p.status === 'received' ? `<div class="grid g2 mt-s">${Object.entries(SERVICES).filter(([k]) => k !== 'consolidation').map(([k, s]) => `<button class="service-tile" data-action="order-svc" data-id="${p.id}" data-type="${k}" style="cursor:pointer;text-align:left;font:inherit"><span class="ico">${s.icon}</span><b class="small">${s.name}</b><span class="muted small">${usd(s.price)}</span></button>`).join('')}</div>
        <p class="muted small mt-s">Для консолидации отметьте несколько посылок в <a href="#/client/parcels?g=stock">списке</a>.</p>` : srs.length ? '' : '<p class="muted small">Доступны, когда посылка на складе.</p>'}
    </div>
  </div></div>`;
};
A['order-svc'] = el => {
  const s = SERVICES[el.dataset.type];
  openModal(`${s.icon} ${s.name}`, `<p>${s.desc}</p><form data-form="order-svc"><input type="hidden" name="id" value="${el.dataset.id}"><input type="hidden" name="type" value="${el.dataset.type}">
    <label class="field"><span>Комментарий для склада</span><textarea name="comment"></textarea></label><button class="btn block">Заказать за ${usd(s.price)}</button></form>`);
};
F['order-svc'] = d => orderService([d.id], d.type, d.comment);
A['pay-parcel'] = el => {
  const p = parcelById(el.dataset.id), c = me();
  if (!p.items.length) return toast('Сначала заполните декларацию', 'err');
  if (!p.delivery) return toast('Выберите способ получения', 'err');
  const total = parcelCost(p) + deliveryExtra(p);
  if (c.balance < total) {
    openModal('Недостаточно средств', `<p>К оплате <b>${usd(total)}</b>, на балансе <b>${usd(c.balance)}</b>.</p><a class="btn block" href="#/client/wallet?topup=${Math.ceil(total - c.balance)}" data-action="modal-close">Пополнить на ${usd(Math.ceil(total - c.balance))}</a>`);
    return;
  }
  p.cost = parcelCost(p); p.paid = true;
  addTx(c.id, 'charge', -total, `Доставка ${p.id} (${p.store}, ${p.country})`);
  setParcelStatus(p, 'ready', 'Доставка оплачена');
  logAction('client', `Оплачена доставка ${p.id}: ${usd(total)}`);
  Store.save(); render(); toast(`${ic('circle-check')} Оплачено! Посылка уйдёт в ближайшей партии.`, 'ok');
};
A['decl-edit'] = el => {
  const p = parcelById(el.dataset.id);
  openModal('Декларация', `<form data-form="decl-save"><input type="hidden" name="id" value="${p.id}"><div id="decl-rows">${(p.items.length ? p.items : [{}]).map(i => declRow().replace('placeholder="Наименование"', `placeholder="Наименование" value="${esc(i.name || '')}"`).replace('value="1" placeholder="Кол-во"', `value="${i.qty || 1}" placeholder="Кол-во"`).replace('placeholder="Цена $"', `placeholder="Цена $" value="${i.price ?? ''}"`)).join('')}</div>
    <button type="button" class="btn ghost sm" data-action="decl-add">${ic('plus')} Ещё товар</button><button class="btn block mt">Сохранить</button></form>`, { wide: true });
};
F['decl-save'] = (d, form) => {
  const fd = new FormData(form), p = parcelById(d.id);
  p.items = fd.getAll('iname').map((n, i) => ({ name: n, qty: +fd.getAll('iqty')[i] || 1, price: +fd.getAll('iprice')[i] || 0 }));
  Store.save(); closeModal(); render(); toast('Декларация сохранена', 'ok');
};
A['delivery-edit'] = el => {
  const p = parcelById(el.dataset.id), c = me();
  openModal('Способ получения', deliveryForm(p.delivery, `<input type="hidden" name="id" value="${p.id}">`, c), { wide: true });
};
function deliveryForm(dl = {}, hidden = '', c) {
  const cities = [...new Set(DB.points.map(p => p.city))];
  return `<form data-form="delivery-save">${hidden}<div class="pill-select">
    <label><input type="radio" name="method" value="pickup" ${dl?.method !== 'courier' ? 'checked' : ''}><span><b>${ic('store')} Пункт выдачи или постамат</b><br><span class="muted small">Бесплатно</span></span></label>
    <label><input type="radio" name="method" value="courier" ${dl?.method === 'courier' ? 'checked' : ''}><span><b>${ic('truck')} Курьер до двери</b><br><span class="muted small">$${DB.settings.courierPrice}, бесплатно при доставке от $${DB.settings.freeCourierFrom}</span></span></label></div>
    <h4 class="mt">Пункт / постамат</h4>
    <div class="pill-select" style="max-height:260px;overflow:auto">${cities.map(city => DB.points.filter(p => p.city === city).map(pt => `<label><input type="radio" name="pointId" value="${pt.id}" ${(dl?.pointId || 'PT-1') === pt.id ? 'checked' : ''}><span><b>${pt.type === 'locker' ? `${ic('archive')} Постамат` : `${ic('store')} ПВЗ`} · ${esc(pt.city)}</b><br><span class="muted small">${esc(pt.address)} · ${esc(pt.hours)}</span></span></label>`).join('')).join('')}</div>
    <label class="field mt"><span>Адрес для курьера</span><input name="address" value="${esc(dl?.address || (c ? c.city + ', ' : ''))}" placeholder="Город, улица, дом, квартира"></label>
    <button class="btn block">Сохранить</button></form>`;
}
F['delivery-save'] = d => {
  if (d.method === 'courier' && d.address.trim().length < 8) return toast('Укажите полный адрес для курьера', 'err');
  const dl = { method: d.method, pointId: d.pointId, address: d.address };
  if (d.id) { parcelById(d.id).delivery = dl; } else { const c = me(); c.defaultDelivery = dl; c.defaultPoint = d.pointId; myParcels().filter(p => ['expected', 'received', 'consolidating'].includes(p.status)).forEach(p => p.delivery = { ...dl }); }
  Store.save(); closeModal(); render(); toast('Способ получения сохранён', 'ok');
};

/* ---------- Купи вместо меня ---------- */
Client.buyout = (parts, q, c) => {
  if (parts[0] === 'new') return Client.newBuyout(q);
  if (parts[0]) return Client.buyoutDetail(parts[0], c);
  const list = DB.buyouts.filter(b => b.clientId === c.id);
  return `${pageHead('Купи вместо меня', '', `<a class="btn" href="#/client/buyout/new">${ic('plus')} Новая заявка</a>`)}
    <div class="notice mb">${ic('shopping-bag')} Магазин не принимает казахстанские карты или не доставляет на склад? Пришлите ссылки — менеджер проверит наличие, выставит счёт и выкупит товар. Комиссия ${DB.settings.buyoutCommission}% (мин. $${DB.settings.minBuyoutCommission}).</div>
    <div class="card pad-0 table-wrap">${list.length ? `<table class="t"><thead><tr><th>Заявка</th><th>Товары</th><th>Страна</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>
    ${list.map(b => `<tr class="click" data-action="go" data-href="#/client/buyout/${b.id}"><td><b>${b.id}</b><div class="muted small">${fdate(b.createdAt)}</div></td><td>${esc(b.items.map(i => i.title).join(', '))}</td><td>${flag(b.country)}</td><td>${b.total ? usd(b.total) : '<span class="muted">считаем…</span>'}</td><td>${badge(b.status, BUYOUT_STATUS)}</td></tr>`).join('')}</tbody></table>` : empty('Заявок пока нет', ic('shopping-bag'))}</div>`;
};
Client.newBuyout = q => `${pageHead('Новая заявка на выкуп', '<a href="#/client/buyout">Купи вместо меня</a> / Новая')}
  <form class="grid g-side" data-form="new-buyout"><div class="card">
    <label class="field"><span>Страна магазина</span><select name="country">${countryOptions(q.get('country') || 'US')}</select></label>
    <div id="by-rows">${buyRow(q.get('url') || '')}</div>
    <button type="button" class="btn ghost sm" data-action="by-add">${ic('plus')} Ещё товар</button>
    <label class="field mt"><span>Комментарий менеджеру</span><textarea name="comment" placeholder="Например: если нет размера M — не покупать"></textarea></label>
  </div><div><div class="card"><h4>Как это работает</h4><ol class="muted small" style="padding-left:18px;line-height:1.9"><li>Менеджер проверит наличие и цену</li><li>Вы получите счёт и оплатите его с кошелька</li><li>Мы выкупим товар и укажем трек</li><li>Посылка придёт на ваш адрес склада автоматически</li></ol></div>
  <button class="btn block lg mt">Отправить заявку</button></div></form>`;
const buyRow = (url = '') => `<div class="card flat by-row mb-s" style="padding:12px;background:var(--surface-2)"><label class="field"><span>Ссылка на товар</span><input name="url" type="url" required value="${esc(url)}" placeholder="https://..."></label>
  <div class="inline-inputs"><input name="title" required placeholder="Название"><input name="params" placeholder="Размер, цвет"><input name="qty" type="number" min="1" value="1" style="max-width:80px"><input name="price" type="number" step="0.01" min="0" required placeholder="Цена $" style="max-width:110px"></div></div>`;
A['by-add'] = () => $('#by-rows').insertAdjacentHTML('beforeend', buyRow());
F['new-buyout'] = (d, form) => {
  const fd = new FormData(form), g = k => fd.getAll(k);
  const items = g('url').map((url, i) => ({ url, title: g('title')[i], params: g('params')[i], qty: +g('qty')[i] || 1, price: +g('price')[i] || 0, actual: null }));
  const b = { id: nextId('BY-', 'buyout'), clientId: me().id, country: d.country, status: 'new', createdAt: new Date().toISOString(), items, localShipping: 0, commissionPct: DB.settings.buyoutCommission, total: null, comment: d.comment };
  DB.buyouts.unshift(b);
  logAction('client', `Новая заявка на выкуп ${b.id}`);
  Store.save(); toast('Заявка отправлена менеджеру. Обычно счёт выставляется в течение часа.', 'ok'); location.hash = '#/client/buyout/' + b.id;
};
function buyoutCalc(b) {
  const goods = b.items.reduce((s, i) => s + (i.actual ?? i.price) * i.qty, 0);
  const commission = Math.max(DB.settings.minBuyoutCommission, goods * b.commissionPct / 100);
  return { goods, commission: Math.round(commission * 100) / 100, total: Math.round((goods + commission + (+b.localShipping || 0)) * 100) / 100 };
}
const BUY_FLOW = ['new', 'invoiced', 'paid', 'purchased', 'shipped', 'done'];
function buyStepper(b) {
  const idx = BUY_FLOW.indexOf(b.status);
  return `<div class="stepper">${BUY_FLOW.map((s, i) => `<div class="st ${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}"><span class="dot">${i <= idx ? ic('check') : ''}</span>${BUYOUT_STATUS[s].label}</div>`).join('')}</div>`;
}
Client.buyoutDetail = (id, c) => {
  const b = byId(DB.buyouts, id);
  if (!b || b.clientId !== c.id) return empty('Заявка не найдена');
  const k = buyoutCalc(b);
  const parcel = b.track && DB.parcels.find(p => p.track === b.track);
  return `${pageHead(`Заявка ${b.id}`, '<a href="#/client/buyout">Купи вместо меня</a> / ' + b.id, badge(b.status, BUYOUT_STATUS))}
  ${b.status !== 'cancelled' ? `<div class="card mb">${buyStepper(b)}</div>` : ''}
  <div class="grid g-side"><div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Товар</th><th>Параметры</th><th>Кол-во</th><th class="right">Цена</th></tr></thead><tbody>
    ${b.items.map(i => `<tr><td><b>${esc(i.title)}</b><div class="small"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.url.slice(0, 48))}…</a></div></td><td>${esc(i.params || '—')}</td><td>${i.qty}</td><td class="right">${usd(i.actual ?? i.price)}${i.actual != null && i.actual !== i.price ? `<div class="muted small"><s>${usd(i.price)}</s></div>` : ''}</td></tr>`).join('')}</tbody></table>
    ${b.comment ? `<div style="padding:12px 16px" class="muted small">${ic('message-circle')} ${esc(b.comment)}</div>` : ''}</div>
  <div><div class="card"><h3>Счёт ${b.invoiceId ? `<span class="muted small">${b.invoiceId}</span>` : ''}</h3>
    ${b.status === 'new' ? '<p class="muted">Менеджер проверяет наличие и цены. Счёт появится здесь.</p>' : `<div class="kv"><div>Товары</div><div>${usd(k.goods)}</div><div>Доставка по стране</div><div>${usd(b.localShipping)}</div><div>Комиссия ${b.commissionPct}%</div><div>${usd(k.commission)}</div><div><b>Итого</b></div><div><b>${money(b.total)}</b></div></div>`}
    ${b.status === 'invoiced' ? `<button class="btn accent block lg mt" data-action="pay-buyout" data-id="${b.id}">Оплатить ${usd(b.total)}</button><div class="muted small center mt-s">Баланс: ${usd(c.balance)}</div><button class="btn ghost sm block mt-s" data-action="cancel-buyout" data-id="${b.id}">Отменить заявку</button>` : ''}
    ${b.status === 'new' ? `<button class="btn ghost sm block mt" data-action="cancel-buyout" data-id="${b.id}">Отменить заявку</button>` : ''}
    ${b.orderNo ? `<div class="kv mt"><div>Заказ в магазине</div><div class="mono">${esc(b.orderNo)}</div></div>` : ''}
    ${b.track ? `<div class="kv mt-s"><div>Трек до склада</div><div class="mono">${esc(b.track)}</div></div>` : ''}
    ${parcel ? `<a class="btn secondary block mt" href="#/client/parcel/${parcel.id}">Открыть посылку ${parcel.id}</a>` : ''}
  </div></div></div>`;
};
A['pay-buyout'] = el => {
  const b = byId(DB.buyouts, el.dataset.id), c = me();
  if (c.balance < b.total) { location.hash = `#/client/wallet?topup=${Math.ceil(b.total - c.balance)}`; toast('Недостаточно средств — пополните кошелёк', 'err'); return; }
  addTx(c.id, 'charge', -b.total, `Оплата счёта ${b.invoiceId} (выкуп ${b.id})`);
  b.status = 'paid'; b.paidAt = new Date().toISOString();
  logAction('client', `Оплачен счёт ${b.invoiceId} по выкупу ${b.id}`);
  Store.save(); render(); toast(`${ic('circle-check')} Счёт оплачен. Менеджер выкупит заказ в ближайшее время.`, 'ok');
};
A['cancel-buyout'] = el => {
  const b = byId(DB.buyouts, el.dataset.id);
  if (!confirm('Отменить заявку ' + b.id + '?')) return;
  b.status = 'cancelled'; logAction('client', `Клиент отменил выкуп ${b.id}`); Store.save(); render();
};

/* ---------- Кошелёк ---------- */
const TX_TYPE = { topup: ['Пополнение', 'green'], charge: ['Списание', ''], refund: ['Возврат', 'blue'], bonus: ['Бонус', 'purple'], adjust: ['Корректировка', 'orange'] };
Client.wallet = (_, q, c) => {
  const tx = DB.transactions.filter(x => x.clientId === c.id);
  const invs = DB.buyouts.filter(b => b.clientId === c.id && b.invoiceId);
  if (q.get('topup')) onMount(() => { history.replaceState(null, '', '#/client/wallet'); A['topup']({ dataset: { amount: q.get('topup') } }); });
  return `${pageHead('Кошелёк', '', `<button class="btn" data-action="topup">${ic('plus')} Пополнить</button>`)}
  <div class="grid g3 mb">
    <div class="card"><div class="stat"><span class="l">Баланс</span><span class="v">${usd(c.balance)}</span><span class="muted">≈ ${kzt(c.balance)}</span></div></div>
    <div class="card"><div class="stat"><span class="l">Бонусы</span><span class="v">$${c.bonus}</span><span class="muted small">Можно оплатить до 50% доставки</span></div></div>
    <div class="card"><div class="stat"><span class="l">Потрачено за 30 дней</span><span class="v">${usd(-tx.filter(x => x.amount < 0 && daysSince(x.date) <= 30).reduce((s, x) => s + x.amount, 0))}</span></div></div>
  </div>
  <div class="tabs"><a class="active">История операций</a></div>
  <div class="card pad-0 table-wrap mb"><table class="t"><thead><tr><th>Дата</th><th>Операция</th><th>Описание</th><th class="right">Сумма</th></tr></thead><tbody>
    ${tx.map(x => `<tr><td class="nowrap">${fdt(x.date)}</td><td><span class="badge ${TX_TYPE[x.type][1]}">${TX_TYPE[x.type][0]}</span></td><td>${esc(x.note)}${x.method ? ` <span class="muted small">· ${esc(x.method)}</span>` : ''}</td><td class="right nowrap" style="color:${x.amount > 0 ? 'var(--green)' : 'inherit'};font-weight:600">${x.amount > 0 ? '+' : ''}${usd(x.amount)}</td></tr>`).join('') || `<tr><td colspan="4">${empty('Операций пока нет')}</td></tr>`}</tbody></table></div>
  <h3>Счета</h3><div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Счёт</th><th>Назначение</th><th>Сумма</th><th>Статус</th><th></th></tr></thead><tbody>
    ${invs.map(b => `<tr><td class="mono">${b.invoiceId}</td><td>Выкуп ${b.id}</td><td>${usd(b.total)}</td><td>${b.status === 'invoiced' ? '<span class="badge orange">Не оплачен</span>' : b.status === 'cancelled' ? '<span class="badge red">Аннулирован</span>' : '<span class="badge green">Оплачен</span>'}</td><td><button class="btn ghost sm" data-action="invoice-pdf" data-id="${b.id}">PDF</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted center">Счетов нет</td></tr>`}</tbody></table></div>`;
};
A['invoice-pdf'] = el => {
  const b = byId(DB.buyouts, el.dataset.id), c = clientById(b.clientId), k = buyoutCalc(b);
  openModal('Счёт ' + b.invoiceId, `<div id="inv-print"><div class="row between"><div class="brand"><span class="logo">Q</span>QazBox</div><div class="right small">ТОО «QazBox Logistics»<br>БИН 000000000000</div></div><hr>
    <p><b>Счёт № ${b.invoiceId}</b> от ${fdate(b.createdAt)}<br>Плательщик: ${esc(c.name)} (${c.id})</p>
    <table class="t"><tbody>${b.items.map(i => `<tr><td>${esc(i.title)} × ${i.qty}</td><td class="right">${usd((i.actual ?? i.price) * i.qty)}</td></tr>`).join('')}<tr><td>Доставка по стране</td><td class="right">${usd(b.localShipping)}</td></tr><tr><td>Комиссия сервиса ${b.commissionPct}%</td><td class="right">${usd(k.commission)}</td></tr><tr><td><b>Итого</b></td><td class="right"><b>${usd(b.total)} (${kzt(b.total)})</b></td></tr></tbody></table></div>
    <div class="modal-foot"><button class="btn" onclick="window.print()">${ic('printer')} Печать / PDF</button></div>`);
};
A['topup'] = el => {
  const amt = el?.dataset?.amount && el.dataset.amount !== '1' ? el.dataset.amount : 20;
  openModal('Пополнение кошелька', `<form data-form="topup">
    <label class="field"><span>Сумма, USD</span><input name="amount" type="number" min="1" step="1" value="${amt}" class="big" data-input="topup-kzt"></label>
    <div class="muted mb" id="topup-kzt">≈ ${kzt(amt)}</div>
    <div class="chips mb">${[10, 20, 50, 100].map(v => `<button type="button" class="chip" data-action="topup-preset" data-v="${v}">$${v}</button>`).join('')}</div>
    <div class="pill-select"><label><input type="radio" name="method" value="kaspi" checked><span><b style="color:#f14635">Kaspi Pay</b><br><span class="muted small">QR или переход в приложение Kaspi.kz</span></span></label>
    <label><input type="radio" name="method" value="card"><span><b>${ic('credit-card')} Банковская карта</b><br><span class="muted small">Visa, Mastercard · 3-D Secure</span></span></label></div>
    <button class="btn block lg mt">Продолжить</button></form>`);
};
CH['topup-kzt'] = el => { $('#topup-kzt').textContent = '≈ ' + kzt(+el.value); };
A['topup-preset'] = el => { const i = $('input[name=amount]'); i.value = el.dataset.v; CH['topup-kzt'](i); };
F['topup'] = d => {
  const amount = +d.amount;
  if (!(amount > 0)) return;
  if (d.method === 'kaspi') {
    openModal('Оплата через Kaspi Pay', `<div class="center"><div style="display:inline-block;padding:14px;border:1px solid var(--border);border-radius:16px">${fakeQR()}</div>
      <p class="mt">Отсканируйте QR в приложении <b>Kaspi.kz</b><br>Сумма: <b>${kzt(amount)}</b></p><p class="muted small">Тестовый режим эквайринга — платёж будет подтверждён автоматически</p>
      <div class="row" style="justify-content:center"><span class="spinner"></span><span class="muted">Ожидаем оплату…</span></div></div>`, { noFocus: true });
    setTimeout(() => finishTopup(amount, 'Kaspi', 'Пополнение через Kaspi Pay'), 2200);
  } else {
    openModal('Оплата картой', `<form data-form="card-pay"><input type="hidden" name="amount" value="${amount}">
      <div class="notice mb">${ic('flask-conical')} Тестовый режим: используйте тестовую карту 4242 4242 4242 4242</div>
      <label class="field"><span>Номер карты</span><input name="pan" value="4242 4242 4242 4242" class="mono"></label>
      <div class="inline-inputs"><label class="field"><span>Срок</span><input value="12/29" class="mono"></label><label class="field"><span>CVC</span><input value="123" class="mono" type="password"></label></div>
      <button class="btn block lg">Оплатить ${kzt(amount)}</button></form>`);
  }
};
F['card-pay'] = d => {
  openModal('3-D Secure', `<div class="center"><p>Подтверждение платежа в банке…</p><span class="spinner"></span></div>`, { noFocus: true });
  setTimeout(() => finishTopup(+d.amount, 'Карта', 'Visa •• ' + d.pan.replace(/\s/g, '').slice(-4)), 1600);
};
function finishTopup(amount, method, note) {
  addTx(DB.session.clientId, 'topup', amount, note, method);
  logAction('client', `Пополнение ${usd(amount)} (${method})`);
  Store.save(); closeModal();
  if (location.hash.includes('topup')) location.hash = '#/client/wallet'; else render();
  toast(`${ic('circle-check')} Баланс пополнен на ${usd(amount)}`, 'ok');
}
function fakeQR() {
  let s = '', seed = 7;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    seed = (seed * 9301 + 49297) % 233280;
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const on = finder ? (x % 6 === 0 || y % 6 === 0 || (x % 20 > 1 && x % 20 < 5 && y % 20 > 1 && y % 20 < 5) || x === 20 || y === 20 || x === 14 || y === 14) && !((x > 6 && x < 14) || (y > 6 && y < 14)) : seed / 233280 > .5;
    if (on) s += `<rect x="${x * 8}" y="${y * 8}" width="8" height="8"/>`;
  }
  return `<svg width="168" height="168" viewBox="0 0 168 168" fill="#111">${s}</svg>`;
}

/* ---------- Получение ---------- */
Client.delivery = (_, __, c) => {
  const dl = c.defaultDelivery || { method: 'pickup', pointId: c.defaultPoint || 'PT-1' };
  const reqs = DB.courierRequests.filter(r => r.clientId === c.id);
  return `${pageHead('Способ получения')}
  <div class="grid g-side"><div class="card"><h3>По умолчанию для новых посылок</h3>${deliveryForm(dl, '', c)}</div>
  <div><div class="card mb"><h3>${ic('map')} Пункты и постаматы</h3><div style="height:180px;border-radius:12px;background:linear-gradient(135deg,#dbeafe,#e0e7ff);display:grid;place-items:center;color:var(--muted);position:relative;overflow:hidden">
    <span style="position:absolute;left:30%;top:40%;font-size:22px">${ic('map-pin')}</span><span style="position:absolute;left:55%;top:25%;font-size:22px">${ic('map-pin')}</span><span style="position:absolute;left:70%;top:60%;font-size:22px">${ic('archive')}</span><span class="small" style="position:absolute;bottom:8px">Здесь будет карта (2GIS / Яндекс)</span></div>
    <p class="muted small mt-s">${DB.points.filter(p => p.type === 'pvz').length} пунктов выдачи и ${DB.points.filter(p => p.type === 'locker').length} постамата в ${new Set(DB.points.map(p => p.city)).size} городах</p></div>
  <div class="card"><h3>Заявки на курьера</h3>${reqs.map(r => `<div class="small mb-s"><b>${r.id}</b> · ${esc(r.address)}<br><span class="muted">${fdate(r.date)} ${r.slot}</span> ${r.status === 'done' ? '<span class="badge green">Доставлено</span>' : r.extId ? '<span class="badge blue">Передано в службу</span>' : '<span class="badge orange">Ожидает</span>'}</div>`).join('') || '<p class="muted small">Заявки создаются автоматически, когда посылка с курьерской доставкой прибывает в Казахстан.</p>'}</div></div></div>`;
};

/* ---------- Лояльность и рефералы ---------- */
Client.loyalty = (_, __, c) => {
  const friends = DB.clients.filter(x => x.referrer === c.id);
  const link = `${location.origin}${location.pathname}#/?ref=${c.id}`;
  return `${pageHead('Бонусы и друзья')}
  <div class="grid g2 mb"><div class="card"><h3>Уровни лояльности</h3>
    ${DB.levels.map(l => `<div class="row nowrap mb-s" style="padding:10px;border-radius:10px;${l.id === c.level ? 'background:var(--primary-50)' : ''}"><span class="badge" style="background:${l.color};color:#fff;min-width:78px;justify-content:center">${l.name}</span><div class="grow small"><b>от ${l.fromKg} кг</b> · ${esc(l.perks)}</div>${l.id === c.level ? '<span class="badge indigo">Ваш</span>' : ''}</div>`).join('')}
    <p class="muted small">Уровень пересчитывается автоматически по суммарному весу отправленных посылок.</p></div>
  <div class="card"><h3>${ic('gift')} Приглашайте друзей</h3><p>Вы и друг получите по <b>$${DB.settings.referralBonus}</b> после регистрации по вашей ссылке.</p>
    <div class="copy-line hl"><span class="v small">${esc(link)}</span>${copyBtn(link)}</div>
    <div class="copy-line"><span class="k">Промокод</span><span class="v mono">${c.id}</span>${copyBtn(c.id)}</div>
    <div class="row mt-s"><button class="btn secondary sm" data-action="share" data-ch="WhatsApp">WhatsApp</button><button class="btn secondary sm" data-action="share" data-ch="Telegram">Telegram</button></div>
    <h4 class="mt">Приглашено: ${friends.length}</h4>${friends.map(f => `<div class="row nowrap mb-s">${avatar(f.name, 28)}<span class="grow small">${esc(f.name)}</span><span class="badge green">+$${DB.settings.referralBonus}</span></div>`).join('') || '<p class="muted small">Пока никого</p>'}</div></div>`;
};
A['share'] = el => toast(`Откроется ${el.dataset.ch} с готовым сообщением и вашей ссылкой`);

/* ---------- Поддержка ---------- */
Client.support = (parts, _, c) => {
  const list = DB.tickets.filter(x => x.clientId === c.id);
  const cur = parts[0] && byId(DB.tickets, parts[0]);
  return `${pageHead('Поддержка', '', `<button class="btn" data-action="ticket-new">${ic('plus')} Новое обращение</button>`)}
  <div class="grid g-side">${cur ? ticketView(cur, 'client') : `<div class="card">${list.length ? '<p class="muted">Выберите обращение справа</p>' : empty('Обращений нет', ic('message-circle'))}</div>`}
  <div class="card pad-0">${list.map(tk => `<div class="parcel-item" data-action="go" data-href="#/client/support/${tk.id}"><div class="meta"><b>${esc(tk.subject)}</b><div class="muted small">${tk.id} · ${fdate(tk.createdAt)}</div></div>${tk.status === 'open' ? '<span class="badge orange">Открыто</span>' : '<span class="badge green">Решено</span>'}</div>`).join('')}
  <div style="padding:14px" class="small muted">Также пишите в Telegram <b>@QazBoxBot</b> или WhatsApp — ответы попадут сюда.</div></div></div>`;
};
function ticketView(tk, side) {
  const c = clientById(tk.clientId);
  return `<div class="card"><div class="card-head"><div><h3>${esc(tk.subject)}</h3><div class="muted small">${tk.id}${side !== 'client' ? ' · ' + esc(c?.name) + ' ' + c?.id : ''}</div></div>${tk.status === 'open' ? '<span class="badge orange">Открыто</span>' : '<span class="badge green">Решено</span>'}</div>
    <div class="chat">${tk.messages.map(m => `<div class="msg ${(m.from === 'client') === (side === 'client') ? 'me' : ''}">${esc(m.text)}<div class="when">${m.from === 'support' ? 'Поддержка · ' : ''}${fdt(m.date)}</div></div>`).join('')}</div>
    <form class="row nowrap mt" data-form="ticket-reply"><input type="hidden" name="id" value="${tk.id}"><input type="hidden" name="side" value="${side}"><input name="text" placeholder="Сообщение…" required autocomplete="off"><button class="btn">${ic('send')}</button></form>
    ${side !== 'client' && tk.status === 'open' ? `<button class="btn ghost sm mt-s" data-action="ticket-close" data-id="${tk.id}">${ic('check')} Закрыть обращение</button>` : ''}</div>`;
}
A['ticket-new'] = () => openModal('Новое обращение', `<form data-form="ticket-new"><label class="field"><span>Тема</span><input name="subject" required></label>
  <label class="field"><span>Посылка (необязательно)</span><select name="parcel"><option value="">—</option>${myParcels().map(p => `<option>${p.id} · ${esc(p.store)}</option>`).join('')}</select></label>
  <label class="field"><span>Сообщение</span><textarea name="text" required></textarea></label><button class="btn block">Отправить</button></form>`);
F['ticket-new'] = d => {
  const tk = { id: nextId('T-', 'ticket'), clientId: me().id, subject: d.subject, status: 'open', createdAt: new Date().toISOString(), messages: [{ from: 'client', text: (d.parcel ? `[${d.parcel}] ` : '') + d.text, date: new Date().toISOString() }] };
  DB.tickets.unshift(tk); logAction('client', `Новое обращение ${tk.id}`); Store.save(); closeModal(); location.hash = '#/client/support/' + tk.id;
  setTimeout(() => { tk.messages.push({ from: 'support', text: 'Здравствуйте! Мы получили ваше обращение и ответим в течение 15 минут.', date: new Date().toISOString() }); Store.save(); if (location.hash.endsWith(tk.id)) render(); }, 1500);
};
F['ticket-reply'] = d => {
  const tk = byId(DB.tickets, d.id);
  tk.messages.push({ from: d.side === 'client' ? 'client' : 'support', text: d.text, date: new Date().toISOString() });
  if (d.side !== 'client') { tk.status = 'open'; notify(tk.clientId, `Ответ поддержки по обращению ${tk.id}`); logAction('admin', `Ответ в обращении ${tk.id}`); }
  Store.save(); render();
};
A['ticket-close'] = el => { byId(DB.tickets, el.dataset.id).status = 'closed'; logAction('admin', 'Закрыто обращение ' + el.dataset.id); Store.save(); render(); };

/* ---------- Уведомления и настройки ---------- */
Client.notifications = (_, __, c) => {
  const list = DB.notifications.filter(n => n.clientId === c.id);
  onMount(() => { list.forEach(n => n.read = true); Store.save(); });
  return `${pageHead('Уведомления')}<div class="card pad-0">${list.map(n => `<div class="parcel-item" style="cursor:default"><span class="icon-tile" style="width:36px;height:36px;font-size:18px;${n.read ? 'background:var(--gray-50);color:var(--muted)' : ''}">${ic(n.read ? 'bell' : 'bell-ring')}</span><div class="meta"><div>${esc(n.text)}</div><div class="muted small">${fdt(n.date)} · ${n.channels.map(x => CHANNEL_NAME[x]).join(', ') || 'в кабинете'}</div></div></div>`).join('') || empty('Нет уведомлений', ic('bell'))}</div>`;
};
Client.settings = (_, __, c) => {
  const ch = c.channels || {};
  const row = (k, ico, label, desc) => `<label class="row nowrap between" style="padding:12px 0;border-bottom:1px solid var(--border)"><span class="row nowrap"><span class="icon-tile" style="width:36px;height:36px;font-size:18px">${ico}</span><span><b>${label}</b><br><span class="muted small">${desc}</span></span></span><input type="checkbox" data-change="channel" data-ch="${k}" ${ch[k] ? 'checked' : ''} style="width:20px;height:20px"></label>`;
  return `${pageHead('Настройки')}<div class="grid g2"><div class="card"><h3>Профиль</h3><form data-form="profile">
    <label class="field"><span>Имя</span><input name="name" value="${esc(c.name)}"></label><label class="field"><span>Имя латиницей (для этикеток)</span><input name="latin" value="${esc(c.latin)}"></label>
    <label class="field"><span>Email</span><input name="email" value="${esc(c.email)}"></label><label class="field"><span>Телефон</span><input name="phone" value="${esc(c.phone)}"></label>
    <label class="field"><span>Город</span><input name="city" value="${esc(c.city)}"></label><button class="btn">Сохранить</button></form>
    <h4 class="mt">Язык интерфейса</h4>${langSwitch()}</div>
  <div class="card"><h3>Каналы уведомлений</h3>
    ${row('email', ic('mail'), 'Email', esc(c.email || 'не указан'))}${row('sms', ic('message-circle'), 'SMS', esc(c.phone || 'не указан'))}${row('whatsapp', ic('message-circle-more'), 'WhatsApp', 'WhatsApp Business API')}
    ${row('telegram', ic('plane'), 'Telegram', ch.telegram ? 'Бот @QazBoxBot подключён' : 'Нажмите, чтобы подключить @QazBoxBot')}${row('push', ic('bell'), 'Push (PWA)', 'Уведомления в браузере/на телефоне')}
    <button class="btn secondary sm mt" data-action="test-notify">Отправить тестовое уведомление</button></div></div>`;
};
CH['channel'] = async el => {
  const c = me(); c.channels = c.channels || {};
  if (el.dataset.ch === 'push' && el.checked && 'Notification' in window) {
    const r = await Notification.requestPermission().catch(() => 'denied');
    if (r !== 'granted') toast('Браузер не разрешил push — в демо уведомления будут в кабинете', 'err');
  }
  if (el.dataset.ch === 'telegram' && el.checked) toast('В боевой версии откроется t.me/QazBoxBot?start=' + c.id + ' для привязки', 'info');
  c.channels[el.dataset.ch] = el.checked; Store.save();
};
A['test-notify'] = () => { notify(me().id, 'Тестовое уведомление: всё работает'); Store.save(); };
F['profile'] = d => { Object.assign(me(), { ...d, latin: d.latin.toUpperCase() }); Store.save(); render(); toast('Профиль сохранён', 'ok'); };
