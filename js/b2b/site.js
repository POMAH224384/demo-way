/* B2B-сайт: страницы собираются из блоков CMS, форма заявки создаёт аккаунт и личный кабинет */
const BSite = {};

/* ---------- Рендер блоков ---------- */
function richText(src) {
  // Простой безопасный формат: абзацы через пустую строку, «## » — подзаголовок, «- » — пункт списка
  return String(src || '').split(/\n{2,}/).map(chunk => {
    const lines = chunk.split('\n');
    let html = '', list = [];
    const flush = () => { if (list.length) { html += `<ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; list = []; } };
    for (const ln of lines) {
      if (ln.startsWith('## ')) { flush(); html += `<h3>${esc(ln.slice(3))}</h3>`; }
      else if (ln.startsWith('- ')) list.push(ln.slice(2));
      else if (ln.trim()) { flush(); html += `<p>${esc(ln)}</p>`; }
    }
    flush();
    return html;
  }).join('');
}
const secHead = d => `<div class="section-title">${d.eyebrow ? `<div class="eyebrow">${esc(d.eyebrow)}</div>` : ''}<h2>${esc(d.title)}</h2>${d.subtitle ? `<p>${esc(d.subtitle)}</p>` : ''}</div>`;

const BLOCK_RENDER = {
  hero: (d, i) => `<section class="b-hero"><div class="container">
    ${d.eyebrow ? `<div class="eyebrow">${esc(d.eyebrow)}</div>` : ''}
    ${i === 0 ? `<h1>${esc(d.title)}</h1>` : `<h2 class="h1">${esc(d.title)}</h2>`}
    ${d.subtitle ? `<p class="lead">${esc(d.subtitle)}</p>` : ''}
    <div class="row">${d.ctaLabel ? `<button class="btn lg accent" data-action="b-lead">${esc(d.ctaLabel)} ${ic('arrow-right')}</button>` : ''}<a class="btn lg ghost-light" href="#/cabinet">${ic('user')} Личный кабинет</a></div>
    ${d.badges?.length ? `<div class="b-badges">${d.badges.map(b => `<span>${ic('circle-check')} ${esc(b)}</span>`).join('')}</div>` : ''}
  </div></section>`,
  stats: d => `<section class="section"><div class="container">${d.title ? `<h2 class="center mb">${esc(d.title)}</h2>` : ''}
    <div class="grid g4">${(d.items || []).map(x => `<div class="b-stat"><div class="v">${esc(x.value)}</div><div class="muted">${esc(x.label)}</div></div>`).join('')}</div></div></section>`,
  services: d => `<section class="section alt"><div class="container">${secHead(d)}
    <div class="grid g3">${(d.items || []).map(x => `<div class="card b-service"><div class="icon-tile">${ic(x.icon || 'package')}</div><h3 class="mt">${esc(x.title)}</h3><p class="muted">${esc(x.text)}</p></div>`).join('')}</div></div></section>`,
  steps: d => `<section class="section"><div class="container">${secHead(d)}
    <div class="b-steps">${(d.items || []).map((x, n) => `<div class="b-step"><div class="num">${n + 1}</div><h3>${esc(x.title)}</h3><p class="muted">${esc(x.text)}</p></div>`).join('')}</div></div></section>`,
  cases: d => `<section class="section alt"><div class="container">${secHead(d)}
    <div class="grid g2">${(d.items || []).map(x => `<figure class="card b-quote"><div class="icon-tile">${ic('quote')}</div><blockquote>${esc(x.quote)}</blockquote><figcaption><b>${esc(x.author)}</b><br><span class="muted small">${esc(x.company)}</span></figcaption></figure>`).join('')}</div></div></section>`,
  faq: d => `<section class="section"><div class="container" style="max-width:820px">${secHead(d)}
    ${(d.items || []).map(x => `<details class="faq"><summary>${esc(x.q)}</summary><div>${esc(x.a)}</div></details>`).join('')}</div></section>`,
  text: d => `<section class="section"><div class="container b-text" style="max-width:820px">${d.title ? `<h2>${esc(d.title)}</h2>` : ''}${richText(d.content)}</div></section>`,
  cta: d => `<section class="section"><div class="container"><div class="b-cta"><div><h2>${esc(d.title)}</h2>${d.text ? `<p>${esc(d.text)}</p>` : ''}</div>
    ${d.ctaLabel ? `<button class="btn lg accent" data-action="b-lead">${esc(d.ctaLabel)} ${ic('arrow-right')}</button>` : ''}</div></div></section>`,
  contacts: d => { const s = BB.settings; return `<section class="section"><div class="container">${secHead(d)}
    <div class="grid g4">${[['phone', 'Телефон', s.phone], ['mail', 'Email', s.email], ['map-pin', 'Адрес', s.address], ['clock', 'Часы работы', s.hours]].map(([i, l, v]) => `<div class="card"><div class="icon-tile">${ic(i)}</div><div class="muted small mt">${l}</div><b>${esc(v)}</b></div>`).join('')}</div>
    <div class="row mt"><span class="badge">${ic('send')} Telegram ${esc(s.telegram)}</span><span class="badge">${ic('message-circle-more')} WhatsApp ${esc(s.whatsapp)}</span></div></div></section>`; },
  lead: d => `<section class="section alt" id="lead-form"><div class="container" style="max-width:900px">${secHead({ title: d.title, subtitle: d.subtitle })}
    <div class="card" style="padding:24px">${leadForm('site')}</div></div></section>`,
};
function renderBlocks(blocks) {
  return blocks.filter(b => !b.hidden).map((b, i) => { try { return BLOCK_RENDER[b.type]?.(b.data, i) || ''; } catch (e) { console.error(e); return ''; } }).join('');
}

/* ---------- Шапка и подвал ---------- */
// Пункты меню на неопубликованные страницы скрываем, чтобы не было ссылок на 404
const menuItems = () => BB.settings.menu.filter(m => { const slug = m.href.startsWith('#/p/') ? m.href.slice(4) : m.href === '#/' ? '/' : null; return !slug || BB.pages.some(p => p.slug === slug && p.status === 'published'); });
function bHeader() {
  const s = BB.settings, u = clientUser();
  const cur = location.hash || '#/';
  return `<header class="site-header b-header"><div class="container">
    <a class="brand" href="#/"><span class="logo">${ic('briefcase')}</span><span>${esc(s.brand)}<small>${esc(s.tagline)}</small></span></a>
    <nav class="site-nav" id="site-nav">${menuItems().map(m => `<a href="${esc(m.href)}" class="${cur === m.href ? 'active' : ''}">${esc(m.label)}</a>`).join('')}
      <a class="show-m" href="${u ? '#/cabinet' : '#/login'}">${ic('user')} ${u ? 'Личный кабинет' : 'Войти'}</a><a class="show-m" role="button" style="cursor:pointer" data-action="b-lead">${ic('send')} Оставить заявку</a></nav>
    <div style="flex:1"></div>
    <a class="btn ghost hide-m" href="${u ? '#/cabinet' : '#/login'}">${ic('user')} ${u ? esc(u.name.split(' ')[0]) : 'Войти'}</a>
    <button class="btn hide-m" data-action="b-lead">Оставить заявку</button>
    <button class="btn secondary sm burger" data-action="burger">${ic('menu')}</button>
  </div></header>`;
}
function bFooter() {
  const s = BB.settings;
  return `<footer class="site-footer"><div class="container"><div class="grid g4">
    <div><a class="brand" href="#/" style="color:#fff"><span class="logo">${ic('briefcase')}</span>${esc(s.brand)}</a><p class="mt-s">B2B-направление Way: логистика, таможня и фулфилмент для компаний.</p></div>
    <div><h4>Разделы</h4>${menuItems().map(m => `<a href="${esc(m.href)}">${esc(m.label)}</a>`).join('')}<a href="#/cabinet">Личный кабинет</a></div>
    <div><h4>Контакты</h4><a>${esc(s.phone)}</a><a>${esc(s.email)}</a><a>${esc(s.address)}</a></div>
    <div><h4>Way</h4><a href="index.html">Для частных лиц ${ic('external-link')}</a><p class="small mt">© 2026 ТОО «Way Logistics». Демо-прототип.</p></div>
  </div></div></footer>`;
}

BSite.page = (slug, { preview = null } = {}) => {
  const p = preview || BB.pages.find(x => x.slug === slug && x.status === 'published');
  if (!p) return `${bHeader()}<div class="container" style="padding:80px 20px;text-align:center"><div class="icon-tile" style="margin:0 auto 16px;width:64px;height:64px;font-size:28px">${ic('file-x')}</div><h1>Страница не найдена</h1><p class="muted">Возможно, она снята с публикации.</p><a class="btn" href="#/">На главную</a></div>${bFooter()}`;
  document.title = (p.seo?.title || (p.slug === '/' ? BB.settings.seoTitle : `${p.title} — ${BB.settings.brand}`));
  $('meta[name=description]')?.setAttribute('content', p.seo?.description || BB.settings.seoDescription);
  const blocks = preview ? p.blocks : p.published;
  const banner = preview ? `<div class="b-preview-bar">${ic('eye')} Предпросмотр черновика «${esc(p.title)}» — посетители видят опубликованную версию <a class="btn sm secondary" href="#/admin/page/${p.id}">Вернуться в редактор</a></div>` : '';
  return banner + bHeader() + renderBlocks(blocks) + bFooter();
};

/* ---------- Форма заявки ---------- */
function leadForm(ctx) {
  const u = clientUser(), co = u && companyById(u.companyId);
  const known = ctx === 'cabinet' && u;
  return `<form data-form="b-lead" class="b-lead-form"><input type="hidden" name="ctx" value="${ctx}">
    ${known ? `<div class="notice mb">${ic('building-2')} Заявка от <b>${esc(co?.name)}</b>, контакт — ${esc(u.name)}</div>` : `
    <h4>Компания и контакт</h4>
    <div class="grid g2">
      <label class="field"><span>Компания *</span><input name="company" required placeholder="ТОО «Ваша компания»" value="${esc(co?.name || '')}"></label>
      <label class="field"><span>БИН / ИИН *</span><input name="bin" required inputmode="numeric" pattern="\\d{12}" title="12 цифр" placeholder="12 цифр" value="${esc(co?.bin || '')}"></label>
      <label class="field"><span>Контактное лицо *</span><input name="name" required placeholder="Имя и фамилия" value="${esc(u?.name || '')}"></label>
      <label class="field"><span>Должность</span><input name="position" placeholder="Руководитель закупок" value="${esc(u?.position || '')}"></label>
      <label class="field"><span>Телефон *</span><input name="phone" required placeholder="+7 7__ ___ __ __" value="${esc(u?.phone || '+7 ')}"></label>
      <label class="field"><span>Email *</span><input name="email" type="email" required placeholder="name@company.kz" value="${esc(u?.email || '')}"></label>
    </div>`}
    <h4 class="mt">Груз и маршрут</h4>
    <div class="grid g2">
      <label class="field"><span>Услуга *</span><select name="service">${B2B_SERVICES.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Периодичность</span><select name="frequency">${FREQUENCIES.map(f => `<option>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Откуда *</span><input name="from" required placeholder="Китай, Гуанчжоу"></label>
      <label class="field"><span>Куда *</span><input name="to" required placeholder="Алматы"></label>
    </div>
    <label class="field"><span>Что везём *</span><input name="cargo" required placeholder="Например: бытовая техника, 3 вида товара"></label>
    <div class="grid g4">
      <label class="field"><span>Вес, кг</span><input name="weight" type="number" min="0" step="any" placeholder="500"></label>
      <label class="field"><span>Объём, м³</span><input name="volume" type="number" min="0" step="any" placeholder="2.5"></label>
      <label class="field"><span>Мест</span><input name="places" type="number" min="0" placeholder="20"></label>
      <label class="field"><span>Стоимость, $</span><input name="valueUsd" type="number" min="0" placeholder="10000"></label>
    </div>
    <label class="field"><span>Комментарий</span><textarea name="comment" placeholder="Сроки, особые требования, условия поставки (EXW, FOB…)"></textarea></label>
    <label class="field"><span>Документы (инвойс, упаковочный лист)</span><input type="file" name="files" multiple></label>
    ${known ? '' : `<label class="check small"><input type="checkbox" required checked> Согласен на обработку персональных данных и создание личного кабинета</label>`}
    <button class="btn lg block mt">${ic('send')} Отправить заявку</button>
    ${known ? '' : '<p class="muted small center mt-s">После отправки мы сразу создадим личный кабинет — в нём вы увидите статус заявки и КП.</p>'}
  </form>`;
}
A['b-lead'] = () => {
  const el = $('#lead-form');
  if (el) { el.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => el.querySelector('input:not([type=hidden])')?.focus(), 400); return; }
  openModal('Заявка на расчёт доставки', leadForm('site'), { wide: true });
};
A['burger'] = () => $('#site-nav')?.classList.toggle('open');

const genPassword = () => 'WY-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
function autoAssignManager() {
  const managers = BB.users.filter(u => u.role === 'SALES_MANAGER' && u.active);
  const load = m => BB.leads.filter(l => l.managerId === m.id && !['done', 'rejected', 'cancelled'].includes(l.status)).length;
  return managers.sort((a, b) => load(a) - load(b))[0]?.id || null;
}
F['b-lead'] = (d, form) => {
  const files = [...(form.querySelector('input[type=file]')?.files || [])].map(f => ({ name: f.name, size: f.size }));
  let u = clientUser();
  let created = null, existingNotLogged = false;
  if (d.ctx !== 'cabinet' || !u) {
    const email = d.email.trim().toLowerCase();
    const found = BB.users.find(x => x.email.toLowerCase() === email);
    if (found && found.role !== 'CLIENT') return toast('Этот email принадлежит сотруднику — используйте другой', 'err');
    if (found) {
      u = found;
      existingNotLogged = BB.session.clientId !== found.id;
    } else {
      const co = { id: 'C' + (++BB.seq.company), name: d.company.trim(), bin: d.bin.trim(), city: d.to.split(',')[0].trim(), industry: '', createdAt: new Date().toISOString() };
      BB.companies.push(co);
      const password = genPassword();
      u = { id: 'U' + (++BB.seq.user), role: 'CLIENT', name: d.name.trim(), email, phone: d.phone.trim(), position: d.position || '', companyId: co.id, active: true, createdAt: new Date().toISOString(), password };
      BB.users.push(u);
      BB.session.clientId = u.id;
      created = { email, password };
    }
  }
  const n = ++BB.seq.lead;
  const lead = { id: 'B2B-' + String(n).padStart(6, '0'), number: n, userId: u.id, companyId: u.companyId, service: d.service, from: d.from, to: d.to, cargo: d.cargo,
    weight: +d.weight || '', volume: +d.volume || '', places: +d.places || '', valueUsd: +d.valueUsd || '', frequency: d.frequency, comment: d.comment || '', incoterms: '',
    status: 'new', managerId: BB.settings.autoAssign ? autoAssignManager() : null, createdAt: new Date().toISOString(),
    history: [{ from: null, to: 'new', date: new Date().toISOString(), userId: u.id, note: d.ctx === 'cabinet' ? 'Создана в личном кабинете' : 'Заявка с сайта' }],
    files: files.map(f => ({ ...f, by: u.id })), messages: [], quote: null, source: d.ctx === 'cabinet' ? 'Кабинет' : 'Сайт' };
  BB.leads.unshift(lead);
  audit(`Новая заявка ${lead.id} (${companyById(u.companyId)?.name})${created ? `, создан аккаунт ${created.email}` : ''}${lead.managerId ? `, автоназначена: ${userById(lead.managerId).name}` : ''}`, u.id);
  B2BStore.save();
  closeModal();
  setTimeout(() => toast(`${ic('bell-ring')} Отдел продаж уведомлён: ${esc(BB.settings.leadNotifyEmail)} и Telegram-чат`, 'info'), 600);
  if (created) {
    location.hash = '#/cabinet/lead/' + lead.id;
    openModal('Заявка принята', `<div class="center"><div class="icon-tile" style="margin:0 auto 12px;width:64px;height:64px;font-size:28px;background:var(--green-50);color:var(--green)">${ic('circle-check')}</div>
      <h2>${lead.id}</h2><p>Мы создали для вас личный кабинет — здесь вы увидите статус заявки, КП и документы.</p></div>
      <div class="card flat" style="background:var(--surface-2)"><div class="copy-line"><span class="k">Логин</span><span class="v">${esc(created.email)}</span>${copyBtn(created.email)}</div>
      <div class="copy-line hl"><span class="k">Временный пароль</span><span class="v mono">${created.password}</span>${copyBtn(created.password)}</div>
      <p class="muted small">Данные для входа также отправлены на email. Пароль можно сменить в профиле.</p></div>
      <div class="modal-foot"><button class="btn" data-action="modal-close">Открыть заявку</button></div>`);
    return;
  }
  if (existingNotLogged) {
    openModal('Заявка принята', `<p>Заявка <b>${lead.id}</b> добавлена в существующий аккаунт <b>${esc(u.email)}</b>.</p><p class="muted">Войдите, чтобы увидеть статус и коммерческое предложение.</p>
      <div class="modal-foot"><button class="btn secondary" data-action="modal-close">Закрыть</button><a class="btn" href="#/login?email=${encodeURIComponent(u.email)}">Войти в кабинет</a></div>`);
    return;
  }
  location.hash = '#/cabinet/lead/' + lead.id;
  toast(`Заявка ${lead.id} отправлена`, 'ok');
};

/* ---------- Вход клиента ---------- */
BSite.login = q => {
  const demo = BB.users.filter(u => u.role === 'CLIENT').slice(0, 4);
  return `${bHeader()}<div class="container" style="max-width:460px;padding:56px 20px">
    <div class="card" style="padding:28px"><h1>Вход в кабинет</h1><p class="muted">Для клиентов ${esc(BB.settings.brand)}</p>
    <form data-form="b-login"><label class="field"><span>Email</span><input name="email" type="email" required value="${esc(q.get('email') || '')}"></label>
    <label class="field"><span>Пароль</span><input name="password" type="password" required></label><button class="btn block lg">Войти</button></form>
    <button class="btn ghost sm block mt-s" data-action="b-forgot">Забыли пароль?</button>
    <hr><p class="muted small">Нет аккаунта? Он создаётся автоматически при <a role="button" style="cursor:pointer" data-action="b-lead">отправке заявки</a>.</p>
    <p class="small"><b>Демо-аккаунты</b> (пароль Demo-2026):</p>${demo.map(u => `<button class="chip mb-s" data-action="b-demo-client" data-id="${u.id}">${esc(companyById(u.companyId)?.name)}</button>`).join(' ')}</div></div>${bFooter()}`;
};
F['b-login'] = d => {
  const u = BB.users.find(x => x.email.toLowerCase() === d.email.trim().toLowerCase());
  if (!u || (u.password && u.password !== d.password && d.password !== 'Demo-2026')) return toast('Неверный email или пароль', 'err');
  if (u.role !== 'CLIENT') { BB.session.staffId = u.id; B2BStore.save(); location.hash = homeForRole(u.role); return; }
  BB.session.clientId = u.id; B2BStore.save(); location.hash = '#/cabinet'; toast('Добро пожаловать, ' + esc(u.name.split(' ')[0]), 'ok');
};
A['b-demo-client'] = el => { BB.session.clientId = el.dataset.id; B2BStore.save(); location.hash = '#/cabinet'; };
A['b-forgot'] = () => toast('В боевой версии придёт письмо со ссылкой для сброса пароля', 'info');
