# Múa Nét AI — Gieo mầm

> *Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.*

**Chơi nhạc cụ cổ truyền Việt Nam bằng đôi tay trong không trung** — mỗi nốt nhạc mọc thành một chi tiết của khu vườn quê. Dự thi mảng **SICT AI-Art Challenge** (nhóm *Sản phẩm & Giải pháp AI Tương tác*). Chạy hoàn toàn trên trình duyệt, dùng được **offline**.

| Nhạc cụ | Chơi bằng tay (hoặc chuột) | Mọc thành |
|---|---|---|
| **Đàn bầu** | chụm để gảy, nâng/hạ tay để luyến | hoa sen — mỗi nốt luyến một lá sen, buông tay sen nở |
| **Sáo trúc** | chụm giữ để thổi, tay lên xuống theo giai điệu | cây tre — mỗi nốt một chùm lá tre |
| **Đàn tranh** (16 dây) | chạm từng dây hoặc lướt ngang để rải | cành đào — mỗi dây một bông đào |
| **Trống cơm** | chụm nhanh: nửa dưới “tùng”, nửa trên “tình” | bông lúa — mỗi tiếng trống một khóm lúa |

Cao độ theo **thang ngũ cung hò – xự – xang – xê – cống** (tay càng cao nốt càng cao); tên nốt hiện lên khi chơi. Mỗi nhạc cụ có **giới thiệu**, **cách chơi**, **bài tập 3 bước tự đánh dấu** và một **tác phẩm mẫu** (*Gió đồng*, *Chiều quê*, *Mưa xuân*, *Hội làng*) phát lại cùng khu vườn. Tác phẩm mẫu do nhóm biên soạn trên thang ngũ cung; âm thanh nhạc cụ được **tổng hợp mô phỏng** (Web Audio), không phải bản thu nhạc cụ thật.

## Sân khấu nhạc cụ (AR) và tập đánh cả bài

Bấm **🎎 Sân khấu nhạc cụ (AR)** phía trên khu vườn: hình camera hiện lớn như gương soi, **nhạc cụ ảo vẽ đè lên** — 16 dây đàn tranh có nhạn đàn, đàn bầu với cần đàn uốn theo tay, ống sáo có lỗ bấm, hai mặt trống cơm (tình/tùng, có cả nắm cơm giữa mặt trống). Hình camera được phóng đúng theo vùng điều khiển nên đầu ngón tay trên hình chính là chỗ đang chơi; dây rung, mặt trống gợn sóng khi đánh trúng. Không bật camera vẫn chơi được bằng chuột trên sân khấu tối.

**Tập đánh cả bài** (nút 🎼 trong thẻ nhạc cụ): nốt cần đánh **sáng vàng** (dây, làn nốt hoặc mặt trống), hai nốt sau được đánh dấu nét đứt; bài **chờ bạn đánh đúng** mới đi tiếp, có thanh tiến độ và số nốt. Xong bài sẽ có màn chúc mừng; mọi nốt vừa đánh đã mọc thành khu vườn để xem lại, phát lại, xuất ảnh.

## AI làm gì, thuật toán làm gì

| Phần | Công nghệ | Vai trò |
|---|---|---|
| **AI nhận diện bàn tay** | [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) (mạng nơ-ron, WebAssembly trong Web Worker) | Mỗi khung hình webcam → 21 điểm khớp. Khung camera nhỏ hiển thị đúng 21 điểm AI “nhìn thấy”. |
| **Cử chỉ → động tác chơi đàn** | `src/tracking/gesture.ts`, `src/music/score.ts` | Chụm/nhả (0,28/0,42 × lòng bàn tay), độ cao tay → nốt ngũ cung, lướt ngang → rải dây; nốt chỉ vang khi tay dừng ≥ 40 ms. |
| **Âm thanh** | `src/music/audio.ts` (Web Audio) | Đàn bầu (âm bồi, luyến, vibrato), sáo (có tiếng hơi), đàn tranh (Karplus–Strong), trống (tùng/tình). |
| **Khu vườn** | `src/artwork/plant.ts` | Mỗi nốt → lá/hoa theo loài cây của nhạc cụ; tái lập theo seed nên phát lại và ảnh xuất trùng nhau. **Không dùng AI sinh ảnh.** |

## Tính năng khác

- Nhãn trạng thái tay: **Đưa tay vào khung → Sẵn sàng → Đang vẽ**; chế độ chuột/cảm ứng đi chung luồng.
- Hoàn tác / khôi phục theo nét, **Làm lại** (có xác nhận), toàn màn hình, tắt/bật âm thanh.
- Thư viện trên máy: tự lưu 1 giây, mở lại, đổi tên, xóa; tự mở lại khu vườn gần nhất.
- **Phát lại** có âm thanh theo đúng thời gian chơi (tạm dừng, bắt đầu lại, 1×/2×); nhiều nhạc cụ trong một khu vườn thành bản hòa tấu.
- **Xuất PNG 1920 × 1080** — khớp từng điểm ảnh với khung cuối của phát lại.
- Cảnh báo thiếu sáng, hiển thị tốc độ AI, xử lý mất camera / từ chối quyền camera.
- **PWA offline có kiểm tra thật** (từng tệp trong cache), cập nhật phiên bản cần người dùng bấm.

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

- Hình ảnh camera chỉ được xử lý trong trình duyệt; **không tải lên, không lưu**. Chỉ lưu các nét đã làm mượt (toạ độ, thời điểm, nhạc cụ, seed) vào IndexedDB của trình duyệt.
- Không backend, không tài khoản, không API trả phí, không khóa API.
- Model, WASM và mọi tài nguyên được phục vụ cùng website (không CDN).
- `@mediapipe/tasks-vision` 1.2.0 có sẵn cơ chế gửi thống kê sử dụng (loại tác vụ, thời gian xử lý — không phải hình ảnh) tới `odml.pa.googleapis.com` mỗi 60 giây. Dự án chặn ở hai lớp:
  1. Worker nhận diện chỉ được `fetch` cùng origin (`src/tracking/privacy.ts`) — chặn ngay cả khi chạy `npm run dev`;
  2. Content-Security-Policy `connect-src 'self'` trên bản phát hành (`dist/_headers`) — trình duyệt từ chối mọi kết nối ra ngoài.

  Có kiểm thử E2E theo dõi trọn một chu kỳ 60 giây để chứng minh không có yêu cầu nào rời máy.

## Kiểm thử

```sh
npm run lint
npm run test           # Vitest: cử chỉ, nốt nhạc, tác phẩm mẫu, bài tập, cây theo nhạc cụ, lưu trữ, phát lại, offline
npm run typecheck
npm run build
npm run check:release  # kiểm tra bản phát hành (kích thước, SHA-256, WASM, khóa API, host ngoài, CSP, precache)
npm run test:e2e       # Playwright trên bản production (vite preview)
npm run release        # chạy tất cả theo thứ tự trên
```

E2E chạy **model thật**: Chromium dùng webcam giả phát ảnh bàn tay thật (`e2e/fixtures`), nên kiểm tra được cả Worker, WASM, model và luồng camera. Các tình huống được kiểm: sân khấu AR (đánh trọn bài “Hội làng” 46 nốt, đàn tranh theo dây sáng, camera hiện sau nhạc cụ), 4 nhạc cụ phát tiếng và hiện tên nốt, bài tập từng bước, tác phẩm mẫu, nhận diện tay và con trỏ, không có tay, từ chối quyền camera, tắt camera giải phóng camera/Worker, vẽ bằng chuột, hoàn tác/khôi phục/làm lại, phím tắt, tự lưu và mở lại sau tải lại trang, thư viện (mở/đổi tên/xóa), phát lại khớp PNG, lưu trữ lỗi vẫn xuất PNG, phát lại dừng nhận diện, **khởi động lại trình duyệt khi mất mạng** rồi dùng mọi chức năng, cache thiếu được phát hiện và sửa, cập nhật phiên bản giữ khu vườn, mất camera giữa chừng, chuyển tab khi phát lại, và quyền riêng tư trong 60 giây.

Kiểm thử tự động **không thay thế** thử nghiệm với webcam thật: trước khi trình diễn hãy thử trên laptop thật với Chrome và Edge, trong điều kiện ánh sáng của phòng triển lãm, và ghi lại số *lần/giây* hiển thị trên thanh trên.

## Xem trực tuyến (GitHub Pages)

Mỗi lần có code mới trên `main`, workflow `.github/workflows/pages.yml` chạy test, build với `BASE_PATH=/IStar/` và đưa lên **https://vantruonghaui2007-del.github.io/IStar/** (cần bật một lần: *Settings → Pages → Source: GitHub Actions*). GitHub Pages không gửi được header CSP; lớp chặn mạng trong Worker vẫn hoạt động.

## Phát hành (Cloudflare Pages)

```sh
npm run release                 # kiểm tra + build
npx wrangler@4.150.0 login      # lần đầu
npm run deploy                  # Direct Upload thư mục dist lên dự án "mua-net-ai" (*.pages.dev)
```

`dist/_headers` được tạo khi build: CSP, `Permissions-Policy` (chỉ camera cho chính trang), và `no-cache` cho `sw.js`/`index.html` để bản cập nhật đến được người dùng. Mọi tệp đều dưới giới hạn 25 MiB/tệp của Cloudflare Pages (lớn nhất: WASM 13,8 MiB). Sau khi phát hành, kiểm tra lại trên link HTTPS: camera, *Sẵn sàng dùng offline*, ngắt mạng rồi mở lại.

## Giới hạn đã biết

- Một bàn tay, một người. Ánh sáng yếu hoặc ngược sáng làm nhận diện kém (ứng dụng sẽ nhắc).
- Âm thanh nhạc cụ là mô phỏng tổng hợp; tác phẩm mẫu do nhóm biên soạn (chưa phải bản dân ca gốc).
- Ưu tiên Chrome/Edge trên laptop. Trình duyệt không có WebAssembly SIMD không chạy được nhận diện (vẫn vẽ bằng chuột). Safari và điện thoại chưa được kiểm thử đầy đủ.
- Tối đa 20.000 điểm mỗi tác phẩm; thư viện nằm trong trình duyệt của máy đó (không đồng bộ).
- Hiệu năng đo trong môi trường CI không GPU: 11–14 lần nhận diện/giây, 55–80 ms/khung hình. Laptop thật thường nhanh hơn; mục tiêu ≥ 15 lần/giây cần được đo lại trên máy trình diễn.

## Cấu trúc

```
src/
  tracking/   webcam, Worker MediaPipe, giao thức, bộ điều khiển cử chỉ, chặn mạng
  music/      thang ngũ cung, nhạc cụ, cử chỉ → nốt, âm thanh Web Audio, bộ phát, bài tập, tác phẩm mẫu
  artwork/    kiểu dữ liệu, cây theo nhạc cụ (sen, tre, đào, lúa), editor, bộ dựng hình, phát lại
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

Tài liệu: [kế hoạch](docs/superpowers/plans/2026-10-30-mua-net-ai-gieo-mam.md) · [nhật ký & kết quả kiểm thử](docs/superpowers/implementation-plan.md) · [thuyết minh](docs/thuyet-minh.md) · [kịch bản video](docs/kich-ban-video.md) · [ảnh tác phẩm mẫu](docs/samples/).
