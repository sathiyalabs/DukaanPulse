import { Experiment, Lang, money } from "./domain";
import { tr, approvedTerms } from "./i18n";
import { economics } from "./analytics";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function posterHTML(e: Experiment, l: Lang, draft = false) {
  const c = e.context,
    ec = economics(c.offer, e.action);
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><title>${esc(c.shop)} · DukaanPulse</title><style>@font-face{font-family:DP;src:url('/fonts/Tamil.ttf')}@font-face{font-family:DPHindi;src:url('/fonts/Hindi.ttf')}*{box-sizing:border-box}body{margin:0;background:#edf1f2;font-family:Arial,DPHindi,DP,sans-serif;color:#102b40}.poster{max-width:760px;min-height:920px;margin:30px auto;background:#fff;padding:64px;border-top:18px solid #b7ed55;position:relative}.brand{font-size:15px;letter-spacing:2px;color:#456478}h1{font-size:42px;line-height:1.4;margin:36px 0 10px}h2{font-size:30px;line-height:1.6}.price{font-size:92px;font-weight:bold;color:#102b40;margin:25px 0}.terms{font-size:21px;line-height:1.8;border-top:2px dashed #bdd0d8;padding-top:26px}.date{background:#102b40;color:white;padding:20px;font-size:22px;border-radius:10px}footer{margin-top:40px;color:#456478;font-size:13px;line-height:1.7}.draft{color:#9c4522;font-weight:bold}.print{display:block;margin:20px auto;padding:14px 30px;font-size:18px}@media print{body{background:white}.poster{margin:0;max-width:none;min-height:95vh}.print{display:none}@page{size:A4;margin:10mm}}</style></head><body><button class="print" onclick="window.print()">${esc(tr(l,'Print / Save PDF'))}</button><article class="poster"><div class="brand">${esc(tr(l, "Counter offer"))}</div>${draft ? `<p class="draft">${esc(tr(l, "Draft"))} · ${esc(tr(l, "Not approved"))}</p>` : ""}<h1>${esc(c.shop)}</h1><h2>${esc(e.action === "investigate" ? tr(l, "Investigate first") : c.offer.name[l])}</h2>${e.action === "investigate" ? `<p class="terms">${esc(tr(l, "Observe the window and record context. No customer offer."))}</p>` : `<div class="price">${esc(money(c.offer.price - ec.discount))}</div>`}<div class="date">${esc(c.testDate)}<br>16:00–18:00 · Asia/Kolkata</div><p class="terms">${esc(approvedTerms(e, l))}</p><footer>DukaanPulse · ${esc(e.id.slice(0, 8))} · ${esc(tr(l, "Revision"))} ${e.revision}<br>${esc(tr(l, "Expiry"))}: ${esc(c.testDate)} 18:00 IST</footer></article></body></html>`;
}
export function download(name: string, body: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
