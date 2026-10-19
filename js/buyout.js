/* Кабинет менеджера выкупа */
const BY = {};

BY.render = (parts, q) => {
  const page = parts[0] || 'queue';
  const cnt = st => DB.buyouts.filter(b => b.status === st).length;
  const nav = [
    { key: 'queue', icon: ic('square-kanban'), label: 'Очередь заявок', short: 'Очередь', count: cnt('new') },
    { key: 'list', icon: ic('copy'), label: 'Все заявки', short: 'Все' },
    { key: 'stores', icon: ic('building-2'), label: 'Спецмагазины', short: 'Магазины' },
    { key: 'settings', icon: ic('settings'), label: 'Комиссии', short: 'Комиссии' },
  ];
  const pages = { queue: BY.queue, list: BY.list, request: BY.request, stores: BY.stores, settings: BY.settings };
  const userCard = `<div class="user-card"><div class="row nowrap">${avatar('Сауле Б.', 28)}<span class="small"><b>Сауле Б.</b><br><span class="muted">Менеджер выкупа</span></span></div>
    <div class="small mt-s muted">К выкупу: <b>${cnt('paid')}</b> · ждут оплаты: <b>${cnt('invoiced')}</b></div></div>`;
  const content = (pages[page] || BY.queue)(parts.slice(1), q);
  return cabinetLayout({ area: 'buyout', brandSub: 'Выкуп товаров', nav, current: page === 'request' ? 'queue' : page, content, userCard });
};

BY.queue = () => {
  const cols = ['new', 'invoiced', 'paid', 'purchased', 'shipped'];
  return `${pageHead(`${ic('square-kanban')} Очередь заявок на выкуп`)}
  <div class="kanban">${cols.map(st => { const list = DB.buyouts.filter(b => b.status === st); return `<div class="col"><h4>${BUYOUT_STATUS[st].label}<span class="badge ${BUYOUT_STATUS[st].color}">${list.length}</span></h4>
    ${list.map(b => { const c = clientById(b.clientId); const age = (Date.now() - new Date(b.createdAt)) / 36e5; return `<div class="kcard" data-action="go" data-href="#/buyout/request/${b.id}">
      <div class="row between"><b>${b.id}</b><span>${flag(b.country)}</span></div><div class="small">${esc(b.items.map(i => i.title).join(', '))}</div>
      <div class="row between small mt-s"><span class="muted">${esc(c?.name)}</span><b>${b.total ? usd(b.total) : '~' + usd(b.items.reduce((s, i) => s + i.price * i.qty, 0))}</b></div>
      ${st === 'new' && age > 1 ? `<span class="badge red mt-s">${ic('alarm-clock')} ${Math.round(age)} ч без ответа</span>` : ''}</div>`; }).join('') || '<div class="muted small center" style="padding:20px 0">пусто</div>'}</div>`; }).join('')}</div>`;
};
BY.list = () => `${pageHead(`${ic('copy')} Все заявки`, '', `<button class="btn secondary" data-action="export-xlsx" data-what="buyouts">${ic('download')} XLSX</button>`)}
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Заявка</th><th>Клиент</th><th>Страна</th><th>Товары</th><th>Сумма</th><th>Комиссия</th><th>Статус</th></tr></thead><tbody>
  ${DB.buyouts.map(b => `<tr class="click" data-action="go" data-href="#/buyout/request/${b.id}"><td><b>${b.id}</b><div class="muted small">${fdate(b.createdAt)}</div></td><td>${clientChip(b.clientId)}</td><td>${flag(b.country)}</td><td class="small">${esc(b.items.map(i => i.title).join(', '))}</td><td>${b.total ? usd(b.total) : '—'}</td><td>${b.total ? usd(buyoutCalc(b).commission) : '—'}</td><td>${badge(b.status, BUYOUT_STATUS)}</td></tr>`).join('')}
  </tbody></table></div>`;

BY.request = ([id]) => {
  const b = byId(DB.buyouts, id);
  if (!b) return empty('Заявка не найдена');
  const c = clientById(b.clientId), k = buyoutCalc(b);
  const editable = b.status === 'new';
  const store = DB.stores.find(s => b.items.some(i => i.url.includes(s.url.replace('https://', '').split('.')[0])));
  return `${pageHead(`Заявка ${b.id}`, '<a href="#/buyout/queue">Очередь</a> / ' + b.id, badge(b.status, BUYOUT_STATUS))}
  ${b.status !== 'cancelled' ? `<div class="card mb">${buyStepper(b)}</div>` : ''}
  <div class="grid g-side"><div>
    <form class="card pad-0 table-wrap mb" data-form="by-invoice"><input type="hidden" name="id" value="${b.id}"><table class="t"><thead><tr><th>Товар</th><th>Параметры</th><th>Кол-во</th><th>Цена клиента</th><th>Факт. цена</th></tr></thead><tbody>
      ${b.items.map((i, n) => `<tr><td><b>${esc(i.title)}</b><div class="small"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.url.slice(0, 50))} ${ic('external-link')}</a></div></td><td>${esc(i.params || '—')}</td><td>${i.qty}</td><td>${usd(i.price)}</td>
        <td>${editable ? `<input name="actual${n}" type="number" step="0.01" value="${i.actual ?? i.price}" style="width:100px" data-input="by-recalc">` : usd(i.actual ?? i.price)}</td></tr>`).join('')}
    </tbody></table>
    ${editable ? `<div style="padding:16px"><div class="grid g3"><label class="field"><span>Доставка по стране, $</span><input name="localShipping" type="number" step="0.01" value="${b.localShipping}" data-input="by-recalc"></label>
      <label class="field"><span>Комиссия, %</span><input name="commissionPct" type="number" step="0.5" value="${b.commissionPct}" data-input="by-recalc"></label><div class="stat"><span class="l">Итого счёт</span><span class="v" id="by-total">${usd(k.total)}</span></div></div>
      <div class="row"><button class="btn">${ic('receipt')} Выставить счёт клиенту</button><button type="button" class="btn ghost" data-action="by-cancel" data-id="${b.id}">Отклонить</button></div></div>` : ''}
    </form>
    ${b.comment ? `<div class="notice mb">${ic('message-circle')} Клиент: ${esc(b.comment)}</div>` : ''}
    ${b.status === 'paid' ? `<div class="card mb"><h3>${ic('shopping-cart')} Выкуп</h3><p class="muted">Оформите заказ в магазине на адрес склада ${flag(b.country)} с кодом клиента <b class="mono">${c.id}</b> и укажите номер заказа.</p>
      <div class="copy-line hl"><span class="k">Address line 2</span><span class="v">${countryBy(b.country).address.line2.replace('{ID}', c.id)}</span>${copyBtn(c.id)}</div>
      <form class="row nowrap" data-form="by-purchased"><input type="hidden" name="id" value="${b.id}"><input name="orderNo" placeholder="Номер заказа в магазине" required><input name="card" placeholder="Карта (последние 4)" style="max-width:160px" value="7781"><button class="btn">Выкуплено</button></form></div>` : ''}
    ${b.status === 'purchased' ? `<div class="card mb"><h3>${ic('package')} Трек до склада</h3><form class="row nowrap" data-form="by-track"><input type="hidden" name="id" value="${b.id}"><input name="track" required placeholder="Трек-номер от магазина" class="mono"><button class="btn">Сохранить</button></form>
      <p class="muted small mt-s">Система создаст ожидаемую посылку у клиента — склад примет её автоматически по треку.</p></div>` : ''}
  </div><div>
    <div class="card mb"><h3>Клиент</h3>${clientChip(c.id)}<div class="kv mt"><div>Город</div><div>${esc(c.city)}</div><div>Телефон</div><div>${esc(c.phone)}</div><div>Выкупов</div><div>${DB.buyouts.filter(x => x.clientId === c.id).length}</div></div></div>
    <div class="card mb"><h3>Расчёт</h3><div class="kv"><div>Товары</div><div>${usd(k.goods)}</div><div>Доставка</div><div>${usd(b.localShipping)}</div><div>Комиссия</div><div>${usd(k.commission)}</div><div><b>Итого</b></div><div><b>${usd(b.total || k.total)}</b></div>${b.invoiceId ? `<div>Счёт</div><div class="mono">${b.invoiceId}</div>` : ''}${b.orderNo ? `<div>Заказ</div><div class="mono">${esc(b.orderNo)}</div>` : ''}${b.track ? `<div>Трек</div><div class="mono">${esc(b.track)}</div>` : ''}</div></div>
    ${store ? `<div class="card">${store.special ? '<span class="badge orange">Спецмагазин</span>' : ''}<h4 class="mt-s">${esc(store.name)}</h4><p class="muted small">${store.special ? 'Не принимает карты РК — выкуп через корпоративную карту.' : 'Клиент мог заказать сам.'}</p></div>` : ''}
  </div></div>`;
};
CH['by-recalc'] = el => {
  const f = el.form.elements, b = byId(DB.buyouts, f['id'].value);
  const tmp = { ...b, items: b.items.map((i, n) => ({ ...i, actual: +f['actual' + n].value })), localShipping: +f['localShipping'].value, commissionPct: +f['commissionPct'].value };
  $('#by-total').textContent = usd(buyoutCalc(tmp).total);
};
F['by-invoice'] = (d) => {
  const b = byId(DB.buyouts, d.id);
  b.items.forEach((i, n) => i.actual = +d['actual' + n]);
  b.localShipping = +d.localShipping; b.commissionPct = +d.commissionPct;
  b.total = buyoutCalc(b).total; b.status = 'invoiced'; b.invoiceId = nextId('INV-', 'inv');
  notify(b.clientId, `Выставлен счёт ${b.invoiceId} на выкуп ${b.id}: ${usd(b.total)}. Оплатите в кабинете.`);
  logAction('buyout', `Выставлен счёт ${b.invoiceId} по ${b.id}: ${usd(b.total)}`);
  Store.save(); render(); toast('Счёт выставлен', 'ok');
};
A['by-cancel'] = el => {
  const b = byId(DB.buyouts, el.dataset.id);
  const reason = prompt('Причина отклонения (увидит клиент)', 'Товара нет в наличии');
  if (reason == null) return;
  b.status = 'cancelled'; b.cancelReason = reason;
  notify(b.clientId, `Заявка ${b.id} отклонена: ${reason}`);
  logAction('buyout', `Отклонена заявка ${b.id}: ${reason}`);
  Store.save(); render();
};
F['by-purchased'] = d => {
  const b = byId(DB.buyouts, d.id);
  b.status = 'purchased'; b.orderNo = d.orderNo; b.purchasedAt = new Date().toISOString();
  notify(b.clientId, `Заказ по заявке ${b.id} выкуплен (заказ ${d.orderNo})`);
  logAction('buyout', `Выкуплен ${b.id}, заказ ${d.orderNo}, карта •• ${d.card}`);
  Store.save(); render();
};
F['by-track'] = d => {
  const b = byId(DB.buyouts, d.id), track = d.track.trim().toUpperCase();
  b.track = track; b.status = 'shipped';
  const c = clientById(b.clientId);
  const p = { id: 'P-' + (++DB.seq.parcel), track, store: 'Выкуп ' + b.id, clientId: c.id, country: b.country, status: 'expected', weight: 0, dims: null, items: b.items.map(i => ({ name: i.title, qty: i.qty, price: i.actual ?? i.price })),
    createdAt: new Date().toISOString(), photos: [], cell: null, batchId: null, paid: false, cost: null, delivery: c.defaultDelivery || { method: 'pickup', pointId: c.defaultPoint || 'PT-1' }, services: [], history: [] };
  setParcelStatus(p, 'expected', 'Создана из выкупа ' + b.id);
  DB.parcels.unshift(p);
  notify(c.id, `Выкуп ${b.id} отправлен на склад, трек ${track}`);
  logAction('buyout', `${b.id}: трек ${track}, создана посылка ${p.id}`);
  Store.save(); render(); toast(`Создана ожидаемая посылка ${p.id}`, 'ok');
};

BY.stores = () => `${pageHead(`${ic('building-2')} Спецмагазины`, 'Магазины, где заказ возможен только через выкуп')}
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Магазин</th><th>Страна</th><th>Категория</th><th>Только выкуп</th></tr></thead><tbody>
  ${DB.stores.map(s => `<tr><td><div class="row nowrap"><div class="store-logo" style="background:${s.color};width:32px;height:32px;font-size:13px">${esc(s.name[0])}</div><b>${esc(s.name)}</b></div></td><td>${flag(s.country)}</td><td>${esc(s.category)}</td><td><input type="checkbox" data-change="store-special" data-id="${s.id}" ${s.special ? 'checked' : ''}></td></tr>`).join('')}
  </tbody></table></div>`;
CH['store-special'] = el => { const s = byId(DB.stores, el.dataset.id); s.special = el.checked; logAction(location.hash.includes('admin') ? 'admin' : 'buyout', `${s.name}: «только выкуп» = ${el.checked ? 'да' : 'нет'}`); Store.save(); };

BY.settings = () => `${pageHead(`${ic('settings')} Комиссии выкупа`)}<div class="card" style="max-width:520px"><form data-form="by-settings">
  <label class="field"><span>Комиссия по умолчанию, %</span><input name="buyoutCommission" type="number" step="0.5" value="${DB.settings.buyoutCommission}"></label>
  <label class="field"><span>Минимальная комиссия, $</span><input name="minBuyoutCommission" type="number" step="0.5" value="${DB.settings.minBuyoutCommission}"></label>
  <button class="btn">Сохранить</button></form></div>`;
F['by-settings'] = d => { DB.settings.buyoutCommission = +d.buyoutCommission; DB.settings.minBuyoutCommission = +d.minBuyoutCommission; logAction('buyout', `Комиссия выкупа: ${d.buyoutCommission}%, мин. $${d.minBuyoutCommission}`); Store.save(); toast('Сохранено', 'ok'); };
