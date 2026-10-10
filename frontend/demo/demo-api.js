/* ============================================
   النسخة التجريبية (عرض فقط) - النواة المشتركة

   بتعترض طلبات fetch لمسار الـ API وبترد عليها من بيانات وهمية متخزنة في
   localStorage عند الزائر نفسه. مفيش سيرفر ولا قاعدة بيانات: كل زائر معاه
   نسخته الخاصة، ومفيش أي حاجة بتتبعت لأي مكان.

   الملف ده مش بيتحمّل في النسخة الحقيقية خالص - بيتحط في index.html بتاع
   النسخة التجريبية بس (demo/inject.mjs). ومفيش أي تعديل على كود الواجهة.
   ============================================ */

function createDemo(cfg) {
  'use strict';

  var pad = function (n) {
    return String(n).padStart(2, '0');
  };

  var H = {
    pad: pad,
    now: function () {
      return Date.now();
    },
    // "YYYY-MM-DD HH:MM:SS" بتوقيت UTC (زي DATETIME من MySQL)
    utc: function (ms) {
      var d = new Date(ms);
      return (
        d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' +
        pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds())
      );
    },
    day: function (ms) {
      return H.utc(ms).slice(0, 10);
    },
    iso: function (ms) {
      return new Date(ms).toISOString();
    },
    // أيام نسبية لـ "النهارده" بتوقيت الزائر (YYYY-MM-DD)
    localDay: function (offset) {
      var d = new Date();
      d.setDate(d.getDate() + (offset || 0));
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    // رقم ثابت 0..999 من نص: عشان البيانات المتولّدة تبقى متكررة مش عشوائية
    hash: function (str) {
      var h = 2166136261;
      str = String(str);
      for (var i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) % 1000;
    },
    code: function (length, alphabet) {
      alphabet = alphabet || 'abcdefghijklmnopqrstuvwxyz0123456789';
      var out = '';
      for (var i = 0; i < length; i += 1) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      return out;
    },
    ok: function (body, status) {
      return { status: status || 200, body: body };
    },
    seq: function (db, kind) {
      db.seq = db.seq || {};
      db.seq[kind] = (db.seq[kind] || 0) + 1;
      return db.seq[kind];
    },
    clone: function (value) {
      return JSON.parse(JSON.stringify(value));
    },
  };

  var db = null;

  function load() {
    try {
      var raw = localStorage.getItem(cfg.key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.__v === cfg.version) return parsed;
      }
    } catch (e) {
      /* التخزين المحلي مقفول - هنكمّل من الذاكرة */
    }
    return null;
  }

  function save() {
    try {
      localStorage.setItem(cfg.key, JSON.stringify(db));
    } catch (e) {
      /* الكوتا خلصت أو التخزين مقفول - الجلسة الحالية شغّالة من الذاكرة */
    }
  }

  function reset() {
    db = { __v: cfg.version, seq: {} };
    cfg.seed(db, H);
    save();
  }

  db = load();
  if (!db) reset();

  /* ---------- اعتراض fetch ---------- */

  var prefixes = [].concat(cfg.prefix);
  var realFetch = window.fetch.bind(window);

  function matchPrefix(pathname) {
    for (var i = 0; i < prefixes.length; i += 1) {
      var p = prefixes[i];
      if (pathname === p || pathname.indexOf(p + '/') === 0) return pathname.slice(p.length) || '/';
    }
    return null;
  }

  function headerValue(headers, name) {
    if (!headers) return undefined;
    if (typeof headers.get === 'function') return headers.get(name);
    var lower = name.toLowerCase();
    for (var k in headers) if (k.toLowerCase() === lower) return headers[k];
    return undefined;
  }

  window.fetch = function (input, init) {
    var raw = typeof input === 'string' ? input : input && (input.url || input.href);
    var parsed;
    try {
      parsed = new URL(raw, window.location.origin);
    } catch (e) {
      return realFetch(input, init);
    }
    var path = parsed.origin === window.location.origin ? matchPrefix(parsed.pathname) : null;
    if (path === null) return realFetch(input, init);

    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var headers = (init && init.headers) || (input && input.headers) || {};
    var body = null;
    var rawBody = init && init.body;
    if (typeof rawBody === 'string' && rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        body = null;
      }
    }
    var query = {};
    parsed.searchParams.forEach(function (v, k) {
      query[k] = v;
    });

    var result;
    try {
      result = cfg.handle({ method: method, path: path, query: query, body: body, headers: headers, header: function (n) { return headerValue(headers, n); } }, db, H);
      if (!result) result = { status: 404, body: cfg.notFound ? cfg.notFound(path) : { message: 'المسار ده مش موجود في النسخة التجريبية' } };
      save();
    } catch (e) {
      if (window.console) console.error('[demo]', e);
      result = { status: 500, body: cfg.serverError ? cfg.serverError() : { message: 'حصل خطأ في النسخة التجريبية' } };
    }

    return new Promise(function (resolve) {
      setTimeout(function () {
        var h = Object.assign({ 'Content-Type': 'application/json' }, result.headers || {});
        var payload = result.status === 204 ? null : result.raw ? result.body : JSON.stringify(result.body);
        resolve(new Response(payload, { status: result.status, headers: h }));
      }, 40 + Math.floor(Math.random() * 80));
    });
  };

  /* ---------- شريط التجربة ---------- */

  var API = {
    db: function () {
      return db;
    },
    H: H,
    save: save,
    reset: function () {
      try {
        localStorage.removeItem(cfg.key);
      } catch (e) {
        /* لا شيء */
      }
      if (cfg.onReset) cfg.onReset();
      window.location.href = cfg.home || '/';
    },
    go: function (url) {
      save();
      window.location.href = url || cfg.home || '/';
    },
  };

  function mountBar() {
    if (document.getElementById('demo-bar')) return;
    var bar = cfg.bar || {};
    var style = document.createElement('style');
    style.textContent =
      '#demo-bar{position:fixed;left:10px;bottom:10px;z-index:2147483000;font-family:inherit;direction:rtl;font-size:13px;line-height:1.5}' +
      '#demo-bar *{box-sizing:border-box}' +
      '#demo-toggle{display:flex;align-items:center;gap:6px;background:#1c1c24;color:#fff;border:1px solid rgba(255,255,255,.28);' +
      'border-radius:999px;padding:7px 13px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}' +
      '#demo-toggle i{width:8px;height:8px;border-radius:50%;background:#f5b93a;display:inline-block}' +
      '#demo-panel{display:none;position:absolute;left:0;bottom:calc(100% + 8px);width:min(290px,calc(100vw - 20px));' +
      'background:#fff;color:#1c1c24;border:1px solid #d6d6dc;border-radius:14px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.3)}' +
      '#demo-panel p{margin:0 0 8px;font-size:12.5px;color:#454552}' +
      '#demo-panel button{display:block;width:100%;margin-top:6px;padding:9px 11px;border-radius:10px;border:1px solid #1c1c24;' +
      'background:#fff;color:#1c1c24;font:inherit;font-weight:700;text-align:right;cursor:pointer}' +
      '#demo-panel button.primary{background:#1c1c24;color:#fff}' +
      '#demo-panel small{display:block;margin-top:9px;font-size:11.5px;color:#6a6a78}';
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'demo-bar';
    var actions = (bar.actions || [])
      .map(function (a, i) {
        return '<button type="button" class="' + (a.primary ? 'primary' : '') + '" data-i="' + i + '"></button>';
      })
      .join('');
    wrap.innerHTML =
      '<div id="demo-panel" role="dialog" aria-label="خيارات النسخة التجريبية">' +
      '<p></p>' + actions +
      '<button type="button" data-reset="1">إعادة ضبط البيانات</button><small></small></div>' +
      '<button id="demo-toggle" type="button" aria-expanded="false" aria-controls="demo-panel"><i></i><span></span></button>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector('#demo-panel');
    var toggle = wrap.querySelector('#demo-toggle');
    toggle.querySelector('span').textContent = bar.label || 'نسخة تجريبية';
    panel.querySelector('p').textContent =
      bar.intro || 'ده عرض للتطبيق ببيانات وهمية متخزنة على جهازك بس.';
    panel.querySelector('small').textContent = bar.note || '';
    (bar.actions || []).forEach(function (a, i) {
      panel.querySelector('button[data-i="' + i + '"]').textContent = a.label;
    });

    function setOpen(open) {
      panel.style.display = open ? 'block' : 'none';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () {
      setOpen(panel.style.display !== 'block');
    });
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute('data-reset')) return API.reset();
      var idx = t.getAttribute('data-i');
      if (idx !== null && bar.actions[Number(idx)]) bar.actions[Number(idx)].run(API);
    });
    if (bar.openFirst && !sessionStorage.getItem(cfg.key + ':seen')) {
      try {
        sessionStorage.setItem(cfg.key + ':seen', '1');
      } catch (e) {
        /* لا شيء */
      }
      setOpen(true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBar);
  else mountBar();

  return API;
}
/* ============================================
   عنبر POS - الباك إند التجريبي
   الأشكال مطابقة لـ frontend/src/types.ts وbackend/src/controllers/*.
   الفلوس هنا بالقروش (أعداد صحيحة) زي السيرفر، وبتتحوّل لنص "12.50" في الرد.
   ============================================ */

(function () {
  'use strict';

  var PASSWORD = 'demo1234';
  var MINUTE = 60000;

  function egp(piastres) {
    return (piastres / 100).toFixed(2);
  }
  function toP(value) {
    return Math.round(Number(value) * 100);
  }
  function fail(status, message) {
    return { status: status, body: { message: message } };
  }

  /* ---------- بيانات البداية ---------- */

  function seed(db, H) {
    db.session = null;
    db.settings = {
      merchant_name: 'مقهى عنبر', branch: 'فرع الزمالك', address: '12 شارع الجزيرة، الزمالك، القاهرة',
      phone: '02 2735 0000', tax_id: '412-889-203', station: 'POS-01', currency: 'ج.م',
      tax_rate: 0.14, receipt_footer: 'شكراً لزيارتكم — نورتونا',
    };
    var created = H.utc(H.now() - 20 * 86400000);
    db.users = [
      { id: 1, name: 'سلمى المدير', email: 'admin@amber.demo', role: 'admin', is_active: 1, created_at: created },
      { id: 2, name: 'كريم الكاشير', email: 'cashier@amber.demo', role: 'cashier', is_active: 1, created_at: created },
      { id: 3, name: 'الشيف مصطفى', email: 'kitchen@amber.demo', role: 'kitchen', is_active: 1, created_at: created },
    ];
    db.seq.user = 3;

    db.categories = [
      { id: 1, name: 'القهوة', sort_order: 1 },
      { id: 2, name: 'مشروبات باردة', sort_order: 2 },
      { id: 3, name: 'مخبوزات', sort_order: 3 },
      { id: 4, name: 'حلويات', sort_order: 4 },
      { id: 5, name: 'وجبات خفيفة', sort_order: 5 },
    ];
    db.seq.category = 5;

    var items = [
      [1, 'إسبريسو', 'شوت مضاعف من حبوب محمصة محلياً', 35],
      [1, 'كابتشينو', 'إسبريسو وحليب مبخّر ورغوة كثيفة', 55],
      [1, 'لاتيه', 'إسبريسو بحليب كريمي', 60],
      [1, 'قهوة تركي', 'محوّجة بالهيل', 40],
      [1, 'فلات وايت', 'شوتين إسبريسو وحليب مخملي', 65],
      [2, 'آيس لاتيه', 'قهوة مثلجة بالحليب', 65],
      [2, 'ليمون بالنعناع', 'عصير ليمون طازج', 45],
      [2, 'موهيتو فراولة', 'فراولة وليمون ونعناع', 70],
      [3, 'كرواسون زبدة', 'مخبوز طازج كل صباح', 40],
      [3, 'ساندوتش جبنة رومي', 'عيش فينو وجبنة رومي وزعتر', 50],
      [4, 'تشيز كيك التوت', 'قطعة كبيرة بصوص التوت', 85],
      [4, 'براونيز', 'شوكولاتة داكنة مع جوز', 60],
      [4, 'أم علي', 'بالمكسرات والكريمة', 75],
      [5, 'بطاطس مقرمشة', 'مع صوص ثوم', 45],
      [5, 'سلطة سيزر', 'دجاج مشوي وجبنة بارميزان', 95],
      [5, 'ميني برجر', 'قطعتين مع جبنة شيدر', 110],
    ];
    db.menu = items.map(function (r, i) {
      return {
        id: i + 1, category_id: r[0], name: r[1], description: r[2], price: egp(r[3] * 100),
        image_url: null, is_available: r[1] === 'أم علي' ? 0 : 1,
      };
    });
    db.seq.menu = db.menu.length;

    db.tables = [];
    for (var t = 1; t <= 8; t += 1) {
      db.tables.push({ id: t, label: 'طاولة ' + t, status: 'free', is_active: 1 });
    }
    db.seq.table = 8;

    db.orders = [];
    db.seq.order = 0;
    db.seq.orderItem = 0;

    function makeOrder(spec) {
      var id = ++db.seq.order;
      var subtotal = 0;
      var itemRows = spec.items.map(function (it) {
        var m = db.menu[it[0] - 1];
        subtotal += toP(m.price) * it[1];
        return {
          id: ++db.seq.orderItem, order_id: id, menu_item_id: m.id, item_name: m.name, quantity: it[1],
          unit_price: m.price, notes: it[2] || null, status: spec.itemStatus || 'pending',
        };
      });
      var discount = spec.discount || 0;
      var tax = Math.round((subtotal - discount) * db.settings.tax_rate);
      var table = spec.table ? db.tables[spec.table - 1] : null;
      db.orders.push({
        id: id, table_id: table ? table.id : null, cashier_id: 2, order_type: spec.type || 'dine_in',
        status: spec.status, subtotal: egp(subtotal), discount: egp(discount), tax: egp(tax),
        total: egp(subtotal - discount + tax), payment_method: spec.method || null,
        created_at: H.utc(spec.at), paid_at: spec.paidAt ? H.utc(spec.paidAt) : null, items: itemRows,
      });
      if (table && ['pending', 'preparing', 'ready', 'served'].indexOf(spec.status) !== -1) table.status = 'occupied';
    }

    // سجل مبيعات آخر 7 أيام: طلبات مدفوعة موزّعة على ساعات اليوم
    var dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    for (var d = 6; d >= 0; d -= 1) {
      var count = 14 + (H.hash('d' + d) % 9);
      for (var n = 0; n < count; n += 1) {
        var seedKey = 'o' + d + '-' + n;
        var at = dayStart.getTime() - d * 86400000 + (8 * 60 + (H.hash(seedKey) % 780)) * MINUTE;
        if (at > H.now() - 45 * MINUTE) continue; // النهارده: بس اللي فات
        var lines = [];
        var lineCount = 1 + (H.hash(seedKey + 'l') % 4);
        for (var l = 0; l < lineCount; l += 1) {
          lines.push([1 + (H.hash(seedKey + 'i' + l) % 15), 1 + (H.hash(seedKey + 'q' + l) % 2)]);
        }
        var pick = H.hash(seedKey + 'm') % 10;
        makeOrder({
          status: 'paid', at: at, paidAt: at + 20 * MINUTE, items: lines, itemStatus: 'served',
          table: 1 + (H.hash(seedKey + 't') % 8), type: pick === 0 ? 'takeaway' : 'dine_in',
          method: pick < 6 ? 'cash' : pick < 9 ? 'card' : 'other',
          discount: H.hash(seedKey + 'd') % 12 === 0 ? 1000 : 0,
        });
        var last = db.orders[db.orders.length - 1];
        if (last.order_type === 'takeaway') last.table_id = null;
      }
    }
    // تحرير الطاولات اللي المدفوعات القديمة كانت واخداها
    db.tables.forEach(function (tb) {
      tb.status = 'free';
    });

    // طلبات مفتوحة دلوقتي
    var now = H.now();
    makeOrder({ status: 'pending', at: now - 4 * MINUTE, table: 3, items: [[3, 2], [9, 1, 'سخن'], [11, 1]] });
    makeOrder({ status: 'preparing', at: now - 11 * MINUTE, table: 5, items: [[16, 2], [14, 1], [7, 2]], itemStatus: 'preparing' });
    makeOrder({ status: 'ready', at: now - 17 * MINUTE, table: 1, items: [[2, 1], [10, 1]], itemStatus: 'ready' });
    makeOrder({ status: 'pending', at: now - 2 * MINUTE, type: 'takeaway', items: [[1, 2], [12, 2]] });
    makeOrder({ status: 'served', at: now - 31 * MINUTE, table: 6, items: [[15, 1], [8, 1], [13, 2]], itemStatus: 'served' });
  }

  /* ---------- أدوات ---------- */

  function tableLabel(db, id) {
    var t = db.tables.filter(function (x) {
      return x.id === id;
    })[0];
    return t ? t.label : null;
  }

  function userName(db, id) {
    var u = db.users.filter(function (x) {
      return x.id === id;
    })[0];
    return u ? u.name : null;
  }

  function orderView(db, o) {
    return Object.assign({}, o, {
      table_label: o.table_id ? tableLabel(db, o.table_id) : null,
      cashier_name: userName(db, o.cashier_id),
      items: o.items.map(function (i) {
        return Object.assign({}, i);
      }),
    });
  }

  function openOrderIdFor(db, tableId) {
    var o = db.orders.filter(function (x) {
      return x.table_id === tableId && ['pending', 'preparing', 'ready', 'served'].indexOf(x.status) !== -1;
    })[0];
    return o ? o.id : null;
  }

  function currentUser(db) {
    if (!db.session) return null;
    return db.users.filter(function (u) {
      return u.id === db.session.userId && u.is_active;
    })[0] || null;
  }

  function publicUser(u) {
    return { id: u.id, name: u.name, email: u.email, role: u.role, is_active: u.is_active };
  }

  function findById(list, id) {
    return list.filter(function (x) {
      return x.id === Number(id);
    })[0];
  }

  /* ---------- الراوتر ---------- */

  function handle(req, db, H) {
    var m;
    var method = req.method;
    var p = req.path;
    var body = req.body || {};

    if (method === 'POST' && p === '/auth/login') {
      var email = String(body.email || '').trim().toLowerCase();
      var u = db.users.filter(function (x) {
        return x.email === email && x.is_active;
      })[0];
      if (!u || String(body.password) !== PASSWORD) return fail(401, 'بيانات الدخول غير صحيحة');
      db.session = { userId: u.id };
      return H.ok({ user: publicUser(u) });
    }
    if (method === 'POST' && p === '/auth/logout') {
      db.session = null;
      return H.ok({ message: 'تم تسجيل الخروج' });
    }
    if (method === 'GET' && p === '/settings/public') {
      var s = db.settings;
      return H.ok({ merchant_name: s.merchant_name, branch: s.branch, station: s.station, currency: s.currency });
    }

    var user = currentUser(db);
    if (!user) return fail(401, 'الجلسة منتهية، سجل دخول تاني');
    var isAdmin = user.role === 'admin';
    function adminOnly() {
      return isAdmin ? null : fail(403, 'العملية دي للأدمن بس');
    }

    if (method === 'GET' && p === '/auth/me') return H.ok({ user: publicUser(user) });
    if (method === 'GET' && p === '/settings') return H.ok(db.settings);
    if (method === 'PUT' && p === '/settings') {
      var denied = adminOnly();
      if (denied) return denied;
      var rate = Number(body.tax_rate);
      if (!(rate >= 0 && rate <= 0.5)) return fail(400, 'نسبة الضريبة لازم تكون بين 0 و 50%');
      db.settings = Object.assign({}, db.settings, body, { tax_rate: rate });
      return H.ok({ message: 'تم حفظ الإعدادات', settings: db.settings });
    }

    /* --- المنيو --- */
    if (method === 'GET' && p === '/menu/categories') {
      return H.ok(db.categories.slice().sort(function (a, b) {
        return a.sort_order - b.sort_order || a.id - b.id;
      }));
    }
    if (method === 'POST' && p === '/menu/categories') {
      if (!body.name || !String(body.name).trim()) return fail(400, 'اكتب اسم القسم');
      if (db.categories.some(function (c) { return c.name === String(body.name).trim(); })) return fail(409, 'في قسم بنفس الاسم');
      var cat = { id: H.seq(db, 'category'), name: String(body.name).trim(), sort_order: Number(body.sort_order) || db.categories.length + 1 };
      db.categories.push(cat);
      return H.ok(cat, 201);
    }
    if ((m = /^\/menu\/categories\/(\d+)$/.exec(p))) {
      var c = findById(db.categories, m[1]);
      if (!c) return fail(404, 'القسم غير موجود');
      if (method === 'PUT') {
        if (body.name !== undefined) c.name = String(body.name).trim();
        if (body.sort_order !== undefined) c.sort_order = Number(body.sort_order);
        return H.ok({ message: 'تم التحديث' });
      }
      if (method === 'DELETE') {
        var cnt = db.menu.filter(function (x) { return x.category_id === c.id; }).length;
        if (cnt) return fail(409, 'القسم فيه ' + cnt + ' صنف — احذفهم أو انقلهم لقسم تاني الأول');
        db.categories = db.categories.filter(function (x) { return x.id !== c.id; });
        return H.ok({ message: 'تم الحذف' });
      }
    }
    if (method === 'GET' && p === '/menu/items') {
      var list = db.menu;
      if (req.query.category_id) {
        list = list.filter(function (x) { return x.category_id === Number(req.query.category_id); });
      }
      return H.ok(list);
    }
    if (method === 'POST' && p === '/menu/items') {
      if (!body.name || !String(body.name).trim()) return fail(400, 'اكتب اسم الصنف');
      if (!(Number(body.price) >= 0)) return fail(400, 'السعر مش صحيح');
      if (!findById(db.categories, body.category_id)) return fail(400, 'القسم غير موجود');
      var mi = {
        id: H.seq(db, 'menu'), category_id: Number(body.category_id), name: String(body.name).trim(),
        description: body.description || null, price: Number(body.price).toFixed(2), image_url: null, is_available: 1,
      };
      db.menu.push(mi);
      return H.ok(mi, 201);
    }
    if ((m = /^\/menu\/items\/(\d+)\/toggle$/.exec(p)) && method === 'PATCH') {
      var ti = findById(db.menu, m[1]);
      if (!ti) return fail(404, 'الصنف غير موجود');
      ti.is_available = ti.is_available ? 0 : 1;
      return H.ok({ message: 'تم التحديث' });
    }
    if ((m = /^\/menu\/items\/(\d+)$/.exec(p))) {
      var item = findById(db.menu, m[1]);
      if (!item) return fail(404, 'الصنف غير موجود');
      if (method === 'PUT') {
        if (body.name !== undefined) item.name = String(body.name).trim();
        if (body.price !== undefined) item.price = Number(body.price).toFixed(2);
        if (body.category_id !== undefined) item.category_id = Number(body.category_id);
        if (body.description !== undefined) item.description = body.description;
        return H.ok({ message: 'تم التحديث' });
      }
      if (method === 'DELETE') {
        var used = db.orders.some(function (o) {
          return o.items.some(function (i) { return i.menu_item_id === item.id; });
        });
        if (used) return fail(409, 'الصنف ده موجود في طلبات سابقة — وقّفه بدل ما تحذفه');
        db.menu = db.menu.filter(function (x) { return x.id !== item.id; });
        return H.ok({ message: 'تم الحذف' });
      }
    }

    /* --- الطاولات --- */
    if (method === 'GET' && p === '/tables') {
      var withArchived = req.query.include_archived === '1';
      return H.ok(
        db.tables
          .filter(function (t) { return withArchived || t.is_active; })
          .map(function (t) {
            return { id: t.id, label: t.label, status: t.status, is_active: t.is_active, active_order_id: openOrderIdFor(db, t.id) };
          })
      );
    }
    if (method === 'POST' && p === '/tables') {
      var label = String(body.label || '').trim();
      if (!label) return fail(400, 'اكتب اسم الطاولة');
      if (db.tables.some(function (t) { return t.label === label; })) return fail(409, 'في طاولة بنفس الاسم');
      var nt = { id: H.seq(db, 'table'), label: label, status: 'free', is_active: 1 };
      db.tables.push(nt);
      return H.ok(nt, 201);
    }
    if ((m = /^\/tables\/(\d+)(?:\/(status|restore))?$/.exec(p))) {
      var tb = findById(db.tables, m[1]);
      if (!tb) return fail(404, 'الطاولة غير موجودة');
      if (m[2] === 'status' && method === 'PATCH') {
        if (['free', 'occupied', 'reserved'].indexOf(body.status) === -1) return fail(400, 'حالة الطاولة مش صحيحة');
        if (openOrderIdFor(db, tb.id) && body.status === 'free') return fail(409, tb.label + ' عليها طلب مفتوح — اقفله الأول');
        tb.status = body.status;
        return H.ok({ message: 'تم التحديث' });
      }
      if (m[2] === 'restore' && method === 'PATCH') {
        tb.is_active = 1;
        return H.ok({ message: 'رجعت الطاولة للخدمة' });
      }
      if (!m[2] && method === 'PATCH') {
        var nl = String(body.label || '').trim();
        if (!nl) return fail(400, 'اكتب اسم الطاولة');
        if (db.tables.some(function (t) { return t.id !== tb.id && t.label === nl; })) return fail(409, 'في طاولة بنفس الاسم');
        tb.label = nl;
        return H.ok({ message: 'تم التحديث' });
      }
      if (!m[2] && method === 'DELETE') {
        var open = openOrderIdFor(db, tb.id);
        if (open) return fail(409, 'الطاولة عليها طلب مفتوح (#' + open + ') — اقفله الأول');
        var hasHistory = db.orders.some(function (o) { return o.table_id === tb.id; });
        if (hasHistory) {
          tb.is_active = 0;
          return H.ok({ message: 'اتأرشفت الطاولة', archived: true });
        }
        db.tables = db.tables.filter(function (t) { return t.id !== tb.id; });
        return H.ok({ message: 'تم حذف الطاولة', archived: false });
      }
    }

    /* --- الطلبات --- */
    if (method === 'POST' && p === '/orders') {
      var type = body.order_type || 'dine_in';
      if (!Array.isArray(body.items) || !body.items.length) return fail(400, 'الطلب فاضي');
      if (type === 'dine_in' && body.table_id == null) return fail(400, 'لازم تختار طاولة لطلبات الصالة');
      var table = null;
      if (body.table_id != null) {
        table = findById(db.tables, body.table_id);
        if (!table) return fail(404, 'الطاولة غير موجودة');
        if (!table.is_active) return fail(409, table.label + ' مؤرشفة ومش في الخدمة');
        if (table.status !== 'free') return fail(409, table.label + ' مش متاحة حالياً');
      }
      var subtotal = 0;
      var rows = [];
      for (var i = 0; i < body.items.length; i += 1) {
        var line = body.items[i];
        var mi2 = findById(db.menu, line.menu_item_id);
        if (!mi2) return fail(400, 'الصنف رقم ' + line.menu_item_id + ' غير موجود');
        if (!mi2.is_available) return fail(409, mi2.name + ' غير متاح حالياً');
        var qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
        subtotal += toP(mi2.price) * qty;
        rows.push({
          id: H.seq(db, 'orderItem'), order_id: 0, menu_item_id: mi2.id, item_name: mi2.name, quantity: qty,
          unit_price: mi2.price, notes: line.notes || null, status: 'pending',
        });
      }
      var disc = toP(body.discount || 0);
      if (disc > subtotal) return fail(400, 'الخصم (' + egp(disc) + ') أكبر من إجمالي الطلب (' + egp(subtotal) + ')');
      var tax = Math.round((subtotal - disc) * db.settings.tax_rate);
      var oid = H.seq(db, 'order');
      rows.forEach(function (r) { r.order_id = oid; });
      db.orders.push({
        id: oid, table_id: table ? table.id : null, cashier_id: user.id, order_type: type, status: 'pending',
        subtotal: egp(subtotal), discount: egp(disc), tax: egp(tax), total: egp(subtotal - disc + tax),
        payment_method: null, created_at: H.utc(H.now()), paid_at: null, items: rows,
      });
      if (table) table.status = 'occupied';
      return H.ok({ id: oid, subtotal: egp(subtotal), discount: egp(disc), tax: egp(tax), total: egp(subtotal - disc + tax) }, 201);
    }

    if (method === 'GET' && p === '/orders/kitchen-queue') {
      return H.ok(
        db.orders
          .filter(function (o) { return ['pending', 'preparing', 'ready'].indexOf(o.status) !== -1; })
          .sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; })
          .map(function (o) {
            return {
              id: o.id, order_type: o.order_type, status: o.status, table_label: o.table_id ? tableLabel(db, o.table_id) : null,
              created_at: o.created_at, items: o.items.map(function (i) { return Object.assign({}, i); }),
            };
          })
      );
    }

    if (method === 'GET' && p === '/orders/reports/sales') {
      var denied2 = adminOnly();
      if (denied2) return denied2;
      var days = Math.min(Math.max(Math.floor(Number(req.query.days)) || 7, 1), 365);
      var startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      var since = H.utc(startOfToday.getTime() - days * 86400000);
      var paid = db.orders.filter(function (o) { return o.status === 'paid' && o.paid_at >= since; });
      var byDay = {};
      var byMethod = {};
      paid.forEach(function (o) {
        var dk = o.paid_at.slice(0, 10);
        byDay[dk] = byDay[dk] || { day: dk, orders_count: 0, total_sales: 0, total_discount: 0 };
        byDay[dk].orders_count += 1;
        byDay[dk].total_sales += toP(o.total);
        byDay[dk].total_discount += toP(o.discount);
        byMethod[o.payment_method] = byMethod[o.payment_method] || { payment_method: o.payment_method, orders_count: 0, total_sales: 0 };
        byMethod[o.payment_method].orders_count += 1;
        byMethod[o.payment_method].total_sales += toP(o.total);
      });
      return H.ok({
        daily: Object.keys(byDay).sort().map(function (k) {
          var r = byDay[k];
          return { day: r.day, orders_count: r.orders_count, total_sales: egp(r.total_sales), total_discount: egp(r.total_discount) };
        }),
        by_payment_method: Object.keys(byMethod).map(function (k) {
          var r = byMethod[k];
          return { payment_method: r.payment_method, orders_count: r.orders_count, total_sales: egp(r.total_sales) };
        }),
      });
    }

    if (method === 'GET' && p === '/orders') {
      var statuses = req.query.status ? String(req.query.status).split(',') : [];
      var pageSize = Math.min(Math.max(Number(req.query.page_size) || 20, 1), 200);
      var page = Math.max(Number(req.query.page) || 1, 1);
      var all = db.orders
        .filter(function (o) { return !statuses.length || statuses.indexOf(o.status) !== -1; })
        .sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id; });
      return H.ok({
        data: all.slice((page - 1) * pageSize, page * pageSize).map(function (o) { return orderView(db, o); }),
        page: page, page_size: pageSize, total: all.length, total_pages: Math.ceil(all.length / pageSize),
      });
    }

    if ((m = /^\/orders\/(\d+)(?:\/(pay|status)|\/items\/(\d+)\/status)?$/.exec(p))) {
      var order = findById(db.orders, m[1]);
      if (!order) return fail(404, 'الطلب غير موجود');
      var closed = order.status === 'paid' || order.status === 'cancelled';
      if (!m[2] && !m[3] && method === 'GET') return H.ok(orderView(db, order));
      if (m[2] === 'pay' && method === 'POST') {
        if (['cash', 'card', 'other'].indexOf(body.payment_method) === -1) return fail(400, 'طريقة الدفع مش صحيحة');
        if (order.status === 'paid') return fail(409, 'الطلب مدفوع بالفعل');
        if (order.status === 'cancelled') return fail(409, 'الطلب ملغي ومش ممكن يتدفع');
        order.status = 'paid';
        order.payment_method = body.payment_method;
        order.paid_at = H.utc(H.now());
        order.items.forEach(function (i) { i.status = 'served'; });
        var tbl = order.table_id ? findById(db.tables, order.table_id) : null;
        if (tbl) tbl.status = 'free';
        return H.ok({ message: 'تم تسجيل الدفع', order_id: order.id, total: Number(order.total), payment_method: body.payment_method });
      }
      if (m[2] === 'status' && method === 'PATCH') {
        if (['pending', 'preparing', 'ready', 'served', 'paid', 'cancelled'].indexOf(body.status) === -1) return fail(400, 'حالة الطلب مش صحيحة');
        if (body.status === 'paid') return fail(400, 'استخدم الدفع لتسجيل الدفع');
        if (closed) return fail(409, 'الطلب مقفول بالفعل (' + order.status + ') ومش ممكن يتعدل');
        order.status = body.status;
        if (['preparing', 'ready', 'served'].indexOf(body.status) !== -1) {
          order.items.forEach(function (i) { i.status = body.status; });
        }
        if (body.status === 'cancelled' && order.table_id) {
          var ft = findById(db.tables, order.table_id);
          if (ft) ft.status = 'free';
        }
        return H.ok({ message: 'تم تحديث حالة الطلب' });
      }
      if (m[3] && method === 'PATCH') {
        if (closed) return fail(409, 'الطلب مقفول بالفعل (' + order.status + ') ومش ممكن يتعدل');
        var it = order.items.filter(function (x) { return x.id === Number(m[3]); })[0];
        if (!it) return fail(404, 'الصنف غير موجود في الطلب ده');
        if (['pending', 'preparing', 'ready', 'served'].indexOf(body.status) === -1) return fail(400, 'حالة الصنف مش صحيحة');
        it.status = body.status;
        return H.ok({ message: 'تم تحديث حالة الصنف' });
      }
    }

    /* --- الموظفين (أدمن بس) --- */
    if (p === '/users' || /^\/users\/\d+\/(toggle|password)$/.test(p)) {
      var denied3 = adminOnly();
      if (denied3) return denied3;
      if (method === 'GET' && p === '/users') return H.ok(db.users.map(function (x) { return Object.assign({}, x); }));
      if (method === 'POST' && p === '/users') {
        var em = String(body.email || '').trim().toLowerCase();
        if (!body.name || !em || !body.password || ['admin', 'cashier', 'kitchen'].indexOf(body.role) === -1) {
          return fail(400, 'البيانات ناقصة');
        }
        if (db.users.some(function (x) { return x.email === em; })) return fail(409, 'البريد الإلكتروني مستخدم بالفعل');
        var nu = { id: H.seq(db, 'user'), name: String(body.name).trim(), email: em, role: body.role, is_active: 1, created_at: H.utc(H.now()) };
        db.users.push(nu);
        return H.ok({ id: nu.id, name: nu.name, email: nu.email, role: nu.role }, 201);
      }
      if ((m = /^\/users\/(\d+)\/toggle$/.exec(p)) && method === 'PATCH') {
        var tu = findById(db.users, m[1]);
        if (!tu) return fail(404, 'المستخدم غير موجود');
        if (tu.id === user.id) return fail(400, 'مينفعش توقف حسابك بنفسك');
        if (tu.role === 'admin' && tu.is_active) {
          var admins = db.users.filter(function (x) { return x.role === 'admin' && x.is_active; }).length;
          if (admins <= 1) return fail(400, 'مينفعش توقف آخر حساب أدمن');
        }
        tu.is_active = tu.is_active ? 0 : 1;
        return H.ok({ message: 'تم التحديث' });
      }
      if ((m = /^\/users\/(\d+)\/password$/.exec(p)) && method === 'PATCH') {
        if (!findById(db.users, m[1])) return fail(404, 'المستخدم غير موجود');
        return H.ok({ message: 'تم تغيير كلمة المرور' });
      }
    }

    return null;
  }

  var demo = createDemo({
    key: 'amber_demo_db',
    version: 1,
    prefix: '/api',
    seed: seed,
    handle: handle,
    notFound: function () {
      return { message: 'المسار ده مش موجود في النسخة التجريبية' };
    },
    bar: {
      label: 'نسخة تجريبية',
      openFirst: true,
      intro: 'ده عرض لنظام عنبر POS ببيانات وهمية متخزنة على جهازك بس. ادخل بأي دور:',
      actions: [
        { label: 'ادخل كأدمن (لوحة التحكم والتقارير)', primary: true, run: function (a) { a.db().session = { userId: 1 }; a.go('/admin'); } },
        { label: 'ادخل ككاشير (شاشة البيع)', run: function (a) { a.db().session = { userId: 2 }; a.go('/pos'); } },
        { label: 'ادخل كمطبخ (شاشة الطلبات)', run: function (a) { a.db().session = { userId: 3 }; a.go('/kitchen'); } },
      ],
      note: 'أو سجّل دخول بـ admin@amber.demo أو cashier@amber.demo أو kitchen@amber.demo وكلمة المرور demo1234.',
    },
  });
})();
