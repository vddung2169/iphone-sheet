import type { Metadata } from "next";
import SheetPage from "@/components/SheetPage";

// Mỗi lần mở trang đều đọc lại sheet
export const dynamic = "force-dynamic";

// Trang phụ, không cho Google lập chỉ mục để không lẫn với bảng giá chính
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Giống trang chính, nhưng mọi máy cộng thêm 1.800K và không có phần liên hệ */
export default function Page() {
  return <SheetPage markup={1800} bare />;
}
