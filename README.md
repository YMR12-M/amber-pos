# عنبر POS — نظام إدارة مطعم/كافيه

**التقنيات:** TypeScript · Node.js · Express · MySQL · React · Vite

نظام جاهز للتشغيل الحقيقي: **مفيش أي بيانات تجريبية** في الكود ولا في
قاعدة البيانات. أول تشغيل بيعمل حساب أدمن واحد بكلمة مرور إنت بتختارها،
وبعد كده بتدخّل أقسامك وأصنافك وطاولاتك وبيانات محلك من لوحة التحكم.

## الهيكل
```
AMBER POS/
├── backend/     → Node + Express + TypeScript + MySQL API
├── frontend/    → React + TypeScript (الإدارة / الكاشير / المطبخ)
├── DESIGN.md    → نظام التصميم (Amber POS)
└── BRAND.md     → دليل الهوية: الشعار · التجميعة · النبرة · الفاتورة
```

---

## التشغيل من أول خطوة

### 1) المتطلبات
MySQL 8+ (أو ما يعادله) و Node.js 20+.

### 2) الباك إند
```bash
cd backend
npm install
cp .env.example .env
```

ولّد مفتاح الجلسات — **التطبيق هيرفض يشتغل من غيره**:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
حط الناتج في `JWT_SECRET` جوه `.env`، وبيانات قاعدة البيانات كمان.

### 3) التجهيز
```bash
npm run setup
```
الأمر ده بيعمل تلات حاجات، وممكن تعيده في أي وقت من غير ضرر:
1. بينشئ قاعدة البيانات والجداول
2. بيرقّي أي قاعدة قديمة (بيضيف الأعمدة الناقصة)
3. بيسألك عن اسمك وبريدك وكلمة مرورك وبيعمل **حساب الأدمن الوحيد**

> مفيش حسابات جاهزة ولا كلمة مرور افتراضية. كلمة المرور لازم 10 حروف
> على الأقل وتجمع حروف وأرقام.

للتشغيل من غير أسئلة (Docker · CI):
```bash
SETUP_ADMIN_NAME="اسمك" SETUP_ADMIN_EMAIL="you@shop.com" \
SETUP_ADMIN_PASSWORD="..." npm run setup
```

### 4) شغّل
```bash
npm run dev          # http://localhost:4000
```
```bash
cd ../frontend
npm install
npm run dev          # http://localhost:5173
```

### 5) أول 5 دقايق جوّه النظام
ادخل بحساب الأدمن، وهتلاقي نفسك على تبويب **الإعدادات** على طول:

| الخطوة | التبويب | ليه |
|---|---|---|
| 1. بيانات المحل | **الإعدادات** | الاسم والعنوان والرقم الضريبي **بيتطبعوا على كل فاتورة** — من غيرهم الفاتورة بترويسة فاضية |
| 2. نسبة الضريبة والعملة | **الإعدادات** | السيرفر بيحسب بيها كل طلب جديد |
| 3. الأقسام | **المنيو** | مشروبات · أطباق رئيسية … الأصناف بتتحط جوّاهم |
| 4. الأصناف والأسعار | **المنيو** | |
| 5. الطاولات | **الطاولات** | سيبها فاضية لو تيك أواي بس |
| 6. حسابات الموظفين | **الموظفين** | كاشير ومطبخ — كل واحد بحسابه |

---

## النشر على سيرفر حقيقي

الطريقة الموصى بيها: **السيرفر يقدّم الواجهة بنفسه** — أصل واحد، مفيش
CORS، والكوكي بتفضل `SameSite=Strict`.

```bash
# 1) ابنِ الواجهة
cd frontend && npm install && npm run build

# 2) ابنِ الباك إند
cd ../backend && npm install && npm run build
```

في `.env`:
```
NODE_ENV=production
SERVE_STATIC=true
DB_PASSWORD=<كلمة مرور حقيقية>
JWT_SECRET=<مفتاح جديد>
CORS_ORIGIN=
```

```bash
npm run setup     # أول مرة بس
npm start
```

السيرفر بيتحقق من إعدادات الإنتاج وقت الإقلاع وبيرفض يشتغل لو:
- `JWT_SECRET` ناقص أو أقصر من 32 حرف
- `DB_PASSWORD` فاضية
- `CORS_ORIGIN` فيها `*`
- مفيش طريقة للوصول (لا `SERVE_STATIC` ولا `CORS_ORIGIN`)

**قدّام السيرفر:** حط Nginx/Caddy بشهادة HTTPS يوجّه على `PORT`.
الكوكي بتتبعت `Secure` في الإنتاج، فمن غير HTTPS مفيش تسجيل دخول.

**لو الواجهة على دومين تاني غير الـ API:** حط الدومين في `CORS_ORIGIN`
و`COOKIE_SAMESITE=none` — من غيرها المتصفح مش هيبعت الكوكي.

**النسخ الاحتياطي:**
```bash
mysqldump -u <user> -p pos_system > backup-$(date +%F).sql
```

---

## الأدوار
| الدور | الصلاحيات |
|---|---|
| **Admin** | المنيو · الأقسام · الطاولات · الموظفين · التقارير · **الإعدادات** |
| **Cashier** | إنشاء الطلبات · الدفع · إلغاء الطلبات · طباعة الفواتير |
| **Kitchen** | طابور الطلبات وتحديث حالتها (**من غير أي بيانات مالية**) |

---

## تقسيم الفرونت إند

الفكرة: **كل ملف له مسؤولية واحدة**، فأي تعديل تعرف تروح له على طول.

```
frontend/src/
├── styles/                 ← كل الـ CSS (مفيش ستايل متناثر)
│   ├── tokens.css          · الألوان والخطوط والمسافات ← ابدأ من هنا
│   ├── base.css            · reset · سكرول · فوكس · حركات
│   ├── layout.css          · الشِل · التوب بار · السايدبار · الدوك
│   ├── components.css      · الأزرار · الكروت · الحقول · المودال …
│   ├── features.css        · أنماط الشاشات + الرسوم البيانية
│   └── print.css           · الفاتورة (80mm)
│
├── components/
│   ├── brand/              ← هوية **النظام** (مش بيانات المحل) — راجع BRAND.md
│   │   ├── brand.ts        · الاسم · الوصف · الإصدار
│   │   ├── geometry.ts     · مسارات الشعار — مصدر واحد لكل الأصول
│   │   └── Logo.tsx        · LogoMark · Wordmark · Logo
│   ├── icons/index.tsx     ← كل الأيقونات SVG inline
│   ├── ui/                 ← مكتبة الواجهة (Button, Modal, Toast …)
│   └── layout/             ← AppShell · TopBar · Sidebar · Dock
│
├── features/               ← منطق + عرض كل شاشة
│   ├── pos/                · useCart · usePosData · MenuGrid · CartPanel …
│   ├── kitchen/            · useKitchenQueue · KitchenCard
│   └── admin/              · CategoryManager · MenuManager · TablesManager
│                             · StaffManager · SettingsManager
│                             · SalesReport · SalesChart
│
├── pages/                  ← تركيب بس: كل صفحة بتجمّع مكوّناتها
├── context/
│   ├── AuthContext.tsx     · المستخدم الحالي
│   └── SettingsContext.tsx · بيانات المحل والعملة ← من الـ API مش من الكود
├── hooks/                  ← useTheme · usePolling · useClock · useAsyncList
├── lib/                    ← format (فلوس/تواريخ) · roles · cn
├── api.ts                  ← كل نداءات السيرفر
└── types.ts                ← الأنواع المشتركة
```

**عايز تغيّر…**

| إيه | فين |
|---|---|
| اسم محلك · عنوانك · رقمك الضريبي · العملة · الضريبة | **لوحة التحكم ← الإعدادات** (مش في الكود) |
| الألوان أو الخطوط أو المسافات | `styles/tokens.css` |
| اسم **النظام** نفسه أو شعاره | `components/brand/brand.ts` + `geometry.ts` ثم `npm run brand` |
| شكل شريط التنقل | `components/layout/Dock.tsx` + `styles/layout.css` |
| عناصر التنقل في شاشة | `dockItems` جوّه ملف الصفحة في `pages/` |
| شكل زر أو حقل | `components/ui/` + `styles/components.css` |
| منطق السلة | `features/pos/useCart.ts` |
| شكل الفاتورة | `components/Receipt.tsx` + `styles/print.css` |

---

## الاختبارات
```bash
cd backend
npm test        # 46 اختبار
npm run typecheck
```
الاختبارات **بتجهّز بياناتها بنفسها** (حسابات وأصناف وطاولات بأسماء
خاصة بكل تشغيلة) وبتمسحها وراها — مش بتعتمد على أي بيانات موجودة، ومش
بتلمس بيانات شغلك.

---

## الأمان

| الطبقة | التفاصيل |
|---|---|
| **التوكن** | httpOnly cookie + `SameSite` مضبوطة — **مش مقروء من JavaScript** |
| **Rate limiting** | 10 محاولات دخول / 15 دقيقة · `API_RATE_LIMIT` (600) طلب / دقيقة لكل IP |
| **JWT** | التطبيق بيرفض التشغيل بمفتاح افتراضي أو أقصر من 32 حرف |
| **CSP** | `script-src 'self'` + بصمة SHA-256 للسكربت السطري الوحيد — مفيش `unsafe-inline` للسكربتات |
| **Headers** | helmet (CSP · HSTS في الإنتاج · nosniff · X-Frame-Options) |
| **CORS** | allowlist صريح — `*` مرفوضة في الإنتاج |
| **كلمات المرور** | bcrypt بـ 12 rounds · 8 حروف كحد أدنى (10 لحساب المالك) |
| **SQL** | كل الاستعلامات parameterized |
| **فحص الإقلاع** | الإنتاج بيرفض يشتغل بقاعدة بيانات من غير كلمة مرور |
| **إلغاء الجلسات** | إيقاف موظف أو تغيير كلمة مروره بيقفل جلسته المفتوحة **فوراً** — مش بعد ما التوكن يخلص |

---

## قواعد العمل المطبّقة في السيرفر

- الأسعار **دايماً** من قاعدة البيانات، مش من الكلاينت
- **نسبة الضريبة من الإعدادات المحفوظة** — الكلاينت ما بيبعتهاش، فمستحيل
  كاشير يغيّرها من الشاشة
- الخصم **مينفعش** يزيد عن إجمالي الطلب
- الطاولة بتتقفل (`FOR UPDATE`) وقت إنشاء الطلب — مستحيل طلبين على نفس الطاولة
- الطلب المدفوع أو الملغي **مينفعش** يتعدل
- كل الحسابات المالية بالقروش (integers) — مفيش أخطاء floating point
- مينفعش توقف آخر حساب أدمن
- **الصنف اللي اتباع مينفعش يتحذف** — "إيقاف" بدلها، عشان التقارير تفضل صح
- **الطاولة اللي عليها فواتير بتتأرشف مش بتتحذف** — الفواتير القديمة
  بتفضل عارفة اسمها
- **القسم اللي فيه أصناف مينفعش يتحذف**
- الطلب المقفول مقفول لآخره: **حتى حالة أصنافه** مينفعش تتغيّر
- كل التواريخ متخزّنة ومنقولة UTC، والعرض بيتحوّل لتوقيت الجهاز —
  وتقرير المبيعات بيتجمّع على **اليوم المحلي للمحل** مش يوم UTC

---

## الـ API

| Method | Endpoint | الصلاحية |
|---|---|---|
| POST | `/api/auth/login` · `/logout` | عام |
| GET | `/api/auth/me` | مسجّل دخول |
| GET | `/api/settings/public` | عام (اسم المحل بس) |
| GET | `/api/settings` | مسجّل دخول |
| PUT | `/api/settings` | admin |
| GET | `/api/menu/categories` | الكل |
| POST/PUT/DELETE | `/api/menu/categories` · `/:id` | admin |
| GET | `/api/menu/items` | الكل |
| POST/PUT/DELETE | `/api/menu/items` · `/:id` | admin |
| PATCH | `/api/menu/items/:id/toggle` | admin |
| GET | `/api/tables?include_archived=` | الكل |
| POST/PATCH/DELETE | `/api/tables` · `/:id` · `/:id/restore` | admin |
| PATCH | `/api/tables/:id/status` | admin · cashier |
| POST | `/api/orders` | admin · cashier |
| GET | `/api/orders?page=&page_size=&status=` | admin · cashier |
| | `status` بيقبل أكتر من حالة بفاصلة: `?status=pending,ready` | |
| **POST** | **`/api/orders/:id/pay`** | admin · cashier |
| PATCH | `/api/orders/:id/status` | admin · cashier · kitchen |
| PATCH | `/api/orders/:id/items/:itemId/status` | admin · kitchen |
| GET | `/api/orders/kitchen-queue` | admin · kitchen |
| GET | `/api/orders/reports/sales?days=` | admin |
| GET/POST | `/api/users` | admin |
| PATCH | `/api/users/:id/toggle` · `/password` | admin |
| GET | `/health` | عام |

كل الـ list endpoints بترجع `{ data, page, page_size, total, total_pages }`.

---

## الواجهة والأداء

| البند | التفاصيل |
|---|---|
| **تقسيم الكود** | كل شاشة `lazy` — الكاشير ما بيحمّلش كود لوحة التحكم |
| **chunks ثابتة** | React و router في ملفات منفصلة تفضل في الكاش بين النسخ |
| **التحديث الدوري** | `usePolling` بيقف لما التبويب يتخفي، وبيحدّث فوراً أول ما ترجع |
| **إعادة الرسم** | `memo` على كروت المنيو والطلبات — السلة ما بتعيدش رسم الشبكة |
| **`content-visibility`** | شبكات الكروت الطويلة ما بتترسمش وهي بره الشاشة |
| **مفيش صور** | الشعار والأيقونات كلها SVG inline — حادّة على أي كثافة بكسل |
| **الثيم قبل الرسم** | سكربت صغير في `index.html` بيمنع وميض الشاشة البيضا |
| **الوضع الداكن** | ألوان مختارة لكل وضع، مش مجرد قلب |
| **RTL** | خصائص منطقية في كل حتة — التحويل لـ LTR ما بيحتاجش تعديل |
| **إتاحة** | `<main>` + مخطط عناوين · رابط تخطي · حبس فوكس في المودال · تنقّل بالأسهم · صفر هدف لمس تحت 44px · `prefers-reduced-motion` |
| **تباين** | 33 من 35 زوج لون بيحققوا AA أو AAA (محسوبين بمعادلة WCAG) |

---

## خطوات لاحقة مقترحة
- Socket.io بدل الـ polling في شاشة المطبخ
- تعديل الطلب بعد إرساله (إضافة/حذف أصناف)
- استرجاع مبالغ (refunds) وتقرير الورديات
- رفع صور للمنتجات
- إغلاق يومي (Z-report)
- تصدير التقارير CSV
