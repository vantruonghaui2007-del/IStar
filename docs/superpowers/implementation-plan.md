# Múa Nét AI — Nhật ký triển khai “Gieo mầm”

Kế hoạch đầy đủ: [`plans/2026-10-30-mua-net-ai-gieo-mam.md`](plans/2026-10-30-mua-net-ai-gieo-mam.md).

## Trạng thái nhiệm vụ

- [x] **1. Studio + model chạy được.** Lỗi gốc đã sửa (xem bên dưới). Worker MediaPipe tải model/WASM cục bộ, có con trỏ đầu ngón trỏ, xử lý camera bị từ chối / thiếu / đang bận / trình duyệt không hỗ trợ, model lỗi có nút Thử lại.
- [x] **2. Cử chỉ → nét ổn định.** `PinchController`: ngưỡng 0,28/0,42 có vùng giữ, làm mượt 0,35, mất tay dừng điểm ngay và kết thúc nét sau 200 ms, phản chiếu ngang, ánh xạ khung 4:3 → 16:9 có vùng hoạt động. Nhãn *Đưa tay vào khung / Sẵn sàng / Đang vẽ*; chuột đi chung luồng (*Chế độ chuột*).
- [x] **3. Nghệ thuật Gieo mầm.** Cây/lá/hoa theo seed, hoạt ảnh nở, ba bảng màu, nền giấy, hoàn tác/khôi phục theo nét, *Làm lại* có xác nhận, giới hạn 20.000 điểm. Đã kiểm tra trực quan ba bố cục (ít nét, nhiều nét, nét giao nhau) và tinh chỉnh cho máy chiếu.
- [x] **4. Lưu / mở / phát lại / PNG.** IndexedDB có phiên bản dữ liệu và nâng cấp từ bản cũ, thư viện mở/đổi tên/xóa, tự lưu 1 giây, mở lại khu vườn gần nhất, phát lại theo timestamp (tạm dừng, bắt đầu lại, 1×/2×), PNG 1920 × 1080 bằng cùng bộ dựng hình, lưu lỗi vẫn xuất PNG.
- [x] **5. PWA / offline.** Service worker tự viết (injectManifest) precache HTML/JS/CSS/Worker/`.task`/`.wasm`; chỉ báo sẵn sàng chỉ khi SW điều khiển trang và xác nhận đủ từng tệp; sửa cache thiếu; cập nhật cần người dùng bấm.
- [x] **6. Chuẩn bị phát hành.** `npm run release`, `npm run check:release`, README, thuyết minh, kịch bản video, ba tác phẩm mẫu (`docs/samples`). Lệnh `npm run deploy` đã sẵn sàng.
- [ ] **Còn lại cần người thực hiện:** đăng nhập Cloudflare và chạy `npm run deploy`; thử webcam thật trên Chrome **và** Edge của laptop trình diễn, ghi số lần/giây; quay video theo `docs/kich-ban-video.md`.

## Các lỗi đã tìm và sửa

| Lỗi | Nguyên nhân | Sửa | Kiểm chứng |
|---|---|---|---|
| Model không bao giờ chạy: *“Không tải được model nhận diện: ModuleFactory not set.”* | Worker là **ES module** nhưng gọi `FilesetResolver.forVisionTasks('/wasm')` (loader cổ điển). Trong module worker `importScripts` ném lỗi, MediaPipe chuyển sang `import()`, và script cổ điển không gán `self.ModuleFactory`. | `forVisionTasks(base, true)` — dùng loader ES module. Bỏ 27 MB WASM cổ điển/no-SIMD không dùng; khóa `@mediapipe/tasks-vision` đúng `1.2.0` cho khớp WASM. | Tái hiện bằng Chromium + webcam giả phát ảnh bàn tay thật; E2E `model.spec.ts`. |
| Nhận diện có thể đứng vĩnh viễn | Khung hình gửi khi model còn đang tải bị bỏ qua mà không trả lời → cờ `busy` không bao giờ được xóa; lỗi khung hình cũng không xóa cờ. | Worker luôn trả lời (`skipped`/`error`), `FrameGate` có thời hạn 1,5 s, `ImageBitmap` luôn được đóng, timestamp tăng nghiêm ngặt. | `frameGate.test.ts` |
| Đổi bảng màu không áp dụng cho nét vẽ bằng tay; nét bị nhân đôi trong StrictMode | Closure cũ trong `onmessage`; `setStrokes` gọi bên trong updater của `setCurrent`. | Editor là reducer thuần trong store ngoài React. | `editor.test.ts`, `art.spec.ts` |
| Phát lại sai sau khi mở lại tác phẩm | Lưu `performance.now()` tuyệt đối — mỗi lần tải trang đồng hồ bắt đầu lại. | Lưu thời gian tương đối trong nét + `startedAt` theo đồng hồ thực; nâng cấp dữ liệu v1. | `replay.test.ts`, `artworks.test.ts` |
| Phát lại ghi đè tác phẩm | Phát lại thay đổi chính danh sách nét → tự lưu bản dở dang. | Phát lại là lớp hiển thị riêng, không chạm dữ liệu. | `library.spec.ts` (phát lại khớp PNG) |
| Bấm *Cập nhật ngay* ở lần mở đầu tiên không tải lại trang | `workbox-window` coi lần đổi controller là “không phải cập nhật” khi trang chưa từng được điều khiển lúc đăng ký. | Tự gửi `SKIP_WAITING` và tải lại khi `controllerchange`. | `update.spec.ts` (đỏ → xanh) |
| Thư viện AI gửi dữ liệu ra ngoài | MediaPipe 1.2.0 gửi thống kê sử dụng tới `odml.pa.googleapis.com` mỗi 60 s. | Worker chỉ được `fetch` cùng origin + CSP `connect-src 'self'`. | `privacy.spec.ts` (đỏ khi gỡ lớp chặn) |
| Khung camera che nút điều khiển phát lại | Hai lớp phủ cùng góc dưới. | Thanh phát lại lên mép trên; lớp vẽ điểm tay không nhận chuột. | `model.spec.ts` |

## Quyết định thực hiện (khác hoặc bổ sung so với kế hoạch)

- Tay quay lại trong 200 ms ân hạn **và** gần nét cũ (< 0,12 chiều cao canvas) thì nét tiếp tục; xa hơn thì kết thúc và mở nét mới — tránh vỡ nét vì một khung hình mất tay mà vẫn không bao giờ nối xuyên màn hình.
- Mẫu không hợp lệ / lòng bàn tay quá nhỏ được tính như *mất tay* cho đồng hồ 200 ms.
- *Làm lại* = xóa khu vườn đang mở (có xác nhận); thêm nút *Khôi phục* cho redo.
- Khoảng nghỉ giữa các nét khi phát lại được rút tối đa còn 1 giây; nét giữ đúng tốc độ gốc; thêm tùy chọn 2×.
- Khu vườn bị *Làm lại* thành trống sẽ bị xóa khỏi thư viện.
- Thêm: vườn mẫu, cảnh báo ánh sáng yếu, minh họa động cử chỉ, phím tắt, khung camera hiển thị 21 điểm AI thấy, CSP/Permissions-Policy, xin quyền lưu trữ bền vững khi đã sẵn sàng offline, kiểm tra cập nhật mỗi 30 phút.

## Tài nguyên model

- URL: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
- Phiên bản: Hand Landmarker float16/1 — SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`
- Runtime `@mediapipe/tasks-vision` 1.2.0; chỉ dùng `vision_wasm_module_internal.{js,wasm}` (sao chép từ gói cùng phiên bản, `npm run check:release` so sánh từng byte).
- Giấy phép: Apache-2.0 (model card MediaPipe, kho mã MediaPipe).

## Kết quả kiểm tra (30/10/2026, môi trường CI Linux, Chromium headless, không GPU)

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `npm run lint` | 0 lỗi (còn cảnh báo kiểu `set-state-in-effect`, không ảnh hưởng hành vi) |
| `npm run test` | **72/72** đạt (12 tệp) |
| `npm run typecheck` | đạt (app, Node config, E2E) |
| `npm run build` | đạt; precache 15 tệp, 22,1 MiB |
| `npm run check:release` | đạt: tệp lớn nhất 13,8 MiB (< 25 MiB), SHA-256 model đúng, WASM trùng gói 1.2.0, không khóa API, không host ngoài lạ, CSP + Permissions-Policy, precache đủ model/WASM/Worker |
| `npm run test:e2e` | **20/20** đạt trên bản production, model thật với webcam giả |
| Offline | Chuẩn bị online → khởi động lại trình duyệt khi mất mạng → vẽ, lưu, phát lại, xuất PNG, camera + nhận diện: đạt. Đối chứng: không chuẩn bị thì `ERR_INTERNET_DISCONNECTED`. |
| Quyền riêng tư | Trọn chu kỳ 60 s: 0 yêu cầu ra ngoài; gỡ lớp chặn → test đỏ (đối chứng). |
| Phát lại ↔ PNG | Sai khác trung bình < 0,5/255 mỗi kênh. |
| Độ bền 10 phút | Camera + model + vẽ chuột liên tục: 480 nét, 8 lần phát lại 2× + 8 lần xuất PNG + 4 lần tạo tác phẩm mới; số nét trong vườn khớp chính xác ở cả 8 chu kỳ; heap JS 5–9 MB, không tăng dần; 12–14 lần nhận diện/giây (0 khi phát lại, đúng thiết kế); 0 lỗi trang; tắt camera giải phóng camera. |
| Hiệu năng (CPU container, headless) | 11–14 lần nhận diện/giây, 55–80 ms/khung. **Chưa đạt mục tiêu ≥ 15 lần/giây trong môi trường này; phải đo lại trên laptop trình diễn.** Nếu thấp: giảm `MAX_FRAME_WIDTH` trong `src/tracking/handTracker.ts`. |
| Webcam thật Chrome/Edge | **Chưa thực hiện** (môi trường không có webcam) — cần làm trước trình diễn. |

### Tự rà soát cuối (không có reviewer độc lập)

Rà toàn nhánh; hai vấn đề quan trọng đã sửa theo TDD (đỏ → xanh, toàn bộ E2E 20/20):

- Mất camera giữa phiên (rút webcam / ứng dụng khác chiếm) trước đây làm hình đứng yên không báo lỗi → giờ báo *Mất kết nối camera*, về chế độ chuột, có **Thử lại**.
- Chuyển tab rồi quay lại khi đang phát lại từng bật lại nhận diện, tay có thể vẽ vào tác phẩm đang phát lại → giờ giữ dừng và bỏ qua mẫu tay khi phát lại.

Ghi nhận nhỏ, chưa sửa:

- Nếu một lần tự lưu của tác phẩm cũ hoàn tất *sau* khi đã mở tác phẩm khác, “tác phẩm mở gần nhất” có thể trỏ về tác phẩm cũ ở lần tải sau.
- Camera trả khung 16:9 (thay vì 4:3 đã yêu cầu) làm lớp 21 điểm trên khung xem trước lệch nhẹ (vẽ vẫn đúng).
- Nhấn `Space` khi đang focus vào một nút của thanh phát lại có thể vừa bấm nút vừa đổi trạng thái (triệt tiêu nhau).
- Vẽ chuột và tay cùng lúc (hai người) có thể trộn điểm vào cùng một nét.
- Khung camera che góc dưới phải canvas khi vẽ bằng chuột (có thể thu nhỏ khung).
