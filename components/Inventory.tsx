"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Phone } from "@/lib/sheet";
import { copyText, phoneLine, phoneList } from "@/lib/copy";

type GroupKey = "series" | "model" | "storage" | "region" | "screen";
const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "series", label: "Dòng" },
  { key: "model", label: "Máy" },
  { key: "storage", label: "Dung lượng" },
  { key: "region", label: "Loại máy" },
  { key: "screen", label: "Màn hình" },
];
type Sort = "stt" | "price-asc" | "price-desc" | "pin-desc";

const fmt = (n: number) => n.toLocaleString("vi-VN");
const storageSize = (s: string) => parseInt(s) * (/TB/.test(s) ? 1024 : 1);
const battClass = (p: number | null) => (p === null ? "bad" : p >= 88 ? "good" : p >= 84 ? "warn" : "bad");

type Filters = Record<GroupKey, string[]>;
const emptyFilters = (): Filters => ({ series: [], model: [], storage: [], region: [], screen: [] });

export default function Inventory({
  phones,
  error,
  loadedAt,
  bare = false,
}: {
  phones: Phone[];
  error: string;
  loadedAt: string;
  /** Ẩn dòng giới thiệu, nút liên hệ và chân trang */
  bare?: boolean;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [q, setQ] = useState("");
  const [minPin, setMinPin] = useState(0);
  const [sort, setSort] = useState<Sort>("stt");
  const [toast, setToast] = useState("");
  const [copiedStt, setCopiedStt] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wasRefreshing = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  const options = useMemo(() => {
    const o = {} as Record<GroupKey, string[]>;
    for (const { key } of GROUPS) {
      const vals = [...new Set(phones.map((p) => p[key]).filter((v) => v !== "—"))];
      o[key] = key === "storage" ? vals.sort((a, b) => storageSize(a) - storageSize(b)) : vals;
    }
    return o;
  }, [phones]);

  // Bỏ các lựa chọn lọc không còn tồn tại sau khi tải lại sheet
  useEffect(() => {
    setFilters((f) => {
      const next = emptyFilters();
      for (const { key } of GROUPS) next[key] = f[key].filter((v) => options[key].includes(v));
      return next;
    });
  }, [options]);

  const matches = (p: Phone, skip?: GroupKey) => {
    for (const { key } of GROUPS) {
      if (key === skip) continue;
      if (filters[key].length && !filters[key].includes(p[key])) return false;
    }
    if (minPin > 0 && (p.pin === null || p.pin < minPin)) return false;
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      const hay = `${p.model} ${p.desc} ${p.color} ${p.region} ${p.storage}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  };

  const list = useMemo(() => {
    const l = phones.filter((p) => matches(p));
    if (sort === "price-asc") l.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") l.sort((a, b) => b.price - a.price);
    else if (sort === "pin-desc") l.sort((a, b) => (b.pin ?? 0) - (a.pin ?? 0));
    else l.sort((a, b) => a.stt - b.stt);
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phones, filters, q, minPin, sort]);

  const toggle = (key: GroupKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  const reset = () => {
    setFilters(emptyFilters());
    setQ("");
    setMinPin(0);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  // Báo khi sheet đã đọc xong (giữ nguyên bộ lọc đang chọn)
  useEffect(() => {
    if (wasRefreshing.current && !refreshing) showToast("Đã tải lại dữ liệu từ sheet");
    wasRefreshing.current = refreshing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // Thanh đầu trang thu gọn lại khi đã cuộn qua nó
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const reload = () => startRefresh(() => router.refresh());

  const doCopy = async (items: Phone[], label: string, stt?: number) => {
    if (!items.length) return;
    const ok = await copyText(items.length === 1 ? phoneLine(items[0]) : phoneList(items));
    if (!ok) return showToast("Không copy được. Hãy thử lại trên trình duyệt khác.");
    if (stt !== undefined) {
      setCopiedStt(stt);
      setTimeout(() => setCopiedStt((c) => (c === stt ? null : c)), 1500);
    }
    showToast(label);
  };

  const activeCount = GROUPS.reduce((n, { key }) => n + filters[key].length, 0) + (minPin > 0 ? 1 : 0);
  const prices = list.map((p) => p.price);
  const time = new Date(loadedAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <div className="wrap">
      <div ref={sentinel} className="sentinel" aria-hidden="true" />
      <div className={`sticky-top${stuck ? " stuck" : ""}`}>
        <header className="head">
          <div>
            <h1>iPhone hàng sẵn HCM</h1>
            {!bare && <p className="sub">Lỗ Tuyển · bao mọi thứ 7 ngày · giá theo sheet (nghìn đồng)</p>}
          </div>
          {!bare && (
            <div className="contact">
              <a className="btn primary" href="tel:0393426609">
                Gọi<span className="full"> 039 342 6609</span>
              </a>
              <a className="btn" href="https://zalo.me/g/oezcwz531" target="_blank" rel="noopener noreferrer">
                <span className="full">Nhóm </span>Zalo<span className="full"> săn sale</span>
              </a>
            </div>
          )}
        </header>

        <section className="filters" aria-label="Bộ lọc">
          <div className="row search">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm: màu, dung lượng, LL/A…"
              aria-label="Tìm kiếm"
            />
            <button
              type="button"
              className="filters-toggle"
              aria-expanded={filtersOpen}
              aria-controls="filter-body"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              Lọc
              {activeCount > 0 && <span className="n">{activeCount}</span>}
            </button>
          </div>
          <div id="filter-body" className={`filters-body${filtersOpen ? " open" : ""}`}>
            {GROUPS.map(({ key, label }) =>
              options[key].length ? (
                <div className="row" key={key}>
                  <span className="lbl">{label}</span>
                  {options[key].map((v) => {
                    const on = filters[key].includes(v);
                    const n = phones.filter((p) => p[key] === v && matches(p, key)).length;
                    return (
                      <button key={v} type="button" className="chip" aria-pressed={on} onClick={() => toggle(key, v)}>
                        {v}
                        <span className="n">{n}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null
            )}
            <div className="row">
              <span className="lbl">Pin tối thiểu</span>
              <input
                type="range"
                min={0}
                max={95}
                value={minPin}
                onChange={(e) => setMinPin(Number(e.target.value))}
                aria-label="Pin tối thiểu"
              />
              <span className="pinval">{minPin ? `≥ ${minPin}%` : "Tất cả"}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="bar">
        <div>
          <div className="count">
            {list.length} máy
            {list.length > 0 && <span> · giá {fmt(Math.min(...prices))} – {fmt(Math.max(...prices))}k</span>}
          </div>
          <div className="status">{refreshing ? "Đang tải lại sheet…" : `Cập nhật lúc ${time}`}</div>
        </div>
        <div className="row">
          <button
            className="btn reload"
            type="button"
            disabled={refreshing}
            data-busy={refreshing ? "true" : "false"}
            onClick={reload}
            aria-label="Tải lại dữ liệu từ Google Sheet"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            {refreshing ? "Đang tải…" : "Tải lại"}
          </button>
          <button className="link" type="button" onClick={reset}>
            Xóa bộ lọc
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sắp xếp">
            <option value="stt">Theo thứ tự sheet</option>
            <option value="price-asc">Giá thấp → cao</option>
            <option value="price-desc">Giá cao → thấp</option>
            <option value="pin-desc">Pin cao nhất</option>
          </select>
        </div>
      </div>

      <div className="copybar">
        <button
          type="button"
          className="btn"
          disabled={!list.length}
          onClick={() => doCopy(list, `Đã copy ${list.length} máy đang lọc`)}
        >
          Copy <span className="long">danh sách </span>đang lọc ({list.length})
        </button>
        <button
          type="button"
          className="btn"
          disabled={!phones.length}
          onClick={() => doCopy([...phones].sort((a, b) => a.stt - b.stt), `Đã copy toàn bộ ${phones.length} máy`)}
        >
          Copy toàn bộ ({phones.length})
        </button>
      </div>

      {error ? (
        <div className="empty">
          Không tải được sheet ({error}). Kiểm tra sheet còn để chế độ “Bất kỳ ai có đường liên kết đều xem được”, rồi
          bấm Tải lại.
        </div>
      ) : !list.length ? (
        <div className="empty">
          {phones.length
            ? "Không có máy khớp bộ lọc. Bỏ bớt điều kiện hoặc bấm “Xóa bộ lọc”."
            : "Sheet hiện chưa có máy nào có giá."}
        </div>
      ) : (
        <div className="grid">
          {list.map((p) => (
            <article className="card" key={`${p.stt}-${p.desc}`}>
              <div className="top">
                <div className="model">iPhone {p.model}</div>
                <div className="stt">STT {p.stt}</div>
              </div>
              <div className="price">
                {fmt(p.price)}
                <small>k</small>
              </div>
              <dl className="specs">
                <dt>Dung lượng</dt>
                <dd>{p.storage}</dd>
                <dt>Loại máy</dt>
                <dd>{p.region}</dd>
                <dt>Ngoại hình</dt>
                <dd>{p.cond}</dd>
                <dt>Pin</dt>
                <dd>
                  <span className={`batt ${battClass(p.pin)}`}>
                    <i>
                      <b style={{ width: `${p.pin ?? 15}%` }} />
                    </i>
                    {p.pinText}
                  </span>
                </dd>
                <dt>Màu</dt>
                <dd>{p.color}</dd>
                <dt>Màn hình</dt>
                <dd>{p.screen}</dd>
              </dl>
              <p className="raw">
                Ghi chú gốc: {p.desc}
                {p.img && (
                  <>
                    {" · "}
                    <a href={p.img} target="_blank" rel="noopener noreferrer">
                      Xem ảnh
                    </a>
                  </>
                )}
              </p>
              <button
                type="button"
                className="copy-one"
                onClick={() => doCopy([p], `Đã copy: ${phoneLine(p)}`, p.stt)}
                aria-label={`Copy thông tin iPhone ${p.model} STT ${p.stt}`}
              >
                {copiedStt === p.stt ? "Đã copy ✓" : "Copy máy này"}
              </button>
            </article>
          ))}
        </div>
      )}

      {!bare && (
        <footer className="foot">
          Dữ liệu đọc trực tiếp từ Google Sheet “Hàng Sẵn HCM - Lỗ Tuyển” mỗi lần mở trang. Vui lòng gọi xác nhận trước
          khi qua xem máy.
        </footer>
      )}

      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
