import mysql from "mysql2/promise";
import { env } from "./env";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  ssl: env.db.ssl ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: "Z",
});

/**
 * كل اتصال بيتكلم UTC.
 *
 * أعمدة TIMESTAMP في MySQL بتتخزّن UTC جوّه، بس بتترجع متحوّلة للمنطقة
 * الزمنية بتاعة الجلسة — واللي افتراضياً بتبقى `SYSTEM` (توقيت السيرفر).
 * إحنا بنرجّع التواريخ كنصوص (`dateStrings`) والواجهة بتفهمها UTC، فلو
 * الجلسة على توقيت محلي التواريخ بتطلع متزحلقة بفرق التوقيت:
 * على سيرفر في مصر (UTC+3) الفاتورة كانت بتطبع وقت زيادة 3 ساعات،
 * ومؤقّت المطبخ كان بيطلع بالسالب فبيتقصّ على "0 د" — يعني **مفيش
 * طلب كان بيتعلّم متأخر أبداً**.
 *
 * بنثبّت الجلسة على UTC، فالمخزّن والمنقول والمعروض كلهم على نفس
 * المرجع مهما كان السيرفر فين. العرض للمستخدم بيتحوّل لتوقيته المحلي
 * في المتصفح (`Intl`)، والتقارير بتتجمّع على اليوم المحلي للمحل
 * (شوف `salesReport`).
 */
pool.on("connection", (connection) => {
  // `query` هنا بترجّع Promise. من غير `catch` أي فشل بيبقى رفض غير
  // ممسوك — وده بيوقّع Node، يعني السيرفر بيقع في نص وردية بسبب أمر
  // إعداد. بنحذّر بصوت عالي بدل كده: النظام بيفضل شغّال والتحذير
  // بيقول إن التواريخ محتاجة مراجعة.
  Promise.resolve(connection.query("SET time_zone = '+00:00'")).catch((err: unknown) => {
    console.error(
      "تحذير: تعذّر ضبط المنطقة الزمنية للاتصال على UTC — التواريخ ممكن تظهر بفرق توقيت السيرفر.",
      err instanceof Error ? err.message : err
    );
  });
});
