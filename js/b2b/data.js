/* B2B-направление: данные, роли и права, статусы заявок. Отдельное хранилище от B2C-демо. */
const B2B_KEY = 'qazbox-b2b';
const B2B_VERSION = 2;
const B2B_DAY = 864e5;
const bIso = (daysAgo, h = 11) => { const d = new Date(Date.now() - daysAgo * B2B_DAY); d.setHours(h, Math.abs(Math.round(daysAgo * 41)) % 60, 0, 0); return d.toISOString(); };

/* ---------- Роли и права (по образцу permissions.ts из demoWay) ---------- */
const B2B_PERMS = ['admin:access', 'dashboard:view', 'leads:all', 'leads:own', 'leads:manage', 'leads:assign', 'clients:view', 'content:manage', 'settings:manage', 'users:manage', 'audit:view'];
const B2B_ROLE_PERMS = {
  SUPER_ADMIN: B2B_PERMS,
  CONTENT_MANAGER: ['admin:access', 'content:manage', 'settings:manage'],
  SALES_HEAD: ['admin:access', 'dashboard:view', 'leads:all', 'leads:manage', 'leads:assign', 'clients:view', 'audit:view'],
  SALES_MANAGER: ['admin:access', 'dashboard:view', 'leads:own', 'leads:manage', 'clients:view'],
  CLIENT: [],
};
const B2B_ROLE_LABELS = { SUPER_ADMIN: 'Супер-администратор', CONTENT_MANAGER: 'Контент-менеджер', SALES_HEAD: 'Руководитель продаж', SALES_MANAGER: 'Менеджер по продажам', CLIENT: 'Клиент' };
const B2B_PERM_LABELS = {
  'admin:access': 'Вход в админку', 'dashboard:view': 'Дашборд продаж', 'leads:all': 'Все заявки', 'leads:own': 'Свои и свободные заявки', 'leads:manage': 'Работа с заявками, КП',
  'leads:assign': 'Назначение менеджеров', 'clients:view': 'Клиенты', 'content:manage': 'Страницы сайта (CMS)', 'settings:manage': 'Настройки сайта', 'users:manage': 'Пользователи и роли', 'audit:view': 'Журнал действий',
};
const STAFF_ROLES = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SALES_HEAD', 'SALES_MANAGER'];
const can = (user, perm) => !!user && (B2B_ROLE_PERMS[user.role] || []).includes(perm);
const homeForRole = role => role === 'CLIENT' ? '#/cabinet' : role === 'CONTENT_MANAGER' ? '#/admin/pages' : role === 'SALES_MANAGER' ? '#/admin/leads' : '#/admin/dashboard';

/* ---------- Статусы заявки и допустимые переходы ---------- */
const LEAD_STATUS = {
  new:       { label: 'Новая', color: 'blue', client: 'Заявка получена. Менеджер свяжется с вами в течение 30 минут в рабочее время.' },
  in_work:   { label: 'В работе', color: 'purple', client: 'Менеджер изучает задачу и готовит коммерческое предложение.' },
  quoted:    { label: 'КП отправлено', color: 'orange', client: 'Коммерческое предложение готово — примите его или запросите пересчёт.' },
  accepted:  { label: 'КП согласовано', color: 'teal', client: 'Вы согласовали предложение. Готовим договор.' },
  contract:  { label: 'Договор подписан', color: 'indigo', client: 'Договор подписан, планируем отгрузку.' },
  shipping:  { label: 'В перевозке', color: 'orange', client: 'Груз в пути. Менеджер сообщает о каждом этапе.' },
  done:      { label: 'Завершена', color: 'green', client: 'Груз доставлен. Спасибо за работу!' },
  rejected:  { label: 'Отклонена', color: 'red', client: 'К сожалению, мы не сможем выполнить эту заявку.' },
  cancelled: { label: 'Отменена клиентом', color: 'red', client: 'Вы отменили заявку.' },
};
const LEAD_FLOW = ['new', 'in_work', 'quoted', 'accepted', 'contract', 'shipping', 'done'];
// Переходы, доступные сотрудникам. «accepted» ставит клиент, приняв КП; «quoted» — отправка КП.
const LEAD_TRANSITIONS = {
  new: ['in_work', 'rejected'],
  in_work: ['rejected'],
  quoted: ['in_work', 'rejected'],
  accepted: ['contract', 'in_work'],
  contract: ['shipping'],
  shipping: ['done'],
  done: [], rejected: [], cancelled: [],
};
const CLIENT_CAN_CANCEL = ['new', 'in_work', 'quoted'];

const B2B_SERVICES = [
  { id: 'cargo-cn', name: 'Карго из Китая (авто / ж/д)', icon: 'truck' },
  { id: 'air', name: 'Авиадоставка', icon: 'plane' },
  { id: 'ftl', name: 'Сборные и полные грузы из Турции и ЕС', icon: 'container' },
  { id: 'customs', name: 'Таможенное оформление', icon: 'file-check' },
  { id: 'buyout', name: 'Выкуп и проверка поставщиков', icon: 'shield-check' },
  { id: 'fulfillment', name: 'Фулфилмент для маркетплейсов', icon: 'warehouse' },
];
const serviceName = id => B2B_SERVICES.find(s => s.id === id)?.name || id;
const FREQUENCIES = ['Разовая поставка', 'Ежемесячно', 'Еженедельно', 'Пока изучаем'];

/* ---------- Блоки CMS по умолчанию ---------- */
function defaultHomeBlocks() {
  return [
    { id: 'b1', type: 'hero', hidden: false, data: { eyebrow: 'Way Business · логистика для компаний', title: 'Доставим грузы вашего бизнеса из Китая, Турции и Европы', subtitle: 'Сборные и полные грузы, авиа, таможенное оформление «под ключ» и фулфилмент для Kaspi, Wildberries и Ozon. Один менеджер — от поставщика до вашего склада.', ctaLabel: 'Оставить заявку', badges: ['Расчёт за 2 часа', 'Договор с НДС', 'Страхование груза'] } },
    { id: 'b2', type: 'stats', hidden: false, data: { title: 'Way Business в цифрах', items: [{ value: '1 200+', label: 'компаний-клиентов' }, { value: '18 000 т', label: 'грузов в год' }, { value: '12 дней', label: 'средний срок из Китая' }, { value: '99,6%', label: 'грузов без претензий' }] } },
    { id: 'b3', type: 'services', hidden: false, data: { eyebrow: 'Услуги', title: 'Закрываем всю цепочку поставки', subtitle: 'Берём на себя то, что отвлекает от продаж.', items: [
      { icon: 'truck', title: 'Карго из Китая', text: 'Авто и ж/д через Хоргос и Достык. Консолидация на складах в Гуанчжоу и Иу.' },
      { icon: 'plane', title: 'Авиадоставка', text: 'Срочные грузы от 3 дней. Регулярные рейсы из Урумчи, Стамбула, Франкфурта.' },
      { icon: 'container', title: 'Сборные и FTL-грузы', text: 'Из Турции и ЕС — от паллеты до полной фуры, с отслеживанием.' },
      { icon: 'file-check', title: 'Таможня «под ключ»', text: 'Декларирование, сертификаты, коды ТН ВЭД. Белая схема, документы для бухгалтерии.' },
      { icon: 'shield-check', title: 'Выкуп и проверка', text: 'Проверим поставщика, выкупим товар, проконтролируем качество до отгрузки.' },
      { icon: 'warehouse', title: 'Фулфилмент', text: 'Приёмка, маркировка и отгрузка на склады маркетплейсов в Алматы и Астане.' },
    ] } },
    { id: 'b4', type: 'steps', hidden: false, data: { eyebrow: 'Как мы работаем', title: 'От заявки до склада — 5 шагов', items: [
      { title: 'Заявка', text: 'Опишите груз — личный кабинет создаётся автоматически.' },
      { title: 'Расчёт и КП', text: 'Менеджер присылает коммерческое предложение в кабинет.' },
      { title: 'Договор', text: 'Согласуете КП в один клик, подписываем договор с ЭЦП.' },
      { title: 'Перевозка', text: 'Статусы и документы — в кабинете, без звонков.' },
      { title: 'Получение', text: 'Доставляем до вашего склада, закрывающие документы — сразу.' },
    ] } },
    { id: 'b5', type: 'cases', hidden: false, data: { eyebrow: 'Отзывы', title: 'Нам доверяют', items: [
      { quote: 'Перевели на Way весь импорт электроники из Шэньчжэня. Сроки стали предсказуемыми, а документы приходят вместе с грузом.', author: 'Гульнара Ибраева', company: 'ТОО «Астана Электроникс»' },
      { quote: 'Фулфилмент для Kaspi закрыл нам вопрос со складом: товар из Китая сразу едет на маркетплейс.', author: 'Руслан Тлеубаев', company: 'ТОО «Smart Home KZ»' },
    ] } },
    { id: 'b6', type: 'faq', hidden: false, data: { eyebrow: 'FAQ', title: 'Частые вопросы', items: [
      { q: 'Работаете ли вы с НДС?', a: 'Да, заключаем договор с ТОО, выставляем счета и ЭСФ, предоставляем закрывающие документы.' },
      { q: 'Какой минимальный объём груза?', a: 'Сборные грузы — от 50 кг или 0,3 м³. Для авиа ограничений нет.' },
      { q: 'Сколько стоит доставка?', a: 'Зависит от маршрута, веса, объёма и типа товара. Оставьте заявку — пришлём КП в течение 2 часов в рабочее время.' },
      { q: 'Как отслеживать груз?', a: 'В личном кабинете: статус, документы и переписка с менеджером по каждой заявке.' },
    ] } },
    { id: 'b7', type: 'lead', hidden: false, data: { title: 'Рассчитаем доставку вашего груза', subtitle: 'Заполните форму — мы создадим личный кабинет, где вы увидите статус заявки и коммерческое предложение.' } },
  ];
}
function defaultAboutBlocks() {
  return [
    { id: 'a1', type: 'hero', hidden: false, data: { eyebrow: 'О компании', title: 'Way Business — B2B-направление Way', subtitle: 'С 2019 года доставляем покупки частным клиентам, с 2022 — грузы для бизнеса. Собственные склады в Китае, Турции и Германии.', ctaLabel: 'Обсудить проект', badges: [] } },
    { id: 'a2', type: 'text', hidden: false, data: { title: 'Почему компании выбирают нас', content: 'Мы — казахстанская компания с собственной инфраструктурой за рубежом.\n\n## Прозрачность\nКаждая заявка, КП и документ — в личном кабинете. Вы всегда знаете, где груз.\n\n## Ответственность\n- Договор и страхование груза\n- Фиксированная стоимость в КП\n- Персональный менеджер' } },
    { id: 'a3', type: 'cta', hidden: false, data: { title: 'Готовы обсудить вашу логистику?', text: 'Оставьте заявку — менеджер свяжется в течение 30 минут.', ctaLabel: 'Оставить заявку' } },
  ];
}
function defaultContactsBlocks() {
  return [
    { id: 'k1', type: 'contacts', hidden: false, data: { title: 'Контакты', subtitle: 'Офис и склад в Алматы. Работаем по всему Казахстану.' } },
    { id: 'k2', type: 'lead', hidden: false, data: { title: 'Напишите нам', subtitle: 'Ответим в течение 30 минут в рабочее время.' } },
  ];
}

/* ---------- Сид ---------- */
function b2bSeed() {
  const users = [
    { id: 'U1', role: 'SUPER_ADMIN', name: 'Арман Сейтказы', email: 'admin@way.biz', phone: '+7 701 100 00 01', active: true, createdAt: bIso(400) },
    { id: 'U2', role: 'CONTENT_MANAGER', name: 'Мадина Касымова', email: 'content@way.biz', phone: '+7 701 100 00 02', active: true, createdAt: bIso(300) },
    { id: 'U3', role: 'SALES_HEAD', name: 'Ерболат Нуржанов', email: 'head@way.biz', phone: '+7 701 100 00 03', active: true, createdAt: bIso(380) },
    { id: 'U4', role: 'SALES_MANAGER', name: 'Алия Нурланова', email: 'aliya@way.biz', phone: '+7 701 100 00 04', active: true, createdAt: bIso(200) },
    { id: 'U5', role: 'SALES_MANAGER', name: 'Дамир Ахметов', email: 'damir@way.biz', phone: '+7 701 100 00 05', active: true, createdAt: bIso(150) },
    { id: 'U10', role: 'CLIENT', name: 'Гульнара Ибраева', email: 'procurement@astel.kz', phone: '+7 701 555 20 10', companyId: 'C1', position: 'Руководитель закупок', active: true, createdAt: bIso(120), password: 'Demo-2026' },
    { id: 'U11', role: 'CLIENT', name: 'Нурсултан Жаксыбеков', email: 'nj@nstextile.kz', phone: '+7 702 444 11 22', companyId: 'C2', position: 'Директор', active: true, createdAt: bIso(60), password: 'Demo-2026' },
    { id: 'U12', role: 'CLIENT', name: 'Сергей Ким', email: 'logistics@kazagroparts.kz', phone: '+7 705 300 40 50', companyId: 'C3', position: 'Логист', active: true, createdAt: bIso(45), password: 'Demo-2026' },
    { id: 'U13', role: 'CLIENT', name: 'Руслан Тлеубаев', email: 'ruslan@smarthome.kz', phone: '+7 777 210 33 44', companyId: 'C4', position: 'Основатель', active: true, createdAt: bIso(30), password: 'Demo-2026' },
    { id: 'U14', role: 'CLIENT', name: 'Айгуль Мухамедова', email: 'supply@medtech.kz', phone: '+7 708 120 90 80', companyId: 'C5', position: 'Менеджер по снабжению', active: true, createdAt: bIso(10), password: 'Demo-2026' },
    { id: 'U15', role: 'CLIENT', name: 'Камила Ержанова', email: 'kamila@beautybox.kz', phone: '+7 747 600 70 80', companyId: 'C6', position: 'ИП', active: true, createdAt: bIso(1), password: 'Demo-2026' },
  ];
  const companies = [
    { id: 'C1', name: 'ТОО «Астана Электроникс»', bin: '180540012345', city: 'Астана', industry: 'Электроника, опт', createdAt: bIso(120) },
    { id: 'C2', name: 'ИП «Нурсултан Текстиль»', bin: '900312300456', city: 'Шымкент', industry: 'Текстиль', createdAt: bIso(60) },
    { id: 'C3', name: 'ТОО «KazAgro Parts»', bin: '150940023456', city: 'Костанай', industry: 'Запчасти для сельхозтехники', createdAt: bIso(45) },
    { id: 'C4', name: 'ТОО «Smart Home KZ»', bin: '210140034567', city: 'Алматы', industry: 'Продавец на Kaspi', createdAt: bIso(30) },
    { id: 'C5', name: 'ТОО «MedTech Supply»', bin: '191040045678', city: 'Алматы', industry: 'Медицинское оборудование', createdAt: bIso(10) },
    { id: 'C6', name: 'ИП «Beauty Box»', bin: '950822400789', city: 'Караганда', industry: 'Косметика', createdAt: bIso(1) },
  ];
  const hist = (steps, start, users = []) => steps.map((st, i) => ({ from: i ? steps[i - 1] : null, to: st, date: bIso(start - i * (start / Math.max(steps.length, 2)), 10 + i), userId: i === 0 ? null : users[i - 1] || 'U4', note: '' }));
  const L = (n, o) => ({ id: 'B2B-' + String(n).padStart(6, '0'), number: n, files: [], messages: [], quote: null, managerId: null, source: 'Сайт', places: '', valueUsd: '', incoterms: 'EXW', ...o });
  const leads = [
    L(101, { userId: 'U10', companyId: 'C1', service: 'cargo-cn', from: 'Китай, Шэньчжэнь', to: 'Астана', cargo: 'Электроника: роутеры, коммутаторы, кабели', weight: 1850, volume: 9.4, places: 112, valueUsd: 68000, frequency: 'Ежемесячно', status: 'shipping', managerId: 'U4', createdAt: bIso(28),
      history: hist(['new', 'in_work', 'quoted', 'accepted', 'contract', 'shipping'], 28, ['U4', 'U4', 'U10', 'U4', 'U4']),
      files: [{ name: 'invoice_SZ-2026-0915.pdf', size: 184000, by: 'U10' }, { name: 'packing_list.xlsx', size: 42000, by: 'U10' }, { name: 'Договор_WY-2026-114.pdf', size: 320000, by: 'U4' }],
      quote: { items: [{ name: 'Авто-доставка Шэньчжэнь → Астана (9,4 м³)', qty: 1, unit: 'услуга', price: 2_350_000 }, { name: 'Таможенное оформление', qty: 1, unit: 'декл.', price: 180_000 }, { name: 'Страхование груза 0,5%', qty: 1, unit: 'услуга', price: 170_000 }], transit: '14–18 дней', validUntil: bIso(-5), terms: 'Оплата 50/50. Цена включает консолидацию и погрузку.', createdAt: bIso(25), by: 'U4' },
      messages: [{ id: 'm1', userId: 'U4', text: 'Гульнара, добрый день! Груз прошёл Хоргос, ориентировочно будет в Астане через 4 дня.', date: bIso(2), visibility: 'public' }, { id: 'm2', userId: 'U4', text: 'Клиент постоянный, ежемесячно ~2 т. Предложить годовой контракт со скидкой.', date: bIso(2), visibility: 'internal' }] }),
    L(102, { userId: 'U11', companyId: 'C2', service: 'ftl', from: 'Турция, Стамбул', to: 'Шымкент', cargo: 'Ткани в рулонах', weight: 12000, volume: 60, places: 240, valueUsd: 41000, frequency: 'Ежемесячно', status: 'quoted', managerId: 'U5', createdAt: bIso(6),
      history: hist(['new', 'in_work', 'quoted'], 6, ['U5', 'U5']),
      quote: { items: [{ name: 'FTL Стамбул → Шымкент, тент 82 м³', qty: 1, unit: 'рейс', price: 3_900_000 }, { name: 'Таможенное оформление', qty: 1, unit: 'декл.', price: 150_000 }], transit: '10–12 дней', validUntil: bIso(-7), terms: 'Предоплата 30%, остаток — по прибытии.', createdAt: bIso(1), by: 'U5' },
      messages: [{ id: 'm3', userId: 'U5', text: 'Направил КП. Можем загрузиться уже на следующей неделе.', date: bIso(1), visibility: 'public' }] }),
    L(103, { userId: 'U12', companyId: 'C3', service: 'air', from: 'Германия, Франкфурт', to: 'Костанай', cargo: 'Запчасти для комбайнов CLAAS (срочно)', weight: 320, volume: 1.2, places: 6, valueUsd: 24000, frequency: 'Разовая поставка', status: 'in_work', managerId: 'U4', createdAt: bIso(2),
      history: hist(['new', 'in_work'], 2, ['U4']), files: [{ name: 'CLAAS_order_7781.pdf', size: 96000, by: 'U12' }],
      messages: [{ id: 'm4', userId: 'U12', text: 'Нужно успеть до начала уборочной, это критично.', date: bIso(2), visibility: 'public' }, { id: 'm5', userId: 'U4', text: 'Запросила ставку у Lufthansa Cargo и Turkish, жду до вечера.', date: bIso(1.5), visibility: 'internal' }] }),
    L(104, { userId: 'U13', companyId: 'C4', service: 'fulfillment', from: 'Китай, Иу', to: 'Алматы (склад Kaspi)', cargo: 'Умные розетки и лампы, 6 SKU', weight: 640, volume: 4.1, places: 48, valueUsd: 15000, frequency: 'Еженедельно', status: 'done', managerId: 'U5', createdAt: bIso(26),
      history: hist(['new', 'in_work', 'quoted', 'accepted', 'contract', 'shipping', 'done'], 26, ['U5', 'U5', 'U13', 'U5', 'U5', 'U5']),
      quote: { items: [{ name: 'Карго Иу → Алматы', qty: 640, unit: 'кг', price: 950 }, { name: 'Маркировка и упаковка для Kaspi', qty: 1200, unit: 'шт', price: 120 }], transit: '12–15 дней', validUntil: bIso(10), terms: 'Оплата по факту приёмки.', createdAt: bIso(24), by: 'U5' } }),
    L(105, { userId: 'U14', companyId: 'C5', service: 'customs', from: 'Корея, Сеул', to: 'Алматы', cargo: 'Медицинские мониторы (требуется РУ)', weight: 410, volume: 2.3, places: 14, valueUsd: 52000, frequency: 'Разовая поставка', status: 'new', managerId: null, createdAt: bIso(0.15), history: hist(['new'], 0.15), files: [{ name: 'proforma_invoice.pdf', size: 210000, by: 'U14' }], comment: 'Есть ли у вас опыт с медизделиями? Нужна помощь с регистрационным удостоверением.' }),
    L(106, { userId: 'U15', companyId: 'C6', service: 'cargo-cn', from: 'Китай, Гуанчжоу', to: 'Караганда', cargo: 'Корейская и китайская косметика', weight: 150, volume: 0.8, places: 10, valueUsd: 6000, frequency: 'Ежемесячно', status: 'new', managerId: null, createdAt: bIso(0.05), history: hist(['new'], 0.05) }),
    L(107, { userId: 'U10', companyId: 'C1', service: 'air', from: 'Китай, Шэньчжэнь', to: 'Астана', cargo: 'Образцы оборудования', weight: 45, volume: 0.2, places: 2, valueUsd: 3000, frequency: 'Разовая поставка', status: 'rejected', managerId: 'U4', createdAt: bIso(15),
      history: [...hist(['new', 'in_work'], 15, ['U4']), { from: 'in_work', to: 'rejected', date: bIso(13), userId: 'U4', note: 'Клиент решил везти образцы курьером DHL — дешевле для такого веса.' }] }),
    L(108, { userId: 'U11', companyId: 'C2', service: 'customs', from: 'Узбекистан, Ташкент', to: 'Шымкент', cargo: 'Пряжа хлопковая', weight: 5000, volume: 22, places: 100, valueUsd: 18000, frequency: 'Ежемесячно', status: 'accepted', managerId: 'U5', createdAt: bIso(9),
      history: hist(['new', 'in_work', 'quoted', 'accepted'], 9, ['U5', 'U5', 'U11']),
      quote: { items: [{ name: 'Таможенное оформление (ЕАЭС, СТ-1)', qty: 1, unit: 'декл.', price: 120_000 }, { name: 'Доставка Ташкент → Шымкент', qty: 1, unit: 'рейс', price: 450_000 }], transit: '3–4 дня', validUntil: bIso(-3), terms: 'Оплата 100% до отгрузки.', createdAt: bIso(5), by: 'U5' } }),
  ];
  return {
    version: B2B_VERSION,
    session: { clientId: 'U10', staffId: 'U1' },
    seq: { lead: 108, user: 20, company: 10, block: 100, msg: 20, page: 10, ver: 10 },
    users, companies, leads,
    settings: {
      brand: 'Way Business', tagline: 'Логистика для бизнеса', phone: '+7 727 355 00 10', email: 'b2b@way.kz', address: 'Алматы, ул. Тимирязева, 42, БЦ «Атакент», офис 305', hours: 'Пн–Пт 9:00–18:00',
      telegram: '@WayBusiness', whatsapp: '+7 701 355 00 10', leadNotifyEmail: 'sales@way.kz', autoAssign: false,
      menu: [{ label: 'Услуги', href: '#/' }, { label: 'О компании', href: '#/p/about' }, { label: 'Контакты', href: '#/p/contacts' }],
      seoTitle: 'Way Business — логистика и таможня для компаний', seoDescription: 'Доставка грузов из Китая, Турции и ЕС для бизнеса, таможенное оформление, фулфилмент для маркетплейсов.',
    },
    pages: [
      { id: 'P1', slug: '/', title: 'Главная', status: 'published', blocks: defaultHomeBlocks(), published: defaultHomeBlocks(), seo: { title: '', description: '' }, updatedAt: bIso(3), updatedBy: 'U2', versions: [{ id: 'V1', date: bIso(3), userId: 'U2', note: 'Публикация', blocks: defaultHomeBlocks() }] },
      { id: 'P2', slug: 'about', title: 'О компании', status: 'published', blocks: defaultAboutBlocks(), published: defaultAboutBlocks(), seo: { title: 'О компании — Way Business', description: '' }, updatedAt: bIso(20), updatedBy: 'U2', versions: [{ id: 'V2', date: bIso(20), userId: 'U2', note: 'Публикация', blocks: defaultAboutBlocks() }] },
      { id: 'P3', slug: 'contacts', title: 'Контакты', status: 'published', blocks: defaultContactsBlocks(), published: defaultContactsBlocks(), seo: { title: 'Контакты — Way Business', description: '' }, updatedAt: bIso(20), updatedBy: 'U2', versions: [{ id: 'V3', date: bIso(20), userId: 'U2', note: 'Публикация', blocks: defaultContactsBlocks() }] },
    ],
    audit: [
      { date: bIso(0.05), userId: null, text: 'Новая заявка B2B-000106 с сайта (ИП «Beauty Box»), создан аккаунт kamila@beautybox.kz' },
      { date: bIso(0.15), userId: null, text: 'Новая заявка B2B-000105 с сайта (ТОО «MedTech Supply»)' },
      { date: bIso(1), userId: 'U5', text: 'B2B-000102: отправлено КП на 4 050 000 ₸' },
      { date: bIso(1.5), userId: 'U4', text: 'B2B-000103: внутренняя заметка' },
      { date: bIso(2), userId: 'U4', text: 'B2B-000101: статус «Договор подписан» → «В перевозке»' },
      { date: bIso(3), userId: 'U2', text: 'Опубликована страница «Главная»' },
    ],
  };
}

/* ---------- Хранилище ---------- */
let BB;
const B2BStore = {
  load() {
    try { BB = JSON.parse(localStorage.getItem(B2B_KEY)); } catch { BB = null; }
    if (!BB || BB.version !== B2B_VERSION) { BB = b2bSeed(); this.save(); }
  },
  save() { try { localStorage.setItem(B2B_KEY, JSON.stringify(BB)); } catch (e) { console.warn(e); } },
  reset() { localStorage.removeItem(B2B_KEY); BB = b2bSeed(); this.save(); },
};
const userById = id => BB.users.find(u => u.id === id);
const companyById = id => BB.companies.find(c => c.id === id);
const leadById = id => BB.leads.find(l => l.id === id);
const pageById = id => BB.pages.find(p => p.id === id);
const staff = () => userById(BB.session.staffId);
const clientUser = () => { const u = userById(BB.session.clientId); return u?.role === 'CLIENT' ? u : null; };
const tg = n => Math.round(+n || 0).toLocaleString('ru-RU') + ' ₸';
const quoteTotal = q => q ? q.items.reduce((s, i) => s + i.qty * i.price, 0) : 0;
function audit(text, userId = BB.session.staffId) {
  BB.audit.unshift({ date: new Date().toISOString(), userId, text });
  if (BB.audit.length > 500) BB.audit.length = 500;
}
function setLeadStatus(l, to, userId, note = '') {
  l.history.push({ from: l.status, to, date: new Date().toISOString(), userId, note });
  l.status = to;
}
/** Какие заявки видит сотрудник: все — по праву leads:all, иначе свои и свободные новые. */
function visibleLeads(u) {
  if (can(u, 'leads:all')) return BB.leads;
  if (can(u, 'leads:own')) return BB.leads.filter(l => l.managerId === u.id || (!l.managerId && l.status === 'new'));
  return [];
}
