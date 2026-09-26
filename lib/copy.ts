import type { Phone } from "./sheet";

const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Ví dụ: 14ProMax 256GB 99% Pin 86% - Gold - Giá 15.800K */
export function phoneLine(p: Phone): string {
  const head = [
    p.model.replace(/\s+/g, ""),
    p.storage !== "—" ? p.storage : "",
    p.cond !== "—" ? p.cond : "",
    p.pinText === "—" ? "" : p.pin !== null ? `Pin ${p.pinText}` : p.pinText,
  ].filter(Boolean).join(" ");
  return [head, p.color !== "—" ? p.color : "", `Giá ${fmt(p.price)}K`].filter(Boolean).join(" - ");
}

export function phoneList(list: Phone[]): string {
  return list.map(phoneLine).join("\n");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* thử cách dự phòng bên dưới */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
