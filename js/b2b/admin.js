/* B2B админка: роли и права, заявки, клиенты, пользователи, аудит. CMS — в cms.js */
const AD2 = {};
const pageHead2 = pageHead;
const openStatuses = ['in_work', 'quoted', 'accepted', 'contract', 'shipping'];
const hoursSince = d => (Date.now() - new Date(d)) / 36e5;
const ago = d => { const h = hoursSince(d); return h < 1 ? Math.max(1, Math.round(h * 60)) + ' мин' : h < 24 ? Math.round(h) + ' ч' : Math.round(h / 24) + ' дн'; };
const lastClientMsgUnanswered = l => { const pub = l.messages.filter(m => m.visibility === 'public'); return pub.length && userById(pub.at(-1).userId)?.role === 'CLIENT'; };
const canManageLead = (u, l) => can(u, 'leads:manage') && (can(u, 'leads:all') || l.managerId === u.id || !l.managerId);

const ADMIN_PAGES = {
  dashboard: { perm: 'dashboard:view', render: (p, q) => AD2.dashboard(p, q) },
  leads: { perm: u => can(u, 'leads:all') || can(u, 'leads:own'), render: (p, q) => AD2.leads(p, q) },
  lead: { perm: u => can(u, 'leads:all') || can(u, 'leads:own'), render: (p, q) => AD2.lead(p, q) },
  clients: { perm: 'clients:view', render: (p, q) => AD2.clients(p, q) },
  client: { perm: 'clients:view', render: (p, q) => AD2.client(p, q) },
  pages: { perm: 'content:manage', render: (p, q) => AD2.pages(p, q) },
  page: { perm: 'content:manage', render: (p, q) => AD2.page(p, q) },
  settings: { perm: 'settings:manage', render: (p, q) => AD2.settings(p, q) },
  users: { perm: 'users:manage', render: (p, q) => AD2.users(p, q) },
  audit: { perm: 'audit:view', render: (p, q) => AD2.audit(p, q) },
};
const allowed = (u, key) => { const g = ADMIN_PAGES[key]?.perm; return typeof g === 'function' ? g(u) : can(u, g); };

AD2.render = (parts, q) => {
  const me = staff();
  const key = parts[0];
  if (key === 'login' || !me || !STAFF_ROLES.includes(me.role) || !me.active) return AD2.login();
  if (key === 'preview') {
    if (!can(me, 'content:manage')) return AD2.forbidden(me);
    return BSite.page(null, { preview: pageById(parts[1]) || { blocks: [], title: '?', seo: {} } });
  }
  if (!key || !ADMIN_PAGES[key]) { location.replace(homeForRole(me.role)); return ''; }
  const content = allowed(me, key) ? ADMIN_PAGES[key].render(parts.slice(1), q) : AD2.forbidden(me);
  return adminLayout(me, { lead: 'leads', client: 'clients', page: 'pages' }[key] || key, content);
};

function adminLayout(me, cur, content) {
  const newCount = visibleLeads(me).filter(l => l.status === 'new' && !l.managerId).length;
  const groups = [
    ['Обзор', [['dashboard', 'layout-dashboard', 'Дашборд']]],
    ['Продажи', [['leads', 'inbox', 'Заявки', newCount], ['clients', 'building-2', 'Клиенты']]],
    ['Контент', [['pages', 'file-text', 'Страницы'], ['settings', 'settings', 'Настройки сайта']]],
    ['Система', [['users', 'users', 'Пользователи и роли'], ['audit', 'scroll-text', 'Журнал действий']]],
  ].map(([g, items]) => [g, items.filter(([k]) => allowed(me, k))]).filter(([, items]) => items.length);
  const nav = groups.map(([g, items]) => `<div class="nav-group">${g}</div>${items.map(([k, i, l, n]) => `<a class="nav ${cur === k ? 'active' : ''}" href="#/admin/${k}"><span class="ico">${ic(i)}</span>${l}${n ? `<span class="cnt">${n}</span>` : ''}</a>`).join('')}`).join('');
  const flat = groups.flatMap(([, items]) => items).slice(0, 5);
  return `<div class="mobile-head"><a class="brand" href="#/admin"><span class="logo">${ic('briefcase')}</span>Admin</a><span class="small">${esc(me.name)}</span></div>
  <div class="app b-admin"><aside class="sidebar"><a class="brand" href="#/admin"><span class="logo">${ic('briefcase')}</span><span>${esc(BB.settings.brand)}<small>Админ-панель</small></span></a>
    <a class="nav" href="#/" target="_self"><span class="ico">${ic('external-link')}</span>Открыть сайт</a>${nav}
    <div class="user-card"><div class="row nowrap">${avatar(me.name, 32)}<div class="grow"><b class="small">${esc(me.name)}</b><div class="muted small">${B2B_ROLE_LABELS[me.role]}</div></div></div>
      <div class="row mt-s" style="gap:6px"><a class="btn ghost sm" href="#/admin/login">${ic('repeat')} Сменить</a><button class="btn ghost sm" data-action="ad2-logout">${ic('log-out')} Выйти</button></div></div></aside>
  <main class="main">${content}</main></div>
  <nav class="bottom-nav">${flat.map(([k, i, l]) => `<a href="#/admin/${k}" class="${cur === k ? 'active' : ''}"><span class="ico">${ic(i)}</span>${l}</a>`).join('')}</nav>`;
}
A['ad2-logout'] = () => { BB.session.staffId = null; B2BStore.save(); location.hash = '#/admin/login'; };

AD2.forbidden = me => `<div class="card center" style="padding:48px;max-width:560px;margin:40px auto"><div class="icon-tile" style="margin:0 auto 12px;width:64px;height:64px;font-size:28px;background:var(--red-50);color:var(--red)">${ic('lock')}</div>
  <h2>Нет доступа</h2><p class="muted">Роль «${B2B_ROLE_LABELS[me.role]}» не имеет прав на этот раздел.</p><a class="btn" href="${homeForRole(me.role)}">К моим разделам</a></div>`;

AD2.login = () => {
  const list = BB.users.filter(u => STAFF_ROLES.includes(u.role));
  const desc = { SUPER_ADMIN: 'Всё: заявки, CMS, пользователи, роли, журнал', CONTENT_MANAGER: 'Страницы сайта, блоки, SEO, настройки', SALES_HEAD: 'Все заявки, назначение менеджеров, дашборд, журнал', SALES_MANAGER: 'Свои и свободные заявки, КП, переписка с клиентом' };
  return `<div class="b-login-stage"><div class="card" style="max-width:640px;width:100%;padding:28px">
    <div class="brand mb"><span class="logo">${ic('briefcase')}</span><span>${esc(BB.settings.brand)}<small>Вход для сотрудников</small></span></div>
    <form data-form="b-login" class="mb"><div class="grid g2"><label class="field"><span>Email</span><input name="email" type="email" required placeholder="name@way.biz"></label><label class="field"><span>Пароль</span><input name="password" type="password" required></label></div><button class="btn">Войти</button></form>
    <p class="small muted">Демо: войдите под любой ролью одним кликом — набор разделов в меню зависит от прав.</p>
    <div class="pill-select">${list.map(u => `<label data-action="ad2-as" data-id="${u.id}" style="${u.active ? '' : 'opacity:.5'}">${avatar(u.name, 32)}<span class="grow"><b>${esc(u.name)}</b> <span class="badge indigo">${B2B_ROLE_LABELS[u.role]}</span>${u.active ? '' : ' <span class="badge red">Отключён</span>'}<br><span class="muted small">${esc(u.email)} · ${desc[u.role]}</span></span></label>`).join('')}</div></div></div>`;
};
A['ad2-as'] = el => {
  const u = userById(el.dataset.id);
  if (!u.active) return toast('Учётная запись отключена администратором', 'err');
  BB.session.staffId = u.id; audit('Вход в админ-панель', u.id); B2BStore.save(); location.hash = homeForRole(u.role);
  toast(`Вы вошли как ${esc(u.name)} — ${B2B_ROLE_LABELS[u.role]}`, 'ok');
};

/* ---------- Дашборд ---------- */
AD2.dashboard = () => {
  const me = staff(), list = visibleLeads(me);
  const by = st => list.filter(l => l.status === st);
  const sum = arr => arr.reduce((s, l) => s + quoteTotal(l.quote), 0);
  const decided = list.filter(l => l.status !== 'new');
  const won = list.filter(l => ['contract', 'shipping', 'done'].includes(l.status));
  const conv = decided.length ? Math.round((won.length / decided.length) * 100) : 0;
  const attention = [
    ...list.filter(l => l.status === 'new' && !l.managerId).map(l => [l, 'red', `Без менеджера ${ago(l.createdAt)}`]),
    ...list.filter(l => l.status === 'quoted' && hoursSince(l.history.at(-1).date) > 72).map(l => [l, 'orange', 'КП без ответа клиента > 3 дней']),
    ...list.filter(l => openStatuses.includes(l.status) && lastClientMsgUnanswered(l)).map(l => [l, 'blue', 'Клиент ждёт ответа в переписке']),
  ];
  const svc = B2B_SERVICES.map(s => [s, list.filter(l => l.service === s.id).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  const maxSvc = Math.max(1, ...svc.map(x => x[1]));
  const funnel = LEAD_FLOW.map(st => [st, list.filter(l => LEAD_FLOW.indexOf(l.status) >= LEAD_FLOW.indexOf(st) && !['rejected', 'cancelled'].includes(l.status)).length]);
  const managers = BB.users.filter(u => u.role === 'SALES_MANAGER' || u.role === 'SALES_HEAD');
  return `${pageHead2(can(me, 'leads:all') ? 'Дашборд продаж' : 'Мой дашборд', fdate(new Date()), `<a class="btn" href="#/admin/leads">${ic('inbox')} Заявки</a>`)}
  <div class="grid g4 mb">
    <div class="card"><div class="stat"><span class="l">Новые без менеджера</span><span class="v" style="color:${by('new').filter(l => !l.managerId).length ? 'var(--red)' : 'inherit'}">${by('new').filter(l => !l.managerId).length}</span><span class="muted small">всего новых: ${by('new').length}</span></div></div>
    <div class="card"><div class="stat"><span class="l">В работе</span><span class="v">${list.filter(l => openStatuses.includes(l.status)).length}</span><span class="muted small">КП ждут ответа: ${by('quoted').length}</span></div></div>
    <div class="card"><div class="stat"><span class="l">Сумма КП в воронке</span><span class="v" style="font-size:22px">${tg(sum([...by('quoted'), ...by('accepted')]))}</span><span class="muted small">отправлено и согласовано</span></div></div>
    <div class="card"><div class="stat"><span class="l">Конверсия в договор</span><span class="v">${conv}%</span><span class="muted small">выиграно: ${tg(sum(won))}</span></div></div></div>
  <div class="grid g-side mb">
    <div class="card"><h3>${ic('bell-ring')} Требуют внимания</h3>${attention.map(([l, c, why]) => `<div class="parcel-item" data-action="go" data-href="#/admin/lead/${l.id}"><span class="dot-st" style="background:var(--${c})"></span><div class="meta"><b>${l.id} · ${esc(companyById(l.companyId)?.name)}</b><div class="muted small">${esc(serviceName(l.service))} · ${route(l)}</div></div><span class="badge ${c}">${why}</span></div>`).join('') || `<p class="muted">${ic('circle-check')} Всё под контролем</p>`}</div>
    <div class="card"><h3>Воронка</h3>${funnel.map(([st, n], i) => `<div class="hbar"><span class="small">${LEAD_STATUS[st].label}</span><div class="track"><div style="width:${(n / Math.max(1, funnel[0][1])) * 100}%;opacity:${1 - i * 0.1}"></div></div><b class="right">${n}</b></div>`).join('')}</div></div>
  <div class="grid ${can(me, 'leads:assign') ? 'g2' : 'g2'}">
    <div class="card"><h3>По услугам</h3>${svc.map(([s, n]) => `<div class="hbar"><span class="small">${ic(s.icon)} ${esc(s.name.split(' (')[0])}</span><div class="track"><div style="width:${(n / maxSvc) * 100}%"></div></div><b class="right">${n}</b></div>`).join('')}</div>
    ${can(me, 'leads:assign') ? `<div class="card pad-0"><div style="padding:16px 16px 0"><h3>Загрузка менеджеров</h3></div><table class="t"><thead><tr><th>Менеджер</th><th class="right">В работе</th><th class="right">КП в воронке</th><th class="right">Выиграно</th></tr></thead><tbody>
      ${managers.map(m => { const ml = BB.leads.filter(l => l.managerId === m.id); return `<tr><td><div class="row nowrap">${avatar(m.name, 26)}<span class="small"><b>${esc(m.name)}</b><br><span class="muted">${B2B_ROLE_LABELS[m.role]}</span></span></div></td><td class="right">${ml.filter(l => openStatuses.includes(l.status)).length}</td><td class="right nowrap">${tg(sum(ml.filter(l => ['quoted', 'accepted'].includes(l.status))))}</td><td class="right nowrap">${tg(sum(ml.filter(l => ['contract', 'shipping', 'done'].includes(l.status))))}</td></tr>`; }).join('')}</tbody></table></div>`
      : `<div class="card"><h3>Последние заявки</h3>${list.slice(0, 5).map(l => `<div class="row between small mb-s"><a href="#/admin/lead/${l.id}">${l.id}</a><span class="grow">${esc(companyById(l.companyId)?.name)}</span>${leadBadge(l.status)}</div>`).join('')}</div>`}</div>`;
};

/* ---------- Заявки ---------- */
AD2.leads = (_, q) => {
  const me = staff(), all = visibleLeads(me);
  const f = { s: q.get('s') || '', m: q.get('m') || '', svc: q.get('svc') || '', q: (q.get('q') || '').trim() };
  const list = all.filter(l => (!f.s || (f.s === 'open' ? openStatuses.includes(l.status) : l.status === f.s))
    && (!f.m || (f.m === 'none' ? !l.managerId : f.m === 'me' ? l.managerId === me.id : l.managerId === f.m))
    && (!f.svc || l.service === f.svc)
    && (!f.q || [l.id, l.cargo, l.from, l.to, companyById(l.companyId)?.name, companyById(l.companyId)?.bin, userById(l.userId)?.email].join(' ').toLowerCase().includes(f.q.toLowerCase())));
  const qs = o => '#/admin/leads?' + new URLSearchParams(Object.entries({ ...f, ...o }).filter(([, v]) => v)).toString();
  const chip = (k, label, n) => `<a class="chip ${f.s === k ? 'active' : ''}" href="${qs({ s: k })}">${label}<span class="n">${n}</span></a>`;
  return `${pageHead2('Заявки', can(me, 'leads:all') ? 'Все заявки отдела' : 'Ваши заявки и свободные новые', `<button class="btn secondary" data-action="ad2-export" data-what="leads">${ic('download')} XLSX</button>`)}
  <div class="chips mb">${chip('', 'Все', all.length)}${chip('new', 'Новые', all.filter(l => l.status === 'new').length)}${chip('open', 'В работе', all.filter(l => openStatuses.includes(l.status)).length)}${['quoted', 'accepted', 'done', 'rejected'].map(s => chip(s, LEAD_STATUS[s].label, all.filter(l => l.status === s).length)).join('')}</div>
  <form class="card mb grid g4" data-form="ad2-leads-filter"><input name="q" value="${esc(f.q)}" placeholder="Номер, компания, БИН, груз">
    <select name="svc"><option value="">Все услуги</option>${B2B_SERVICES.map(s => `<option value="${s.id}" ${f.svc === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    <select name="m"><option value="">Все менеджеры</option><option value="me" ${f.m === 'me' ? 'selected' : ''}>Мои</option><option value="none" ${f.m === 'none' ? 'selected' : ''}>Без менеджера</option>${can(me, 'leads:all') ? BB.users.filter(u => ['SALES_MANAGER', 'SALES_HEAD'].includes(u.role)).map(u => `<option value="${u.id}" ${f.m === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('') : ''}</select>
    <input type="hidden" name="s" value="${f.s}"><button class="btn">${ic('search')} Найти</button></form>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Заявка</th><th>Компания</th><th>Услуга / груз</th><th>Маршрут</th><th>Менеджер</th><th class="right">КП</th><th>Статус</th></tr></thead><tbody>
  ${list.map(l => { const co = companyById(l.companyId); return `<tr class="click" data-action="go" data-href="#/admin/lead/${l.id}"><td><b>${l.id}</b>${lastClientMsgUnanswered(l) && openStatuses.includes(l.status) ? ` <span title="Новое сообщение клиента" style="color:var(--blue)">${ic('message-circle')}</span>` : ''}<div class="muted small">${ago(l.createdAt)} назад · ${esc(l.source)}</div></td>
    <td><b class="small">${esc(co?.name)}</b><div class="muted small">БИН ${esc(co?.bin)}</div></td><td class="small">${esc(serviceName(l.service))}<div class="muted">${esc(l.cargo)}</div></td><td class="small">${route(l)}</td>
    <td class="small">${l.managerId ? esc(userById(l.managerId).name) : can(me, 'leads:manage') && !can(me, 'leads:assign') ? `<button class="btn sm" data-action="ad2-take" data-id="${l.id}">Взять в работу</button>` : '<span class="badge red">Не назначен</span>'}</td>
    <td class="right nowrap">${l.quote ? tg(quoteTotal(l.quote)) : '—'}</td><td>${leadBadge(l.status)}</td></tr>`; }).join('') || `<tr><td colspan="7">${empty('Заявок не найдено')}</td></tr>`}
  </tbody></table></div>`;
};
F['ad2-leads-filter'] = d => { location.hash = '#/admin/leads?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)).toString(); };
function takeLead(l, me) {
  l.managerId = me.id;
  if (l.status === 'new') setLeadStatus(l, 'in_work', me.id, 'Менеджер взял заявку в работу');
  audit(`${l.id}: взята в работу (${me.name})`);
}
A['ad2-take'] = el => { const l = leadById(el.dataset.id), me = staff(); if (l.managerId) return toast('Заявку уже взял другой менеджер', 'err'); takeLead(l, me); B2BStore.save(); render(); toast(`Заявка ${l.id} ваша`, 'ok'); };

AD2.lead = ([id]) => {
  const me = staff(), l = leadById(id);
  if (!l || !visibleLeads(me).includes(l)) return `<div class="card">${empty('Заявка не найдена или недоступна для вашей роли', ic('file-x'))}</div>`;
  const co = companyById(l.companyId), cu = userById(l.userId), manage = canManageLead(me, l);
  const tr = [...LEAD_TRANSITIONS[l.status], ...(l.status === 'quoted' ? ['accepted'] : [])];
  const pub = l.messages.filter(m => m.visibility === 'public'), internal = l.messages.filter(m => m.visibility === 'internal');
  const showQuoteForm = manage && ['in_work', 'quoted'].includes(l.status) && (!l.quote || AD2.editQuote === l.id);
  return `<div class="crumbs"><a href="#/admin/leads">${ic('arrow-left')} Все заявки</a></div>
  <div class="row mb"><h1 style="margin:0">Заявка ${l.id}</h1>${leadBadge(l.status)}<span class="muted">${esc(co?.name)} · ${fdt(l.createdAt)} · ${esc(l.source)}</span></div>
  <div class="card mb">${leadSteps(l)}</div>
  ${l.status === 'in_work' && l.history.at(-1).note.startsWith('Клиент запросил пересчёт') ? `<div class="notice warn mb">${ic('refresh-cw')} ${esc(l.history.at(-1).note)}</div>` : ''}
  <div class="grid g-side"><div>
    <div class="card mb"><h3>${ic('clipboard-list')} Данные заявки</h3>${leadInfo(l)}</div>
    <div class="card mb"><div class="card-head"><h3>${ic('receipt')} Коммерческое предложение</h3>${l.quote && manage && ['in_work', 'quoted'].includes(l.status) && AD2.editQuote !== l.id ? `<button class="btn ghost sm" data-action="ad2-quote-edit" data-id="${l.id}">${ic('pencil')} Изменить</button>` : ''}</div>
      ${showQuoteForm ? quoteForm(l) : l.quote ? quoteTable(l.quote) + `<p class="muted small mt-s">Отправлено ${fdt(l.quote.createdAt)} · ${esc(userById(l.quote.by)?.name || '')}</p>` : `<p class="muted">${manage ? (l.status === 'new' ? 'Возьмите заявку в работу, чтобы подготовить КП.' : 'КП ещё не подготовлено.') : 'КП ещё не подготовлено.'}</p>`}</div>
    <div class="card mb"><h3>${ic('message-circle')} Переписка с клиентом <span class="muted small" style="font-weight:400">— видна в кабинете клиента</span></h3>
      <div class="chat">${pub.map(m => `<div class="msg ${userById(m.userId)?.role === 'CLIENT' ? '' : 'me'}">${esc(m.text)}<div class="when">${esc(userById(m.userId)?.name)} · ${fdt(m.date)}</div></div>`).join('') || '<p class="muted small">Сообщений пока нет</p>'}</div>
      ${manage ? `<form class="row nowrap mt" data-form="ad2-msg"><input type="hidden" name="id" value="${l.id}"><input type="hidden" name="visibility" value="public"><input name="text" required placeholder="Сообщение клиенту…" autocomplete="off"><button class="btn">${ic('send')}</button></form>` : ''}</div>
    <div class="card"><h3>${ic('history')} История статусов</h3>${[...l.history].reverse().map(h => `<div class="b-hist"><div>${h.from ? `<span class="muted">${LEAD_STATUS[h.from].label}</span> ${ic('arrow-right')} ` : 'Создана: '}<b>${LEAD_STATUS[h.to].label}</b></div><div class="muted small">${fdt(h.date)} · ${esc(userById(h.userId)?.name || 'Система')} (${B2B_ROLE_LABELS[userById(h.userId)?.role] || 'сайт'})</div>${h.note ? `<div class="small">${esc(h.note)}</div>` : ''}</div>`).join('')}</div>
  </div><div>
    <div class="card mb"><h3>Статус</h3>${manage && tr.length && l.managerId ? `<form data-form="ad2-status"><input type="hidden" name="id" value="${l.id}"><label class="field"><span>Новый статус</span><select name="to">${tr.map(s => `<option value="${s}">${LEAD_STATUS[s].label}${s === 'accepted' ? ' (согласовано вне кабинета)' : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Комментарий</span><textarea name="note" placeholder="Виден клиенту в истории заявки"></textarea></label><button class="btn block">Изменить статус</button></form>
      ${l.status === 'in_work' ? '<p class="muted small mt-s">Статус «КП отправлено» ставится при отправке коммерческого предложения.</p>' : ''}${l.status === 'quoted' ? '<p class="muted small mt-s">Обычно клиент сам принимает КП в личном кабинете.</p>' : ''}`
      : `<p class="muted small">${!l.managerId ? 'Сначала назначьте ответственного.' : !tr.length ? 'Заявка закрыта — статус больше не меняется.' : 'Менять статус может ответственный менеджер или руководитель.'}</p>`}</div>
    <div class="card mb"><h3>${ic('user-round')} Ответственный</h3>
      ${can(me, 'leads:assign') ? `<form class="row nowrap" data-form="ad2-assign"><input type="hidden" name="id" value="${l.id}"><select name="managerId"><option value="">— не назначен —</option>${BB.users.filter(u => ['SALES_MANAGER', 'SALES_HEAD'].includes(u.role) && u.active).map(u => `<option value="${u.id}" ${l.managerId === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select><button class="btn secondary">OK</button></form>`
        : l.managerId ? `<div class="row nowrap">${avatar(userById(l.managerId).name, 32)}<b>${esc(userById(l.managerId).name)}</b></div>` : `<button class="btn block" data-action="ad2-take" data-id="${l.id}">${ic('hand')} Взять в работу</button>`}</div>
    <div class="card mb"><h3>${ic('building-2')} Клиент</h3><b>${esc(co?.name)}</b><div class="kv mt-s"><div>БИН</div><div class="mono">${esc(co?.bin)}</div><div>Контакт</div><div>${esc(cu?.name)}${cu?.position ? `, ${esc(cu.position)}` : ''}</div><div>Телефон</div><div><a href="tel:${esc(cu?.phone)}">${esc(cu?.phone)}</a></div><div>Email</div><div><a href="mailto:${esc(cu?.email)}">${esc(cu?.email)}</a></div><div>Заявок</div><div>${BB.leads.filter(x => x.companyId === l.companyId).length}</div></div>
      ${can(me, 'clients:view') ? `<a class="btn ghost sm mt-s" href="#/admin/client/${co?.id}">Карточка клиента →</a>` : ''}</div>
    <div class="card mb"><h3>${ic('paperclip')} Документы</h3>${filesList(l, manage, 'ad2-file')}${manage && l.status === 'accepted' ? `<button class="btn secondary sm mt-s" data-action="ad2-contract" data-id="${l.id}">${ic('file-signature')} Сформировать договор</button>` : ''}</div>
    <div class="card b-internal"><h3>${ic('lock')} Внутренние заметки</h3><p class="muted small">Никогда не показываются клиенту</p>
      ${internal.map(m => `<div class="b-note">${esc(m.text)}<div class="muted small">${esc(userById(m.userId)?.name)} · ${fdt(m.date)}</div></div>`).join('')}
      <form data-form="ad2-msg" class="mt-s"><input type="hidden" name="id" value="${l.id}"><input type="hidden" name="visibility" value="internal"><textarea name="text" required placeholder="Видно только сотрудникам"></textarea><button class="btn secondary sm mt-s">${ic('lock')} Сохранить заметку</button></form></div>
  </div></div>`;
};
function quoteForm(l) {
  const q = l.quote || { items: [{ name: `${serviceName(l.service)}: ${l.from} → ${l.to}`, qty: 1, unit: 'услуга', price: '' }], transit: '', validUntil: new Date(Date.now() + 7 * B2B_DAY).toISOString(), terms: 'Оплата 50% — предоплата, 50% — по прибытии груза.' };
  return `<form data-form="ad2-quote"><input type="hidden" name="id" value="${l.id}"><div id="q-rows">${q.items.map(quoteRow).join('')}</div>
    <button type="button" class="btn ghost sm" data-action="ad2-qrow-add">${ic('plus')} Позиция</button>
    <div class="grid g2 mt"><label class="field"><span>Срок доставки</span><input name="transit" required value="${esc(q.transit)}" placeholder="12–15 дней"></label><label class="field"><span>Действует до</span><input name="validUntil" type="date" required value="${q.validUntil.slice(0, 10)}"></label></div>
    <label class="field"><span>Условия</span><textarea name="terms">${esc(q.terms)}</textarea></label>
    <div class="row"><button class="btn">${ic('send')} Отправить КП клиенту</button>${l.quote ? `<button type="button" class="btn ghost" data-action="ad2-quote-cancel">Отмена</button>` : ''}<span class="muted small">Клиент получит email и увидит КП в кабинете</span></div></form>`;
}
const quoteRow = (i = {}) => `<div class="inline-inputs q-row mb-s"><input name="qname" required placeholder="Позиция" value="${esc(i.name || '')}" style="flex:4"><input name="qqty" type="number" min="0" step="any" required value="${i.qty ?? 1}" placeholder="Кол-во"><input name="qunit" value="${esc(i.unit || 'услуга')}" placeholder="Ед."><input name="qprice" type="number" min="0" required value="${i.price ?? ''}" placeholder="Цена, ₸" style="flex:1.4"><button type="button" class="icon-btn" data-action="ad2-qrow-del" style="flex:0">${ic('x')}</button></div>`;
A['ad2-qrow-add'] = () => $('#q-rows').insertAdjacentHTML('beforeend', quoteRow());
A['ad2-qrow-del'] = el => { if ($$('.q-row').length > 1) el.closest('.q-row').remove(); };
A['ad2-quote-edit'] = el => { AD2.editQuote = el.dataset.id; render(); };
A['ad2-quote-cancel'] = () => { AD2.editQuote = null; render(); };
F['ad2-quote'] = (d, form) => {
  const l = leadById(d.id), me = staff(), fd = new FormData(form);
  const items = fd.getAll('qname').map((name, i) => ({ name, qty: +fd.getAll('qqty')[i], unit: fd.getAll('qunit')[i], price: +fd.getAll('qprice')[i] }));
  const revised = !!l.quote;
  l.quote = { items, transit: d.transit, validUntil: new Date(d.validUntil).toISOString(), terms: d.terms, createdAt: new Date().toISOString(), by: me.id };
  if (l.status !== 'quoted') setLeadStatus(l, 'quoted', me.id, `${revised ? 'Обновлённое КП' : 'КП'} на ${tg(quoteTotal(l.quote))}`);
  else l.history.push({ from: 'quoted', to: 'quoted', date: new Date().toISOString(), userId: me.id, note: `КП обновлено: ${tg(quoteTotal(l.quote))}` });
  l.messages.push({ id: 'm' + (++BB.seq.msg), userId: me.id, text: `${revised ? 'Обновили' : 'Подготовили'} коммерческое предложение на ${tg(quoteTotal(l.quote))}, срок ${d.transit}. Посмотрите его в заявке.`, date: new Date().toISOString(), visibility: 'public' });
  AD2.editQuote = null;
  audit(`${l.id}: ${revised ? 'обновлено' : 'отправлено'} КП на ${tg(quoteTotal(l.quote))}`);
  B2BStore.save(); render(); toast(`КП отправлено. Письмо клиенту: ${esc(userById(l.userId).email)}`, 'ok');
};
F['ad2-status'] = d => {
  const l = leadById(d.id), me = staff();
  if (!LEAD_TRANSITIONS[l.status].concat(l.status === 'quoted' ? ['accepted'] : []).includes(d.to)) return toast('Недопустимый переход', 'err');
  if (d.to === 'rejected' && !d.note.trim()) return toast('Укажите причину отклонения — её увидит клиент', 'err');
  const from = l.status;
  setLeadStatus(l, d.to, me.id, d.note.trim());
  audit(`${l.id}: статус «${LEAD_STATUS[from].label}» → «${LEAD_STATUS[d.to].label}»`);
  B2BStore.save(); render(); toast(`Статус изменён. Клиент уведомлён по email`, 'ok');
};
F['ad2-assign'] = d => {
  const l = leadById(d.id), me = staff();
  l.managerId = d.managerId || null;
  if (l.managerId && l.status === 'new') setLeadStatus(l, 'in_work', me.id, `Назначен менеджер: ${userById(l.managerId).name}`);
  audit(`${l.id}: ответственный — ${l.managerId ? userById(l.managerId).name : 'не назначен'}`);
  B2BStore.save(); render(); if (l.managerId && l.managerId !== me.id) toast(`${esc(userById(l.managerId).name)} получил уведомление о заявке`, 'info');
};
F['ad2-msg'] = d => {
  const l = leadById(d.id), me = staff();
  l.messages.push({ id: 'm' + (++BB.seq.msg), userId: me.id, text: d.text, date: new Date().toISOString(), visibility: d.visibility });
  audit(`${l.id}: ${d.visibility === 'internal' ? 'внутренняя заметка' : 'сообщение клиенту'}`);
  B2BStore.save(); render(); if (d.visibility === 'public') toast('Клиент получит уведомление на email', 'info');
};
CH['ad2-file'] = el => { const l = leadById(el.dataset.id); [...el.files].forEach(f => l.files.push({ name: f.name, size: f.size, by: BB.session.staffId })); audit(`${l.id}: загружено документов: ${el.files.length}`); B2BStore.save(); render(); };
A['ad2-contract'] = el => {
  const l = leadById(el.dataset.id);
  l.files.push({ name: `Договор_${l.id}.pdf`, size: 284000, by: BB.session.staffId });
  l.messages.push({ id: 'm' + (++BB.seq.msg), userId: BB.session.staffId, text: 'Договор во вложениях заявки. Подпишите, пожалуйста, ЭЦП — после этого запланируем отгрузку.', date: new Date().toISOString(), visibility: 'public' });
  audit(`${l.id}: сформирован договор`); B2BStore.save(); render(); toast('Договор сформирован по шаблону и прикреплён к заявке', 'ok');
};

/* ---------- Клиенты ---------- */
AD2.clients = (_, q) => {
  const f = (q.get('q') || '').toLowerCase();
  const rows = BB.companies.map(co => { const ls = BB.leads.filter(l => l.companyId === co.id); return { co, ls, contact: BB.users.find(u => u.companyId === co.id), won: ls.filter(l => ['accepted', 'contract', 'shipping', 'done'].includes(l.status)).reduce((s, l) => s + quoteTotal(l.quote), 0) }; })
    .filter(r => !f || [r.co.name, r.co.bin, r.contact?.name, r.contact?.email].join(' ').toLowerCase().includes(f));
  return `${pageHead2('Клиенты', `${rows.length} компаний`, `<button class="btn secondary" data-action="ad2-export" data-what="clients">${ic('download')} XLSX</button>`)}
  <form class="row nowrap mb" data-form="ad2-clients-filter"><input name="q" value="${esc(f)}" placeholder="Компания, БИН, контакт, email"><button class="btn secondary">${ic('search')}</button></form>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Компания</th><th>Контакт</th><th>Город</th><th class="right">Заявок</th><th class="right">Согласовано КП</th><th>Клиент с</th></tr></thead><tbody>
  ${rows.map(r => `<tr class="click" data-action="go" data-href="#/admin/client/${r.co.id}"><td><b>${esc(r.co.name)}</b><div class="muted small mono">БИН ${esc(r.co.bin)}</div></td><td class="small">${esc(r.contact?.name)}<br><span class="muted">${esc(r.contact?.email)}</span></td><td>${esc(r.co.city)}</td><td class="right">${r.ls.length}</td><td class="right nowrap">${tg(r.won)}</td><td class="small">${fdate(r.co.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
};
F['ad2-clients-filter'] = d => { location.hash = '#/admin/clients?q=' + encodeURIComponent(d.q); };
AD2.client = ([id]) => {
  const me = staff(), co = companyById(id);
  if (!co) return empty('Клиент не найден');
  const users = BB.users.filter(u => u.companyId === co.id), ls = BB.leads.filter(l => l.companyId === co.id);
  const visible = visibleLeads(me);
  return `${pageHead2(esc(co.name), '<a href="#/admin/clients">Клиенты</a>', can(me, 'users:manage') ? `<button class="btn secondary" data-action="ad2-impersonate" data-id="${users[0]?.id}">${ic('eye')} Открыть кабинет клиента</button>` : '')}
  <div class="grid g3 mb"><div class="card"><div class="kv"><div>БИН / ИИН</div><div class="mono">${esc(co.bin)}</div><div>Город</div><div>${esc(co.city)}</div><div>Сфера</div><div>${esc(co.industry || '—')}</div><div>Клиент с</div><div>${fdate(co.createdAt)}</div></div></div>
    <div class="card"><h4>Контактные лица</h4>${users.map(u => `<div class="row nowrap mb-s">${avatar(u.name, 30)}<div class="grow small"><b>${esc(u.name)}</b>${u.position ? `, ${esc(u.position)}` : ''}<br><span class="muted">${esc(u.email)} · ${esc(u.phone)}</span></div><button class="icon-btn" title="Отправить ссылку для входа" data-action="ad2-invite" data-email="${esc(u.email)}">${ic('mail')}</button></div>`).join('')}</div>
    <div class="card"><div class="stat"><span class="l">Согласовано КП</span><span class="v" style="font-size:22px">${tg(ls.filter(l => ['accepted', 'contract', 'shipping', 'done'].includes(l.status)).reduce((s, l) => s + quoteTotal(l.quote), 0))}</span><span class="muted small">${ls.length} заявок</span></div></div></div>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Заявка</th><th>Услуга</th><th>Маршрут</th><th>Менеджер</th><th class="right">КП</th><th>Статус</th></tr></thead><tbody>
  ${ls.map(l => `<tr class="${visible.includes(l) ? 'click' : ''}" ${visible.includes(l) ? `data-action="go" data-href="#/admin/lead/${l.id}"` : 'title="Заявка другого менеджера"'}><td><b>${l.id}</b><div class="muted small">${fdate(l.createdAt)}</div></td><td class="small">${esc(serviceName(l.service))}</td><td class="small">${route(l)}</td><td class="small">${esc(userById(l.managerId)?.name || '—')}</td><td class="right nowrap">${l.quote ? tg(quoteTotal(l.quote)) : '—'}</td><td>${leadBadge(l.status)}</td></tr>`).join('')}</tbody></table></div>`;
};
A['ad2-invite'] = el => { audit(`Отправлена ссылка для входа: ${el.dataset.email}`); B2BStore.save(); toast(`Письмо со ссылкой для входа отправлено на ${esc(el.dataset.email)}`, 'info'); };
A['ad2-impersonate'] = el => { BB.session.clientId = el.dataset.id; audit(`Просмотр кабинета клиента ${userById(el.dataset.id)?.email}`); B2BStore.save(); location.hash = '#/cabinet'; toast('Вы видите кабинет глазами клиента', 'info'); };

/* ---------- Пользователи и роли ---------- */
AD2.users = () => {
  const me = staff(), list = BB.users.filter(u => STAFF_ROLES.includes(u.role));
  return `${pageHead2('Пользователи и роли', `${list.length} сотрудников`, `<button class="btn" data-action="ad2-user-new">${ic('user-plus')} Добавить сотрудника</button>`)}
  <div class="card pad-0 table-wrap mb"><table class="t"><thead><tr><th>Сотрудник</th><th>Роль</th><th>Активен</th><th>Создан</th></tr></thead><tbody>
  ${list.map(u => `<tr><td><div class="row nowrap">${avatar(u.name, 30)}<span class="small"><b>${esc(u.name)}</b>${u.id === me.id ? ' <span class="badge indigo">это вы</span>' : ''}<br><span class="muted">${esc(u.email)}</span></span></div></td>
    <td><select data-change="ad2-role" data-id="${u.id}" ${u.id === me.id ? 'disabled title="Нельзя менять собственную роль"' : ''} style="width:auto">${STAFF_ROLES.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${B2B_ROLE_LABELS[r]}</option>`).join('')}</select></td>
    <td><input type="checkbox" data-change="ad2-active" data-id="${u.id}" ${u.active ? 'checked' : ''} ${u.id === me.id ? 'disabled' : ''}></td><td class="small">${fdate(u.createdAt)}</td></tr>`).join('')}</tbody></table></div>
  <h3>Матрица прав</h3><div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Право</th>${STAFF_ROLES.map(r => `<th class="center">${B2B_ROLE_LABELS[r]}</th>`).join('')}</tr></thead><tbody>
  ${B2B_PERMS.map(p => `<tr><td>${B2B_PERM_LABELS[p]}<div class="muted small mono">${p}</div></td>${STAFF_ROLES.map(r => `<td class="center">${B2B_ROLE_PERMS[r].includes(p) ? `<span style="color:var(--green)">${ic('check')}</span>` : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="muted small mt">Права проверяются при каждом переходе: раздел без права показывает «Нет доступа», а менеджер видит только свои и свободные заявки.</p>`;
};
CH['ad2-role'] = el => { const u = userById(el.dataset.id); const old = u.role; u.role = el.value; audit(`${u.name}: роль «${B2B_ROLE_LABELS[old]}» → «${B2B_ROLE_LABELS[u.role]}»`); B2BStore.save(); render(); toast('Роль изменена', 'ok'); };
CH['ad2-active'] = el => { const u = userById(el.dataset.id); u.active = el.checked; audit(`${u.name}: ${u.active ? 'доступ включён' : 'доступ отключён'}`); B2BStore.save(); toast(u.active ? 'Доступ включён' : 'Доступ отключён, сессии сотрудника завершены', 'ok'); };
A['ad2-user-new'] = () => openModal('Новый сотрудник', `<form data-form="ad2-user-new"><label class="field"><span>Имя</span><input name="name" required></label><label class="field"><span>Email</span><input name="email" type="email" required placeholder="name@way.biz"></label>
  <label class="field"><span>Телефон</span><input name="phone" value="+7 "></label><label class="field"><span>Роль</span><select name="role">${STAFF_ROLES.map(r => `<option value="${r}" ${r === 'SALES_MANAGER' ? 'selected' : ''}>${B2B_ROLE_LABELS[r]}</option>`).join('')}</select></label><button class="btn block">Создать и отправить приглашение</button></form>`);
F['ad2-user-new'] = d => {
  if (BB.users.some(u => u.email.toLowerCase() === d.email.toLowerCase())) return toast('Пользователь с таким email уже есть', 'err');
  const u = { id: 'U' + (++BB.seq.user), role: d.role, name: d.name, email: d.email, phone: d.phone, active: true, createdAt: new Date().toISOString() };
  BB.users.push(u); audit(`Создан сотрудник ${u.name} (${B2B_ROLE_LABELS[u.role]})`); B2BStore.save(); closeModal(); render();
  toast(`Приглашение со ссылкой для установки пароля отправлено на ${esc(u.email)}`, 'info');
};

/* ---------- Журнал ---------- */
AD2.audit = (_, q) => {
  const uid = q.get('u') || '';
  const list = BB.audit.filter(a => !uid || a.userId === uid);
  const people = [...new Set(BB.audit.map(a => a.userId))].map(id => userById(id)).filter(Boolean);
  return `${pageHead2('Журнал действий', `${list.length} записей`, `<button class="btn secondary" data-action="ad2-export" data-what="audit">${ic('download')} XLSX</button>`)}
  <div class="chips mb"><a class="chip ${!uid ? 'active' : ''}" href="#/admin/audit">Все</a>${people.map(u => `<a class="chip ${uid === u.id ? 'active' : ''}" href="#/admin/audit?u=${u.id}">${esc(u.name)}</a>`).join('')}</div>
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Дата</th><th>Кто</th><th>Действие</th></tr></thead><tbody>
  ${list.map(a => { const u = userById(a.userId); return `<tr><td class="nowrap small">${fdt(a.date)}</td><td class="small"><b>${esc(u?.name || 'Сайт')}</b><br><span class="muted">${B2B_ROLE_LABELS[u?.role] || 'Посетитель'}</span></td><td>${esc(a.text)}</td></tr>`; }).join('')}</tbody></table></div>`;
};

/* ---------- Экспорт ---------- */
function b2bLoadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
A['ad2-export'] = async el => {
  const me = staff();
  const sets = {
    leads: () => visibleLeads(me).map(l => ({ 'Заявка': l.id, 'Дата': fdt(l.createdAt), 'Компания': companyById(l.companyId)?.name, 'БИН': companyById(l.companyId)?.bin, 'Услуга': serviceName(l.service), 'Откуда': l.from, 'Куда': l.to, 'Груз': l.cargo, 'Вес, кг': l.weight, 'Объём, м³': l.volume, 'Менеджер': userById(l.managerId)?.name || '', 'КП, ₸': quoteTotal(l.quote) || '', 'Статус': LEAD_STATUS[l.status].label, 'Источник': l.source })),
    clients: () => BB.companies.map(co => ({ 'Компания': co.name, 'БИН': co.bin, 'Город': co.city, 'Контакт': BB.users.find(u => u.companyId === co.id)?.name, 'Email': BB.users.find(u => u.companyId === co.id)?.email, 'Заявок': BB.leads.filter(l => l.companyId === co.id).length, 'Клиент с': fdate(co.createdAt) })),
    audit: () => BB.audit.map(a => ({ 'Дата': fdt(a.date), 'Кто': userById(a.userId)?.name || 'Сайт', 'Роль': B2B_ROLE_LABELS[userById(a.userId)?.role] || '', 'Действие': a.text })),
  };
  const rows = sets[el.dataset.what](), name = `way-b2b-${el.dataset.what}-${new Date().toISOString().slice(0, 10)}`;
  try {
    await b2bLoadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), el.dataset.what); XLSX.writeFile(wb, name + '.xlsx');
  } catch {
    const keys = Object.keys(rows[0] || {});
    const csv = '﻿' + [keys.join(';'), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name + '.csv'; a.click();
  }
  audit(`Экспорт: ${el.dataset.what} (${rows.length} строк)`); B2BStore.save();
};
