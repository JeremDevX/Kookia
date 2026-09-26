export const IMPACT_MONTHS_PER_PAGE = 12;

const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

export const impactMonthCount = (from: string, to: string) => monthIndex(to) - monthIndex(from) + 1;

export const impactMonthPageCount = (from: string, to: string) => Math.ceil(impactMonthCount(from, to) / IMPACT_MONTHS_PER_PAGE);

export function impactMonthPage(from: string, to: string, page: number) {
  if (from > to) throw new RangeError("La date de début doit précéder la date de fin.");
  const totalMonths = impactMonthCount(from, to);
  const pageCount = Math.ceil(totalMonths / IMPACT_MONTHS_PER_PAGE);
  if (!Number.isInteger(page) || page < 0 || page >= pageCount)
    throw new RangeError("La page mensuelle est hors de la période sélectionnée.");

  const finalMonthExclusive = monthIndex(to) + 1;
  const endIndex = finalMonthExclusive - page * IMPACT_MONTHS_PER_PAGE;
  const startIndex = Math.max(monthIndex(from), endIndex - IMPACT_MONTHS_PER_PAGE);
  const ranges = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const year = Math.floor(index / 12);
    const monthNumber = index % 12 + 1;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const monthStart = `${month}-01`;
    const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    ranges.push({ month, from: from > monthStart ? from : monthStart, to: to < monthEnd ? to : monthEnd });
  }

  return { page, pageCount, totalMonths, hasOlder: page + 1 < pageCount, hasNewer: page > 0, ranges };
}
