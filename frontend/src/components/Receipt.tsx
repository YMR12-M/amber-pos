import type { Order, PaymentMethod } from "../types";
import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "../types";
import { formatStamp, ltr, money } from "../lib/format";
import { useSettings } from "../context/SettingsContext";
import { BRAND, LogoMark, orderNo } from "./brand";

/**
 * فاتورة حرارية 80mm.
 *
 * الترتيب متبع الاصطلاح العالمي للفواتير، وكل بند فيه ليه سبب:
 *   1. المنشأة  — مين اللي باع (اسم · فرع · عنوان · تليفون)
 *   2. الرقم الضريبي — إلزامي في أغلب الأسواق للفاتورة المعتمدة
 *   3. رقم الفاتورة والتاريخ — المرجع اللي بيتبحث بيه في المرتجعات
 *   4. الكاشير والمحطة — المسؤولية: مين طبعها ومن أنهي جهاز
 *   5. البنود بسعر الوحدة — العميل يقدر يراجع الحساب بنفسه
 *   6. المجاميع بالترتيب — مجموع ← خصم ← ضريبة ← إجمالي
 *   7. طريقة الدفع
 *   8. تذييل الشكر + توقيع النظام
 *
 * بيانات المنشأة كلها من `useSettings()` — يعني من جدول `settings` اللي
 * الأدمن بيملاه. أي سطر بياناته فاضية بيتشال من الطباعة بدل ما يطبع
 * عنوان فاضي أو رقم ضريبي وهمي.
 *
 * `@media print` في styles/print.css بيخفي كل حاجة غيرها.
 */
export default function Receipt({
  order,
  paymentMethod,
}: {
  order: Order;
  paymentMethod: PaymentMethod | null;
}) {
  const { settings } = useSettings();
  const discount = Number(order.discount);
  const tax = Number(order.tax);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  // نسبة الضريبة بتتحسب من الفاتورة نفسها مش من إعداد ثابت،
  // فالفاتورة القديمة بتفضل تطبع بنسبتها هي لو الإعداد اتغيّر.
  const taxBase = Number(order.subtotal) - discount;
  const taxRate = taxBase > 0 && tax > 0 ? Math.round((tax / taxBase) * 1000) / 10 : null;

  return (
    <div className="receipt" dir="rtl">
      {/* ------------------------------ المنشأة ------------------------------ */}
      <div className="receipt__head">
        <div className="receipt__logo">
          <LogoMark size={44} tone="print" />
        </div>
        {settings.merchant_name && (
          <div className="receipt__merchant">{settings.merchant_name}</div>
        )}
        {settings.branch && <div className="receipt__branch">{settings.branch}</div>}
        {settings.address && <div className="receipt__contact">{settings.address}</div>}
        {/* التليفون والرقم الضريبي تركيبهم لاتيني — من غير `ltr()`
            بتتقلب مجموعاتهم على الورق: "0100 000 0000" بتطبع بالمقلوب. */}
        {settings.phone && <div className="receipt__contact num">{ltr(settings.phone)}</div>}
        {settings.tax_id && (
          <div className="receipt__tax num">الرقم الضريبي: {ltr(settings.tax_id)}</div>
        )}
      </div>

      <hr className="receipt__rule" />

      <div className="receipt__no num">فاتورة {orderNo(order.id)}</div>

      {/* ------------------------------ البيانات ----------------------------- */}
      <div className="receipt__meta">
        <div className="receipt__meta-row">
          <span>النوع</span>
          <span>{order.table_label ?? ORDER_TYPE_LABELS[order.order_type]}</span>
        </div>
        <div className="receipt__meta-row">
          <span>الكاشير</span>
          <span>{order.cashier_name ?? "—"}</span>
        </div>
        <div className="receipt__meta-row">
          <span>المحطة</span>
          <span className="num">{settings.station}</span>
        </div>
        <div className="receipt__meta-row">
          <span>التاريخ</span>
          <span className="num">{formatStamp(order.paid_at ?? order.created_at)}</span>
        </div>
      </div>

      <hr className="receipt__rule" />

      {/* ------------------------------- البنود ------------------------------ */}
      <table className="receipt__table">
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="receipt__item-name">{item.item_name}</span>
                {/* سعر الوحدة تحت الاسم — العميل يقدر يراجع الحساب بنفسه */}
                <span className="receipt__item-calc num">
                  {item.quantity} × {money(item.unit_price)}
                </span>
                {item.notes && <span className="receipt__item-note">{item.notes}</span>}
              </td>
              <td className="num">{money(Number(item.unit_price) * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="receipt__rule" />

      {/* ------------------------------ المجاميع ----------------------------- */}
      <div className="receipt__row">
        <span>عدد الأصناف</span>
        <span className="num">{itemCount}</span>
      </div>
      <div className="receipt__row">
        <span>المجموع</span>
        <span className="num">{money(order.subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="receipt__row">
          <span>الخصم</span>
          <span className="num">− {money(discount)}</span>
        </div>
      )}
      {tax > 0 && (
        <div className="receipt__row">
          <span>الضريبة{taxRate !== null && <span className="num"> {ltr(`(${taxRate}%)`)}</span>}</span>
          <span className="num">{money(tax)}</span>
        </div>
      )}

      <div className="receipt__grand">
        <span>الإجمالي</span>
        <span className="num">
          {money(order.total)} {settings.currency}
        </span>
      </div>

      {paymentMethod && (
        <div className="receipt__row receipt__row--pay">
          <span>طريقة الدفع</span>
          <span>{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
        </div>
      )}

      <hr className="receipt__rule" />

      {/* ------------------------------ التذييل ------------------------------ */}
      <div className="receipt__foot">
        {settings.receipt_footer && (
          <div className="receipt__thanks">{settings.receipt_footer}</div>
        )}
        <div className="receipt__ref num">
          مرجع الفاتورة: {orderNo(order.id)} · {settings.station}
        </div>
        <div className="receipt__by">
          {BRAND.name} {BRAND.suffix} — {BRAND.tagline}
        </div>
      </div>
    </div>
  );
}
