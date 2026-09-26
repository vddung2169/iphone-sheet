export type Phone = {
  stt: number;
  series: string;
  model: string;
  desc: string;
  price: number; // nghìn đồng
  img: string;
  storage: string;
  region: string;
  cond: string;
  pin: number | null;
  pinText: string;
  color: string;
  screen: string;
};

export const DEFAULT_SHEET_ID = "1bWC3unJLZ7FgZaS-rlpM2jognlJwOJ77BCiYLkX62K4";

function csvUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0`;
}

/** CSV parser: hỗ trợ ngoặc kép và xuống dòng trong ô */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function parsePrice(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{1,3}([.,]\d{3})+$/.test(v)) return Number(v.replace(/[.,]/g, ""));
  const n = parseFloat(v.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(n)) return null;
  return n < 1000 ? Math.round(n * 1000) : Math.round(n);
}

function niceModel(m: string) {
  return m
    .replace(/\s+/g, "")
    .replace(/PROMAX$/i, " Pro Max")
    .replace(/PRO$/i, " Pro")
    .replace(/PLUS$/i, " Plus")
    .replace(/MINI$/i, " Mini");
}

const COLORS = ["gold", "đen", "tự nhiên", "sa mạc", "trắng", "xanh teal", "xanh", "hồng", "tím", "vàng", "bạc", "titan", "cam"];

function describe(stt: number, series: string, model: string, desc: string, price: number, img: string): Phone {
  const d = desc.toLowerCase();
  const storage = d.match(/(\d+)\s*(gb|tb)/);
  const region = (d.match(/\b(ll|kh|vn|za|j|zp|ch)\s*\/\s*a/) || [])[1];
  const cond = (d.match(/\/a\s*-?\s*(\d+(?:[.,]\d+)?)/) || [])[1];
  const pinM = d.match(/pin\s*(\d+)\s*%/);
  const pin = pinM ? Number(pinM[1]) : null;
  const colorKey = COLORS.find((c) => d.includes(c));
  return {
    stt, series, model, desc, price, img,
    storage: storage ? storage[1] + storage[2].toUpperCase() : "—",
    region: region ? region.toUpperCase() + "/A" : "—",
    cond: cond ? cond.replace(",", ".") + "%" : "—",
    pin,
    pinText: pinM ? pinM[1] + "%" : d.includes("pin thấp") ? "Pin thấp" : "—",
    color: colorKey ? colorKey.charAt(0).toUpperCase() + colorKey.slice(1) : "—",
    screen: d.includes("mèo") ? "Màn mèo nhẹ" : d.includes("màn đẹp") ? "Màn đẹp" : "—",
  };
}

/** Cột sheet: A nhóm | B dòng | C máy | D STT | E mô tả | F giá | G link ảnh */
export function sheetToPhones(rows: string[][]): Phone[] {
  const out: Phone[] = [];
  let series = "";
  let model = "";
  for (const r of rows) {
    const [A = "", B = "", C = "", D = "", E = "", F = "", G = ""] = r.map((x) => (x || "").trim());
    if (/loại máy khác/i.test(A)) break;
    if (B) series = B.replace(/seri(es)?/i, "Series").trim();
    if (C) model = niceModel(C);
    if (!E || !D || !model) continue;
    const price = parsePrice(F);
    if (price === null) continue;
    out.push(describe(Number(D) || out.length + 1, series, model, E, price, /^https?:\/\//.test(G) ? G : ""));
  }
  return out;
}

export async function fetchPhones(id: string): Promise<Phone[]> {
  const res = await fetch(csvUrl(id), { cache: "no-store" });
  if (!res.ok) throw new Error(`Google Sheets trả về lỗi ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) throw new Error("Sheet không còn được chia sẻ công khai");
  return sheetToPhones(parseCSV(text));
}
