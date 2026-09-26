import Inventory from "@/components/Inventory";
import { DEFAULT_SHEET_ID, fetchPhones, type Phone } from "@/lib/sheet";

// Mỗi lần mở trang đều đọc lại sheet
export const dynamic = "force-dynamic";

export default async function Page() {
  const sheetId = process.env.SHEET_ID || DEFAULT_SHEET_ID;
  let phones: Phone[] = [];
  let error = "";
  try {
    phones = await fetchPhones(sheetId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Không tải được sheet";
  }
  return <Inventory phones={phones} error={error} loadedAt={new Date().toISOString()} />;
}
