/* B2B: роутер, демо-панель ролей, делегирование событий */
function b2bRoleBar(area) {
  const me = staff();
  const staffList = BB.users.filter(u => STAFF_ROLES.includes(u.role) && u.active);
  const link = (key, href, label) => `<a href="${href}" class="${area === key ? 'active' : ''}">${label}</a>`;
  return `<div class="rolebar no-print"><span class="tag">DEMO</span><a href="index.html">${ic('arrow-left')} B2C</a><span class="tag b2b-tag">B2B</span>
    ${link('site', '#/', `${ic('globe')} Сайт`)}${link('cabinet', '#/cabinet', `${ic('building-2')} Кабинет клиента`)}${link('admin', '#/admin', `${ic('settings')} Админка`)}
    <select class="rolebar-select" data-change="b2b-staff" title="Сотрудник в админке"><option value="">Сотрудник…</option>${staffList.map(u => `<option value="${u.id}" ${me?.id === u.id ? 'selected' : ''}>${esc(u.name)} — ${B2B_ROLE_LABELS[u.role]}</option>`).join('')}</select>
    <span class="sep"></span><button data-action="b2b-scenarios">${ic('clapperboard')} Сценарии</button><button data-action="b2b-reset">${ic('rotate-ccw')} Сбросить данные</button></div>`;
}
CH['b2b-staff'] = el => {
  if (!el.value) return;
  const u = userById(el.value);
  BB.session.staffId = u.id; audit('Вход в админ-панель', u.id); B2BStore.save();
  location.hash = homeForRole(u.role); render();
  toast(`Админка: ${esc(u.name)} — ${B2B_ROLE_LABELS[u.role]}`, 'ok');
};

let b2bLastPath = null;
function render() {
  mounts.length = 0;
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  let html, area = 'site';
  document.title = BB.settings.brand;
  switch (parts[0]) {
    case 'cabinet': area = 'cabinet'; html = BCab.render(parts.slice(1), q); document.title = 'Личный кабинет · ' + BB.settings.brand; break;
    case 'login': html = BSite.login(q); document.title = 'Вход · ' + BB.settings.brand; break;
    case 'admin': area = 'admin'; html = AD2.render(parts.slice(1), q); document.title = 'Админ-панель · ' + BB.settings.brand; break;
    case 'p': html = BSite.page(parts[1]); break;
    default: html = BSite.page('/');
  }
  $('#app').innerHTML = b2bRoleBar(area) + html;
  if (path !== b2bLastPath) { window.scrollTo(0, 0); b2bLastPath = path; }
  mounts.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = A[el.dataset.action];
  if (!fn) return console.warn('Нет обработчика', el.dataset.action);
  if (el.tagName === 'BUTTON' || (el.tagName === 'A' && !el.getAttribute('href'))) e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  F[f.dataset.form]?.(Object.fromEntries(new FormData(f)), f);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el) CH[el.dataset.input]?.(el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el) CH[el.dataset.change]?.(el, e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('hashchange', () => { closeModal(); render(); });
window.addEventListener('storage', e => { if (e.key === B2B_KEY) { B2BStore.load(); if (!$('#modal-root').innerHTML && !document.activeElement?.matches('input, textarea')) render(); } });

A['b2b-reset'] = () => {
  if (!confirm('Сбросить демо-данные B2B к исходному состоянию?')) return;
  B2BStore.reset(); CMS.open.clear(); render(); toast('Демо-данные B2B сброшены', 'ok');
};
A['b2b-scenarios'] = () => openModal(`${ic('clapperboard')} Сценарии B2B`, `<div class="pill-select">
  ${[
    ['1. Заявка с сайта → аккаунт', 'Сайт → «Оставить заявку» → заполнить форму. Аккаунт компании создаётся сразу, показываются логин и временный пароль, открывается заявка в кабинете.', '#/'],
    ['2. Менеджер берёт заявку', 'Сотрудник: Алия Нурланова (менеджер) → Заявки → «Взять в работу» у новой заявки. Видны только свои и свободные заявки.', '#/admin/login'],
    ['3. КП и согласование', 'В заявке менеджер заполняет КП → «Отправить КП клиенту». В кабинете клиента — «Принять КП» или «Запросить пересчёт».', '#/admin/lead/B2B-000103'],
    ['4. Договор и перевозка', 'После согласования: «Сформировать договор» → статус «Договор подписан» → «В перевозке» → «Завершена». Клиент видит каждый шаг.', '#/admin/lead/B2B-000108'],
    ['5. Руководитель продаж', 'Ерболат Нуржанов: все заявки, назначение менеджеров, загрузка отдела, «Требуют внимания».', '#/admin/dashboard'],
    ['6. Контент-менеджер и CMS', 'Мадина Касымова: Страницы → Главная → правка блоков, порядок, скрытие, добавление блока → Предпросмотр → Опубликовать. Заявки ей недоступны.', '#/admin/pages'],
    ['7. Роли и права', 'Арман Сейтказы (супер-админ): Пользователи и роли — смена роли, отключение доступа, матрица прав; Журнал действий.', '#/admin/users'],
  ].map(([h, d, href]) => `<label data-action="go" data-href="${href}"><span><b>${h}</b><br><span class="muted small">${d}</span></span></label>`).join('')}</div>`, { wide: true });

B2BStore.load();
render();
