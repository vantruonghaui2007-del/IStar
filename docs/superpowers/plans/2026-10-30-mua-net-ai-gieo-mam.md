# Múa Nét AI — Kế hoạch triển khai “Gieo mầm”

> **Dành cho người triển khai:** dùng `superpowers:executing-plans` để thực hiện lần lượt từng nhiệm vụ. Đánh dấu các bước đã hoàn thành; kiểm tra từng phần trước khi chuyển sang phần tiếp theo.

**Mục tiêu:** xây dựng ứng dụng nghệ thuật tương tác, dùng AI nhận diện bàn tay qua webcam để người dùng tạo nên một khu vườn bằng chuyển động, lưu tác phẩm và phát lại quá trình sáng tác.

**Kiến trúc:** ứng dụng web độc lập, xử lý nhận diện và đồ họa trên thiết bị của người dùng. Phát hành dưới dạng website HTTPS và PWA dùng offline sau khi tải trước đầy đủ.

**Công nghệ:** React, TypeScript, Vite, MediaPipe Hand Landmarker, Canvas 2D, IndexedDB, vite-plugin-pwa, Vitest và Playwright.

**Đặc tả:** các quyết định sản phẩm, hành vi và tiêu chí nghiệm thu trong kế hoạch này (mục 1–2 đóng vai trò đặc tả). Nhật ký thực hiện và kết quả kiểm thử: [`../implementation-plan.md`](../implementation-plan.md).

## 1. Sản phẩm và phạm vi đã chốt

### Ý tưởng và người dùng

Tên sản phẩm: **Múa Nét AI**. Trải nghiệm đầu tiên: **Gieo mầm**.

Thông điệp: **“Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.”**

Sản phẩm dành cho sinh viên và khách tham quan triển lãm, có thể trải nghiệm trong vài phút mà không cần biết vẽ. Mục tiêu trình diễn là người xem hiểu cách dùng, tự tạo được một tác phẩm và nhận thấy rõ vai trò của AI.

Luồng sử dụng:

1. Đọc giới thiệu ngắn và xem minh họa thao tác.
2. Bấm **Bắt đầu**, cho phép sử dụng webcam.
3. Đưa một bàn tay vào khung hướng dẫn.
4. Chụm hai ngón để vẽ; tách ngón để nhấc bút.
5. Các nét vẽ phát triển thành thân cây, lá và hoa.
6. Đặt tên, lưu tác phẩm, xuất PNG hoặc xem phát lại.

### Phạm vi phiên bản đầu

Bao gồm:

- Nhận diện một bàn tay, hướng dẫn trạng thái rõ ràng.
- Một trải nghiệm nghệ thuật hoàn chỉnh theo chủ đề Gieo mầm.
- Ba bảng màu được tuyển chọn.
- Hoàn tác nét cuối, làm lại và chế độ toàn màn hình.
- Lưu tác phẩm trên thiết bị, mở lại, xóa và phát lại.
- Xuất ảnh PNG.
- Website công khai và PWA có kiểm tra sẵn sàng offline.
- Điều khiển bằng chuột để thử trải nghiệm khi chưa bật webcam.

Chưa đưa vào: tài khoản, đồng bộ đám mây, tạo nhạc, chatbot, sinh ảnh từ văn bản, xuất video, nhận diện nhiều người hoặc phiên bản di động hoàn chỉnh.

### Giới hạn chung

- Dự án riêng (repo `IStar`); giữ nguyên MIXVERSE.
- Giao diện tiếng Việt, ưu tiên laptop Windows với Chrome và Edge.
- Không sử dụng API AI trả phí hoặc yêu cầu người dùng nhập khóa.
- Không gửi hình webcam lên máy chủ; không lưu hình webcam.
- Model, WASM, biểu tượng và tài nguyên giao diện được phục vụ cùng website.
- Chỉ xin quyền camera sau thao tác chủ động của người dùng.
- Phiên bản offline cần được chuẩn bị trước trên đúng trình duyệt sẽ dùng trình diễn.

MediaPipe hỗ trợ model lưu trong dự án và khuyến nghị dùng Web Worker để tránh quá trình nhận diện chặn giao diện. [Tài liệu MediaPipe](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js).

## 2. Thiết kế trải nghiệm và kiến trúc

### Giao diện

Phong cách: **nền giấy ngà, xanh thực vật, điểm nhấn hồng đất**, ít chi tiết điều khiển để tác phẩm là phần nổi bật nhất.

Bố cục studio:

- Thanh trên: tên sản phẩm, trạng thái camera, trạng thái offline.
- Giữa: vùng tác phẩm tỷ lệ 16:9.
- Cạnh bên: hướng dẫn cử chỉ và ba bảng màu.
- Thanh dưới: hoàn tác, làm lại, lưu, xuất PNG và phát lại.
- Webcam hiển thị trong khung nhỏ có thể ẩn; không đưa webcam vào ảnh xuất.

Ba bảng màu: **Vườn xuân**, **Hoàng hôn**, **Đêm đom đóm**. Đổi bảng màu chỉ ảnh hưởng những nét vẽ tiếp theo.

Giao diện dùng nút thông thường cho các thao tác lưu, xóa và hoàn tác. Bản đầu không dùng cử chỉ phức tạp để điều khiển toàn bộ ứng dụng.

### Nhận diện và điều khiển

Luồng dữ liệu: **Webcam → khung hình → Worker MediaPipe → điểm bàn tay → trạng thái chụm ngón → nét vẽ → đồ họa thực vật.**

- Camera yêu cầu khoảng 640 × 480; chấp nhận độ phân giải thực tế trình duyệt cung cấp.
- MediaPipe chạy chế độ `VIDEO`, tối đa một bàn tay.
- Chạy CPU trong Worker; chưa thêm cơ chế tăng tốc GPU.
- Tối đa 20 lần nhận diện mỗi giây, chỉ một khung hình đang xử lý. Bỏ qua khung mới nếu Worker đang bận.
- Vẽ giao diện bằng `requestAnimationFrame`, tách khỏi tốc độ nhận diện.
- Đóng `ImageBitmap` sau mỗi lượt xử lý để tránh tăng bộ nhớ.

Quy tắc chụm ngón:

- Khoảng cách đầu ngón cái và ngón trỏ chia cho độ rộng lòng bàn tay (điểm 5–17).
- Bắt đầu vẽ khi tỷ lệ dưới `0,28`; nhấc bút khi trên `0,42`; vùng giữa giữ trạng thái hiện tại.
- Bỏ mẫu có điểm không hợp lệ hoặc lòng bàn tay quá nhỏ.
- Làm mượt tọa độ bằng hệ số `0,35` cho mẫu mới.
- Khi mất tay: ngừng thêm điểm ngay; sau 200 ms kết thúc nét. Khi tay xuất hiện lại, bắt đầu nét mới.
- Camera xem trước và tọa độ vẽ cùng được phản chiếu ngang.

Khi tắt camera, chuyển tab hoặc vào chế độ phát lại: kết thúc nét đang vẽ và dừng vòng xử lý. Khi bật lại cần chụm ngón mới để tiếp tục.

### Cách hình thành tác phẩm

- Đường di chuyển tạo thành thân hoặc cành cong.
- Di chuyển chậm tạo nét dày hơn; di chuyển nhanh tạo nét thanh hơn.
- Lá mọc luân phiên dọc nét, theo khoảng cách, tối đa 20 lá mỗi nét.
- Khi nhấc tay, một bông hoa xuất hiện ở đầu cuối của nét.
- Một thao tác chụm tại chỗ tạo một bông hoa nhỏ.
- Lá và hoa có hoạt ảnh nở ngắn; xuất ảnh luôn lấy trạng thái đã nở hoàn chỉnh.
- Hình dáng và biến thể dùng seed được lưu với nét.

Canvas có hệ tọa độ logic **1920 × 1080**; PNG luôn xuất ở kích thước này.

### Dữ liệu

- `HandSample`: thời điểm và 21 điểm bàn tay chuẩn hóa, hoặc trạng thái không phát hiện tay.
- `Stroke`: mã nét, bảng màu, seed và danh sách điểm `{x, y, t}`.
- `Artwork`: phiên bản dữ liệu, mã, tên, thời điểm tạo/cập nhật, kích thước canvas và các nét.

Giới hạn một tác phẩm là **20.000 điểm**. Phân chia mã: **tracking**, **artwork**, **storage**, **offline**, **studio**. Bộ dựng hình dùng chung cho trực tiếp, phát lại và xuất ảnh.

## 3. Các nhiệm vụ triển khai

1. **Dựng studio và chứng minh model chạy được** — model/WASM cục bộ có URL/phiên bản/SHA-256/giấy phép; Worker; con trỏ đầu ngón trỏ; lỗi camera/model; kiểm tra model thật.
2. **Chuyển cử chỉ thành nét ổn định** — kiểm thử ngưỡng, vùng giữ, làm mượt, mất tay; nhãn **Đưa tay vào khung / Sẵn sàng / Đang vẽ**; chuột đi chung luồng (**Chế độ chuột**).
3. **Hoàn thiện nghệ thuật Gieo mầm** — kiểm thử seed, giới hạn lá, giới hạn điểm; thân/lá/hoa/hoạt ảnh nở; ba bảng màu; hoàn tác theo nét; làm lại có xác nhận.
4. **Lưu, mở lại, phát lại, xuất PNG** — IndexedDB, thư viện mở/đổi tên/xóa, tự lưu sau 1 giây, phát lại theo timestamp có tạm dừng/bắt đầu lại, PNG 1920 × 1080, giữ tác phẩm khi lưu lỗi.
5. **PWA và offline đáng tin cậy** — precache HTML/JS/CSS/model/WASM (khai báo rõ `.task`, `.wasm`); chỉ báo **Sẵn sàng dùng offline** khi SW điều khiển trang và cache đủ; cập nhật cần người dùng chọn.
6. **Phát hành và bài dự thi** — test/typecheck/build/e2e; không API key/CDN/gửi dữ liệu webcam; mỗi tài nguyên < 25 MiB; Cloudflare Pages; README; ba tác phẩm mẫu; kịch bản video và thuyết minh.

## 4. Kiểm thử và tiêu chí nghiệm thu

Lệnh chuẩn: `npm run test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. Kiểm thử offline chạy trên bản production.

| Nhóm | Điều kiện phải đạt |
|---|---|
| Nhận diện thật | Model hoạt động trên webcam laptop, Chrome và Edge; hướng con trỏ khớp chuyển động tay |
| Cử chỉ | Không rung trạng thái quanh ngưỡng chụm; mất tay không tạo nét nối sai |
| Camera | Từ chối quyền, thiếu camera hoặc camera bị chiếm đều có thông báo và đường thử lại |
| Tranh | Ba bảng màu hoạt động; hoàn tác xóa đúng toàn bộ nét; canvas đổi kích thước không mất tranh |
| Lưu trữ | Tác phẩm mở lại đúng; lỗi lưu không làm mất khả năng xuất ảnh |
| Phát lại | Bố cục cuối khớp tác phẩm đã lưu; không bật camera khi xem |
| Offline | Khởi động lại khi ngắt mạng vẫn dùng được tất cả chức năng chính |
| Cập nhật | Có phiên bản mới không làm mất phiên sáng tác đang mở |
| Riêng tư | Không có ảnh/video webcam hoặc điểm tay gửi ra máy chủ |
| Độ bền | Chạy sáng tác liên tục 10 phút không treo; tắt camera giải phóng camera và Worker |

Mục tiêu hiệu năng: nhận diện ≥ 15 lần/giây, độ trễ < ~150 ms trong điều kiện đủ sáng. Năm tình huống cần chú ý: ánh sáng yếu, mất tay rồi xuất hiện lại, mất camera/chuyển tab, cache chưa đầy đủ, lưu trữ hết dung lượng.

## 5. Thứ tự ưu tiên

Model chạy ổn → cử chỉ dễ dùng → tác phẩm đẹp → lưu/phát lại → offline → phát hành.
