/* Роутер, ролевая панель демо, делегирование событий */
const EMBED = new URLSearchParams(location.search).has('embed');
if (EMBED) document.body.classList.add('embed');

const ROLES = [
  { key: 'site', label: `${ic('globe')} Сайт`, href: '#/' },
  { key: 'client', label: `${ic('user')} Клиент`, href: '#/client' },
  { key: 'warehouse', label: `${ic('warehouse')} Оператор склада`, href: '#/warehouse' },
  { key: 'buyout', label: `${ic('shopping-bag')} Менеджер выкупа`, href: '#/buyout' },
  { key: 'admin', label: `${ic('settings')} Администратор`, href: '#/admin' },
  { key: 'mobile', label: `${ic('smartphone')} Приложение`, href: '#/mobile' },
  { key: 'b2b', label: `${ic('briefcase')} B2B-направление`, href: 'b2b.html' },
];
function roleBar(area) {
  return `<div class="rolebar no-print"><span class="tag">DEMO</span>
    ${ROLES.map(r => `<a href="${r.href}" class="${r.key === area ? 'active' : ''}">${r.label}</a>`).join('')}
    <span class="sep"></span><button data-action="scenarios">${ic('clapperboard')} Сценарии</button><button data-action="reset">${ic('rotate-ccw')} Сбросить данные</button></div>`;
}

function mobilePage() {
  return `<div class="phone-stage"><div class="phone"><iframe src="${location.pathname}?embed=1#/client" title="Мобильное приложение"></iframe></div>
    <div class="phone-info card"><h2>${ic('smartphone')} Мобильное приложение</h2>
      <p>Кабинет клиента адаптирован под телефон: нижняя навигация, крупные кнопки, камера, push-уведомления.</p>
      <p><b>Этап 1 — PWA:</b> устанавливается с сайта на iOS и Android без сторов, работает офлайн (Service Worker), получает Web Push.</p>
      <p><b>Этап 2 — нативные приложения</b> (React Native / Flutter) на том же API: App Store и Google Play, Face ID, Apple/Google Pay.</p>
      <p class="muted small">Внутри рамки — тот же живой прототип: все действия синхронизированы с остальными ролями.</p>
      <div class="row"><button class="btn" data-action="pwa-install">${ic('download')} Установить PWA</button><button class="btn secondary" data-action="reload-phone">↻ Обновить</button></div></div></div>`;
}
A['reload-phone'] = () => { const f = $('.phone iframe'); f.src = f.src; };

let lastPath = null;
function render() {
  mounts.length = 0;
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  const area = parts[0] || '';
  let html, roleKey = 'site', title = 'Way — доставка из-за рубежа в Казахстан';
  switch (area) {
    case 'client': html = Client.render(parts.slice(1), q); roleKey = 'client'; title = 'Личный кабинет · Way'; break;
    case 'warehouse': html = WH.render(parts.slice(1), q); roleKey = 'warehouse'; title = 'Склад · Way'; break;
    case 'buyout': html = BY.render(parts.slice(1), q); roleKey = 'buyout'; title = 'Выкуп · Way'; break;
    case 'admin': html = AD.render(parts.slice(1), q); roleKey = 'admin'; title = 'Админ-панель · Way'; break;
    case 'mobile': html = mobilePage(); roleKey = 'mobile'; title = 'Мобильное приложение · Way'; break;
    case 'stores': html = Site.stores(q); title = 'Каталог магазинов · Way'; break;
    case 'help': html = Site.help(q); title = 'Помощь · Way'; break;
    case 'track': html = Site.track(q); title = 'Отслеживание · Way'; break;
    default:
      html = Site.home();
      if (q.get('ref') && !clientById(DB.session.clientId)) onMount(() => authModal('register'));
  }
  const isSite = roleKey === 'site';
  $('#app').innerHTML = roleBar(roleKey) + html + (isSite ? cookieBanner() : '');
  document.title = title;
  if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; }
  mounts.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}

/* ---------- Делегирование событий ---------- */
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
  const d = Object.fromEntries(new FormData(f));
  F[f.dataset.form]?.(d, f);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el) CH[el.dataset.input]?.(el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el) CH[el.dataset.change]?.(el, e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('hashchange', () => { closeModal(); render(); });
// синхронизация между вкладками и рамкой «телефона»
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { Store.load(); if (!$('#modal-root').innerHTML) render(); } });

A['reset'] = () => {
  if (!confirm('Сбросить все демо-данные к исходному состоянию?')) return;
  Store.reset(); RX = null; OCR.state = null; render(); toast('Демо-данные сброшены', 'ok');
};
A['scenarios'] = () => openModal(`${ic('clapperboard')} Сценарии для показа`, `<div class="pill-select">
  ${[
    ['1. Регистрация клиента', 'Сайт → «Получить адрес» → email/телефон/Google → персональный ID-код и адреса складов', '#/'],
    ['2. Приёмка по предзаявке', 'Склад → Приёмка → чип трека 1Z999AA10123456784 → «С весов» → Принять. Клиент получает уведомление и видит посылку с фото', '#/warehouse/receive'],
    ['3. OCR: посылка без предзаявки', 'Склад → OCR этикетки → демо-этикетки «С ID-кодом», «Без ID — только имя», «Имя с ошибкой», «Неизвестный»', '#/warehouse/ocr'],
    ['4. Нераспознанные', 'Склад → Нераспознанные: подсказки владельца по имени с этикетки, ручная привязка', '#/warehouse/unidentified'],
    ['5. Консолидация', 'Клиент → Посылки → отметить P-1002 и P-1003 → Объединить. Затем Склад → Заявки на услуги → Выполнить', '#/client/parcels?g=stock'],
    ['6. Оплата и отправка', 'Клиент → Кошелёк (Kaspi/карта) → оплатить доставку. Склад → Партии → сформировать → провести по статусам до «Выдача»', '#/client/wallet'],
    ['7. Купи вместо меня', 'Клиент создаёт заявку → Менеджер выкупа выставляет счёт → клиент платит → менеджер выкупает и указывает трек → склад принимает', '#/buyout'],
    ['8. Выдача', 'Склад → Выдача → WY-10427 → Выдать (код в кабинете клиента)', '#/warehouse/issue?c=WY-10427'],
    ['9. Админка', 'Тарифы и курсы (сразу меняются на сайте), страны, клиенты с корректировкой баланса, отчёты с экспортом XLSX, журнал действий', '#/admin'],
  ].map(([h, d, href]) => `<label data-action="go" data-href="${href}"><span><b>${h}</b><br><span class="muted small">${d}</span></span></label>`).join('')}</div>`, { wide: true });

/* ---------- Старт ---------- */
Store.load();
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
try { if (localStorage.getItem('qazbox-cookie') === 'all') loadAnalytics(); } catch {}
