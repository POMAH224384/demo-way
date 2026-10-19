/* CMS: блочный редактор страниц B2B-сайта, черновик / публикация / версии / SEO, настройки сайта */
const CMS = { open: new Set(), tab: 'blocks' };
const ICON_CHOICES = ['truck', 'plane', 'container', 'file-check', 'shield-check', 'warehouse', 'package', 'boxes', 'globe', 'clock', 'badge-dollar-sign', 'handshake', 'map-pin', 'phone', 'headset', 'chart-line'];

const fld = (k, label, o = {}) => ({ k, label, type: 'text', ...o });
const itemsFld = (label, fields, o = {}) => ({ k: 'items', label, type: 'items', fields, ...o });
const BLOCK_DEFS = {
  hero: { label: 'Hero — первый экран', icon: 'layout-template', fields: [fld('eyebrow', 'Надзаголовок', { max: 80 }), fld('title', 'Заголовок', { req: true, max: 160, hint: 'Если блок первый на странице, заголовок становится H1' }), fld('subtitle', 'Описание', { type: 'textarea', max: 600 }), fld('ctaLabel', 'Текст кнопки «Заявка»', { max: 40, hint: 'Пусто — кнопка скрыта' }), fld('badges', 'Метки под кнопками', { type: 'lines', hint: 'Каждая метка — с новой строки' })] },
  stats: { label: 'Цифры', icon: 'chart-line', fields: [fld('title', 'Заголовок'), itemsFld('Показатели', [fld('value', 'Значение', { req: true }), fld('label', 'Подпись')], { min: 1 })] },
  services: { label: 'Услуги / преимущества', icon: 'layout-grid', fields: [fld('eyebrow', 'Надзаголовок'), fld('title', 'Заголовок', { req: true }), fld('subtitle', 'Подзаголовок', { type: 'textarea' }), itemsFld('Карточки', [fld('icon', 'Иконка', { type: 'icon' }), fld('title', 'Заголовок', { req: true }), fld('text', 'Текст', { type: 'textarea' })], { min: 1 })] },
  steps: { label: 'Шаги работы', icon: 'list-ordered', fields: [fld('eyebrow', 'Надзаголовок'), fld('title', 'Заголовок', { req: true }), itemsFld('Шаги', [fld('title', 'Название шага', { req: true }), fld('text', 'Описание', { type: 'textarea' })], { min: 1 })] },
  cases: { label: 'Отзывы клиентов', icon: 'quote', fields: [fld('eyebrow', 'Надзаголовок'), fld('title', 'Заголовок', { req: true }), itemsFld('Отзывы', [fld('quote', 'Отзыв', { type: 'textarea', req: true }), fld('author', 'Автор', { req: true }), fld('company', 'Компания')], { min: 1 })] },
  faq: { label: 'FAQ', icon: 'circle-help', fields: [fld('eyebrow', 'Надзаголовок'), fld('title', 'Заголовок', { req: true }), itemsFld('Вопросы', [fld('q', 'Вопрос', { req: true }), fld('a', 'Ответ', { type: 'textarea', req: true })], { min: 1 })] },
  text: { label: 'Текст', icon: 'text', fields: [fld('title', 'Заголовок'), fld('content', 'Текст', { type: 'textarea', req: true, rows: 8, hint: 'Абзацы — через пустую строку, «## » — подзаголовок, «- » — пункт списка. HTML не допускается.' })] },
  cta: { label: 'Призыв к действию', icon: 'megaphone', fields: [fld('title', 'Заголовок', { req: true }), fld('text', 'Текст', { type: 'textarea' }), fld('ctaLabel', 'Текст кнопки', { req: true })] },
  contacts: { label: 'Контакты', icon: 'contact', note: 'Телефон, email, адрес и часы работы берутся из «Настроек сайта».', fields: [fld('title', 'Заголовок', { req: true }), fld('subtitle', 'Подзаголовок')] },
  lead: { label: 'Форма заявки', icon: 'send', note: 'Поля формы фиксированные. Каждая заявка создаёт аккаунт клиента и попадает в раздел «Заявки».', fields: [fld('title', 'Заголовок', { req: true }), fld('subtitle', 'Подзаголовок', { type: 'textarea' })] },
};
const emptyBlockData = type => {
  const d = {};
  BLOCK_DEFS[type].fields.forEach(f => { d[f.k] = f.type === 'lines' ? [] : f.type === 'items' ? [Object.fromEntries(f.fields.map(x => [x.k, x.type === 'icon' ? 'package' : '']))] : ''; });
  if (d.title === '') d.title = BLOCK_DEFS[type].label;
  if (type === 'cta' || type === 'hero') d.ctaLabel = 'Оставить заявку';
  if (type === 'text') d.content = 'Новый текст';
  return d;
};
const blockSummary = b => b.data.title || b.data.items?.[0]?.title || '';
const isDirty = p => JSON.stringify(p.blocks) !== JSON.stringify(p.published || []);
const pageStatusBadge = p => p.status === 'published' ? '<span class="badge green">Опубликована</span>' : '<span class="badge">Черновик</span>';

function validateBlocks(blocks) {
  const errs = [];
  blocks.forEach((b, i) => {
    if (b.hidden) return;
    BLOCK_DEFS[b.type].fields.forEach(f => {
      if (f.type === 'items') {
        if ((b.data.items || []).length < (f.min || 0)) errs.push({ b: b.id, msg: `Блок ${i + 1}: добавьте хотя бы ${f.min} элемент` });
        (b.data.items || []).forEach((it, n) => f.fields.forEach(sf => { if (sf.req && !String(it[sf.k] || '').trim()) errs.push({ b: b.id, msg: `Блок ${i + 1}, элемент ${n + 1}: «${sf.label}» обязательно` }); }));
      } else if (f.req && !String(b.data[f.k] || '').trim()) errs.push({ b: b.id, msg: `Блок ${i + 1} (${BLOCK_DEFS[b.type].label}): «${f.label}» обязательно` });
    });
  });
  return errs;
}

/* ---------- Список страниц ---------- */
AD2.pages = () => `${pageHead2('Страницы сайта', 'CMS', `<button class="btn" data-action="cms-page-new">${ic('plus')} Новая страница</button>`)}
  <div class="card pad-0 table-wrap"><table class="t"><thead><tr><th>Страница</th><th>Адрес</th><th>Блоков</th><th>Статус</th><th>Изменена</th><th></th></tr></thead><tbody>
  ${BB.pages.map(p => `<tr class="click" data-action="go" data-href="#/admin/page/${p.id}"><td><b>${esc(p.title)}</b>${isDirty(p) && p.status === 'published' ? ' <span class="badge orange">Есть неопубликованные изменения</span>' : ''}</td><td class="mono small">${p.slug === '/' ? '/' : '/p/' + esc(p.slug)}</td><td>${p.blocks.length}</td><td>${pageStatusBadge(p)}</td>
    <td class="small">${fdt(p.updatedAt)}<br><span class="muted">${esc(userById(p.updatedBy)?.name || '')}</span></td><td class="right nowrap"><a class="icon-btn" href="${p.slug === '/' ? '#/' : '#/p/' + p.slug}" title="Открыть на сайте" onclick="event.stopPropagation()">${ic('external-link')}</a></td></tr>`).join('')}
  </tbody></table></div>
  <p class="muted small mt">Страницы собираются из блоков. Черновик сохраняется автоматически, посетители видят только опубликованную версию. Каждая публикация сохраняется в истории версий.</p>`;
A['cms-page-new'] = () => openModal('Новая страница', `<form data-form="cms-page-new"><label class="field"><span>Название</span><input name="title" required placeholder="Фулфилмент для маркетплейсов" data-input="cms-slug-auto"></label>
  <label class="field"><span>Адрес</span><div class="row nowrap"><span class="muted mono">/p/</span><input name="slug" id="cms-slug" required pattern="[a-z0-9-]+" title="латиница, цифры, дефис" placeholder="fulfillment"></div></label>
  <label class="check"><input type="checkbox" name="menu" checked> Добавить в меню сайта</label><button class="btn block mt">Создать</button></form>`);
CH['cms-slug-auto'] = el => { const s = $('#cms-slug'); if (s && !s.dataset.touched) s.value = translit(el.value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
document.addEventListener('input', e => { if (e.target.id === 'cms-slug') e.target.dataset.touched = '1'; });
F['cms-page-new'] = d => {
  if (BB.pages.some(p => p.slug === d.slug)) return toast('Такой адрес уже занят', 'err');
  const p = { id: 'P' + (++BB.seq.page), slug: d.slug, title: d.title, status: 'draft', blocks: [{ id: 'b' + (++BB.seq.block), type: 'hero', hidden: false, data: { ...emptyBlockData('hero'), title: d.title } }, { id: 'b' + (++BB.seq.block), type: 'lead', hidden: false, data: emptyBlockData('lead') }],
    published: [], seo: { title: '', description: '' }, updatedAt: new Date().toISOString(), updatedBy: BB.session.staffId, versions: [] };
  BB.pages.push(p);
  if (d.menu) BB.settings.menu.push({ label: d.title, href: '#/p/' + d.slug });
  audit(`Создана страница «${d.title}» (/p/${d.slug})`); B2BStore.save(); closeModal(); CMS.open = new Set([p.blocks[0].id]); location.hash = '#/admin/page/' + p.id;
};

/* ---------- Редактор страницы ---------- */
AD2.page = ([id], q) => {
  const p = pageById(id);
  if (!p) return empty('Страница не найдена');
  const tab = q.get('tab') || 'blocks';
  const tabs = [['blocks', `Блоки (${p.blocks.length})`], ['main', 'Основное'], ['seo', 'SEO'], ['versions', `Версии (${p.versions.length})`]];
  let body = '';
  if (tab === 'blocks') body = `<div class="row between mb"><span class="muted small">Изменения сохраняются в черновик автоматически. Скрытые блоки не показываются на сайте.</span>
      <div class="row"><button class="btn ghost sm" data-action="cms-collapse">${ic('chevrons-down-up')} Свернуть все</button><button class="btn sm" data-action="cms-add">${ic('plus')} Добавить блок</button></div></div>
    ${p.blocks.map((b, i) => blockCard(p, b, i)).join('') || empty('Блоков нет — добавьте первый')}`;
  if (tab === 'main') body = `<form class="card" data-form="cms-main" style="max-width:640px"><input type="hidden" name="id" value="${p.id}">
      <label class="field"><span>Название страницы</span><input name="title" value="${esc(p.title)}" required></label>
      <label class="field"><span>Адрес</span>${p.slug === '/' ? '<input value="/ (главная)" readonly>' : `<div class="row nowrap"><span class="muted mono">/p/</span><input name="slug" value="${esc(p.slug)}" pattern="[a-z0-9-]+" required></div>`}</label>
      <label class="check"><input type="checkbox" name="menu" ${BB.settings.menu.some(m => m.href === (p.slug === '/' ? '#/' : '#/p/' + p.slug)) ? 'checked' : ''}> Показывать в меню сайта</label>
      <div class="row mt"><button class="btn">Сохранить</button>${p.slug !== '/' ? `<button type="button" class="btn ghost" style="color:var(--red)" data-action="cms-page-del" data-id="${p.id}">${ic('trash-2')} Удалить страницу</button>` : ''}</div></form>`;
  if (tab === 'seo') {
    const title = p.seo.title || (p.slug === '/' ? BB.settings.seoTitle : `${p.title} — ${BB.settings.brand}`), desc = p.seo.description || BB.settings.seoDescription;
    body = `<div class="grid g2"><form class="card" data-form="cms-seo"><input type="hidden" name="id" value="${p.id}">
      <label class="field"><span>Title (до 60 символов)</span><input name="title" maxlength="70" value="${esc(p.seo.title)}" placeholder="${esc(title)}" data-input="cms-seo-preview"></label>
      <label class="field"><span>Description (до 160 символов)</span><textarea name="description" maxlength="200" placeholder="${esc(BB.settings.seoDescription)}" data-input="cms-seo-preview">${esc(p.seo.description)}</textarea></label>
      <p class="muted small">Пустые поля берутся из настроек сайта. Canonical, Open Graph и JSON-LD формируются автоматически.</p><button class="btn">Сохранить</button></form>
      <div class="card"><h4>Как страница выглядит в поиске</h4><div class="b-serp"><div class="u">way.kz${p.slug === '/' ? '/business' : '/business/' + esc(p.slug)}</div><div class="t" id="serp-t">${esc(title)}</div><div class="d" id="serp-d">${esc(desc)}</div></div></div></div>`;
  }
  if (tab === 'versions') body = `<div class="card pad-0">${p.versions.length ? `<table class="t"><thead><tr><th>Дата</th><th>Автор</th><th>Блоков</th><th>Комментарий</th><th></th></tr></thead><tbody>
      ${[...p.versions].reverse().map((v, i) => `<tr><td>${fdt(v.date)}${i === 0 && p.status === 'published' ? ' <span class="badge green">На сайте</span>' : ''}</td><td>${esc(userById(v.userId)?.name || '')}</td><td>${v.blocks.length}</td><td class="small">${esc(v.note)}</td><td class="right"><button class="btn ghost sm" data-action="cms-restore" data-id="${p.id}" data-v="${v.id}">${ic('undo-2')} В черновик</button></td></tr>`).join('')}</tbody></table>`
    : empty('Страница ещё не публиковалась', ic('history'))}</div>`;
  const dirty = isDirty(p);
  return `<div class="cms-head"><div><div class="crumbs"><a href="#/admin/pages">Страницы</a> / ${esc(p.title)}</div>
      <div class="row"><h1 style="margin:0">${esc(p.title)}</h1>${pageStatusBadge(p)}<span id="cms-dirty">${dirty ? '<span class="badge orange">Черновик отличается от опубликованного</span>' : ''}</span></div></div>
    <div class="row"><button class="btn secondary" data-action="cms-save" data-id="${p.id}">${ic('save')} Сохранить черновик</button><a class="btn secondary" href="#/admin/preview/${p.id}">${ic('eye')} Предпросмотр</a>
      ${p.status === 'published' && p.slug !== '/' ? `<button class="btn secondary" data-action="cms-unpublish" data-id="${p.id}">${ic('eye-off')} Снять</button>` : ''}
      <button class="btn" data-action="cms-publish" data-id="${p.id}">${ic('upload')} Опубликовать</button></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/admin/page/${p.id}?tab=${k}" class="${tab === k ? 'active' : ''}">${l}</a>`).join('')}</div>${body}`;
};

function blockCard(p, b, i) {
  const def = BLOCK_DEFS[b.type], open = CMS.open.has(b.id);
  const btn = (act, icon, title, extra = '') => `<button class="icon-btn" data-action="${act}" data-p="${p.id}" data-b="${b.id}" title="${title}" ${extra}>${ic(icon)}</button>`;
  return `<div class="card pad-0 cms-block ${b.hidden ? 'is-hidden' : ''}" id="blk-${b.id}">
    <div class="cms-block-head" data-action="cms-toggle" data-b="${b.id}"><span class="cms-num">${i + 1}</span><span class="icon-tile" style="width:34px;height:34px;font-size:16px">${ic(def.icon)}</span>
      <div class="grow"><b>${def.label}</b>${b.hidden ? ' <span class="badge">Скрыт</span>' : ''}<div class="muted small cms-sum" id="sum-${b.id}">${esc(blockSummary(b))}</div></div>
      <div class="row nowrap" style="gap:2px">${btn('cms-toggle', open ? 'chevron-up' : 'chevron-down', 'Развернуть')}${btn('cms-move', 'arrow-up', 'Выше', `data-dir="-1" ${i === 0 ? 'disabled' : ''}`)}${btn('cms-move', 'arrow-down', 'Ниже', `data-dir="1" ${i === p.blocks.length - 1 ? 'disabled' : ''}`)}
        ${btn('cms-hide', b.hidden ? 'eye-off' : 'eye', b.hidden ? 'Показать' : 'Скрыть')}${btn('cms-dup', 'copy', 'Дублировать')}<button class="icon-btn" style="color:var(--red)" data-action="cms-del" data-p="${p.id}" data-b="${b.id}" title="Удалить">${ic('trash-2')}</button></div></div>
    ${open ? `<div class="cms-block-body">${def.note ? `<div class="notice mb">${ic('info')} ${def.note}</div>` : ''}${def.fields.map(f => fieldHtml(p, b, f)).join('')}</div>` : ''}</div>`;
}
function inputHtml(f, val, attrs) {
  const req = f.req ? '<span style="color:var(--red)">*</span>' : '';
  const label = `<span>${esc(f.label)}${req}</span>`;
  const hint = f.hint ? `<div class="muted small" style="margin-top:4px">${esc(f.hint)}</div>` : '';
  if (f.type === 'textarea') return `<label class="field">${label}<textarea ${attrs} rows="${f.rows || 3}">${esc(val)}</textarea>${hint}</label>`;
  if (f.type === 'lines') return `<label class="field">${label}<textarea ${attrs} rows="3">${esc((val || []).join('\n'))}</textarea>${hint}</label>`;
  if (f.type === 'icon') return `<label class="field">${label}<div class="row nowrap"><span class="icon-tile" style="width:40px;height:40px">${ic(val || 'package')}</span><select ${attrs} data-rerender="1">${ICON_CHOICES.map(n => `<option ${n === val ? 'selected' : ''}>${n}</option>`).join('')}</select></div></label>`;
  return `<label class="field">${label}<input ${attrs} value="${esc(val)}" ${f.max ? `maxlength="${f.max}"` : ''}>${hint}</label>`;
}
function fieldHtml(p, b, f) {
  if (f.type !== 'items') return inputHtml(f, b.data[f.k], `data-input="cms-field" data-p="${p.id}" data-b="${b.id}" data-k="${f.k}" data-t="${f.type}"`);
  const items = b.data.items || [];
  return `<fieldset class="cms-items"><legend>${esc(f.label)} (${items.length})</legend>
    ${items.map((it, n) => `<div class="cms-item"><div class="row between mb-s"><b class="small muted">#${n + 1}</b><button type="button" class="icon-btn" style="color:var(--red)" data-action="cms-item-del" data-p="${p.id}" data-b="${b.id}" data-n="${n}" ${items.length <= (f.min || 0) ? 'disabled' : ''}>${ic('x')}</button></div>
      <div class="grid ${f.fields.length > 2 ? 'g3' : 'g2'}">${f.fields.map(sf => inputHtml(sf, it[sf.k], `data-input="cms-field" data-p="${p.id}" data-b="${b.id}" data-k="${sf.k}" data-n="${n}" data-t="${sf.type}"`)).join('')}</div></div>`).join('')}
    <button type="button" class="btn ghost sm" data-action="cms-item-add" data-p="${p.id}" data-b="${b.id}">${ic('plus')} Добавить</button></fieldset>`;
}

/* ---------- Действия редактора ---------- */
const findBlock = el => { const p = pageById(el.dataset.p); return { p, b: p?.blocks.find(x => x.id === el.dataset.b) }; };
let cmsSaveTimer = null;
function touchPage(p, rerender = false) {
  p.updatedAt = new Date().toISOString(); p.updatedBy = BB.session.staffId;
  clearTimeout(cmsSaveTimer); cmsSaveTimer = setTimeout(() => B2BStore.save(), 250);
  if (rerender) { B2BStore.save(); render(); return; }
  const d = $('#cms-dirty'); if (d) d.innerHTML = isDirty(p) ? '<span class="badge orange">Черновик отличается от опубликованного</span>' : '';
}
CH['cms-field'] = el => {
  const { p, b } = findBlock(el);
  const v = el.dataset.t === 'lines' ? el.value.split('\n').map(x => x.trim()).filter(Boolean) : el.value;
  if (el.dataset.n != null) b.data.items[+el.dataset.n][el.dataset.k] = v; else b.data[el.dataset.k] = v;
  const s = $('#sum-' + b.id); if (s) s.textContent = blockSummary(b);
  touchPage(p, !!el.dataset.rerender);
};
A['cms-toggle'] = el => { CMS.open.has(el.dataset.b) ? CMS.open.delete(el.dataset.b) : CMS.open.add(el.dataset.b); render(); };
A['cms-collapse'] = () => { CMS.open.clear(); render(); };
A['cms-move'] = el => { const { p, b } = findBlock(el); const i = p.blocks.indexOf(b), j = i + +el.dataset.dir; if (j < 0 || j >= p.blocks.length) return; [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]]; touchPage(p, true); };
A['cms-hide'] = el => { const { p, b } = findBlock(el); b.hidden = !b.hidden; touchPage(p, true); };
A['cms-dup'] = el => { const { p, b } = findBlock(el); const c = JSON.parse(JSON.stringify(b)); c.id = 'b' + (++BB.seq.block); p.blocks.splice(p.blocks.indexOf(b) + 1, 0, c); CMS.open.add(c.id); touchPage(p, true); };
A['cms-del'] = el => { const { p, b } = findBlock(el); if (!confirm(`Удалить блок «${BLOCK_DEFS[b.type].label}»?`)) return; p.blocks.splice(p.blocks.indexOf(b), 1); touchPage(p, true); };
A['cms-item-add'] = el => { const { p, b } = findBlock(el); const f = BLOCK_DEFS[b.type].fields.find(x => x.type === 'items'); b.data.items.push(Object.fromEntries(f.fields.map(x => [x.k, x.type === 'icon' ? 'package' : '']))); touchPage(p, true); };
A['cms-item-del'] = el => { const { p, b } = findBlock(el); b.data.items.splice(+el.dataset.n, 1); touchPage(p, true); };
A['cms-add'] = () => {
  const p = pageById(location.hash.split('/')[3].split('?')[0]);
  openModal('Добавить блок', `<div class="grid g2">${Object.entries(BLOCK_DEFS).map(([k, d]) => `<button class="service-tile" style="cursor:pointer;text-align:left;font:inherit" data-action="cms-add-type" data-p="${p.id}" data-type="${k}"><span class="ico">${ic(d.icon)}</span><b>${d.label}</b></button>`).join('')}</div>`, { wide: true });
};
A['cms-add-type'] = el => {
  const p = pageById(el.dataset.p);
  const b = { id: 'b' + (++BB.seq.block), type: el.dataset.type, hidden: false, data: emptyBlockData(el.dataset.type) };
  p.blocks.push(b); CMS.open = new Set([b.id]); closeModal(); touchPage(p, true);
  setTimeout(() => $('#blk-' + b.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
};
A['cms-save'] = el => { const p = pageById(el.dataset.id); B2BStore.save(); audit(`Сохранён черновик страницы «${p.title}»`); B2BStore.save(); toast('Черновик сохранён', 'ok'); };
A['cms-publish'] = el => {
  const p = pageById(el.dataset.id);
  const errs = validateBlocks(p.blocks);
  if (errs.length) { errs.forEach(e => CMS.open.add(e.b)); render(); return toast('Не опубликовано: ' + errs.slice(0, 3).map(e => esc(e.msg)).join('; '), 'err'); }
  const snap = JSON.parse(JSON.stringify(p.blocks));
  p.published = snap; p.status = 'published';
  p.versions.push({ id: 'V' + (++BB.seq.ver), date: new Date().toISOString(), userId: BB.session.staffId, note: 'Публикация', blocks: JSON.parse(JSON.stringify(snap)) });
  audit(`Опубликована страница «${p.title}»`); B2BStore.save(); render(); toast(`Страница «${esc(p.title)}» опубликована`, 'ok');
};
A['cms-unpublish'] = el => { const p = pageById(el.dataset.id); p.status = 'draft'; audit(`Снята с публикации страница «${p.title}»`); B2BStore.save(); render(); toast('Страница снята с публикации'); };
A['cms-restore'] = el => {
  const p = pageById(el.dataset.id), v = p.versions.find(x => x.id === el.dataset.v);
  p.blocks = JSON.parse(JSON.stringify(v.blocks)); audit(`«${p.title}»: версия от ${fdt(v.date)} восстановлена в черновик`); B2BStore.save();
  location.hash = `#/admin/page/${p.id}`; toast('Версия восстановлена в черновик — проверьте и опубликуйте', 'ok');
};
F['cms-main'] = d => {
  const p = pageById(d.id), oldHref = p.slug === '/' ? '#/' : '#/p/' + p.slug;
  if (d.slug && d.slug !== p.slug && BB.pages.some(x => x.slug === d.slug)) return toast('Такой адрес уже занят', 'err');
  p.title = d.title; if (d.slug) p.slug = d.slug;
  const href = p.slug === '/' ? '#/' : '#/p/' + p.slug;
  const mi = BB.settings.menu.find(m => m.href === oldHref);
  if (mi) { mi.href = href; if (!d.menu) BB.settings.menu.splice(BB.settings.menu.indexOf(mi), 1); else mi.label = p.slug === '/' ? mi.label : p.title; }
  else if (d.menu) BB.settings.menu.push({ label: p.title, href });
  audit(`Изменены параметры страницы «${p.title}»`); B2BStore.save(); render(); toast('Сохранено', 'ok');
};
A['cms-page-del'] = el => {
  const p = pageById(el.dataset.id);
  if (!confirm(`Удалить страницу «${p.title}»?`)) return;
  BB.pages = BB.pages.filter(x => x !== p); BB.settings.menu = BB.settings.menu.filter(m => m.href !== '#/p/' + p.slug);
  audit(`Удалена страница «${p.title}»`); B2BStore.save(); location.hash = '#/admin/pages';
};
F['cms-seo'] = d => { const p = pageById(d.id); p.seo = { title: d.title, description: d.description }; audit(`SEO страницы «${p.title}» обновлено`); B2BStore.save(); toast('SEO сохранено', 'ok'); };
CH['cms-seo-preview'] = el => {
  if (el.name === 'title') $('#serp-t').textContent = el.value || el.placeholder;
  else $('#serp-d').textContent = el.value || el.placeholder;
  el.closest('label').querySelector('span').textContent = (el.name === 'title' ? 'Title' : 'Description') + ` (${el.value.length}/${el.name === 'title' ? 60 : 160})`;
};

/* ---------- Настройки сайта ---------- */
AD2.settings = () => {
  const s = BB.settings, me = staff();
  return `${pageHead2('Настройки сайта', 'CMS')}<form data-form="cms-settings"><div class="grid g2">
    <div class="card"><h3>Бренд и контакты</h3>
      ${[['brand', 'Название'], ['tagline', 'Слоган под логотипом'], ['phone', 'Телефон'], ['email', 'Email'], ['address', 'Адрес'], ['hours', 'Часы работы'], ['telegram', 'Telegram'], ['whatsapp', 'WhatsApp']].map(([k, l]) => `<label class="field"><span>${l}</span><input name="${k}" value="${esc(s[k])}"></label>`).join('')}</div>
    <div><div class="card mb"><h3>Меню сайта</h3><label class="field"><span>Пункты: «Название | ссылка», каждый с новой строки</span><textarea name="menu" rows="5">${esc(s.menu.map(m => `${m.label} | ${m.href}`).join('\n'))}</textarea></label>
      <p class="muted small">Ссылки на страницы: <span class="mono">#/</span> — главная, <span class="mono">#/p/адрес</span> — остальные.</p></div>
      <div class="card mb"><h3>SEO по умолчанию</h3><label class="field"><span>Title</span><input name="seoTitle" value="${esc(s.seoTitle)}"></label><label class="field"><span>Description</span><textarea name="seoDescription">${esc(s.seoDescription)}</textarea></label></div>
      ${can(me, 'users:manage') ? `<div class="card"><h3>Заявки</h3><label class="field"><span>Email для уведомлений о новых заявках</span><input name="leadNotifyEmail" value="${esc(s.leadNotifyEmail)}"></label>
        <label class="check"><input type="checkbox" name="autoAssign" ${s.autoAssign ? 'checked' : ''}> Автоматически назначать менеджера (наименее загруженного)</label></div>` : ''}</div></div>
    <button class="btn lg mt">${ic('save')} Сохранить настройки</button></form>`;
};
F['cms-settings'] = d => {
  const s = BB.settings;
  ['brand', 'tagline', 'phone', 'email', 'address', 'hours', 'telegram', 'whatsapp', 'seoTitle', 'seoDescription'].forEach(k => s[k] = d[k]);
  s.menu = d.menu.split('\n').map(x => x.split('|').map(y => y.trim())).filter(([l, h]) => l && h).map(([label, href]) => ({ label, href }));
  if (can(staff(), 'users:manage')) { s.leadNotifyEmail = d.leadNotifyEmail; s.autoAssign = !!d.autoAssign; }
  audit('Обновлены настройки сайта'); B2BStore.save(); render(); toast('Настройки сохранены', 'ok');
};
