/* Общие хелперы: форматирование, i18n, модалки, тосты, бизнес-расчёты */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const A = {};      // click-обработчики: data-action="name"
const F = {};      // submit-обработчики: data-form="name"
const CH = {};     // change/input-обработчики: data-change / data-input
const mounts = []; // колбэки после рендера
const onMount = fn => mounts.push(fn);

/* ---------- Формат ---------- */
const usd = n => (n < 0 ? '−$' : '$') + Math.abs(+n || 0).toFixed(2);
const kzt = n => Math.round((+n || 0) * DB.settings.rates.KZT).toLocaleString('ru-RU') + ' ₸';
const money = n => `${usd(n)} <span class="muted small">≈ ${kzt(n)}</span>`;
const fdate = d => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
const fdt = d => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const daysSince = d => Math.floor((Date.now() - new Date(d)) / DAY);
const kg = n => (+n || 0).toFixed(1).replace('.0', '') + ' кг';
const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const colorFor = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 62% 52%)`; };
const avatar = (name, size = 36) => `<span class="avatar" style="background:${colorFor(name)};width:${size}px;height:${size}px">${esc(initials(name))}</span>`;
const FLAG_LOCAL = ['us', 'gb', 'de', 'es', 'cn', 'tr', 'it', 'kz'];
const flag = code => { const c = String(code || '').toLowerCase(); return c ? `<img class="flag" src="${FLAG_LOCAL.includes(c) ? 'vendor/flags/' + c + '.svg' : 'https://flagcdn.com/' + c + '.svg'}" alt="${c.toUpperCase()}" loading="lazy">` : ic('flag'); };

function badge(status, map = STATUS) {
  const s = map[status] || { label: status, color: '' };
  return `<span class="badge ${s.color}">${s.icon ? s.icon + ' ' : ''}${esc(s.short || s.label)}</span>`;
}

/* ---------- i18n (сайт и навигация) ---------- */
const I18N = {
  ru: {
    nav_calc: 'Калькулятор', nav_stores: 'Магазины', nav_track: 'Отследить', nav_help: 'Помощь', nav_login: 'Войти', nav_cabinet: 'Личный кабинет',
    hero_title: 'Покупайте за рубежом — <em>доставим в Казахстан</em>',
    hero_lead: 'Личные адреса складов в США, Англии, Германии, Испании и Китае. Объединяем посылки, выкупаем товары за вас и привозим до двери или в постамат.',
    hero_cta: 'Получить адрес бесплатно', hero_cta2: 'Рассчитать стоимость',
    hero_b1: `${ic('zap')} от 7 дней`, hero_b2: `${ic('credit-card')} Kaspi и карты`, hero_b3: `${ic('map-pin')} ПВЗ и постаматы`,
    calc_title: 'Калькулятор доставки', calc_country: 'Страна склада', calc_weight: 'Вес, кг', calc_dims: 'Габариты, см (Д × Ш × В)',
    calc_level: 'Уровень', calc_total: 'Стоимость доставки', calc_note: 'Объёмный вес = Д×Ш×В / 5000. Оплачивается больший из весов.', calc_btn: 'Отправить посылку',
    how_title: 'Как это работает', how_sub: 'Четыре шага от корзины в зарубежном магазине до вашей двери',
    s1t: 'Зарегистрируйтесь', s1d: 'Получите персональный ID-код и адреса складов в 5 странах',
    s2t: 'Покупайте', s2d: 'Укажите адрес склада при оформлении заказа в любом магазине',
    s3t: 'Мы примем посылку', s3d: 'Взвесим, сфотографируем, при желании объединим с другими',
    s4t: 'Получите в Казахстане', s4d: 'Оплатите доставку в кабинете и заберите в ПВЗ, постамате или у курьера',
    countries_title: 'Склады в 5 странах', countries_sub: 'Новые направления добавляются администратором — без релиза',
    services_title: 'Больше, чем доставка',
    sv1t: 'Купи вместо меня', sv1d: 'Магазин не принимает казахстанские карты? Пришлите ссылку — выкупим за вас.',
    sv2t: 'Консолидация', sv2d: 'Объединим посылки из разных магазинов в одну и сэкономим до 40%.',
    sv3t: 'Фото и проверка', sv3d: 'Покажем содержимое и сверим с заказом до отправки.',
    sv4t: 'Курьер и постаматы', sv4d: 'Получайте в ПВЗ, постамате 24/7 или курьером до двери.',
    stores_title: 'Популярные магазины', stores_all: 'Весь каталог →',
    tariffs_title: 'Тарифы', tariffs_sub: 'Цена за 1 кг по уровню лояльности. Чем больше отправляете — тем дешевле.',
    app_title: 'Приложение всегда под рукой', app_sub: 'Установите веб-приложение на телефон прямо с сайта — без App Store и Google Play. Push-уведомления о каждом статусе.',
    app_install: 'Установить приложение',
    faq_title: 'Частые вопросы',
    footer_about: 'Доставка покупок из зарубежных интернет-магазинов в Казахстан.',
    cookie_text: 'Мы используем cookie для работы сайта и аналитики (Google Analytics, Meta Pixel).',
    cookie_all: 'Принять все', cookie_need: 'Только необходимые',
    track_title: 'Отслеживание посылки', track_ph: 'Трек-номер или номер посылки', track_btn: 'Найти',
    stores_page: 'Каталог магазинов', search: 'Поиск', all_countries: 'Все страны', all_categories: 'Все категории',
    help_title: 'Помощь',
    c_dashboard: 'Главная', c_parcels: 'Посылки', c_addresses: 'Мои адреса', c_buyout: 'Купи вместо меня', c_wallet: 'Кошелёк',
    c_delivery: 'Получение', c_loyalty: 'Бонусы и друзья', c_support: 'Поддержка', c_settings: 'Настройки', c_more: 'Ещё',
  },
  kk: {
    nav_calc: 'Калькулятор', nav_stores: 'Дүкендер', nav_track: 'Бақылау', nav_help: 'Көмек', nav_login: 'Кіру', nav_cabinet: 'Жеке кабинет',
    hero_title: 'Шетелден сатып алыңыз — <em>Қазақстанға жеткіземіз</em>',
    hero_lead: 'АҚШ, Англия, Германия, Испания және Қытайдағы жеке қойма мекенжайлары. Сәлемдемелерді біріктіреміз, тауарды сіз үшін сатып аламыз және есікке не постаматқа дейін жеткіземіз.',
    hero_cta: 'Мекенжайды тегін алу', hero_cta2: 'Құнын есептеу',
    hero_b1: `${ic('zap')} 7 күннен бастап`, hero_b2: `${ic('credit-card')} Kaspi және карталар`, hero_b3: `${ic('map-pin')} Беру пункттері мен постаматтар`,
    calc_title: 'Жеткізу калькуляторы', calc_country: 'Қойма елі', calc_weight: 'Салмағы, кг', calc_dims: 'Өлшемдері, см (Ұ × Е × Б)',
    calc_level: 'Деңгей', calc_total: 'Жеткізу құны', calc_note: 'Көлемдік салмақ = Ұ×Е×Б / 5000. Үлкен салмақ бойынша төленеді.', calc_btn: 'Сәлемдеме жіберу',
    how_title: 'Бұл қалай жұмыс істейді', how_sub: 'Шетелдік дүкен себетінен есігіңізге дейін төрт қадам',
    s1t: 'Тіркеліңіз', s1d: 'Жеке ID-код пен 5 елдегі қойма мекенжайларын алыңыз',
    s2t: 'Сатып алыңыз', s2d: 'Тапсырыс беру кезінде қойма мекенжайын көрсетіңіз',
    s3t: 'Біз қабылдаймыз', s3d: 'Өлшейміз, суретке түсіреміз, қаласаңыз біріктіреміз',
    s4t: 'Қазақстанда алыңыз', s4d: 'Кабинетте төлеп, пунктте, постаматта немесе курьерден алыңыз',
    countries_title: '5 елдегі қоймалар', countries_sub: 'Жаңа бағыттарды әкімші қосады',
    services_title: 'Жеткізуден де көп',
    sv1t: 'Мен үшін сатып ал', sv1d: 'Дүкен қазақстандық картаны қабылдамай ма? Сілтеме жіберіңіз — сатып аламыз.',
    sv2t: 'Біріктіру', sv2d: 'Әр дүкеннің сәлемдемелерін біреуге біріктіріп, 40%-ға дейін үнемдейміз.',
    sv3t: 'Фото және тексеру', sv3d: 'Жөнелтер алдында ішін көрсетіп, тапсырыспен салыстырамыз.',
    sv4t: 'Курьер және постаматтар', sv4d: 'Пунктте, 24/7 постаматта немесе курьер арқылы алыңыз.',
    stores_title: 'Танымал дүкендер', stores_all: 'Толық каталог →',
    tariffs_title: 'Тарифтер', tariffs_sub: 'Адалдық деңгейі бойынша 1 кг бағасы.',
    app_title: 'Қосымша әрқашан қолыңызда', app_sub: 'Веб-қосымшаны телефонға тікелей сайттан орнатыңыз — App Store мен Google Play-сіз.',
    app_install: 'Қосымшаны орнату',
    faq_title: 'Жиі қойылатын сұрақтар',
    footer_about: 'Шетелдік интернет-дүкендерден Қазақстанға жеткізу.',
    cookie_text: 'Біз cookie файлдарын сайт жұмысы мен аналитика үшін қолданамыз.',
    cookie_all: 'Барлығын қабылдау', cookie_need: 'Тек қажеттілері',
    track_title: 'Сәлемдемені бақылау', track_ph: 'Трек-нөмір немесе сәлемдеме нөмірі', track_btn: 'Іздеу',
    stores_page: 'Дүкендер каталогы', search: 'Іздеу', all_countries: 'Барлық елдер', all_categories: 'Барлық санаттар',
    help_title: 'Көмек',
    c_dashboard: 'Басты бет', c_parcels: 'Сәлемдемелер', c_addresses: 'Мекенжайларым', c_buyout: 'Мен үшін сатып ал', c_wallet: 'Әмиян',
    c_delivery: 'Алу тәсілі', c_loyalty: 'Бонустар', c_support: 'Қолдау', c_settings: 'Баптаулар', c_more: 'Тағы',
  },
  en: {
    nav_calc: 'Calculator', nav_stores: 'Stores', nav_track: 'Track', nav_help: 'Help', nav_login: 'Sign in', nav_cabinet: 'My account',
    hero_title: 'Shop abroad — <em>we deliver to Kazakhstan</em>',
    hero_lead: 'Personal warehouse addresses in the USA, UK, Germany, Spain and China. We consolidate parcels, buy for you and deliver to your door or a parcel locker.',
    hero_cta: 'Get a free address', hero_cta2: 'Calculate cost',
    hero_b1: `${ic('zap')} from 7 days`, hero_b2: `${ic('credit-card')} Kaspi & cards`, hero_b3: `${ic('map-pin')} Pickup points & lockers`,
    calc_title: 'Shipping calculator', calc_country: 'Warehouse country', calc_weight: 'Weight, kg', calc_dims: 'Dimensions, cm (L × W × H)',
    calc_level: 'Level', calc_total: 'Shipping cost', calc_note: 'Volumetric weight = L×W×H / 5000. The greater weight is charged.', calc_btn: 'Ship a parcel',
    how_title: 'How it works', how_sub: 'Four steps from a foreign store cart to your door',
    s1t: 'Sign up', s1d: 'Get a personal ID code and warehouse addresses in 5 countries',
    s2t: 'Shop', s2d: 'Use our warehouse address at checkout in any store',
    s3t: 'We receive it', s3d: 'We weigh, photograph and consolidate on request',
    s4t: 'Pick up in Kazakhstan', s4d: 'Pay online and pick up at a point, locker or by courier',
    countries_title: 'Warehouses in 5 countries', countries_sub: 'New destinations are added by admins — no release required',
    services_title: 'More than shipping',
    sv1t: 'Buy for me', sv1d: 'Store does not accept Kazakh cards? Send a link — we will buy it for you.',
    sv2t: 'Consolidation', sv2d: 'We merge parcels from different stores and save you up to 40%.',
    sv3t: 'Photos & inspection', sv3d: 'We show the contents and check against your order.',
    sv4t: 'Courier & lockers', sv4d: 'Pick up at a point, a 24/7 locker or get courier delivery.',
    stores_title: 'Popular stores', stores_all: 'Full catalog →',
    tariffs_title: 'Rates', tariffs_sub: 'Price per kg by loyalty level. Ship more — pay less.',
    app_title: 'The app is always at hand', app_sub: 'Install the web app on your phone right from the site — no App Store or Google Play needed.',
    app_install: 'Install app',
    faq_title: 'FAQ',
    footer_about: 'Delivery of purchases from foreign online stores to Kazakhstan.',
    cookie_text: 'We use cookies for site operation and analytics (Google Analytics, Meta Pixel).',
    cookie_all: 'Accept all', cookie_need: 'Necessary only',
    track_title: 'Track a parcel', track_ph: 'Tracking or parcel number', track_btn: 'Find',
    stores_page: 'Store catalog', search: 'Search', all_countries: 'All countries', all_categories: 'All categories',
    help_title: 'Help',
    c_dashboard: 'Home', c_parcels: 'Parcels', c_addresses: 'My addresses', c_buyout: 'Buy for me', c_wallet: 'Wallet',
    c_delivery: 'Delivery', c_loyalty: 'Rewards', c_support: 'Support', c_settings: 'Settings', c_more: 'More',
  },
};
let LANG = (() => { try { return localStorage.getItem('qazbox-lang') || 'ru'; } catch { return 'ru'; } })();
const t = k => I18N[LANG]?.[k] ?? I18N.ru[k] ?? k;
A['lang'] = el => { LANG = el.dataset.lang; try { localStorage.setItem('qazbox-lang', LANG); } catch {} document.documentElement.lang = LANG === 'kk' ? 'kk' : LANG; render(); };
const langSwitch = () => `<div class="lang-switch">${['ru', 'kk', 'en'].map(l => `<button data-action="lang" data-lang="${l}" class="${LANG === l ? 'active' : ''}">${l === 'kk' ? 'KZ' : l.toUpperCase()}</button>`).join('')}</div>`;

/* ---------- Тосты и модалки ---------- */
function toast(msg, type = '') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = String(msg).startsWith('<svg') ? '' : ic({ ok: 'circle-check', err: 'circle-x', info: 'bell-ring' }[type] || 'info');
  el.innerHTML = icon + '<span>' + msg + '</span>';
  box.appendChild(el);
  setTimeout(() => el.remove(), type === 'info' ? 4200 : 3200);
}
function openModal(title, body, opts = {}) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="modal-bg"><div class="modal ${opts.wide ? 'wide' : ''}">
    <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-action="modal-close" style="font-size:22px">${ic('x')}</button></div>
    <div class="modal-body">${body}</div></div></div>`;
  const first = $('#modal-root input:not([type=hidden]):not([readonly]), #modal-root select, #modal-root textarea');
  if (first && !opts.noFocus) setTimeout(() => first.focus(), 30);
  opts.onOpen?.();
}
function closeModal() { $('#modal-root').innerHTML = ''; }
A['modal-close'] = closeModal;
A['modal-bg'] = (el, e) => { if (e.target === el) closeModal(); };
A['copy'] = el => { navigator.clipboard?.writeText(el.dataset.text).catch(() => {}); toast(`${ic('copy')} Скопировано: ` + esc(el.dataset.text)); };
A['go'] = el => { location.hash = el.dataset.href; };
A['zoom'] = el => openModal('Фото', `<img src="${el.src}" style="width:100%;border-radius:12px">`, { wide: true });
const copyBtn = (text, label = ic('copy')) => `<button type="button" class="icon-btn" title="Копировать" data-action="copy" data-text="${esc(text)}">${label}</button>`;

/* ---------- Журнал, уведомления ---------- */
const ROLE_USER = { client: 'Клиент', warehouse: 'Оператор склада', buyout: 'Менеджер выкупа', admin: 'Администратор', site: 'Сайт' };
const STAFF = { warehouse: () => ({ US: 'Mike R. (US)', GB: 'Oliver T. (GB)', DE: 'Klaus W. (DE)', ES: 'Lucía M. (ES)', CN: 'Wang L. (CN)' }[DB.session.whCountry] || 'Оператор'), buyout: () => 'Сауле Б.', admin: () => 'Админ' };
function logAction(role, text) {
  DB.log.unshift({ date: new Date().toISOString(), role: ROLE_USER[role] || role, user: STAFF[role]?.() || (role === 'client' ? DB.session.clientId : '—'), text });
  if (DB.log.length > 400) DB.log.length = 400;
}
const CHANNEL_NAME = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', telegram: 'Telegram', push: 'Push' };
function notify(clientId, text, silent = false) {
  const c = clientById(clientId);
  if (!c) return;
  const ch = Object.entries(c.channels || { email: true, telegram: true }).filter(([, v]) => v).map(([k]) => k);
  DB.notifications.unshift({ id: 'N' + Date.now() + Math.random().toString(36).slice(2, 5), clientId, text, date: new Date().toISOString(), read: false, channels: ch });
  if (!silent) setTimeout(() => toast(`${ic('bell-ring')} Уведомление ${esc(c.name.split(' ')[0])} (${ch.map(x => CHANNEL_NAME[x]).join(', ') || 'в кабинете'}): ${esc(text)}`, 'info'), 350);
  if (ch.includes('push') && clientId === DB.session.clientId && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification('QazBox', { body: text, icon: 'icons/icon.svg' }); } catch {}
  }
}
function addTx(clientId, type, amount, note, method) {
  const c = clientById(clientId);
  c.balance = Math.round((c.balance + amount) * 100) / 100;
  DB.transactions.unshift({ id: nextId('TX-', 'tx'), clientId, type, amount: Math.round(amount * 100) / 100, date: new Date().toISOString(), note, method });
}

/* ---------- Бизнес-расчёты ---------- */
function calcShipping(countryCode, weight, dims, levelId = 'base') {
  const c = countryBy(countryCode);
  if (!c) return null;
  const vol = dims && dims.l && dims.w && dims.h ? (dims.l * dims.w * dims.h) / DB.settings.volumetricDivider : 0;
  // к оплате — больший из весов, округлённый вверх до 100 г
  const chargeable = Math.ceil(Math.max(+weight || 0, vol) * 10 - 1e-9) / 10;
  const perKg = c.perKg[levelId] ?? c.perKg.base;
  const cost = Math.round(Math.max(c.minCharge, chargeable * perKg) * 100) / 100;
  return { vol: Math.round(vol * 100) / 100, chargeable, perKg, cost, min: c.minCharge, transit: c.transit };
}
function parcelCost(p) {
  if (p.cost != null && p.paid) return p.cost;
  if (!p.weight) return null;
  return calcShipping(p.country, p.weight, p.dims, clientById(p.clientId)?.level).cost;
}
function deliveryExtra(p) {
  if (p.delivery?.method !== 'courier') return 0;
  return (parcelCost(p) || 0) >= DB.settings.freeCourierFrom ? 0 : DB.settings.courierPrice;
}
function levelForKg(kgTotal) { return [...DB.levels].reverse().find(l => kgTotal >= l.fromKg) || DB.levels[0]; }
function setParcelStatus(p, status, note = '') {
  p.status = status;
  p.history.unshift({ status, date: new Date().toISOString(), note });
}
function storageDays(p) {
  const rec = p.history.find(h => h.status === 'received' || h.status === 'unidentified');
  return rec ? daysSince(rec.date) : 0;
}

/* ---------- Транслитерация (для сопоставления имён с этикетки) ---------- */
const TR = { а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'kh', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', і: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const translit = s => String(s).toLowerCase().split('').map(ch => TR[ch] ?? ch).join('').toUpperCase();

/* ---------- Сгенерированные «фото со склада» ---------- */
const _photoCache = {};
function boxPhoto(p, n = 1) {
  const key = p.id + n;
  if (_photoCache[key]) return _photoCache[key];
  const hue = [28, 32, 25, 35][n % 4];
  const label = esc(p.track.slice(-10));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs>
<rect width="320" height="240" fill="url(#bg)"/><rect y="190" width="320" height="50" fill="#64748b"/>
<g transform="translate(${n === 2 ? 70 : 60} ${n === 2 ? 50 : 40})">
<polygon points="0,40 100,10 200,40 100,70" fill="hsl(${hue} 52% 70%)"/>
<polygon points="0,40 100,70 100,170 0,140" fill="hsl(${hue} 45% 55%)"/>
<polygon points="200,40 100,70 100,170 200,140" fill="hsl(${hue} 48% 62%)"/>
<rect x="88" y="56" width="24" height="16" fill="#c9a96b" transform="skewY(-16)"/>
${n === 2 ? `<g transform="translate(112 92) skewY(-16)"><rect width="74" height="44" fill="#fff"/><rect x="6" y="6" width="50" height="4" fill="#111"/><rect x="6" y="14" width="40" height="3" fill="#555"/><g fill="#111">${Array.from({ length: 16 }, (_, i) => `<rect x="${6 + i * 4}" y="24" width="${i % 3 ? 1.5 : 2.5}" height="14"/>`).join('')}</g></g>`
    : `<g transform="translate(14 78) skewY(16)"><rect width="74" height="40" fill="#fff"/><text x="5" y="14" font-size="8" font-family="monospace" fill="#111">${label}</text><text x="5" y="27" font-size="7" font-family="monospace" fill="#444">${esc(p.clientId || '???')}</text></g>`}
</g>
<text x="10" y="230" font-size="11" font-family="monospace" fill="#fff">${esc(p.id)} · ${esc(p.cell || '')} · ${p.weight ? p.weight + ' kg' : ''}</text></svg>`;
  return (_photoCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}
const photoSrc = (p, ph, i) => (String(ph).startsWith('gen:') ? boxPhoto(p, +ph.slice(4) || i + 1) : ph);
const photosHtml = p => p.photos?.length ? `<div class="photos">${p.photos.map((ph, i) => `<img src="${photoSrc(p, ph, i)}" data-action="zoom" alt="Фото посылки">`).join('')}</div>` : '<div class="muted small">Фото появятся после приёмки на складе</div>';
const thumb = p => p.photos?.length ? `<img class="thumb" src="${photoSrc(p, p.photos[0], 0)}" alt="">` : `<div class="thumb">${STATUS[p.status]?.icon || ic('package')}</div>`;

/* Сжатие загружаемых фото, чтобы влезали в localStorage */
function readImage(file, max = 720) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = img.width * k; cv.height = img.height * k;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = rej; img.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}

/* ---------- Общие куски разметки ---------- */
function stepper(p) {
  const idx = CLIENT_FLOW.indexOf(p.status === 'courier' ? 'issue' : p.status);
  const labels = { expected: 'Ожидается', received: 'На складе', ready: 'Оплачена', in_batch: 'В партии', transit: 'В пути', kz: 'В Казахстане', issue: p.delivery?.method === 'courier' ? 'У курьера' : 'К выдаче', delivered: 'Получена' };
  return `<div class="stepper">${CLIENT_FLOW.map((s, i) => `<div class="st ${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}"><span class="dot">${i <= idx ? ic('check') : ''}</span>${labels[s]}</div>`).join('')}</div>`;
}
function timelineHtml(p) {
  return `<ul class="timeline">${p.history.map(h => `<li><b>${esc(STATUS[h.status]?.label || h.status)}</b>${h.note ? ` <span class="muted">— ${esc(h.note)}</span>` : ''}<div class="when">${fdt(h.date)}</div></li>`).join('')}</ul>`;
}
const empty = (text, ico = ic('inbox')) => `<div class="empty"><div class="ico">${ico}</div>${text}</div>`;
const countryOptions = (sel, onlyActive = true, withAll = false) => (withAll ? `<option value="">${t('all_countries')}</option>` : '') +
  DB.countries.filter(c => !onlyActive || c.active).map(c => `<option value="${c.code}" ${c.code === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
function clientChip(id) {
  const c = clientById(id);
  if (!c) return '<span class="badge red">Не определён</span>';
  return `<span class="row nowrap" style="gap:8px">${avatar(c.name, 28)}<span><b>${esc(c.name)}</b><br><span class="muted small mono">${c.id}</span></span></span>`;
}
function pageHead(title, crumbs = '', actions = '') {
  return `<div class="topbar"><div>${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1></div><div class="sp"></div>${actions}</div>`;
}
function cabinetLayout({ area, brandSub, nav, current, content, userCard = '', mobileNav = null, mobileRight = '' }) {
  const navHtml = nav.map(n => n.group ? `<div class="nav-group">${n.group}</div>` :
    `<a class="nav ${n.key === current ? 'active' : ''}" href="#/${area}/${n.key}"><span class="ico">${n.icon}</span>${n.label}${n.count ? `<span class="cnt">${n.count}</span>` : ''}</a>`).join('');
  const mob = (mobileNav || nav.filter(n => !n.group).slice(0, 5));
  return `<div class="mobile-head"><a class="brand" href="#/${area}"><span class="logo">Q</span>QazBox</a>${mobileRight}</div>
  <div class="app"><aside class="sidebar"><a class="brand" href="#/"><span class="logo">Q</span><span>QazBox<small>${brandSub}</small></span></a>${navHtml}${userCard}</aside>
  <main class="main">${content}</main></div>
  <nav class="bottom-nav">${mob.map(n => `<a href="#/${area}/${n.key}" class="${n.key === current ? 'active' : ''}"><span class="ico">${n.icon}</span>${n.short || n.label}</a>`).join('')}</nav>`;
}
