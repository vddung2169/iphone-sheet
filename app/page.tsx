import SheetPage from "@/components/SheetPage";

// Mỗi lần mở trang đều đọc lại sheet
export const dynamic = "force-dynamic";

export default function Page() {
  return <SheetPage />;
}
