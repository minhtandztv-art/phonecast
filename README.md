# PhoneCast

Ứng dụng web truyền màn hình Android sang trình duyệt máy tính bằng WebRTC, ghép nối qua mã QR.

## Chạy thử trên máy tính

Yêu cầu Node.js 18+.

```bash
npm install
npm start
```

Mở `http://localhost:3000`.

## Triển khai để có link HTTPS truy cập từ mọi nơi

1. Đưa toàn bộ thư mục dự án lên GitHub.
2. Tạo một Web Service mới trên Render (hoặc nền tảng Node.js tương đương), kết nối repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Sau khi deploy, mở URL HTTPS do nền tảng cấp.

Trang HTTPS dùng được cho cả điện thoại và máy tính ở cùng Wi-Fi hoặc khác mạng. Không cần mở cổng router.

## TURN cho kết nối Internet ổn định

WebRTC dùng STUN mặc định. Một số mạng di động, NAT nghiêm ngặt hoặc tường lửa cần TURN relay. Tạo dịch vụ TURN (ví dụ coturn hoặc nhà cung cấp TURN) và thêm vào `public/app.js` bằng cách thay phần `iceServers`:

```js
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:YOUR_TURN_HOST:3478",
    username: "YOUR_TURN_USERNAME",
    credential: "YOUR_TURN_CREDENTIAL"
  }
];
```

Không đưa thông tin TURN bí mật vào repository công khai. Với triển khai thật, nên cấp thông tin TURN tạm thời qua máy chủ.

## Lưu ý Android

- Chia sẻ màn hình từ trình duyệt yêu cầu HTTPS (ngoại trừ localhost).
- Hỗ trợ `getDisplayMedia()` trên Android phụ thuộc phiên bản Android và trình duyệt. Nếu nút chia sẻ báo không hỗ trợ, trình duyệt đó không thể phát màn hình bằng web app này.
- Người dùng phải chủ động chấp thuận hộp thoại chia sẻ màn hình của hệ điều hành.
- Âm thanh hệ thống không được truyền trong bản này.
- Máy chủ chỉ chuyển tiếp tín hiệu kết nối; video đi ngang hàng qua WebRTC, hoặc qua TURN relay khi cần.
- Mã phòng ngẫu nhiên 6 chữ số chỉ phù hợp demo/nhóm nhỏ. Bản triển khai công khai nên bổ sung xác thực, giới hạn tốc độ, thời hạn phòng và mã ghép nối mạnh hơn.
