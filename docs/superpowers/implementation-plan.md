# Múa Nét AI — Kế hoạch triển khai “Gieo mầm”

## Mục tiêu và nguyên tắc
Ứng dụng nghệ thuật tương tác tiếng Việt, xử lý bàn tay và đồ họa trên thiết bị; người dùng tạo vườn bằng cử chỉ, lưu cục bộ, phát lại và xuất PNG. Không backend, không tải ảnh/video webcam lên mạng. Dự án độc lập trong repo `IStar`.

## Phạm vi đã chốt
- Trải nghiệm Gieo mầm: giới thiệu, webcam chỉ sau thao tác chủ động, một bàn tay, chụm để vẽ, tách để nhấc bút; thao tác chuột luôn sẵn sàng.
- Canvas 2D logic 1920×1080; thân/cành, tối đa 20 lá và hoa theo nét; ba bảng màu (Vườn xuân, Hoàng hôn, Đêm đom đóm).
- Hoàn tác/làm lại, toàn màn hình, đặt tên, lưu/mở/xóa cục bộ, phát lại, PNG 1920×1080.
- PWA offline có precache bắt buộc model + WASM và xác minh cache; ưu tiên laptop Windows Chrome/Edge.
- Không tài khoản, đồng bộ cloud, tạo nhạc, chatbot, sinh ảnh, video hay nhận nhiều bàn tay.

## Kiến trúc
React + TypeScript + Vite; MediaPipe Hand Landmarker trong Web Worker (VIDEO, CPU, một tay, tối đa 20 FPS), Canvas 2D, IndexedDB, PWA; Vitest và Playwright. Bộ dựng hình dùng chung cho live/replay/export. Tỷ lệ chụm = khoảng cách ngón cái-trỏ / khoảng cách điểm lòng bàn tay 5–17; ngưỡng 0.28/0.42, hysteresis; smoothing 0.35; mất tay ngừng điểm ngay, kết thúc nét sau 200 ms. Chỉ lưu nét đã làm mượt, không lưu video. Model và WASM là tài nguyên cục bộ.

## Nhiệm vụ và tiêu chí
1. **Studio/model:** dự án React/TS/Vite, lockfile; model chính thức kèm URL/version/SHA-256/license; WASM cục bộ; màn hình studio và worker; kiểm tra camera/model lỗi. Nghiệm thu: nhận diện thật Chrome/Edge, con trỏ theo tay, không AI CDN. Webcam thật phải được thử thủ công.
2. **Cử chỉ:** test ngưỡng/hysteresis/smoothing/mất tay; nhãn trạng thái; chuột qua cùng luồng. Nghiệm thu không nối nét qua lúc mất tay.
3. **Nghệ thuật:** test seed/lá/giới hạn 20.000 điểm; thân/lá/hoa, bảng màu, undo/redo, mẫu trực quan. Nghiệm thu bố cục rõ trong 2 phút.
4. **Lưu/phát/xuất:** IndexedDB, thư viện, autosave 1 giây, replay theo timestamp, PNG, graceful fallback khi storage lỗi. Nghiệm thu mở lại và PNG khớp.
5. **PWA/offline:** manifest/icon/service worker precache HTML/JS/CSS/model/WASM (bao gồm .task/.wasm), chỉ báo sẵn sàng khi SW điều khiển trang và cache đủ, cập nhật có xác nhận. Kiểm thử trên production khi ngắt mạng.
6. **Phát hành:** test/typecheck/build/e2e, audit privacy/assets <=25 MiB, Cloudflare Pages Direct Upload, README, ba mẫu và video demo 3–5 phút. Không phát hành cho tới nghiệm thu HTTPS/offline.

## Kiểm thử/ưu tiên
Lệnh chuẩn: `npm run test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. Thử ánh sáng yếu, mất tay, đổi tab/tắt camera, cache thiếu và hết dung lượng. Mục tiêu >=15 lần nhận diện/s, latency <150 ms, chạy 10 phút không treo. Ưu tiên model thật → cử chỉ → nghệ thuật → lưu/phát → offline → phát hành. Phân biệt rõ MediaPipe AI nhận diện và thuật toán tạo hình.

## Nhật ký triển khai
- [x] Đặc tả/kế hoạch được ghi vào repo.
- [x] Khởi tạo React/TypeScript/Vite và lockfile.
- [ ] Model chạy thật trên Chrome/Edge webcam (worker + model đã đóng gói; cần webcam thật để nghiệm thu).
- [x] Studio tương tác và cử chỉ cơ bản; unit test cử chỉ (3 test pass).
- [ ] Artwork hoàn chỉnh, seed nhất quán, giới hạn điểm và undo/redo.
- [x] IndexedDB cơ bản, thư viện mở/đổi tên/xóa, autosave, undo/redo, replay theo thời gian.
- [ ] PWA/offline.
- [ ] Phát hành và nghiệm thu.

## Tài nguyên model
- URL: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
- Phiên bản model: Hand Landmarker float16/1; SHA-256: `FBC2A30080C3C557093B5DDFC334698132EB341044CCEE322CCF8BCF3607CDE1`
- Runtime `@mediapipe/tasks-vision` 1.2.0; WASM được sao chép từ package cùng phiên bản.
- License model: Apache-2.0 (MediaPipe model card); runtime: Apache-2.0. Xác nhận/đính kèm bản license trước phát hành.

### Kết quả kiểm tra gần nhất
- `npm run test`: đạt, 3 test.
- `npm run typecheck`: đạt.
- `npm run build`: đạt; mọi file WASM hiện <25 MiB, model đi kèm local.
- `npm run test:e2e`: chưa cài Playwright do registry npm trả 404 cho tarball `rollup@4.67.2`.
- IndexedDB có fallback báo lỗi; export PNG vẫn hoạt động khi lưu lỗi.
- Webcam thật chưa thể nghiệm thu trong môi trường hiện tại.
