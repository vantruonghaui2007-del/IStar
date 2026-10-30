# Múa Nét AI — Gieo mầm

Trải nghiệm nghệ thuật tương tác: dùng chuyển động bàn tay hoặc chuột để tạo khu vườn trên canvas. MediaPipe nhận diện bàn tay trên thiết bị; nét cây/lá/hoa được tạo bởi thuật toán đồ họa, không phải AI sinh ảnh. Webcam không được tải lên hoặc lưu.

## Chạy trên máy
Yêu cầu Node.js 20.19+ hoặc 22.12+.

```sh
npm ci
npm run dev
```

Camera chỉ hoạt động trên HTTPS hoặc `localhost`; bấm **Bắt đầu** để xin quyền. Nếu không cấp quyền hoặc chưa có camera, có thể dùng chuột. Model MediaPipe và WASM nằm trong `public/models` và `public/wasm`, không tải từ CDN.

## Kiểm tra
```sh
npm run test
npm run typecheck
npm run build
```

Model: [Hand Landmarker float16](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task), SHA-256 `FBC2A30080C3C557093B5DDFC334698132EB341044CCEE322CCF8BCF3607CDE1`. Runtime/WASM: `@mediapipe/tasks-vision` 1.2.0. Model/runtime theo Apache-2.0; xem upstream license/model card.

## Trạng thái triển khai
- Đã có studio React/TS/Vite, Canvas 1920×1080, 3 bảng màu, điều khiển chuột, camera preview, worker MediaPipe CPU, model/WASM local và unit test cử chỉ.
- Lưu nháp hiện còn dùng localStorage; chưa có IndexedDB/library, replay timestamp, redo có xác nhận hoặc giới hạn cứng điểm.
- PWA/offline chưa được cấu hình và kiểm chứng. Chưa phát hành Cloudflare Pages.
- Cần kiểm tra webcam thật trên Chrome và Edge, bao gồm ánh sáng yếu, quyền camera và hiệu năng. Không coi build thành công là nghiệm thu nhận diện.
- Kế hoạch và nhật ký: [`docs/superpowers/implementation-plan.md`](docs/superpowers/implementation-plan.md).
