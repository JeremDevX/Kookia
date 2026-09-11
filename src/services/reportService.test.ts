import { expect, it } from "vitest";
import { reportCsv, reportExcelXml, type Report } from "./reportService";
const report: Report = { from: "2026-09-01", to: "2026-09-30", timezone: "UTC", generatedAt: "2026-09-11T12:00:00Z", rows: [
  { section: "Stock", date: "2026-09-11", metric: '=HYPERLINK("bad")', value: -2.5, source: "A&B <test>" },
] };
it("escapes CSV cells and prevents string formula interpretation without changing negative numbers", () => {
  const csv = reportCsv(report);
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('"-2.5"');
  expect(csv).toContain("2026-09-01");
});
it("exports typed Excel XML without executable formulas or raw XML markup from data", () => {
  const xml = reportExcelXml(report);
  expect(xml).toContain('ss:Type="Number">-2.5');
  expect(xml).toContain("A&amp;B &lt;test&gt;");
  expect(xml).not.toContain("ss:Formula");
});
