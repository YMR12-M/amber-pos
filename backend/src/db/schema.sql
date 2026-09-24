-- ============================================================================
-- عنبر POS — مخطط قاعدة البيانات
--
-- الملف ده **قابل لإعادة التشغيل**: كل جملة فيه `IF NOT EXISTS`، والفهارس
-- معرّفة جوّه الجداول نفسها (مش `CREATE INDEX` منفصلة) عشان تشغيله تاني
-- على قاعدة شغّالة ما يفشلش.
--
-- مفيش أي بيانات تجريبية هنا — الصفوف الوحيدة اللي بتتزرع هي صف
-- الإعدادات الفاضي. أول حساب أدمن بيتعمل بـ `npm run setup`.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_system;

-- المستخدمين: admin / cashier / kitchen
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'cashier', 'kitchen') NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- لحظة آخر إلغاء للجلسات. NULL = عمره ما اتلغى.
  -- بيتحدّث عند إيقاف الحساب أو تغيير كلمة المرور، وأي توكن اتعمل
  -- فيها أو قبلها بيبقى ملغي — فالجلسة بتتقفل فوراً مش بعد 8 ساعات.
  tokens_valid_from TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- أقسام المنيو — بيعملها الأدمن من لوحة التحكم
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_categories_sort (sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- أصناف المنيو
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_menu_items_category (category_id),
  CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- طاولات الصالة.
-- `is_active = FALSE` معناها الطاولة اتأرشفت: مش بتظهر للكاشير، بس صفّها
-- باقي عشان الفواتير القديمة تفضل عارفة اسم الطاولة اللي اتباع عليها.
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  status ENUM('free', 'occupied', 'reserved') NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tables_active (is_active, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- الطلبات
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_id INT NULL,
  cashier_id INT NOT NULL,
  order_type ENUM('dine_in', 'takeaway', 'delivery') NOT NULL DEFAULT 'dine_in',
  status ENUM('pending', 'preparing', 'ready', 'served', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash', 'card', 'other') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  KEY idx_orders_status (status),
  KEY idx_orders_created (created_at),
  KEY idx_orders_paid (status, paid_at),
  KEY idx_orders_table_open (table_id, status),
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_cashier FOREIGN KEY (cashier_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- بنود الطلب
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  notes VARCHAR(255),
  status ENUM('pending', 'preparing', 'ready', 'served') NOT NULL DEFAULT 'pending',
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- إعدادات المنشأة — صف واحد بس (id = 1).
--
-- ده اللي بيتطبع على الفاتورة وبيظهر في التوب بار. بيتملى من لوحة التحكم
-- (تبويب الإعدادات)، مش مكتوب في الكود — عشان أي محل ينشر النظام لنفسه
-- من غير ما يلمس سطر واحد.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  merchant_name VARCHAR(120) NOT NULL DEFAULT '',
  branch VARCHAR(120) NOT NULL DEFAULT '',
  address VARCHAR(200) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  tax_id VARCHAR(40) NOT NULL DEFAULT '',
  station VARCHAR(20) NOT NULL DEFAULT 'POS-01',
  currency VARCHAR(10) NOT NULL DEFAULT 'ج.م',
  -- نسبة الضريبة كنسبة عشرية: 0.1400 = 14%. السيرفر هو اللي بيطبّقها،
  -- الكلاينت ما بيبعتهاش.
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  receipt_footer VARCHAR(200) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_settings_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (id) VALUES (1);
