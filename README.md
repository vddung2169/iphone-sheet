# iPhone hàng sẵn HCM

Trang lọc và copy nhanh danh sách iPhone từ Google Sheet công khai. Mỗi lần mở trang, dữ liệu được đọc lại trực tiếp từ sheet (chỉ đọc, không cần quyền sửa).

## Chạy thử trên máy

Cần Node.js 18.18 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Đưa lên Vercel

1. Push thư mục này lên một repo GitHub.
2. Vào vercel.com → Add New → Project → chọn repo → Deploy (không cần chỉnh gì).

## Đổi sang sheet khác (tuỳ chọn)

Đặt biến môi trường `SHEET_ID` (trong Vercel: Settings → Environment Variables) bằng phần ID trong link sheet, sau đó Redeploy. Sheet mới phải có cùng bố cục cột: B dòng máy, C model, D STT, E mô tả, F giá, G link ảnh.

## Cấu trúc

- `lib/sheet.ts` đọc CSV từ Google Sheets và tách thông tin (dung lượng, loại máy, pin, màu…)
- `lib/copy.ts` định dạng dòng copy, ví dụ `14ProMax 256GB 99% Pin 86% - Gold - Giá 15.800K`
- `components/Inventory.tsx` giao diện lọc, sắp xếp và các nút copy
# iphone-sheet
