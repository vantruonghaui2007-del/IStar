# Thuyết minh — Múa Nét AI · Gieo mầm

## 1. Vấn đề

Ở các không gian triển lãm, khách tham quan thường chỉ *nhìn* tác phẩm số. Trải nghiệm vẽ số lại đòi hỏi biết vẽ, có bút cảm ứng hoặc phải làm quen phần mềm. Các ứng dụng “vẽ bằng AI” phổ biến hiện nay thường gửi dữ liệu lên máy chủ, cần tài khoản, khóa API hoặc mạng ổn định — điều khó đảm bảo ở một gian trưng bày, và gây lo ngại về hình ảnh của người tham gia.

## 2. Giải pháp

**Múa Nét AI — Gieo mầm** biến chuyển động bàn tay thành một khu vườn:

- Đứng trước laptop, **chụm ngón cái và ngón trỏ** để đặt bút, di chuyển để thân cây mọc theo tay, **tách ngón** để hoa nở.
- Không cần biết vẽ: thuật toán tạo hình lo phần thẩm mỹ (độ dày theo tốc độ, lá so le, hoa, đom đóm), người tham gia lo phần *chuyển động*.
- Trong vài phút người xem có một tác phẩm riêng, đặt tên, lưu, **xem lại quá trình sáng tác** và **mang về ảnh PNG Full HD**.
- Thông điệp: *mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.*

## 3. Vai trò của AI — và giới hạn của nó

| Thành phần | Có phải AI? | Mô tả |
|---|---|---|
| Nhận diện 21 điểm khớp bàn tay | **Có** — MediaPipe Hand Landmarker (mạng nơ-ron) | Chạy trên CPU của máy bằng WebAssembly trong Web Worker, tối đa 20 lần/giây. Khung camera nhỏ vẽ lại đúng 21 điểm AI nhìn thấy để người xem *thấy* AI đang làm việc. |
| Hiểu cử chỉ chụm/nhả | Không — thuật toán | Tỷ lệ khoảng cách ngón cái–trỏ chia độ rộng lòng bàn tay, ngưỡng trễ 0,28/0,42, làm mượt 0,35, xử lý mất tay 200 ms. |
| Cây, lá, hoa | Không — thuật toán tạo hình theo seed | Tái lập được: cùng nét + cùng seed luôn cho cùng hình, nên phát lại và ảnh xuất trùng nhau. |

Dự án **không** dùng AI sinh ảnh và **không** tuyên bố nhận diện tay là phát minh mới.

## 4. Điểm cải tiến

1. **Đồng sáng tác bằng chuyển động**: tốc độ tay quyết định độ dày thân, độ dài nét quyết định số lá, điểm nhấc tay là nơi hoa nở.
2. **Chạy hoàn toàn trên máy, kể cả offline**: model 7,5 MiB và runtime 13,8 MiB được phục vụ cùng website và lưu sẵn bằng service worker. Ứng dụng chỉ báo *Sẵn sàng dùng offline* sau khi **xác minh từng tệp** trong cache, không dựa vào trạng thái mạng.
3. **Quyền riêng tư được kiểm chứng**: không tải ảnh lên, không lưu video. Thư viện MediaPipe có sẵn cơ chế gửi thống kê sử dụng về Google mỗi 60 giây — dự án phát hiện và chặn ở hai lớp (Worker chỉ được kết nối cùng nguồn + CSP `connect-src 'self'`), có kiểm thử tự động chứng minh.
4. **Phát lại trung thực**: phát lại theo thời gian thật của từng nét; khung hình cuối của phát lại khớp từng điểm ảnh với PNG xuất ra (có kiểm thử).
5. **Bền cho triển lãm**: tự lưu 1 giây, tự mở lại khu vườn sau khi tải lại trang, cập nhật phiên bản chỉ khi người dùng đồng ý, cảnh báo ánh sáng yếu, đường thử lại cho mọi lỗi camera.

## 5. Kiến trúc

```
Webcam ──► ImageBitmap ──► Web Worker (MediaPipe Hand Landmarker, WASM, CPU)
                                     │ 21 điểm bàn tay (≤ 20 lần/giây, 1 khung đang xử lý)
                                     ▼
                        PinchController (chụm/nhả, làm mượt, mất tay)
                                     │ sự kiện nét  ◄── chuột / cảm ứng (cùng luồng)
                                     ▼
                     Editor (nét, hoàn tác, giới hạn 20.000 điểm)
                       │                          │
          GardenRenderer (Canvas 2D,        IndexedDB (tự lưu 1 s)
          requestAnimationFrame)                 │
       trực tiếp · phát lại · PNG          Thư viện · mở lại
                                     
Service worker: precache HTML/JS/CSS/Worker/model/WASM, kiểm tra & sửa cache, cập nhật có xác nhận
```

- **Công nghệ**: React 19, TypeScript, Vite, MediaPipe Tasks Vision 1.2.0, Canvas 2D, IndexedDB, vite-plugin-pwa (service worker tự viết), Vitest, Playwright.
- **Không có backend**: phát hành tĩnh trên Cloudflare Pages (HTTPS), mọi tệp < 25 MiB.

## 6. Kết quả thử nghiệm

| Hạng mục | Kết quả |
|---|---|
| Kiểm thử đơn vị (Vitest) | 72/72 đạt — cử chỉ, tạo hình, editor, lưu trữ, tự lưu, phát lại, offline, chặn mạng, vườn mẫu |
| Kiểm thử đầu-cuối (Playwright, bản production, **model thật** với webcam giả phát ảnh bàn tay thật) | 20/20 đạt |
| Offline | Chuẩn bị online → đóng trình duyệt → mở lại khi **mất mạng hoàn toàn** → vẽ, lưu, phát lại, xuất PNG, bật camera và nhận diện tay: đạt. Đối chứng: không chuẩn bị thì không mở được trang. |
| Quyền riêng tư | Trong trọn chu kỳ 60 giây không có yêu cầu nào ra ngoài; gỡ lớp chặn thì kiểm thử báo lỗi (đối chứng). |
| Phát lại ↔ PNG | Sai khác trung bình < 0,5/255 mỗi kênh màu. |
| Độ bền | Phiên 10 phút liên tục (camera + model + 480 nét + 8 lần phát lại + 8 lần xuất ảnh): số nét luôn khớp, bộ nhớ JS 5–9 MB không tăng dần, 0 lỗi, tắt camera giải phóng camera. |
| Hiệu năng (máy CI không GPU) | 11–14 lần nhận diện/giây, 55–80 ms/khung hình. **Cần đo lại trên laptop trình diễn** (mục tiêu ≥ 15 lần/giây, trễ < 150 ms). |

Hạn chế chưa kiểm chứng tự động: webcam thật trên Chrome và Edge, ánh sáng phòng triển lãm, laptop cấu hình thấp.

## 7. Hướng phát triển

- Đo và tối ưu trên laptop trình diễn (giảm độ phân giải khung nhận diện nếu < 15 lần/giây; thử GPU delegate).
- Thêm trải nghiệm thứ hai (ví dụ: *Gió* — cử chỉ vẫy làm cây lay động) dùng lại toàn bộ nền tảng tracking/render.
- Chế độ triển lãm: tự phát lại vườn mẫu khi không có người, mã QR để khách tải ảnh về điện thoại (vẫn không cần máy chủ: ảnh tạo trên máy).
- Âm thanh sinh theo chuyển động (đã loại khỏi phạm vi bản đầu).
- Hỗ trợ hai bàn tay / hai người cùng vẽ.
