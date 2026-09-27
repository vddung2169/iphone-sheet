import Inventory from "@/components/Inventory";
import { DEFAULT_SHEET_ID, fetchPhones, type Phone } from "@/lib/sheet";

export default async function SheetPage({
  markup = 0,
  bare = false,
}: {
  /** Cộng thêm vào giá từng máy, đơn vị nghìn đồng (1800 = +1.800K) */
  markup?: number;
  /** Ẩn dòng giới thiệu, nút liên hệ và chân trang */
  bare?: boolean;
}) {
  const sheetId = process.env.SHEET_ID || DEFAULT_SHEET_ID;
  let phones: Phone[] = [];
  let error = "";
  try {
    phones = await fetchPhones(sheetId);
    if (markup) phones = phones.map((p) => ({ ...p, price: p.price + markup }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Không tải được sheet";
  }
  return <Inventory phones={phones} error={error} loadedAt={new Date().toISOString()} bare={bare} />;
}
