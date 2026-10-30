# Webcam giả cho kiểm thử E2E

Chromium phát lặp các tệp MJPEG này thay cho webcam (`--use-file-for-fake-video-capture`), nên E2E chạy được model nhận diện thật.

| Tệp | Nội dung | Nguồn |
|---|---|---|
| `hand-victory.mjpeg` | Bàn tay giơ hai ngón (không chụm) | `https://storage.googleapis.com/mediapipe-assets/victory.jpg` |
| `hand-pointing_up.mjpeg` | Bàn tay chỉ lên | `https://storage.googleapis.com/mediapipe-assets/pointing_up.jpg` |
| `no-hand.mjpeg` | Nền trống, không có tay | Tạo bằng ffmpeg (màu đơn) |

Ảnh gốc là dữ liệu kiểm thử công khai của dự án MediaPipe (Apache-2.0). Tạo lại:

```sh
ffmpeg -loop 1 -i victory.jpg -vf "scale=-2:420,pad=640:480:(ow-iw)/2:(oh-ih)/2:color=white" -t 0.3 -r 10 -q:v 5 -f mjpeg hand-victory.mjpeg
```
