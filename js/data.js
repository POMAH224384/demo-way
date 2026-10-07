/* Демо-данные и «база» в localStorage. Бэкенда нет — всё живёт в браузере. */
const STORAGE_KEY = 'qazbox-demo';
const DATA_VERSION = 4;
const DAY = 864e5;

function iso(daysAgo, hour = 11) {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, Math.abs(Math.round(daysAgo * 37)) % 60, 0, 0);
  return d.toISOString();
}

const STATUS = {
  expected:      { label: 'Ожидается на складе', short: 'Ожидается', color: '', icon: ic('clock') },
  unidentified:  { label: 'Не распознана', short: 'Нераспознана', color: 'red', icon: ic('circle-help') },
  received:      { label: 'На складе', short: 'На складе', color: 'blue', icon: ic('package') },
  consolidating: { label: 'Консолидация', short: 'Консолидация', color: 'purple', icon: ic('combine') },
  ready:         { label: 'Готова к отправке', short: 'Оплачена', color: 'teal', icon: ic('circle-check') },
  in_batch:      { label: 'В партии на отправку', short: 'В партии', color: 'indigo', icon: ic('square-kanban') },
  transit:       { label: 'В пути в Казахстан', short: 'В пути', color: 'orange', icon: ic('plane') },
  kz:            { label: 'Прибыла в Казахстан', short: 'В Казахстане', color: 'orange', icon: ic('landmark') },
  issue:         { label: 'Готова к выдаче', short: 'К выдаче', color: 'green', icon: ic('store') },
  courier:       { label: 'Передана курьеру', short: 'У курьера', color: 'green', icon: ic('truck') },
  delivered:     { label: 'Получена', short: 'Получена', color: 'dark', icon: ic('party-popper') },
  merged:        { label: 'Объединена', short: 'Объединена', color: '', icon: ic('link') },
  returned:      { label: 'Возвращена продавцу', short: 'Возврат', color: 'red', icon: ic('undo-2') },
};
const CLIENT_FLOW = ['expected', 'received', 'ready', 'in_batch', 'transit', 'kz', 'issue', 'delivered'];
const STATUS_GROUPS = {
  all: { label: 'Все', st: null },
  expected: { label: 'Ожидаются', st: ['expected'] },
  stock: { label: 'На складе', st: ['received', 'consolidating', 'ready'] },
  way: { label: 'В пути', st: ['in_batch', 'transit', 'kz'] },
  issue: { label: 'К получению', st: ['issue', 'courier'] },
  done: { label: 'Получены', st: ['delivered', 'returned'] },
};

const BATCH_STATUS = {
  origin:  { label: 'Склад отправителя', parcel: 'in_batch', color: 'indigo' },
  transit: { label: 'Транзит', parcel: 'transit', color: 'orange' },
  kz:      { label: 'Казахстан', parcel: 'kz', color: 'teal' },
  issue:   { label: 'Выдача', parcel: 'issue', color: 'green' },
};
const BATCH_FLOW = ['origin', 'transit', 'kz', 'issue'];

const SERVICES = {
  consolidation: { name: 'Консолидация', icon: ic('combine'), price: 3, desc: 'Объединим несколько посылок в одну коробку — экономия на весе' },
  photo:         { name: 'Фотоотчёт', icon: ic('images'), price: 1, desc: 'Детальные фото содержимого посылки' },
  check:         { name: 'Проверка содержимого', icon: ic('scan-search'), price: 2, desc: 'Сверим товары с декларацией, проверим целостность' },
  repack:        { name: 'Переупаковка', icon: ic('package'), price: 3, desc: 'Уберём лишнюю упаковку, добавим защиту' },
  return:        { name: 'Возврат продавцу', icon: ic('undo-2'), price: 5, desc: 'Отправим посылку обратно в магазин' },
};

const BUYOUT_STATUS = {
  new:       { label: 'Новая', color: 'blue' },
  invoiced:  { label: 'Ожидает оплаты', color: 'orange' },
  paid:      { label: 'Оплачена — к выкупу', color: 'purple' },
  purchased: { label: 'Выкуплена', color: 'teal' },
  shipped:   { label: 'Едет на склад', color: 'indigo' },
  done:      { label: 'Поступила на склад', color: 'green' },
  cancelled: { label: 'Отменена', color: 'red' },
};

const SERVICE_REQ_STATUS = { new: { label: 'Новая', color: 'orange' }, done: { label: 'Выполнена', color: 'green' } };

function genParcels() {
  // [id, track, store, client, country, status, weightKg, [l,w,h], daysAgo, items, extra]
  const rows = [
    ['P-1001', '1Z999AA10123456784', 'Amazon', 'QB-10427', 'US', 'expected', 0, null, 1, [['Apple AirPods Pro 2', 1, 189]]],
    ['P-1002', 'TBA308812233000', 'Amazon', 'QB-10427', 'US', 'received', 1.4, [30, 22, 12], 3, [['Kindle Paperwhite', 1, 139], ['Чехол для Kindle', 1, 19]], { cell: 'A-03-2' }],
    ['P-1003', '9400111899223856923471', 'iHerb', 'QB-10427', 'US', 'received', 2.1, [35, 25, 18], 2, [['Витамины D3+K2', 2, 18], ['Омега-3', 3, 24]], { cell: 'A-03-4' }],
    ['P-1004', 'LX123456789DE', 'Zalando', 'QB-10427', 'DE', 'transit', 1.8, [40, 30, 10], 8, [['Кроссовки adidas Samba', 1, 110]], { batchId: 'B-DE-0041', paid: true, cost: 17.1 }],
    ['P-1005', 'YT2345678901234567', 'Taobao', 'QB-10427', 'CN', 'issue', 3.2, [45, 35, 20], 18, [['Органайзеры для дома', 6, 4], ['Настольная лампа', 1, 22]], { batchId: 'B-CN-0118', paid: true, cost: 21.6 }],
    ['P-1006', 'SP0012984455ES', 'Zara', 'QB-10427', 'ES', 'delivered', 1.1, [38, 28, 8], 34, [['Пальто', 1, 129]], { batchId: 'B-ES-0019', paid: true, cost: 10.8 }],
    ['P-1007', 'RB998877665GB', 'ASOS', 'QB-10427', 'GB', 'ready', 0.9, [30, 25, 6], 5, [['Платье', 1, 45], ['Ремень', 1, 15]], { cell: 'G-01-1', paid: true, cost: 9.4 }],
    ['P-1008', '1Z999AA10198765432', 'Sephora', 'QB-10427', 'US', 'kz', 0.7, [20, 15, 10], 12, [['Парфюм', 1, 98]], { batchId: 'B-US-0207', paid: true, cost: 8.9 }],
    ['P-1009', 'TBA308812299112', 'Amazon', 'QB-10388', 'US', 'received', 4.5, [50, 40, 30], 2, [['Блендер Ninja', 1, 99]], { cell: 'B-01-1' }],
    ['P-1010', '1Z999AA10155544433', 'Nike', 'QB-10388', 'US', 'ready', 1.6, [36, 26, 14], 4, [['Nike Air Force 1', 1, 115]], { cell: 'B-02-3', paid: true, cost: 15.0 }],
    ['P-1011', '9400111899200011122', 'Carter\'s', 'QB-10512', 'US', 'ready', 2.4, [40, 30, 15], 6, [['Детская одежда', 8, 12]], { cell: 'B-04-1', paid: true, cost: 23.8 }],
    ['P-1012', 'TBA308812277001', 'Amazon', 'QB-10095', 'US', 'transit', 6.2, [60, 40, 30], 9, [['Робот-пылесос', 1, 299]], { batchId: 'B-US-0208', paid: true, cost: 52.1 }],
    ['P-1013', 'YT2345678909876543', 'AliExpress', 'QB-10603', 'CN', 'received', 0.6, [25, 18, 6], 1, [['Чехлы для телефона', 3, 4]], { cell: 'C-01-2' }],
    ['P-1014', 'YT2345678900001111', '1688', 'QB-10159', 'CN', 'ready', 8.4, [60, 45, 40], 5, [['Товары для дома', 20, 3]], { cell: 'C-02-1', paid: true, cost: 56.7 }],
    ['P-1015', 'LX987654321DE', 'Amazon.de', 'QB-10244', 'DE', 'in_batch', 2.2, [40, 30, 20], 4, [['Кофемолка', 1, 59]], { batchId: 'B-DE-0042', paid: true, cost: 19.8 }],
    ['P-1016', 'LX555444333DE', 'Zalando', 'QB-10671', 'DE', 'in_batch', 1.3, [35, 25, 12], 4, [['Куртка', 1, 89]], { batchId: 'B-DE-0042', paid: true, cost: 12.4 }],
    ['P-1017', '1Z999AA10100022233', 'Amazon', 'QB-10244', 'US', 'transit', 3.0, [40, 35, 25], 9, [['Монитор 27"', 1, 229]], { batchId: 'B-US-0208', paid: true, cost: 28.5 }],
    ['P-1018', '9400111899233344455', 'Walmart', 'QB-10671', 'US', 'kz', 1.2, [30, 20, 15], 13, [['Посуда', 1, 39]], { batchId: 'B-US-0207', paid: true, cost: 11.9 }],
    ['P-1019', 'YT2345678912121212', 'Taobao', 'QB-10512', 'CN', 'issue', 2.8, [40, 30, 25], 17, [['Игрушки', 5, 6]], { batchId: 'B-CN-0118', paid: true, cost: 21.0 }],
    ['P-1020', 'RB112233445GB', 'Selfridges', 'QB-10095', 'GB', 'received', 1.0, [30, 22, 10], 1, [['Свитер', 1, 140]], { cell: 'G-02-2' }],
    ['P-1021', 'TBA308812200077', 'Amazon', null, 'US', 'unidentified', 0.8, [25, 20, 10], 2, [], { cell: 'X-01-1', labelText: 'SHIP TO: J. SMITH\n1201 N ORANGE ST STE 7\nWILMINGTON DE 19801' }],
    ['P-1022', '1Z999AA10177788899', 'eBay', null, 'US', 'unidentified', 1.9, [35, 30, 20], 4, [], { cell: 'X-01-2', labelText: 'TO: TIMUR K.\n1201 N ORANGE ST\nWILMINGTON DE' }],
    ['P-1023', 'TBA308812244556', 'Amazon', 'QB-10512', 'US', 'expected', 0, null, 0, [['Наушники Sony', 1, 279]]],
    ['P-1024', 'YT2345678933334444', 'Taobao', 'QB-10427', 'CN', 'expected', 0, null, 2, [['Сумка', 1, 35]]],
  ];
  return rows.map(([id, track, store, clientId, country, status, weight, dims, d, items, extra = {}]) => {
    const p = {
      id, track, store, clientId, country, status, weight,
      dims: dims ? { l: dims[0], w: dims[1], h: dims[2] } : null,
      items: items.map(([name, qty, price]) => ({ name, qty, price })),
      createdAt: iso(d + 2), photos: weight ? ['gen:1', 'gen:2'] : [], cell: null, batchId: null,
      paid: false, cost: null, delivery: null, services: [], history: [], ...extra,
    };
    if (clientId === 'QB-10427') p.delivery = p.delivery || { method: 'pickup', pointId: 'PT-1' };
    const flowIdx = CLIENT_FLOW.indexOf(status);
    const steps = status === 'unidentified' ? ['unidentified'] : CLIENT_FLOW.slice(0, Math.max(flowIdx, 0) + 1);
    const span = d + 2;
    p.history = steps.map((st, i) => ({ status: st, date: iso(span - (span * i) / Math.max(steps.length, 1), 9 + i), note: '' })).reverse();
    return p;
  });
}

function seed() {
  const s = {
    version: DATA_VERSION,
    session: { clientId: 'QB-10427', whCountry: 'US' },
    seq: { parcel: 1100, client: 10700, buyout: 220, tx: 5000, batch: 300, sr: 60, ticket: 40, courier: 10, inv: 900 },
    settings: {
      rates: { KZT: 505, EUR: 0.92, GBP: 0.79, CNY: 7.15 },
      courierPrice: 3, freeCourierFrom: 50, buyoutCommission: 5, minBuyoutCommission: 3,
      storageFreeDays: 30, storageFeePerDay: 0.3, referralBonus: 5, volumetricDivider: 5000,
    },
    levels: [
      { id: 'base', name: 'Base', fromKg: 0, color: '#64748b', perks: 'Базовые тарифы' },
      { id: 'silver', name: 'Silver', fromKg: 20, color: '#94a3b8', perks: '−5% к тарифу, бесплатное фото' },
      { id: 'gold', name: 'Gold', fromKg: 60, color: '#d4a017', perks: '−10% к тарифу, 45 дней хранения' },
      { id: 'platinum', name: 'Platinum', fromKg: 150, color: '#7c3aed', perks: '−15% к тарифу, персональный менеджер' },
    ],
    countries: [
      { code: 'US', name: 'США', active: true, transit: '7–12 дней', minCharge: 5, perKg: { base: 9.9, silver: 9.4, gold: 8.9, platinum: 8.4 },
        address: { line1: '1201 N Orange St, Suite 7', line2: '{ID}', city: 'Wilmington', region: 'DE (Delaware, без налога)', zip: '19801', phone: '+1 302 555 0142' } },
      { code: 'GB', name: 'Англия', active: true, transit: '8–14 дней', minCharge: 6, perKg: { base: 10.5, silver: 10, gold: 9.5, platinum: 8.9 },
        address: { line1: 'Unit 5, Heathrow Logistics Park', line2: '{ID}', city: 'Hounslow', region: 'Middlesex', zip: 'TW6 2GH', phone: '+44 20 3807 1120' } },
      { code: 'DE', name: 'Германия', active: true, transit: '8–12 дней', minCharge: 5, perKg: { base: 9.5, silver: 9, gold: 8.6, platinum: 8.1 },
        address: { line1: 'Lagerstraße 12', line2: '{ID}', city: 'Frankfurt am Main', region: 'Hessen', zip: '60549', phone: '+49 69 2475 3301' } },
      { code: 'ES', name: 'Испания', active: true, transit: '10–14 дней', minCharge: 5, perKg: { base: 9.8, silver: 9.3, gold: 8.8, platinum: 8.3 },
        address: { line1: 'Calle de la Logística 8, Nave 3', line2: '{ID}', city: 'Madrid', region: 'Madrid', zip: '28042', phone: '+34 910 555 284' } },
      { code: 'CN', name: 'Китай', active: true, transit: '12–18 дней', minCharge: 4, perKg: { base: 6.8, silver: 6.5, gold: 6.1, platinum: 5.8 },
        address: { line1: '广州市白云区石井街道 物流园 3栋 302', line2: '{ID}', city: 'Guangzhou (广州)', region: 'Guangdong', zip: '510430', phone: '+86 20 3622 7781' } },
      { code: 'TR', name: 'Турция', active: false, transit: '7–10 дней', minCharge: 5, perKg: { base: 8.5, silver: 8.1, gold: 7.7, platinum: 7.2 },
        address: { line1: 'Atatürk Cd. No:44', line2: '{ID}', city: 'İstanbul', region: 'Esenyurt', zip: '34510', phone: '+90 212 555 0190' } },
    ],
    clients: [
      { id: 'QB-10427', name: 'Айгерим Нурланова', latin: 'AIGERIM NURLANOVA', email: 'aigerim@example.kz', phone: '+7 701 555 12 34', city: 'Алматы', level: 'gold', shippedKg: 74.5, balance: 42.5, bonus: 12, referrer: null, createdAt: iso(410), via: 'google', blocked: false, channels: { email: true, sms: false, whatsapp: true, telegram: true, push: false } },
      { id: 'QB-10388', name: 'Ерлан Сапаров', latin: 'YERLAN SAPAROV', email: 'yerlan.s@example.kz', phone: '+7 702 444 55 66', city: 'Астана', level: 'silver', shippedKg: 31.2, balance: 15, bonus: 0, referrer: 'QB-10427', createdAt: iso(220), via: 'phone' },
      { id: 'QB-10512', name: 'Динара Ахметова', latin: 'DINARA AKHMETOVA', email: 'dinara.a@example.kz', phone: '+7 705 222 33 44', city: 'Шымкент', level: 'base', shippedKg: 9.4, balance: 4.2, bonus: 0, referrer: 'QB-10427', createdAt: iso(95), via: 'email' },
      { id: 'QB-10095', name: 'Тимур Касымов', latin: 'TIMUR KASSYMOV', email: 'timur.k@example.kz', phone: '+7 777 100 20 30', city: 'Алматы', level: 'platinum', shippedKg: 212, balance: 310, bonus: 40, referrer: null, createdAt: iso(800), via: 'email' },
      { id: 'QB-10603', name: 'Мадина Жумабаева', latin: 'MADINA ZHUMABAYEVA', email: 'madina.zh@example.kz', phone: '+7 708 999 88 77', city: 'Караганда', level: 'base', shippedKg: 2.1, balance: 0, bonus: 0, referrer: null, createdAt: iso(30), via: 'google' },
      { id: 'QB-10244', name: 'Арман Исмаилов', latin: 'ARMAN ISMAILOV', email: 'arman.i@example.kz', phone: '+7 747 321 65 98', city: 'Астана', level: 'silver', shippedKg: 44, balance: 22.8, bonus: 5, referrer: null, createdAt: iso(500), via: 'phone' },
      { id: 'QB-10671', name: 'Алия Серикова', latin: 'ALIYA SERIKOVA', email: 'aliya.s@example.kz', phone: '+7 700 765 43 21', city: 'Алматы', level: 'base', shippedKg: 6.8, balance: 11, bonus: 5, referrer: 'QB-10427', createdAt: iso(60), via: 'email' },
      { id: 'QB-10159', name: 'Данияр Омаров', latin: 'DANIYAR OMAROV', email: 'daniyar.o@example.kz', phone: '+7 701 909 08 07', city: 'Актобе', level: 'gold', shippedKg: 98, balance: 64, bonus: 10, referrer: null, createdAt: iso(650), via: 'email' },
    ],
    parcels: genParcels(),
    batches: [
      { id: 'B-US-0207', country: 'US', status: 'kz', awb: '176-55512340', createdAt: iso(13), carrier: 'Air cargo (Turkish Cargo)', history: [{ status: 'origin', date: iso(13) }, { status: 'transit', date: iso(11) }, { status: 'kz', date: iso(1) }] },
      { id: 'B-US-0208', country: 'US', status: 'transit', awb: '176-55512981', createdAt: iso(9), carrier: 'Air cargo (Turkish Cargo)', history: [{ status: 'origin', date: iso(9) }, { status: 'transit', date: iso(7) }] },
      { id: 'B-DE-0041', country: 'DE', status: 'transit', awb: '020-11223344', createdAt: iso(8), carrier: 'Lufthansa Cargo', history: [{ status: 'origin', date: iso(8) }, { status: 'transit', date: iso(6) }] },
      { id: 'B-DE-0042', country: 'DE', status: 'origin', awb: '', createdAt: iso(2), carrier: 'Lufthansa Cargo', history: [{ status: 'origin', date: iso(2) }] },
      { id: 'B-CN-0118', country: 'CN', status: 'issue', awb: 'TRK-CN-88120', createdAt: iso(18), carrier: 'Авто (Хоргос)', history: [{ status: 'origin', date: iso(18) }, { status: 'transit', date: iso(16) }, { status: 'kz', date: iso(4) }, { status: 'issue', date: iso(3) }] },
      { id: 'B-ES-0019', country: 'ES', status: 'issue', awb: '075-99887766', createdAt: iso(34), carrier: 'Iberia Cargo', history: [{ status: 'origin', date: iso(34) }, { status: 'transit', date: iso(32) }, { status: 'kz', date: iso(24) }, { status: 'issue', date: iso(23) }] },
    ],
    buyouts: [
      { id: 'BY-0211', clientId: 'QB-10427', country: 'US', status: 'invoiced', createdAt: iso(2), items: [{ url: 'https://www.bestbuy.com/site/apple-watch-se', title: 'Apple Watch SE 44mm', params: 'Midnight, M/L', qty: 1, price: 249, actual: 249 }], localShipping: 0, commissionPct: 5, total: 261.45, comment: 'BestBuy не принимает казахстанские карты', invoiceId: 'INV-0893' },
      { id: 'BY-0212', clientId: 'QB-10427', country: 'GB', status: 'purchased', createdAt: iso(6), items: [{ url: 'https://www.next.co.uk/style/st123', title: 'Детский комбинезон', params: '2-3 года, бежевый', qty: 2, price: 28, actual: 28 }], localShipping: 4, commissionPct: 5, total: 62.99, orderNo: 'NX-7781230', invoiceId: 'INV-0880' },
      { id: 'BY-0213', clientId: 'QB-10388', country: 'US', status: 'new', createdAt: iso(0.2), items: [{ url: 'https://www.costco.com/kirkland-vitamins', title: 'Kirkland Multivitamin', params: '500 таб.', qty: 2, price: 22, actual: null }, { url: 'https://www.costco.com/kirkland-fish-oil', title: 'Kirkland Fish Oil', params: '400 капс.', qty: 1, price: 19, actual: null }], localShipping: 0, commissionPct: 5, total: null, comment: 'Costco только для членов клуба' },
      { id: 'BY-0214', clientId: 'QB-10095', country: 'DE', status: 'paid', createdAt: iso(1), items: [{ url: 'https://www.otto.de/p/dyson-v15', title: 'Dyson V15 Detect', params: 'EU', qty: 1, price: 649, actual: 649 }], localShipping: 0, commissionPct: 5, total: 681.45, invoiceId: 'INV-0891' },
      { id: 'BY-0215', clientId: 'QB-10603', country: 'CN', status: 'new', createdAt: iso(0.5), items: [{ url: 'https://item.taobao.com/item.htm?id=6823', title: 'Платье летнее', params: 'S, голубое', qty: 1, price: 18, actual: null }], localShipping: 0, commissionPct: 5, total: null },
      { id: 'BY-0209', clientId: 'QB-10159', country: 'US', status: 'shipped', createdAt: iso(10), items: [{ url: 'https://www.homedepot.com/p/123', title: 'Набор инструментов DeWalt', params: '', qty: 1, price: 199, actual: 189 }], localShipping: 9, commissionPct: 5, total: 207.9, orderNo: 'HD-55120', track: '1Z999AA10166677788', invoiceId: 'INV-0860' },
    ],
    transactions: [
      { id: 'TX-4990', clientId: 'QB-10427', type: 'topup', amount: 100, date: iso(40), method: 'Kaspi', note: 'Пополнение через Kaspi Pay' },
      { id: 'TX-4991', clientId: 'QB-10427', type: 'charge', amount: -10.8, date: iso(33), note: 'Доставка P-1006 (Zara, ES)' },
      { id: 'TX-4992', clientId: 'QB-10427', type: 'bonus', amount: 5, date: iso(30), note: 'Реферальный бонус: Алия Серикова' },
      { id: 'TX-4993', clientId: 'QB-10427', type: 'topup', amount: 50, date: iso(20), method: 'Карта', note: 'Visa •• 4242' },
      { id: 'TX-4994', clientId: 'QB-10427', type: 'charge', amount: -21.6, date: iso(17), note: 'Доставка P-1005 (Taobao, CN)' },
      { id: 'TX-4995', clientId: 'QB-10427', type: 'charge', amount: -8.9, date: iso(12), note: 'Доставка P-1008 (Sephora, US)' },
      { id: 'TX-4996', clientId: 'QB-10427', type: 'charge', amount: -17.1, date: iso(8), note: 'Доставка P-1004 (Zalando, DE)' },
      { id: 'TX-4997', clientId: 'QB-10427', type: 'charge', amount: -62.99, date: iso(6), note: 'Оплата счёта INV-0880 (выкуп BY-0212)' },
      { id: 'TX-4998', clientId: 'QB-10427', type: 'topup', amount: 30, date: iso(6), method: 'Kaspi', note: 'Пополнение через Kaspi Pay' },
      { id: 'TX-4999', clientId: 'QB-10427', type: 'charge', amount: -9.4, date: iso(5), note: 'Доставка P-1007 (ASOS, GB)' },
      { id: 'TX-4980', clientId: 'QB-10095', type: 'topup', amount: 1000, date: iso(3), method: 'Карта', note: 'Mastercard •• 5100' },
      { id: 'TX-4981', clientId: 'QB-10095', type: 'charge', amount: -681.45, date: iso(1), note: 'Оплата счёта INV-0891 (выкуп BY-0214)' },
      { id: 'TX-4982', clientId: 'QB-10388', type: 'topup', amount: 30, date: iso(4), method: 'Kaspi', note: 'Пополнение через Kaspi Pay' },
      { id: 'TX-4983', clientId: 'QB-10388', type: 'charge', amount: -15, date: iso(4), note: 'Доставка P-1010 (Nike, US)' },
    ],
    serviceRequests: [
      { id: 'SR-0051', clientId: 'QB-10603', parcelIds: ['P-1013'], type: 'repack', status: 'new', createdAt: iso(0.4), price: 3, comment: 'Уберите лишнюю упаковку' },
      { id: 'SR-0052', clientId: 'QB-10095', parcelIds: ['P-1020'], type: 'photo', status: 'new', createdAt: iso(0.3), price: 1, comment: 'Покажите бирку на свитере' },
      { id: 'SR-0049', clientId: 'QB-10388', parcelIds: ['P-1009'], type: 'check', status: 'new', createdAt: iso(1), price: 2, comment: 'Проверьте, что комплект полный' },
    ],
    stores: [
      ['Amazon', 'US', 'Маркетплейсы', '#ff9900'], ['eBay', 'US', 'Маркетплейсы', '#e53238'], ['Walmart', 'US', 'Маркетплейсы', '#0071ce'], ['iHerb', 'US', 'Здоровье', '#4c8c2b'],
      ['Nike', 'US', 'Одежда и обувь', '#111111'], ['Sephora', 'US', 'Красота', '#000000'], ['Carter\'s', 'US', 'Детям', '#00a6d6'], ['Best Buy', 'US', 'Электроника', '#0046be', true],
      ['Costco', 'US', 'Маркетплейсы', '#e31837', true], ['Home Depot', 'US', 'Дом и ремонт', '#f96302', true], ['Apple', 'US', 'Электроника', '#555555'], ['6pm', 'US', 'Одежда и обувь', '#c8102e'],
      ['ASOS', 'GB', 'Одежда и обувь', '#2d2d2d'], ['Next', 'GB', 'Детям', '#000000', true], ['Selfridges', 'GB', 'Одежда и обувь', '#ffe500'], ['Boots', 'GB', 'Красота', '#05054b'],
      ['Zalando', 'DE', 'Одежда и обувь', '#ff6900'], ['Amazon.de', 'DE', 'Маркетплейсы', '#ff9900'], ['Otto', 'DE', 'Дом и ремонт', '#d4021d', true], ['MediaMarkt', 'DE', 'Электроника', '#df0000'],
      ['Zara', 'ES', 'Одежда и обувь', '#000000'], ['Mango', 'ES', 'Одежда и обувь', '#3a3a3a'], ['El Corte Inglés', 'ES', 'Маркетплейсы', '#00843d', true], ['Massimo Dutti', 'ES', 'Одежда и обувь', '#5c4a3d'],
      ['Taobao', 'CN', 'Маркетплейсы', '#ff5000', true], ['1688', 'CN', 'Маркетплейсы', '#ff6a00', true], ['AliExpress', 'CN', 'Маркетплейсы', '#e62e04'], ['Pinduoduo', 'CN', 'Маркетплейсы', '#e02e24', true],
      ['JD.com', 'CN', 'Электроника', '#e1251b'], ['Shein', 'CN', 'Одежда и обувь', '#222222'],
    ].map(([name, country, category, color, special], i) => ({ id: 'S' + (i + 1), name, country, category, color, special: !!special, url: 'https://' + name.toLowerCase().replace(/[^a-z0-9.]/g, '') + (name.includes('.') ? '' : '.com') })),
    points: [
      { id: 'PT-1', type: 'pvz', city: 'Алматы', address: 'пр. Абая, 150, офис 12', hours: 'Пн–Сб 10:00–20:00' },
      { id: 'PT-2', type: 'pvz', city: 'Алматы', address: 'ул. Тимирязева, 42 (Атакент)', hours: 'Ежедневно 10:00–21:00' },
      { id: 'PT-3', type: 'locker', city: 'Алматы', address: 'ТРЦ MEGA Alma-Ata, 1 этаж', hours: '24/7' },
      { id: 'PT-4', type: 'pvz', city: 'Астана', address: 'пр. Мангилик Ел, 55/20', hours: 'Пн–Сб 10:00–20:00' },
      { id: 'PT-5', type: 'locker', city: 'Астана', address: 'ТРЦ Keruen, 2 этаж', hours: '24/7' },
      { id: 'PT-6', type: 'pvz', city: 'Шымкент', address: 'пр. Тауке хана, 31', hours: 'Пн–Сб 10:00–19:00' },
      { id: 'PT-7', type: 'pvz', city: 'Караганда', address: 'ул. Ерубаева, 50', hours: 'Пн–Сб 10:00–19:00' },
      { id: 'PT-8', type: 'pvz', city: 'Актобе', address: 'пр. Абилкайыр хана, 62', hours: 'Пн–Сб 10:00–19:00' },
    ],
    courierRequests: [
      { id: 'CR-0007', clientId: 'QB-10095', parcelIds: ['P-0991'], address: 'Алматы, мкр. Самал-2, 58, кв 14', date: iso(-1), slot: '14:00–18:00', status: 'new', extId: null, price: 0 },
    ],
    tickets: [
      { id: 'T-0037', clientId: 'QB-10427', subject: 'Когда придёт посылка из Германии?', status: 'open', createdAt: iso(1), messages: [
        { from: 'client', text: 'Здравствуйте! Посылка P-1004 уже неделю в пути, когда ожидать?', date: iso(1, 10) },
        { from: 'support', text: 'Добрый день, Айгерим! Партия B-DE-0041 вылетела из Франкфурта, ориентировочно прибудет в Алматы через 3–4 дня.', date: iso(1, 12) },
      ] },
      { id: 'T-0038', clientId: 'QB-10512', subject: 'Не вижу посылку с Amazon', status: 'open', createdAt: iso(0.3), messages: [
        { from: 'client', text: 'Трек TBA308812244556 — магазин пишет, что доставлено, но в кабинете статус «ожидается».', date: iso(0.3) },
      ] },
      { id: 'T-0035', clientId: 'QB-10388', subject: 'Возврат за переплату', status: 'closed', createdAt: iso(9), messages: [
        { from: 'client', text: 'Списали дважды за доставку', date: iso(9) },
        { from: 'support', text: 'Вернули $15 на баланс, приносим извинения!', date: iso(8) },
      ] },
    ],
    notifications: [
      { id: 'N1', clientId: 'QB-10427', text: 'Посылка P-1005 (Taobao) готова к выдаче в пункте пр. Абая, 150', date: iso(3), read: false, channels: ['telegram', 'whatsapp'] },
      { id: 'N2', clientId: 'QB-10427', text: 'Выставлен счёт INV-0893 на выкуп BY-0211: $261.45', date: iso(2), read: false, channels: ['email', 'telegram'] },
      { id: 'N3', clientId: 'QB-10427', text: 'Посылка P-1003 (iHerb) поступила на склад в США, вес 2.1 кг', date: iso(2), read: true, channels: ['telegram'] },
      { id: 'N4', clientId: 'QB-10427', text: 'Посылка P-1002 (Amazon) поступила на склад в США, вес 1.4 кг', date: iso(3), read: true, channels: ['telegram'] },
    ],
    log: [
      { date: iso(0.2), role: 'Менеджер выкупа', user: 'Сауле Б.', text: 'Новая заявка на выкуп BY-0213 (QB-10388)' },
      { date: iso(1), role: 'Оператор склада', user: 'Mike R. (US)', text: 'Принята посылка TBA308812299112 → QB-10388, 4.5 кг' },
      { date: iso(1.2), role: 'Администратор', user: 'Админ', text: 'Изменён курс USD/KZT: 503 → 505' },
      { date: iso(2), role: 'Оператор склада', user: 'Mike R. (US)', text: 'Посылка TBA308812200077 помещена в нераспознанные' },
      { date: iso(2.1), role: 'Оператор склада', user: 'Klaus W. (DE)', text: 'Сформирована партия B-DE-0042 (2 посылки, 3.5 кг)' },
      { date: iso(3), role: 'Администратор', user: 'Админ', text: 'Ручная корректировка баланса QB-10388: +$15 (возврат переплаты)' },
    ],
    integrations: {
      kaspi: { on: true, mode: 'test' }, cards: { on: true, mode: 'test', provider: 'Halyk ePay / CloudPayments' },
      courier: { on: true, provider: 'Курьерская служба (API)' }, email: { on: true }, sms: { on: true, provider: 'SMS-шлюз' },
      whatsapp: { on: true }, telegram: { on: true, bot: '@QazBoxBot' }, push: { on: true },
      ga: { on: true, id: 'G-XXXXXXX' }, pixel: { on: false, id: '000000000000' },
    },
  };
  return s;
}

/* ---------- Store ---------- */
let DB;
const Store = {
  load() {
    try { DB = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { DB = null; }
    if (!DB || DB.version !== DATA_VERSION) { DB = seed(); this.save(); }
  },
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); }
    catch (e) { console.warn(e); typeof toast === 'function' && toast('Локальное хранилище заполнено — часть фото не сохранится', 'err'); }
  },
  reset() { localStorage.removeItem(STORAGE_KEY); DB = seed(); this.save(); },
};

function nextId(prefix, key, pad = 4) { DB.seq[key] = (DB.seq[key] || 0) + 1; return prefix + String(DB.seq[key]).padStart(pad, '0'); }
const byId = (list, id) => list.find(x => x.id === id);
const clientById = id => byId(DB.clients, id);
const countryBy = code => DB.countries.find(c => c.code === code);
const parcelById = id => byId(DB.parcels, id);
const pointById = id => byId(DB.points, id);
const levelOf = c => DB.levels.find(l => l.id === c?.level) || DB.levels[0];
