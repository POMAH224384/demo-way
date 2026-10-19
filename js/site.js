/* Публичный сайт: лендинг с тарифами, каталог магазинов, помощь, трекинг, регистрация */
const Site = {};

const FAQ = [
  ['Как получить адрес склада?', 'Зарегистрируйтесь — система сразу выдаст персональный ID-код (например, WY-10427) и адреса складов во всех странах. ID обязательно указывайте в строке Address 2 — по нему склад определяет владельца.'],
  ['Что делать, если я забыл указать ID?', 'Ничего страшного: склад распознаёт этикетку по фото и найдёт вас по имени получателя. Если не получится — посылка попадёт в «нераспознанные», и вы сможете заявить её, указав трек-номер.'],
  ['Как считается стоимость доставки?', 'По большему из фактического и объёмного веса (Д×Ш×В/5000), по тарифу страны и вашему уровню лояльности. Минимальная стоимость зависит от страны.'],
  ['Сколько посылка хранится на складе бесплатно?', '30 дней (45 для уровня Gold и выше). Далее — $0.30 в день.'],
  ['Как оплатить?', 'Пополните кошелёк через Kaspi Pay или банковской картой, затем оплатите доставку в кабинете в один клик.'],
  ['Можно ли объединить посылки?', 'Да, выберите несколько посылок на складе одной страны и закажите консолидацию — это экономит до 40% стоимости.'],
  ['Как работает «Купи вместо меня»?', 'Пришлите ссылки на товары, менеджер проверит наличие и выставит счёт (стоимость + комиссия 5%, мин. $3). После оплаты мы выкупим заказ и он придёт на ваш адрес склада.'],
  ['Где получить посылку?', 'В пунктах выдачи и постаматах в Алматы, Астане, Шымкенте, Караганде и Актобе или курьером до двери (бесплатно при доставке от $50).'],
];
const PROHIBITED = [
  [ic('crosshair'), 'Оружие, боеприпасы и их части'], [ic('pill'), 'Наркотические и психотропные вещества, рецептурные препараты'], [ic('battery-warning'), 'Отдельные литиевые батареи и пауэрбанки'],
  [ic('flask-conical'), 'Легковоспламеняющиеся, взрывчатые и ядовитые вещества'], [ic('wind'), 'Аэрозоли, баллончики под давлением'], [ic('beef'), 'Скоропортящиеся продукты, мясо, молочная продукция'],
  [ic('banknote'), 'Наличные деньги, ценные бумаги, драгоценные металлы'], [ic('sprout'), 'Семена, растения, животные'], [ic('cigarette'), 'Табак и электронные сигареты, жидкости'],
];
const TUTORIALS = [
  [ic('shopping-cart'), 'Как заказать на Amazon', 'Пошагово: регистрация, адрес склада, оплата картой, отслеживание.'],
  [ic('shopping-basket'), 'Покупки на Taobao и 1688', 'Как работать с китайскими площадками через «Купи вместо меня».'],
  [ic('combine'), 'Консолидация посылок', 'Когда выгодно объединять и как заказать услугу в кабинете.'],
  [ic('smartphone'), 'Установка приложения', 'Как установить PWA на iPhone и Android за 10 секунд.'],
  [ic('file-text'), 'Таможенные лимиты', 'Беспошлинный лимит, декларирование и как не переплатить.'],
  [ic('credit-card'), 'Оплата через Kaspi', 'Пополнение кошелька и оплата доставки через Kaspi Pay.'],
];

function siteHeader(active) {
  const logged = !!clientById(DB.session.clientId);
  return `<header class="site-header"><div class="container">
    <a class="brand" href="#/"><span class="logo">W</span>Way</a>
    <nav class="site-nav" id="site-nav">
      <a href="#/" data-action="scroll-tariffs" class="${active === 'home' ? 'active' : ''}">${t('nav_tariffs')}</a>
      <a href="#/stores" class="${active === 'stores' ? 'active' : ''}">${t('nav_stores')}</a>
      <a href="#/track" class="${active === 'track' ? 'active' : ''}">${t('nav_track')}</a>
      <a href="#/help" class="${active === 'help' ? 'active' : ''}">${t('nav_help')}</a>
    </nav>
    <div class="sp" style="flex:1"></div>
    ${langSwitch()}
    ${logged ? `<a class="btn hide-m" href="#/client">${t('nav_cabinet')}</a>` : `<button class="btn hide-m" data-action="auth">${t('nav_login')}</button>`}
    <button class="btn secondary sm burger" data-action="burger">${ic('menu')}</button>
  </div></header>`;
}
A['burger'] = () => $('#site-nav')?.classList.toggle('open');
A['scroll-tariffs'] = (el, e) => {
  if (location.hash && location.hash !== '#/') { sessionStorage.setItem('qazbox-scroll', 'tariffs'); return; }
  e.preventDefault(); $('#tariffs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function siteFooter() {
  return `<footer class="site-footer"><div class="container">
    <div class="grid g4">
      <div><a class="brand" href="#/" style="color:#fff"><span class="logo">W</span>Way</a><p class="mt-s">${t('footer_about')}</p><p class="small">© 2026 Way · Демо-прототип</p></div>
      <div><h4>Сервис</h4><a href="#/" data-action="scroll-tariffs">Тарифы</a><a href="#/stores">Магазины</a><a href="#/track">Отслеживание</a><a href="#/client/buyout">Купи вместо меня</a><a href="b2b.html">Для бизнеса (B2B)</a></div>
      <div><h4>Помощь</h4><a href="#/help?tab=faq">FAQ</a><a href="#/help?tab=tutorials">Туториалы</a><a href="#/help?tab=prohibited">Запрещённые товары</a><a href="#/help?tab=terms">Условия сервиса</a></div>
      <div><h4>Контакты</h4><a>+7 727 355 00 00</a><a>hello@way.kz</a><a>Telegram: @WayDeliveryBot</a><a>WhatsApp: +7 701 000 00 00</a></div>
    </div></div></footer>`;
}

Site.home = () => {
  const countries = DB.countries.filter(c => c.active);
  const me = clientById(DB.session.clientId), us = countryBy('US');
  const cheapest = [...countries].sort((x, y) => x.perKg.base - y.perKg.base)[0]?.code;
  // переход «Тарифы» с другой страницы: прокручиваем после рендера
  try { if (sessionStorage.getItem('qazbox-scroll') === 'tariffs') { sessionStorage.removeItem('qazbox-scroll'); onMount(() => $('#tariffs')?.scrollIntoView({ block: 'start' })); } } catch {}
  return `${siteHeader('home')}
  <section class="hero"><div class="container hero-grid">
    <div>
      <span class="badge indigo mb">${flag('KZ')} Доставка в Казахстан с 2019 года</span>
      <h1>${t('hero_title')}</h1>
      <p class="lead">${t('hero_lead')}</p>
      <button class="btn lg accent hero-cta" data-action="auth">${t('hero_cta')} ${ic('arrow-right')}</button>
      <div class="bullets"><span>${t('hero_b1')}</span><span>${t('hero_b2')}</span><span>${t('hero_b3')}</span></div>
    </div>
    <div class="card addr-card" data-action="auth">
      <div class="row between"><b>${flag('US')} ${t('addr_title')}</b><span class="badge green">${ic('gift')} 0 ₸</span></div>
      <div class="addr-lines">
        <div><span>Full name</span><b>${esc(me?.latin || 'AIGERIM NURLANOVA')}</b></div>
        <div><span>Address 1</span><b>${esc(us.address.line1)}</b></div>
        <div class="hl"><span>Address 2</span><b>${esc(me?.id || 'WY-10427')}</b></div>
        <div><span>City / ZIP</span><b>${esc(us.address.city)}, DE ${esc(us.address.zip)}</b></div>
      </div>
      <p class="muted small" style="margin:0">${ic('info')} ${t('addr_note')}</p>
      <div class="addr-flags">${countries.filter(c => c.code !== 'US').map(c => flag(c.code)).join('')}<span class="muted small">${t('addr_more')}</span></div>
    </div>
  </div></section>

  <section class="section tariffs-section" id="tariffs"><div class="container">
    <div class="section-title"><h2>${t('tariffs_title')}</h2><p>${t('tariffs_sub')}</p></div>
    <div class="tariff-grid">${countries.map(c => `<div class="tariff-card ${c.code === cheapest ? 'best' : ''}">
      ${c.code === cheapest ? `<span class="tariff-ribbon">${ic('star')} ${t('t_best')}</span>` : ''}
      <div class="row nowrap tariff-country"><span class="flag-lg">${flag(c.code)}</span><div><b>${esc(c.name)}</b><div class="muted small">${ic('clock')} ${c.transit}</div></div></div>
      <div class="tariff-price"><span class="cur">$</span>${c.perKg.base}<span class="unit">${t('per_kg')}</span></div>
      <div class="muted small">≈ ${kzt(c.perKg.base)} · ${t('t_min')} $${c.minCharge}</div>
      <div class="tariff-levels"><div class="muted small mb-s">${t('t_levels')}</div>${DB.levels.slice(1).map(l => `<div class="row between small"><span><span class="dot-st" style="background:${l.color}"></span> ${l.name}</span><b>$${c.perKg[l.id]}</b></div>`).join('')}</div>
    </div>`).join('')}</div>
    <div class="tariff-info">
      <span>${ic('scale')} ${t('t_vol')}</span>
      <span>${ic('truck')} ${t('t_courier')} — $${DB.settings.courierPrice}, ${t('t_free')} $${DB.settings.freeCourierFrom}</span>
      <span>${ic('banknote')} ${t('t_rate')}: 1 USD = ${DB.settings.rates.KZT} ₸</span>
    </div>
    <div class="center mt"><button class="btn lg accent" data-action="auth">${t('t_cta')} ${ic('arrow-right')}</button></div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-title"><h2>${t('how_title')}</h2><p>${t('how_sub')}</p></div>
    <div class="grid g4">${[1, 2, 3, 4].map(i => `<div class="step"><div class="num">${i}</div><h3>${t('s' + i + 't')}</h3><p class="muted">${t('s' + i + 'd')}</p></div>`).join('')}</div>
  </div></section>

  <section class="section alt"><div class="container">
    <div class="section-title"><h2>${t('services_title')}</h2></div>
    <div class="grid g4">${[[ic('shopping-bag'), 1], [ic('combine'), 2], [ic('images'), 3], [ic('truck'), 4]].map(([ico, i]) => `<div class="card feature"><div class="ico">${ico}</div><h3>${t('sv' + i + 't')}</h3><p class="muted">${t('sv' + i + 'd')}</p></div>`).join('')}</div>
  </div></section>

  <section class="section"><div class="container">
    <div class="row between mb"><h2 style="margin:0">${t('stores_title')}</h2><a href="#/stores">${t('stores_all')}</a></div>
    <div class="grid g4">${DB.stores.slice(0, 8).map(storeCard).join('')}</div>
  </div></section>

  <section class="section"><div class="container"><div class="card" style="padding:32px;background:linear-gradient(135deg,#0b1020,#26306b);color:#fff;border:0">
    <div class="grid g2" style="align-items:center">
      <div><h2>${t('app_title')}</h2><p style="color:#cbd5e1">${t('app_sub')}</p>
        <div class="app-badges mt"><button class="btn accent" data-action="pwa-install">${ic('download')} ${t('app_install')}</button><a class="btn secondary" href="#/mobile">${ic('smartphone')} Посмотреть демо</a></div>
        <div class="app-badges mt"><button class="app-badge" data-action="soon"><span style="font-size:22px">${ic('apple')}</span><span>Скоро в<b>App Store</b></span></button><button class="app-badge" data-action="soon"><span style="font-size:20px">${ic('play')}</span><span>Скоро в<b>Google Play</b></span></button></div></div>
      <div class="center" style="font-size:150px;line-height:1;color:#8ea0ff">${ic('smartphone')}</div>
    </div></div></div></section>

  <section class="section alt"><div class="container" style="max-width:820px">
    <div class="section-title"><h2>${t('faq_title')}</h2></div>
    ${FAQ.slice(0, 5).map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><div>${esc(a)}</div></details>`).join('')}
    <p class="center mt"><a href="#/help">Все вопросы →</a></p>
  </div></section>
  ${siteFooter()}`;
};
A['soon'] = () => toast('Нативные приложения iOS/Android — этап 2 (React Native / Flutter). Сейчас доступна PWA.', 'info');

function storeCard(s) {
  return `<div class="card store-card">
    <div class="row nowrap"><div class="store-logo" style="background:${s.color};${s.color === '#ffe500' ? 'color:#111' : ''}">${esc(s.name[0])}</div>
      <div class="grow"><b>${esc(s.name)}</b><div class="muted small">${flag(s.country)} ${esc(countryBy(s.country)?.name || '')} · ${esc(s.category)}</div></div></div>
    ${s.special ? `<span class="badge orange" title="Магазин не принимает казахстанские карты или не отправляет на склад напрямую">${ic('shopping-bag')} Только через выкуп</span>` : '<span class="badge green">Можно заказать самому</span>'}
    <div class="row"><button class="btn secondary sm" data-action="store-open" data-name="${esc(s.name)}">Перейти ${ic('external-link')}</button><button class="btn ghost sm" data-action="store-buyout" data-id="${s.id}">Купить через нас</button></div>
  </div>`;
}
A['store-open'] = el => toast(`В боевой версии откроется сайт ${esc(el.dataset.name)} (с UTM-меткой партнёрки)`);
A['store-buyout'] = el => {
  const s = byId(DB.stores, el.dataset.id);
  if (!clientById(DB.session.clientId)) return A['auth']();
  location.hash = `#/client/buyout/new?country=${s.country}&url=${encodeURIComponent(s.url)}`;
};

Site.stores = () => {
  const cats = [...new Set(DB.stores.map(s => s.category))];
  onMount(CH['stores-filter']);
  return `${siteHeader('stores')}<div class="container" style="padding-top:32px;padding-bottom:60px">
    <h1>${t('stores_page')}</h1><p class="muted">Проверенные магазины, которые отправляют на наши склады. Отметка «Только через выкуп» — оформим заказ за вас.</p>
    <div class="card mb"><div class="grid g3">
      <input id="st-q" placeholder="${t('search')}: Amazon, Zara..." data-input="stores-filter">
      <select id="st-country" data-input="stores-filter">${countryOptions('', true, true)}</select>
      <select id="st-cat" data-input="stores-filter"><option value="">${t('all_categories')}</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>
    </div><label class="check mt-s"><input type="checkbox" id="st-special" data-input="stores-filter"> Только магазины для выкупа</label></div>
    <div class="grid g4" id="stores-grid"></div>
  </div>${siteFooter()}`;
};
CH['stores-filter'] = () => {
  const q = $('#st-q').value.trim().toLowerCase(), c = $('#st-country').value, cat = $('#st-cat').value, sp = $('#st-special').checked;
  const list = DB.stores.filter(s => countryBy(s.country)?.active && (!q || s.name.toLowerCase().includes(q)) && (!c || s.country === c) && (!cat || s.category === cat) && (!sp || s.special));
  $('#stores-grid').innerHTML = list.map(storeCard).join('') || `<div style="grid-column:1/-1">${empty('Ничего не найдено. Нет нужного магазина? Оформите <a href="#/client/buyout/new">выкуп по ссылке</a>.', ic('search'))}</div>`;
};

Site.help = (q) => {
  const tab = q.get('tab') || 'faq';
  const tabs = { faq: 'FAQ', tutorials: 'Туториалы', prohibited: 'Запрещённые товары', terms: 'Условия сервиса' };
  let body = '';
  if (tab === 'faq') body = FAQ.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><div>${esc(a)}</div></details>`).join('');
  if (tab === 'tutorials') body = `<div class="grid g3">${TUTORIALS.map(([i, h, d]) => `<div class="card"><div class="icon-tile">${i}</div><h3 class="mt">${h}</h3><p class="muted">${d}</p><button class="btn ghost sm" data-action="soon-video">${ic('play')} Смотреть (3 мин)</button></div>`).join('')}</div>`;
  if (tab === 'prohibited') body = `<div class="notice warn mb">${ic('triangle-alert')} Посылки с запрещёнными товарами задерживаются на складе и возвращаются отправителю за счёт клиента.</div><div class="grid g3">${PROHIBITED.map(([i, h]) => `<div class="card flat row nowrap"><span class="icon-tile" style="background:var(--red-50);color:var(--red)">${i}</span><span>${h}</span></div>`).join('')}</div>`;
  if (tab === 'terms') body = `<div class="card" style="max-width:820px"><h3>Условия сервиса (выдержка)</h3><ol class="muted" style="padding-left:18px">
    <li>Компания предоставляет адрес склада для приёма посылок клиента и организует их доставку в Республику Казахстан.</li>
    <li>Стоимость рассчитывается по большему из фактического и объёмного веса по действующим тарифам.</li>
    <li>Бесплатное хранение — ${DB.settings.storageFreeDays} дней, далее $${DB.settings.storageFeePerDay}/день. Через 90 дней посылка может быть утилизирована.</li>
    <li>Клиент обязан достоверно декларировать содержимое посылок.</li>
    <li>Комиссия за выкуп — ${DB.settings.buyoutCommission}% от стоимости заказа, минимум $${DB.settings.minBuyoutCommission}.</li>
    <li>Персональные данные обрабатываются в соответствии с Законом РК «О персональных данных и их защите».</li></ol></div>`;
  return `${siteHeader('help')}<div class="container" style="padding-top:32px;padding-bottom:60px">
    <h1>${t('help_title')}</h1>
    <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<a href="#/help?tab=${k}" class="${tab === k ? 'active' : ''}">${v}</a>`).join('')}</div>
    ${body}</div>${siteFooter()}`;
};
A['soon-video'] = () => toast('Здесь будет встроенное видео-руководство');

Site.track = (q) => {
  const v = (q.get('q') || '').trim();
  let res = '';
  if (v) {
    const p = DB.parcels.find(x => x.track.toLowerCase() === v.toLowerCase() || x.id.toLowerCase() === v.toLowerCase());
    res = p ? `<div class="card mt"><div class="row between"><div><div class="muted small">Трек ${esc(p.track)}</div><h3>${flag(p.country)} ${esc(p.store)} · ${p.id}</h3></div>${badge(p.status)}</div>${stepper(p)}<hr>${timelineHtml(p)}</div>`
      : `<div class="notice warn mt">Посылка не найдена. Если вы ещё не добавили её в кабинете — сделайте это, и мы свяжем её с вашим аккаунтом при поступлении на склад.</div>`;
  }
  const samples = ['LX123456789DE', 'YT2345678901234567', '1Z999AA10198765432'];
  return `${siteHeader('track')}<div class="container" style="padding-top:40px;padding-bottom:60px;max-width:760px">
    <h1>${t('track_title')}</h1>
    <form class="row nowrap" data-form="track"><input name="q" class="big" placeholder="${t('track_ph')}" value="${esc(v)}"><button class="btn lg">${t('track_btn')}</button></form>
    <div class="muted small mt-s">Попробуйте: ${samples.map(s => `<a href="#/track?q=${s}">${s}</a>`).join(', ')}</div>
    ${res}</div>${siteFooter()}`;
};
F['track'] = d => { location.hash = '#/track?q=' + encodeURIComponent(d.q.trim()); };

/* ---------- Регистрация / вход ---------- */
A['auth'] = (el) => {
  if (clientById(DB.session.clientId) && !el?.dataset?.force) { location.hash = '#/client'; return; }
  authModal('register');
};
function authModal(mode, method = 'email') {
  const ref = new URLSearchParams(location.hash.split('?')[1] || '').get('ref') || '';
  const tabs = `<div class="tabs"><button data-action="auth-mode" data-mode="register" class="${mode === 'register' ? 'active' : ''}">Регистрация</button><button data-action="auth-mode" data-mode="login" class="${mode === 'login' ? 'active' : ''}">Вход</button></div>`;
  const methods = `<div class="chips mb">${[['email', `${ic('mail')} Email`], ['phone', `${ic('smartphone')} Телефон`]].map(([k, v]) => `<button type="button" class="chip ${method === k ? 'active' : ''}" data-action="auth-method" data-mode="${mode}" data-method="${k}">${v}</button>`).join('')}</div>`;
  const google = `<button type="button" class="btn secondary block" data-action="auth-google"><b style="color:#4285f4">G</b> Продолжить с Google</button><div class="center muted small" style="margin:12px 0">или</div>`;
  let body;
  if (mode === 'register') {
    body = `${tabs}${google}${methods}<form data-form="register">
      <input type="hidden" name="method" value="${method}">
      <label class="field"><span>Имя и фамилия</span><input name="name" required placeholder="Айжан Бекова" data-input="translit"></label>
      <label class="field"><span>Имя латиницей (как на посылках)</span><input name="latin" id="reg-latin" required placeholder="AIZHAN BEKOVA"></label>
      ${method === 'email' ? `<label class="field"><span>Email</span><input name="email" type="email" required placeholder="you@mail.kz"></label><label class="field"><span>Пароль</span><input name="password" type="password" required minlength="6" placeholder="Минимум 6 символов"></label>`
        : `<label class="field"><span>Телефон</span><input name="phone" required placeholder="+7 7__ ___ __ __" value="+7 "></label>`}
      <label class="field"><span>Промокод друга (необязательно)</span><input name="ref" value="${esc(ref)}" placeholder="WY-10427"></label>
      <label class="check small"><input type="checkbox" required checked> Принимаю <a href="#/help?tab=terms" target="_blank">условия сервиса</a> и политику конфиденциальности</label>
      <button class="btn block lg mt">Зарегистрироваться</button></form>`;
  } else {
    body = `${tabs}${google}${methods}<form data-form="login"><input type="hidden" name="method" value="${method}">
      ${method === 'email' ? `<label class="field"><span>Email</span><input name="email" type="email" required value="aigerim@example.kz"></label><label class="field"><span>Пароль</span><input name="password" type="password" value="demo123"></label>`
        : `<label class="field"><span>Телефон</span><input name="phone" required value="+7 701 555 12 34"></label>`}
      <button class="btn block lg">Войти</button></form>
      <p class="muted small mt">Демо: любой пароль подходит. Попробуйте также dinara.a@example.kz</p>`;
  }
  openModal(mode === 'register' ? 'Создать аккаунт' : 'Вход в кабинет', body);
}
A['auth-mode'] = el => authModal(el.dataset.mode);
A['auth-method'] = el => authModal(el.dataset.mode, el.dataset.method);
CH['translit'] = el => { const l = $('#reg-latin'); if (l && !l.dataset.touched) l.value = translit(el.value); };
document.addEventListener('input', e => { if (e.target.id === 'reg-latin') e.target.dataset.touched = '1'; });

function createClient({ name, latin, email, phone, ref, via }) {
  const id = 'WY-' + (++DB.seq.client);
  const c = { id, name, latin: (latin || translit(name)).toUpperCase(), email: email || '', phone: phone || '', city: 'Алматы', level: 'base', shippedKg: 0, balance: 0, bonus: 0, referrer: null, createdAt: new Date().toISOString(), via, channels: { email: !!email, sms: !!phone, whatsapp: false, telegram: false, push: false } };
  const r = ref && clientById(ref.trim().toUpperCase());
  DB.clients.unshift(c);
  if (r) {
    c.referrer = r.id;
    addTx(id, 'bonus', DB.settings.referralBonus, `Приветственный бонус по приглашению ${r.id}`);
    addTx(r.id, 'bonus', DB.settings.referralBonus, `Реферальный бонус: ${name}`);
    notify(r.id, `Ваш друг ${name} зарегистрировался — начислено $${DB.settings.referralBonus}`, true);
  }
  DB.session.clientId = id;
  logAction('client', `Регистрация клиента ${id} (${via})`);
  notify(id, `Добро пожаловать в Way! Ваш персональный код: ${id}`, true);
  Store.save();
  closeModal();
  location.hash = '#/client/welcome';
  toast(`${ic('party-popper')} Аккаунт создан. Ваш ID: <b>${id}</b>`, 'ok');
}
F['register'] = d => {
  if (d.method === 'phone') {
    openModal('Подтверждение телефона', `<p>Мы отправили SMS с кодом на <b>${esc(d.phone)}</b></p><form data-form="sms-code"><input type="hidden" name="payload" value="${esc(JSON.stringify(d))}"><input name="code" class="big center" maxlength="4" placeholder="••••" required><p class="muted small mt-s">Демо-код: <b>1234</b></p><button class="btn block lg mt">Подтвердить</button></form>`);
    return;
  }
  if (DB.clients.some(c => c.email && c.email === d.email)) return toast('Этот email уже зарегистрирован — войдите', 'err');
  createClient({ ...d, via: 'email' });
};
F['sms-code'] = d => { if (d.code !== '1234') return toast('Неверный код (демо: 1234)', 'err'); createClient({ ...JSON.parse(d.payload), via: 'phone' }); };
A['auth-google'] = () => openModal('Выберите аккаунт Google', `<div class="pill-select">
  <label data-action="google-pick" data-email="aigerim@example.kz"><span>${avatar('Айгерим Нурланова')}</span><span><b>Айгерим Нурланова</b><br><span class="muted small">aigerim@example.kz · уже клиент</span></span></label>
  <label data-action="google-pick" data-email="new.user@gmail.com" data-name="Нурсултан Абенов"><span>${avatar('Нурсултан Абенов')}</span><span><b>Нурсултан Абенов</b><br><span class="muted small">new.user@gmail.com · новый</span></span></label></div>
  <p class="muted small mt">Демо OAuth: в боевой версии — Google Identity Services.</p>`);
A['google-pick'] = el => {
  const ex = DB.clients.find(c => c.email === el.dataset.email);
  if (ex) { DB.session.clientId = ex.id; Store.save(); closeModal(); location.hash = '#/client'; toast('Вход выполнен через Google', 'ok'); return; }
  createClient({ name: el.dataset.name, email: el.dataset.email, via: 'google' });
};
F['login'] = d => {
  const c = DB.clients.find(x => d.method === 'email' ? x.email === d.email.trim() : x.phone.replace(/\D/g, '') === d.phone.replace(/\D/g, ''));
  if (!c) return toast('Пользователь не найден', 'err');
  DB.session.clientId = c.id; Store.save(); closeModal(); location.hash = '#/client'; toast('С возвращением, ' + esc(c.name.split(' ')[0]) + '!', 'ok');
};

/* ---------- Cookie, аналитика, PWA ---------- */
function cookieBanner() {
  let v; try { v = localStorage.getItem('qazbox-cookie'); } catch {}
  if (v) return '';
  return `<div class="cookie" id="cookie"><p>${ic('cookie')} ${t('cookie_text')}</p><div class="row"><button class="btn sm" data-action="cookie" data-v="all">${t('cookie_all')}</button><button class="btn secondary sm" data-action="cookie" data-v="necessary">${t('cookie_need')}</button></div></div>`;
}
A['cookie'] = el => { try { localStorage.setItem('qazbox-cookie', el.dataset.v); } catch {} $('#cookie')?.remove(); if (el.dataset.v === 'all') loadAnalytics(); };
function loadAnalytics() {
  // В боевой версии здесь подключаются gtag.js (GA4) и fbq (Meta Pixel) — только после согласия.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); console.debug('[GA4 stub]', ...arguments); };
  window.fbq = window.fbq || function () { console.debug('[Meta Pixel stub]', ...arguments); };
  gtag('config', DB.integrations.ga.id); fbq('track', 'PageView');
}
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
A['pwa-install'] = async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; return; }
  openModal('Установка приложения', `<p><b>iPhone (Safari):</b> нажмите «Поделиться» → «На экран Домой».</p><p><b>Android (Chrome):</b> меню ⋮ → «Установить приложение».</p><p class="muted small">PWA работает офлайн, присылает push-уведомления и открывается как обычное приложение.</p>`);
};
