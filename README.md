# Mô Phỏng Tàu Đệm Từ 2D — Maglev Physics Simulator

Phòng thí nghiệm mô phỏng 2D tàu đệm từ (maglev) chạy trên đường ray từ tính, dùng cho
giảng dạy và thực hành tại HUIT. Toàn bộ mô hình vật lý chạy trên trình duyệt, không cần
máy chủ hay API key.

- Nền tảng: React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- Đồ hoạ: Canvas 2D (không dùng WebGL), hoạt ảnh theo từng khung hình
- Âm thanh: Web Audio API tổng hợp trực tiếp (không có tệp âm thanh)

## Tính năng

| Nhóm | Nội dung |
| --- | --- |
| Hệ nâng | EMS (hút điện từ, khe hở 10–15 mm) và EDS (đẩy cảm ứng siêu dẫn, khe hở ~100 mm) |
| Động cơ | Động cơ đồng bộ tuyến tính (LSM): lực đẩy, phanh tái sinh, phanh khẩn cấp, phanh cơ khí |
| Điều khiển | Bộ PID giữ khe hở EMS (Kp, Ki, Kd), từ trường bogie, lực nâng tối đa |
| Môi trường | Mật độ không khí (kể cả chân không Hyperloop), gió xuôi/ngược, độ dốc ±8%, mưa/tuyết |
| Trực quan | Đường sức từ, luồng khí động, véc-tơ lực, tia laser đo khe hở, tia lửa khi chạm ray, mưa/tuyết |
| Camera | Bám tàu, gầm bogie, trạm quan sát, toàn tuyến; lăn chuột để zoom, kéo để dịch |
| Phân tích | Dao động ký 4 kênh (tốc độ, khe hở, lực đẩy, công suất) lấy mẫu ~15 Hz |
| Học tập | 7 bước chỉ dẫn trực tiếp, 5 điểm chú thích bộ phận, mặt cắt bogie EMS/EDS, 4 thử thách |

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:3000
```

Các lệnh kiểm tra:

```bash
npm run lint       # tsc --noEmit, chế độ strict
npm run build      # vite build
npm run simcheck   # nghiệm thu vật lý headless cho cả 5 preset
```

`simcheck` chạy từng preset 120 giây mô phỏng và báo lỗi nếu có giá trị NaN, tàu "bay"
nhưng vẫn chạm ray, khe hở bị kẹp ở ngưỡng trần 200 mm, khe hở lệch quá xa mục tiêu,
hoặc kịch bản mất điện không thực sự hạ tàu xuống guốc trượt.

## Điều khiển

| Phím | Tác dụng |
| --- | --- |
| `W` / `↑` | Tăng ga 10% |
| `S` / `↓` | Giảm ga 10% (âm → phanh tái sinh) |
| `X` | Về ga 0, thả trôi |
| `E` | Bật/tắt phanh khẩn cấp |
| `Space` | Dừng/chạy mô phỏng |
| `R` | Đặt lại |
| `1`–`4` | Đổi góc nhìn camera |

Tay ga, các nút 0/50/100%, phanh khẩn cấp và bộ chọn thời gian 1x/2x/4x nằm ở thanh
điều khiển phía dưới.

## Mô hình vật lý

Trạng thái được tích phân theo từng bước nhỏ (10–20 micro-step mỗi khung hình, `dt` tối đa
100 ms) bằng phương pháp Euler bán ẩn. Hệ phương trình chính:

- Khí động: `F_drag = ½·ρ_hiệu_dụng·Cd·A·(v − v_gió)²`, có hệ số mưa +8%, tuyết +6%.
- Dốc: `F_dốc = −m·g·sin(atan(grade/100))`, thành phần pháp tuyến `m·g·cos(...)`.
- EMS: lực hút tỉ lệ nghịch với khe hở, PID hiệu chỉnh dòng điện quanh điểm cân bằng;
  lực bị chặn bởi `maxLiftForce`; khi khe hở = 0 tàu tựa guốc trượt, ma sát `μ·N`.
- EDS: `F_nâng = F_max·v²/(v²+v_c²)·(B/B₀)²·(y₀/y)^1.5`, `v_c = 38 m/s`; dưới tốc độ cất
  cánh tàu chạy trên bánh xe phụ (μ = 0.015).
- Công suất: `P = F·v/η` khi kéo, thu hồi 75% khi phanh tái sinh, cộng công suất nuôi cuộn nâng.

## Cấu trúc

```
src/
  App.tsx                     vòng lặp mô phỏng (requestAnimationFrame) và bố cục
  physics/maglevEngine.ts     tích phân trạng thái, lực nâng/đẩy/cản/ma sát
  physics/presets.ts          5 kịch bản mẫu
  types/physics.ts            kiểu dữ liệu dùng chung
  components/SimulationCanvas.tsx   kết xuất cảnh 2D, hạt, thời tiết, camera
  components/ControlDeck.tsx        thanh lái, preset, bảng thông số
  components/ChallengeModeModal.tsx 4 thử thách + điều kiện thắng/thua
  audio/soundEffects.ts       tổng hợp tiếng động cơ/gió/guốc trượt
scripts/physics-check.ts      nghiệm thu vật lý headless
```

## Giới hạn đã biết

- **Tốc độ đỉnh không trùng kỷ lục thực tế.** Động cơ LSM trong mô hình sinh lực đẩy không
  đổi theo tốc độ (không mô phỏng giới hạn công suất/back-EMF), nên khi chạy lâu tàu có thể
  vượt xa con số trên thẻ preset (SCMaglev ~1.500 km/h, Hyperloop ~6.000 km/h). Các nhãn
  "603 km/h", "431 km/h" là số liệu tham chiếu ngoài đời, không phải giới hạn của mô phỏng.
- **EDS không dùng PID.** Bộ điều khiển Kp/Ki/Kd chỉ tác động ở chế độ EMS; khe hở EDS do
  cân bằng lực thụ động quyết định nên có thể lệch khỏi `targetGap` (khoảng 110–120 mm khi
  đặt 100 mm).
- **Không có chuyển động lùi.** Vận tốc bị chặn ở 0; trên dốc, tàu dừng lại thay vì trôi ngược.
- Khe hở bị chặn cứng ở 200 mm (coi như từ trường mất kiểm soát) — đây là biện pháp an toàn
  số học, không phải hiện tượng vật lý.
- Chưa có kiểm thử tự động cho giao diện; `simcheck` chỉ bao phủ phần vật lý.

## Giấy phép

Apache-2.0 (xem header `@license` trong từng tệp nguồn).
