# Múa Nét AI — Gieo mầm

> *Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.*

Trải nghiệm nghệ thuật tương tác cho triển lãm: người xem đưa bàn tay trước webcam, **chụm ngón cái và ngón trỏ để vẽ**, tách ngón để nhấc bút. Mỗi nét vẽ mọc thành thân cây, lá và hoa. Tác phẩm được lưu trên máy, phát lại được quá trình sáng tác và xuất ảnh PNG Full HD. Ứng dụng chạy hoàn toàn trên thiết bị và dùng được **offline** sau khi chuẩn bị.

## AI làm gì, thuật toán làm gì

| Phần | Công nghệ | Vai trò |
|---|---|---|
| **AI nhận diện bàn tay** | [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) (mạng nơ-ron, chạy bằng WebAssembly trong Web Worker) | Từ mỗi khung hình webcam tìm 21 điểm khớp của bàn tay. Khung camera nhỏ hiển thị đúng 21 điểm AI “nhìn thấy”. |
| **Hiểu cử chỉ** | Thuật toán của dự án (`src/tracking/gesture.ts`) | Tỷ lệ khoảng cách ngón cái–ngón trỏ / độ rộng lòng bàn tay → đặt bút (< 0,28), nhấc bút (> 0,42), làm mượt, xử lý mất tay. |
| **Tạo hình khu vườn** | Thuật toán sinh hình theo *seed* (`src/artwork/plant.ts`) | Thân dày khi đi chậm, mảnh khi đi nhanh; tối đa 20 lá mọc so le; hoa nở khi nhấc tay; đom đóm trong bảng màu đêm. **Không dùng AI sinh ảnh.** |

Nhận diện tay hay vẽ bằng webcam không phải phát minh mới; điểm riêng của dự án là **quá trình đồng sáng tác bằng chuyển động**, ngôn ngữ hình ảnh thực vật và câu chuyện *Gieo mầm*.

## Tính năng

- Một bàn tay, nhãn trạng thái rõ ràng: **Đưa tay vào khung → Sẵn sàng → Đang vẽ**; khung nét đứt trên camera là vùng điều khiển.
- Chế độ chuột/cảm ứng đi qua cùng luồng tạo nét — thử được ngay khi chưa bật camera.
- Ba bảng màu **Vườn xuân**, **Hoàng hôn**, **Đêm đom đóm** (đổi bảng màu chỉ ảnh hưởng nét tiếp theo).
- Chụm tại chỗ để gieo một bông hoa nhỏ.
- Hoàn tác / khôi phục theo cả nét, **Làm lại** (có xác nhận), toàn màn hình.
- Thư viện trên máy: tự lưu sau 1 giây, mở lại, đổi tên, xóa; tự mở lại khu vườn gần nhất.
- **Phát lại** theo thời gian thật của từng nét (tạm dừng, bắt đầu lại, 1×/2×), không cần camera.
- **Xuất PNG 1920 × 1080** bằng cùng bộ dựng hình — ảnh cuối của phát lại khớp từng điểm ảnh với PNG.
- Ba **vườn mẫu** để giới thiệu nhanh.
- Cảnh báo ánh sáng yếu; hiển thị tốc độ AI (lần/giây, ms/khung hình).
- **PWA offline** có kiểm tra thật: chỉ báo *Sẵn sàng dùng offline* khi service worker đã điều khiển trang **và** xác nhận đủ từng tài nguyên (HTML, JS, CSS, Worker, model `.task`, WASM) trong cache. Thiếu thì báo và có nút **Thử lại** để tải bù.
- Cập nhật phiên bản cần người dùng bấm; khu vườn đang mở được lưu và mở lại sau cập nhật.

Phím tắt: `Ctrl+Z` hoàn tác · `Ctrl+Y` khôi phục · `F` toàn màn hình · `Space` tạm dừng/tiếp tục phát lại · `Esc` thoát phát lại.

## Chạy trên máy

Yêu cầu Node.js 20.19+ (khuyến nghị 22 LTS).

```sh
npm ci
npm run dev
```

Mở `http://localhost:5173`, bấm **Bắt đầu** để trình duyệt hỏi quyền camera. Camera chỉ hoạt động trên `localhost` hoặc HTTPS. Ở chế độ `dev` không có service worker nên không có offline — muốn thử offline hãy dùng bản build:

```sh
npm run build
npm run preview
```

## Chuẩn bị trình diễn offline

1. Mở link HTTPS (hoặc `npm run preview`) trên **đúng trình duyệt và máy** sẽ trình diễn (Chrome hoặc Edge).
2. Chờ thanh trên báo **● Sẵn sàng dùng offline** (khoảng 22 MiB được tải một lần). Có thể bấm *Cài đặt ứng dụng* trên thanh địa chỉ.
3. Bấm **Bắt đầu**, cho phép camera, vẽ thử một nét — trình duyệt nhớ quyền camera cho lần sau.
4. Từ giờ có thể ngắt mạng, đóng/mở lại trình duyệt: vẽ, lưu, phát lại, xuất PNG và nhận diện tay vẫn chạy.
5. Trước giờ trình diễn mở lại một lần và xem chỉ báo vẫn xanh. **Không xóa dữ liệu duyệt web** của trang (xóa sẽ mất cả cache offline lẫn thư viện tác phẩm).

Nếu chỉ báo là *Chưa đủ tài nguyên offline*, kết nối mạng rồi bấm **Thử lại**.

## Riêng tư

- Hình ảnh camera chỉ được xử lý trong trình duyệt; **không tải lên, không lưu**. Chỉ lưu các nét đã làm mượt (toạ độ, thời điểm, bảng màu, seed) vào IndexedDB của trình duyệt.
- Không backend, không tài khoản, không API trả phí, không khóa API.
- Model, WASM và mọi tài nguyên được phục vụ cùng website (không CDN).
- `@mediapipe/tasks-vision` 1.2.0 có sẵn cơ chế gửi thống kê sử dụng (loại tác vụ, thời gian xử lý — không phải hình ảnh) tới `odml.pa.googleapis.com` mỗi 60 giây. Dự án chặn ở hai lớp:
  1. Worker nhận diện chỉ được `fetch` cùng origin (`src/tracking/privacy.ts`) — chặn ngay cả khi chạy `npm run dev`;
  2. Content-Security-Policy `connect-src 'self'` trên bản phát hành (`dist/_headers`) — trình duyệt từ chối mọi kết nối ra ngoài.

  Có kiểm thử E2E theo dõi trọn một chu kỳ 60 giây để chứng minh không có yêu cầu nào rời máy.

## Kiểm thử

```sh
npm run lint
npm run test           # Vitest: cử chỉ, cây/lá/hoa, editor, lưu trữ, tự lưu, phát lại, offline, mẫu
npm run typecheck
npm run build
npm run check:release  # kiểm tra bản phát hành (kích thước, SHA-256, WASM, khóa API, host ngoài, CSP, precache)
npm run test:e2e       # Playwright trên bản production (vite preview)
npm run release        # chạy tất cả theo thứ tự trên
```

E2E chạy **model thật**: Chromium dùng webcam giả phát ảnh bàn tay thật (`e2e/fixtures`), nên kiểm tra được cả Worker, WASM, model và luồng camera. Các tình huống được kiểm: nhận diện tay và con trỏ, không có tay, từ chối quyền camera, tắt camera giải phóng camera/Worker, vẽ bằng chuột, hoàn tác/khôi phục/làm lại, phím tắt, tự lưu và mở lại sau tải lại trang, thư viện (mở/đổi tên/xóa), phát lại khớp PNG, lưu trữ lỗi vẫn xuất PNG, phát lại dừng nhận diện, vườn mẫu, **khởi động lại trình duyệt khi mất mạng** rồi dùng mọi chức năng, cache thiếu được phát hiện và sửa, cập nhật phiên bản giữ khu vườn, mất camera giữa chừng, chuyển tab khi phát lại, và quyền riêng tư trong 60 giây.

Kiểm thử tự động **không thay thế** thử nghiệm với webcam thật: trước khi trình diễn hãy thử trên laptop thật với Chrome và Edge, trong điều kiện ánh sáng của phòng triển lãm, và ghi lại số *lần/giây* hiển thị trên thanh trên.

## Phát hành (Cloudflare Pages)

```sh
npm run release                 # kiểm tra + build
npx wrangler@4.150.0 login      # lần đầu
npm run deploy                  # Direct Upload thư mục dist lên dự án "mua-net-ai" (*.pages.dev)
```

`dist/_headers` được tạo khi build: CSP, `Permissions-Policy` (chỉ camera cho chính trang), và `no-cache` cho `sw.js`/`index.html` để bản cập nhật đến được người dùng. Mọi tệp đều dưới giới hạn 25 MiB/tệp của Cloudflare Pages (lớn nhất: WASM 13,8 MiB). Sau khi phát hành, kiểm tra lại trên link HTTPS: camera, *Sẵn sàng dùng offline*, ngắt mạng rồi mở lại.

## Giới hạn đã biết

- Một bàn tay, một người. Ánh sáng yếu hoặc ngược sáng làm nhận diện kém (ứng dụng sẽ nhắc).
- Ưu tiên Chrome/Edge trên laptop. Trình duyệt không có WebAssembly SIMD không chạy được nhận diện (vẫn vẽ bằng chuột). Safari và điện thoại chưa được kiểm thử đầy đủ.
- Tối đa 20.000 điểm mỗi tác phẩm; thư viện nằm trong trình duyệt của máy đó (không đồng bộ).
- Hiệu năng đo trong môi trường CI không GPU: 11–14 lần nhận diện/giây, 55–80 ms/khung hình. Laptop thật thường nhanh hơn; mục tiêu ≥ 15 lần/giây cần được đo lại trên máy trình diễn.

## Cấu trúc

```
src/
  tracking/   webcam, Worker MediaPipe, giao thức, bộ điều khiển cử chỉ, chặn mạng
  artwork/    kiểu dữ liệu, bảng màu, cây/lá/hoa theo seed, editor, bộ dựng hình, phát lại, vườn mẫu
  storage/    IndexedDB (có nâng cấp dữ liệu cũ), tự lưu
  offline/    service worker, kiểm tra cache, cập nhật
  studio/     giao diện React (canvas, camera, thư viện, phát lại…)
e2e/          Playwright + webcam giả
scripts/      kiểm tra phát hành, tạo biểu tượng
docs/         kế hoạch, thuyết minh, kịch bản video, tác phẩm mẫu
```

Luồng dữ liệu: **Webcam → ImageBitmap → Worker MediaPipe (≤ 20 lần/giây, 1 khung đang xử lý) → 21 điểm → PinchController → nét vẽ → GardenRenderer (requestAnimationFrame)**.

## Model và giấy phép

- Model: Hand Landmarker float16 v1 — `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` (được `npm run check:release` kiểm tra).
- Runtime/WASM: `@mediapipe/tasks-vision` **1.2.0** (khóa đúng phiên bản; `public/wasm` phải trùng với gói đã cài — script kiểm tra cũng so sánh).
- Model và runtime MediaPipe theo giấy phép Apache-2.0 (xem model card và kho mã MediaPipe).
- Ảnh bàn tay dùng làm webcam giả trong `e2e/fixtures` lấy từ dữ liệu kiểm thử công khai của MediaPipe — xem `e2e/fixtures/README.md`.

Tài liệu: [kế hoạch](docs/superpowers/plans/2026-10-30-mua-net-ai-gieo-mam.md) · [nhật ký & kết quả kiểm thử](docs/superpowers/implementation-plan.md) · [thuyết minh](docs/thuyet-minh.md) · [kịch bản video](docs/kich-ban-video.md) · [tác phẩm mẫu](docs/samples/).
