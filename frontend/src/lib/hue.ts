/**
 * لون القسم — تمانية أحبار (`--cat-1` … `--cat-8` في tokens.css).
 *
 * بيتحدّد بـ **id** القسم مش بترتيبه، فالقسم بياخد نفس اللون على كل جهاز
 * وفي كل وردية، وحذف قسم ما بيغيّرش ألوان اللي بعده. الكاشير بيتعلّم
 * «القهوة عنبري، والباردة تركواز» وبيروح للقسم بنظرة من غير ما يقرا.
 *
 * `0` = «الكل» (لون الحبر).
 */
export const HUE_COUNT = 8;

export function hueOf(categoryId: number): number {
  return ((Math.abs(Math.trunc(categoryId)) + HUE_COUNT - 1) % HUE_COUNT) + 1;
}
