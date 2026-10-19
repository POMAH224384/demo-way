/* B2B личный кабинет клиента */
const BCab = {};
const leadBadge = st => `<span class="badge ${LEAD_STATUS[st]?.color || ''}">${esc(LEAD_STATUS[st]?.label || st)}</span>`;
const fmtSize = b => b > 1e6 ? (b / 1e6).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1e3)) + ' КБ';
const route = l => `${esc(l.from)} ${ic('arrow-right')} ${esc(l.to)}`;

function leadSteps(l) {
  const stopped = ['rejected', 'cancelled'].includes(l.status);
  const last = stopped ? l.history.filter(h => LEAD_FLOW.includes(h.to)).map(h => h.to).pop() : l.status;
  const idx = LEAD_FLOW.indexOf(last);
  return `<div class="b-steps-bar">${LEAD_FLOW.map((s, i) => `<div class="${i <= idx ? 'done' : ''} ${i === idx && !stopped ? 'cur' : ''}"><span></span>${LEAD_STATUS[s].label}</div>`).join('')}</div>`;
}
function quoteTable(q) {
  return `<div class="table-wrap"><table class="t"><thead><tr><th>Позиция</th><th class="right">Кол-во</th><th class="right">Цена</th><th class="right">Сумма</th></tr></thead><tbody>
    ${q.items.map(i => `<tr><td>${esc(i.name)}</td><td class="right nowrap">${i.qty} ${esc(i.unit)}</td><td class="right nowrap">${tg(i.price)}</td><td class="right nowrap">${tg(i.qty * i.price)}</td></tr>`).join('')}
    <tr><td colspan="3"><b>Итого</b></td><td class="right nowrap"><b>${tg(quoteTotal(q))}</b></td></tr></tbody></table></div>
    <div class="kv mt"><div>Срок доставки</div><div>${esc(q.transit)}</div><div>Действует до</div><div>${fdate(q.validUntil)}</div><div>Условия</div><div>${esc(q.terms)}</div></div>`;
}
function leadInfo(l) {
  const rows = [['Услуга', esc(serviceName(l.service))], ['Маршрут', route(l)], ['Груз', esc(l.cargo)], ['Вес / объём', `${l.weight ? l.weight + ' кг' : '—'} / ${l.volume ? l.volume + ' м³' : '—'}`],
    ['Мест', l.places || '—'], ['Стоимость груза', l.valueUsd ? '$' + (+l.valueUsd).toLocaleString('ru-RU') : '—'], ['Периодичность', esc(l.frequency || '—')], ['Источник', esc(l.source)], ['Создана', fdt(l.createdAt)]];
  return `<div class="kv">${rows.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>${l.comment ? `<div class="notice mt">${ic('message-circle')} ${esc(l.comment)}</div>` : ''}`;
}
function filesList(l, canUpload, form) {
  return `${l.files.map(f => `<div class="row nowrap b-file"><span class="icon-tile" style="width:36px;height:36px;font-size:16px">${ic('file-text')}</span><div class="grow"><b class="small">${esc(f.name)}</b><div class="muted small">${fmtSize(f.size)} · ${esc(userById(f.by)?.role === 'CLIENT' ? 'Клиент' : userById(f.by)?.name || '')}</div></div><button class="icon-btn" data-action="b-file-dl" data-name="${esc(f.name)}">${ic('download')}</button></div>`).join('') || '<p class="muted small">Документов пока нет</p>'}
    ${canUpload ? `<label class="btn secondary sm mt-s"><input type="file" multiple hidden data-change="${form}" data-id="${l.id}">${ic('paperclip')} Прикрепить файл</label>` : ''}`;
}
A['b-file-dl'] = el => toast(`Файл «${esc(el.dataset.name)}» скачается из хранилища (S3) — в демо файлы не сохраняются`, 'info');

function cabLayout(u, tab, content) {
  const co = companyById(u.companyId);
  const tabs = [['', 'Мои заявки', 'list'], ['new', 'Новая заявка', 'plus'], ['profile', 'Профиль компании', 'building-2']];
  return `${bHeader()}<div class="container b-cab">
    <div class="b-cab-head"><div><div class="eyebrow">Личный кабинет</div><h1>${esc(co?.name || u.name)}</h1><div class="muted">${esc(u.name)} · ${esc(u.email)}</div></div>
      <nav class="tabs" style="border:0;margin:0">${tabs.map(([k, l, i]) => `<a href="#/cabinet${k ? '/' + k : ''}" class="${tab === k ? 'active' : ''}">${ic(i)} ${l}</a>`).join('')}<a href="#/" data-action="b-logout">${ic('log-out')} Выйти</a></nav></div>
    ${content}</div>${bFooter()}`;
}
A['b-logout'] = (el, e) => { e.preventDefault(); BB.session.clientId = null; B2BStore.save(); location.hash = '#/'; toast('Вы вышли из кабинета'); };

BCab.render = (parts, q) => {
  const u = clientUser();
  if (!u) { location.replace('#/login'); return ''; }
  if (parts[0] === 'new') return cabLayout(u, 'new', `<div class="card" style="padding:24px;max-width:900px">${leadForm('cabinet')}</div>`);
  if (parts[0] === 'profile') return cabLayout(u, 'profile', BCab.profile(u));
  if (parts[0] === 'lead') return cabLayout(u, '', BCab.lead(u, parts[1]));
  return cabLayout(u, '', BCab.list(u));
};

BCab.list = u => {
  const list = BB.leads.filter(l => l.companyId === u.companyId);
  const active = list.filter(l => !['done', 'rejected', 'cancelled'].includes(l.status));
  const action = list.filter(l => l.status === 'quoted');
  return `<div class="grid g3 mb">
      <div class="card"><div class="stat"><span class="l">Активные заявки</span><span class="v">${active.length}</span></div></div>
      <div class="card"><div class="stat"><span class="l">Ждут вашего решения</span><span class="v" style="color:${action.length ? 'var(--orange)' : 'inherit'}">${action.length}</span></div></div>
      <div class="card"><div class="stat"><span class="l">Завершено</span><span class="v">${list.filter(l => l.status === 'done').length}</span></div></div></div>
    ${action.map(l => `<div class="notice warn mb">${ic('receipt')} По заявке <a href="#/cabinet/lead/${l.id}"><b>${l.id}</b></a> готово коммерческое предложение на ${tg(quoteTotal(l.quote))} — примите его или запросите пересчёт.</div>`).join('')}
    <div class="card pad-0">${list.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Заявка</th><th>Услуга</th><th>Маршрут</th><th>Менеджер</th><th>КП</th><th>Статус</th></tr></thead><tbody>
      ${list.map(l => `<tr class="click" data-action="go" data-href="#/cabinet/lead/${l.id}"><td><b>${l.id}</b><div class="muted small">${fdate(l.createdAt)}</div></td><td>${esc(serviceName(l.service))}<div class="muted small">${esc(l.cargo)}</div></td><td class="small">${route(l)}</td>
        <td class="small">${l.managerId ? esc(userById(l.managerId).name) : '<span class="muted">назначается</span>'}</td><td class="nowrap">${l.quote ? tg(quoteTotal(l.quote)) : '—'}</td><td>${leadBadge(l.status)}</td></tr>`).join('')}</tbody></table></div>`
      : empty('Заявок пока нет. <a href="#/cabinet/new">Создайте первую</a>', ic('inbox'))}</div>`;
};

BCab.lead = (u, id) => {
  const l = leadById(id);
  // Чужие заявки не показываем — как 404
  if (!l || l.companyId !== u.companyId) return `<div class="card">${empty('Заявка не найдена', ic('file-x'))}</div>`;
  const m = userById(l.managerId);
  const pub = l.messages.filter(x => x.visibility === 'public');
  return `<div class="crumbs"><a href="#/cabinet">${ic('arrow-left')} Все заявки</a></div>
    <div class="row mb"><h2 style="margin:0">Заявка ${l.id}</h2>${leadBadge(l.status)}</div>
    <div class="card mb">${leadSteps(l)}<p class="muted mt-s" style="margin-bottom:0">${esc(LEAD_STATUS[l.status].client)}</p>
      ${l.status === 'rejected' ? `<div class="notice err mt">${ic('circle-x')} ${esc(l.history.at(-1).note || 'Заявка отклонена')}</div>` : ''}</div>
    <div class="grid g-side"><div>
      ${l.quote ? `<div class="card mb ${l.status === 'quoted' ? 'b-quote-card' : ''}"><div class="card-head"><h3>${ic('receipt')} Коммерческое предложение</h3><button class="btn ghost sm" data-action="b-quote-print" data-id="${l.id}">${ic('printer')} PDF</button></div>
        ${quoteTable(l.quote)}
        ${l.status === 'quoted' ? `<div class="row mt"><button class="btn success lg" data-action="b-quote-accept" data-id="${l.id}">${ic('circle-check')} Принять КП</button><button class="btn secondary lg" data-action="b-quote-revise" data-id="${l.id}">${ic('refresh-cw')} Запросить пересчёт</button></div>` : ''}</div>` : ''}
      <div class="card mb"><h3>${ic('clipboard-list')} Данные заявки</h3>${leadInfo(l)}</div>
      <div class="card mb"><h3>${ic('message-circle')} Переписка с менеджером</h3>
        <div class="chat">${pub.map(x => `<div class="msg ${x.userId === u.id || userById(x.userId)?.role === 'CLIENT' ? 'me' : ''}">${esc(x.text)}<div class="when">${userById(x.userId)?.role === 'CLIENT' ? '' : esc(userById(x.userId)?.name) + ' · '}${fdt(x.date)}</div></div>`).join('') || '<p class="muted small">Сообщений пока нет. Менеджер напишет здесь, а вы можете задать вопрос.</p>'}</div>
        ${['done', 'rejected', 'cancelled'].includes(l.status) ? '' : `<form class="row nowrap mt" data-form="b-cab-msg"><input type="hidden" name="id" value="${l.id}"><input name="text" required placeholder="Сообщение менеджеру…" autocomplete="off"><button class="btn">${ic('send')}</button></form>`}</div>
    </div><div>
      <div class="card mb"><h3>${ic('user-round')} Ваш менеджер</h3>${m ? `<div class="row nowrap">${avatar(m.name)}<div><b>${esc(m.name)}</b><div class="muted small">${esc(m.phone)}<br>${esc(m.email)}</div></div></div>` : '<p class="muted">Менеджер будет назначен в течение 30 минут в рабочее время.</p>'}</div>
      <div class="card mb"><h3>${ic('paperclip')} Документы</h3>${filesList(l, !['rejected', 'cancelled'].includes(l.status), 'b-cab-file')}</div>
      <div class="card mb"><h3>${ic('history')} История</h3><ul class="timeline">${[...l.history].reverse().map(h => `<li><b>${esc(LEAD_STATUS[h.to]?.label)}</b><div class="when">${fdt(h.date)}</div>${h.note ? `<div class="small">${esc(h.note)}</div>` : ''}</li>`).join('')}</ul></div>
      ${CLIENT_CAN_CANCEL.includes(l.status) ? `<button class="btn ghost block" style="color:var(--red)" data-action="b-cab-cancel" data-id="${l.id}">${ic('circle-x')} Отменить заявку</button>` : ''}
    </div></div>`;
};
F['b-cab-msg'] = d => {
  const l = leadById(d.id), u = clientUser();
  l.messages.push({ id: 'm' + (++BB.seq.msg), userId: u.id, text: d.text, date: new Date().toISOString(), visibility: 'public' });
  audit(`${l.id}: сообщение от клиента`, u.id); B2BStore.save(); render();
  toast(l.managerId ? `Менеджер ${esc(userById(l.managerId).name)} получил уведомление` : 'Сообщение получит менеджер после назначения', 'info');
};
CH['b-cab-file'] = el => {
  const l = leadById(el.dataset.id), u = clientUser();
  [...el.files].forEach(f => l.files.push({ name: f.name, size: f.size, by: u.id }));
  audit(`${l.id}: клиент прикрепил ${el.files.length} файл(а)`, u.id); B2BStore.save(); render(); toast('Файлы прикреплены', 'ok');
};
A['b-quote-accept'] = el => {
  const l = leadById(el.dataset.id), u = clientUser();
  setLeadStatus(l, 'accepted', u.id, `КП на ${tg(quoteTotal(l.quote))} принято клиентом`);
  audit(`${l.id}: клиент принял КП (${tg(quoteTotal(l.quote))})`, u.id); B2BStore.save(); render();
  toast('Предложение принято. Менеджер подготовит договор.', 'ok');
};
A['b-quote-revise'] = el => openModal('Запросить пересчёт', `<form data-form="b-quote-revise"><input type="hidden" name="id" value="${el.dataset.id}">
  <label class="field"><span>Что изменить?</span><textarea name="note" required placeholder="Например: нужен срок быстрее, рассмотрите ж/д вместо авто"></textarea></label><button class="btn block">Отправить менеджеру</button></form>`);
F['b-quote-revise'] = d => {
  const l = leadById(d.id), u = clientUser();
  setLeadStatus(l, 'in_work', u.id, 'Клиент запросил пересчёт: ' + d.note);
  l.messages.push({ id: 'm' + (++BB.seq.msg), userId: u.id, text: 'Прошу пересчитать КП: ' + d.note, date: new Date().toISOString(), visibility: 'public' });
  audit(`${l.id}: клиент запросил пересчёт КП`, u.id); B2BStore.save(); closeModal(); render(); toast('Запрос отправлен менеджеру', 'ok');
};
A['b-cab-cancel'] = el => {
  const l = leadById(el.dataset.id), u = clientUser();
  if (!confirm(`Отменить заявку ${l.id}?`)) return;
  setLeadStatus(l, 'cancelled', u.id, 'Отменена клиентом'); audit(`${l.id}: отменена клиентом`, u.id); B2BStore.save(); render();
};
A['b-quote-print'] = el => {
  const l = leadById(el.dataset.id), co = companyById(l.companyId), m = userById(l.quote.by);
  openModal('Коммерческое предложение', `<div class="b-doc"><div class="row between"><div class="brand"><span class="logo">${ic('briefcase')}</span>${esc(BB.settings.brand)}</div><div class="right small muted">ТОО «Way Logistics»<br>БИН 000000000000<br>${esc(BB.settings.phone)}</div></div><hr>
    <h3>Коммерческое предложение по заявке ${l.id}</h3><p>Для: <b>${esc(co.name)}</b>, БИН ${esc(co.bin)}<br>Дата: ${fdate(l.quote.createdAt)} · Маршрут: ${route(l)}</p>
    ${quoteTable(l.quote)}<p class="small mt">Менеджер: ${esc(m?.name || '')}, ${esc(m?.phone || '')}</p></div>
    <div class="modal-foot"><button class="btn" onclick="window.print()">${ic('printer')} Печать / PDF</button></div>`, { wide: true });
};

BCab.profile = u => {
  const co = companyById(u.companyId);
  return `<div class="grid g2"><form class="card" data-form="b-profile"><h3>Компания</h3>
      <label class="field"><span>Название</span><input name="company" value="${esc(co.name)}" required></label>
      <label class="field"><span>БИН / ИИН</span><input name="bin" value="${esc(co.bin)}" pattern="\\d{12}" required></label>
      <label class="field"><span>Город</span><input name="city" value="${esc(co.city || '')}"></label>
      <label class="field"><span>Сфера деятельности</span><input name="industry" value="${esc(co.industry || '')}"></label>
      <h3 class="mt">Контактное лицо</h3>
      <label class="field"><span>Имя</span><input name="name" value="${esc(u.name)}" required></label><label class="field"><span>Должность</span><input name="position" value="${esc(u.position || '')}"></label>
      <label class="field"><span>Телефон</span><input name="phone" value="${esc(u.phone)}"></label>
      <button class="btn">Сохранить</button></form>
    <div><form class="card mb" data-form="b-password"><h3>Смена пароля</h3><label class="field"><span>Новый пароль</span><input name="password" type="password" minlength="8" required></label><button class="btn secondary">Сменить пароль</button></form>
      <div class="card"><h3>Вход</h3><div class="kv"><div>Логин</div><div>${esc(u.email)}</div><div>В кабинете с</div><div>${fdate(u.createdAt)}</div></div></div></div></div>`;
};
F['b-profile'] = d => {
  const u = clientUser(), co = companyById(u.companyId);
  Object.assign(co, { name: d.company, bin: d.bin, city: d.city, industry: d.industry });
  Object.assign(u, { name: d.name, position: d.position, phone: d.phone });
  audit(`Клиент обновил профиль компании ${co.name}`, u.id); B2BStore.save(); render(); toast('Сохранено', 'ok');
};
F['b-password'] = d => { clientUser().password = d.password; audit('Клиент сменил пароль', BB.session.clientId); B2BStore.save(); render(); toast('Пароль изменён', 'ok'); };
