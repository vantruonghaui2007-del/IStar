# Thuyết minh — Múa Nét AI · Gieo mầm

**Mảng thi:** SICT AI-Art Challenge (CLB Nghệ thuật iStar) — nhóm *Sản phẩm & Giải pháp AI Tương tác*: tương tác thời gian thực với âm thanh và hình ảnh.

> *Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp.*

## 1. Vấn đề

Đàn bầu, sáo trúc, đàn tranh, trống cơm là âm thanh của làng quê Việt, nhưng với nhiều bạn trẻ chúng chỉ còn là thứ nghe qua tivi, sân khấu lễ hội. Nhạc cụ thật đắt, khó tìm thầy, khó học; buổi giới thiệu nhạc cụ dân tộc thường là *nghe* chứ ít khi được *tự tay chơi*. Khi không ai chạm vào, âm nhạc truyền thống dần bị quên.

## 2. Giải pháp

**Múa Nét AI — Gieo mầm** cho bất kỳ ai **chơi nhạc cụ cổ truyền bằng đôi tay trong không trung**, và mỗi nốt nhạc mọc thành một chi tiết của khu vườn quê:

| Nhạc cụ | Chơi bằng tay | Mọc thành |
|---|---|---|
| **Đàn bầu** (một dây) | chụm để gảy, nâng/hạ tay để **luyến** như uốn cần đàn | **hoa sen** — mỗi nốt luyến tới một lá sen, buông tay sen nở |
| **Sáo trúc** | chụm giữ để thổi, tay lên xuống theo giai điệu | **cây tre** — mỗi nốt mới một chùm lá tre |
| **Đàn tranh** (16 dây) | chạm từng dây hoặc lướt ngang để **rải** | **cành đào** — mỗi dây được gảy nở một bông đào |
| **Trống cơm** | chụm nhanh để gõ: dưới “tùng”, trên “tình” | **bông lúa** — mỗi tiếng trống một khóm lúa |

Mọi nốt nằm trên **thang ngũ cung hò – xự – xang – xê – cống**, nên ai chơi cũng nghe “ra chất Việt”. Tên nốt hiện lên khi chơi.

Mỗi nhạc cụ có:
- **Giới thiệu ngắn** (chất liệu, cách chơi thật, gắn với loại hình nghệ thuật nào);
- **Hướng dẫn cách chơi** bằng tay và **bài tập 3 bước** tự đánh dấu khi người chơi làm đúng;
- **Tác phẩm mẫu** (*Gió đồng*, *Chiều quê*, *Mưa xuân*, *Hội làng*) phát lại cùng khu vườn mọc theo tiếng nhạc.

Nhiều người lần lượt chơi các nhạc cụ khác nhau sẽ cùng tạo ra **một bản hòa tấu và một bức tranh quê chung**; phát lại để nghe – xem lại toàn bộ, xuất ảnh PNG Full HD làm kỷ niệm.

## 3. Thông điệp

Điều tốt đẹp được nuôi dưỡng ở đây là **âm nhạc của cha ông**: mỗi chuyển động nhỏ của người trẻ làm một tiếng đàn, tiếng sáo vang lên lần nữa — và vì nghe được, thấy được, chơi được, người ta muốn tìm hiểu nhạc cụ thật.

## 4. AI làm gì — và không làm gì

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **AI nhìn bàn tay** | MediaPipe Hand Landmarker (mạng nơ-ron), WebAssembly trong Web Worker | Mỗi khung hình webcam → 21 điểm khớp tay, ~15–20 lần/giây. Khung camera nhỏ vẽ lại 21 điểm để người xem *thấy* AI đang làm việc. |
| **Hiểu cử chỉ thành động tác chơi đàn** | Thuật toán của nhóm | Chụm/nhả (ngưỡng 0,28/0,42 tỷ lệ với lòng bàn tay), độ cao tay → cao độ ngũ cung, lướt ngang → rải dây; nốt chỉ vang khi tay dừng ≥ 40 ms để không kêu lạc. |
| **Âm thanh nhạc cụ** | Tổng hợp Web Audio | Đàn bầu: âm bồi + luyến + vibrato; sáo: tiếng sáo có hơi thổi; đàn tranh: mô phỏng dây gảy Karplus–Strong; trống: tiếng da trống tùng/tình. **Âm thanh mô phỏng, gần giống chứ không phải bản thu nhạc cụ thật.** |
| **Khu vườn** | Thuật toán tạo hình theo seed | Mỗi nốt → lá, hoa; tái lập được nên phát lại và ảnh xuất luôn trùng nhau. Không dùng AI sinh ảnh. |

Dữ liệu đầu vào: hình webcam (chỉ xử lý trên máy, không lưu, không gửi đi). Đầu ra: âm thanh, khu vườn, nét vẽ có thời gian (để phát lại).

Hạn chế: cần đủ sáng, một bàn tay; độ trễ phụ thuộc máy (CPU); tiếng nhạc cụ là mô phỏng.

## 5. Điểm đổi mới

1. **Cơ thể là nhạc cụ**: không cần đàn, không cần chạm — một thao tác chụm tay thay cho gảy, thổi, gõ.
2. **Âm nhạc thành hình**: mỗi nốt nhạc mọc thành chi tiết thực vật mang tính biểu tượng của chính nhạc cụ đó (tre cho sáo trúc, lúa cho trống cơm…). Bức tranh *là* bản nhạc.
3. **Học mà chơi**: giới thiệu, hướng dẫn, bài tập tự kiểm tra, rồi thưởng thức tác phẩm — trong vài phút.
4. **Chạy hoàn toàn trên máy, kể cả offline**: AI, âm thanh, đồ họa đều trong trình duyệt; mang tới bất kỳ phòng học, sân khấu, bảo tàng nào. Thư viện AI có sẵn cơ chế gửi thống kê ra ngoài — nhóm phát hiện và chặn, có kiểm thử chứng minh.

## 6. Ứng dụng thực tế

- **Sân khấu, sự kiện CLB iStar / nhà trường**: một người “chơi” trên màn chiếu, khu vườn và tiếng nhạc lan ra cả hội trường.
- **Góc trải nghiệm văn hóa** ở ngày hội, bảo tàng, thư viện: khách tự tay chơi thử 4 nhạc cụ trong 1–2 phút.
- **Giờ học âm nhạc / giáo dục di sản**: giáo viên dùng phần giới thiệu + bài tập, học sinh chơi theo.
- **Tại nhà**: mở web trên laptop có webcam, không cần cài đặt hay mạng.

## 7. Kiến trúc

```
Webcam → Worker MediaPipe (21 điểm tay) → bộ cử chỉ (chụm, độ cao, lướt)
      → nét có thời gian ──┬─► âm nhạc (scoreOf → MusicPlayer → Web Audio)
          ▲ chuột cùng luồng ├─► khu vườn (cây theo nhạc cụ, Canvas 2D)
                             └─► IndexedDB (tự lưu) · phát lại · PNG
Service worker: lưu sẵn model, WASM, giao diện → chạy offline
```

React + TypeScript + Vite · MediaPipe Tasks Vision 1.2.0 · Web Audio · Canvas 2D · IndexedDB · PWA · Vitest · Playwright. Không backend; phát hành tĩnh (GitHub Pages / Cloudflare Pages).

## 8. Kết quả thử nghiệm

| Hạng mục | Kết quả |
|---|---|
| Kiểm thử đơn vị | 93/93 — thang ngũ cung, nốt nhạc theo cử chỉ, tác phẩm mẫu phát đúng từng nốt đã viết, bài tập từng bước, cây theo nhạc cụ, lưu trữ, phát lại, offline |
| Kiểm thử đầu-cuối (Playwright, bản production, model thật với webcam giả) | 23/23 — 4 nhạc cụ đều phát tiếng và hiện tên nốt, bài tập tự đánh dấu, tác phẩm mẫu phát hết, offline sau khi khởi động lại trình duyệt, quyền riêng tư 60 giây, cập nhật phiên bản |
| Độ bền | 10 phút liên tục (camera + model + vẽ + phát lại + xuất ảnh): không lỗi, bộ nhớ ổn định |
| Hiệu năng (máy chủ CI không GPU) | 11–14 lần nhận diện/giây; cần đo lại trên laptop trình diễn |

## 9. Hướng phát triển

- Thêm nhạc cụ: đàn nhị (kéo vĩ = đưa tay ngang), đàn nguyệt, đàn đá, song loan.
- Nhập **bản nhạc dân ca thật** (CLB biên soạn theo ký âm ngũ cung) để người chơi tập theo từng nốt.
- Chế độ hòa tấu nhiều người cùng lúc (hai bàn tay, hai người), chế độ sân khấu toàn màn hình.
- Thu âm nhạc cụ thật của nghệ nhân để thay cho âm thanh mô phỏng.
