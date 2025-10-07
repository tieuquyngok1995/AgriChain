# Hướng dẫn GitHub Copilot

## Tổng quan dự án

Hệ thống backend AgriChain để truy xuất nguồn gốc dữ liệu nông nghiệp dựa trên blockchain. Tạo hash SHA-256 từ dữ liệu off-chain và ghi lên blockchain để xác minh nguồn gốc dữ liệu.

## Kiến trúc & Mẫu thiết kế chính

### Cấu trúc MVC (src/)

- **config/** - Cấu hình blockchain (mẫu export blockchainConfig)
- **services/** - Logic nghiệp vụ (mẫu object BlockchainService với các phương thức async)
- **controllers/** - Xử lý HTTP (hàm async với try-catch, sử dụng tiện ích success/error)
- **routes/** - Router Express (export default, import controllers)
- **utils/** - Tiện ích chung (helper response, xử lý lỗi)

### Tích hợp Blockchain (ethers.js)

- Sử dụng mẫu JsonRpcProvider: `new ethers.JsonRpcProvider(rpcUrl)`
- Khởi tạo ví: `new ethers.Wallet(privateKey, provider)`
- Service export object với các phương thức async, không phải class instances
- Tất cả thao tác blockchain được bao bọc trong try-catch với xử lý lỗi phù hợp

### Cấu hình môi trường

- Sử dụng process.env với fallbacks trong file config
- RPC URLs theo network (mặc định Polygon Amoy testnet)
- Private keys và contract addresses qua environment variables
- Ví dụ: mẫu `blockchainConfig.rpcUrl` để truy cập config

### Xử lý phản hồi

- Tiện ích response chuẩn hóa: `success(data)` và `error(message)`
- Controllers theo mẫu: extract params → gọi service → trả về JSON response
- Tất cả async controllers được bao bọc trong try-catch với status 500 cho lỗi

## Quy ước phát triển

### Kiểu Import/Export

- ES6 modules với đuôi .js: `from "../config/blockchain.js"`
- Named exports cho configs: `export const blockchainConfig`
- Default exports cho routes: `export default router`
- Object exports cho services: `export const BlockchainService = {}`

### Mẫu hàm

- Tất cả comments phải bằng tiếng Anh
- Mỗi hàm phải có comment mô tả ở đầu
- Ưu tiên async/await hơn promises
- Hàm controller: mẫu `async (req, res) => {}`

### Xử lý lỗi

- Service layer: throw errors, để controllers xử lý HTTP responses
- Controllers: try-catch với `res.status(500).json(error(err.message))`
- Sử dụng error utilities tùy chỉnh cho API responses nhất quán

## File quan trọng cần hiểu

- `src/config/blockchain.js` - Cấu hình kết nối blockchain
- `src/services/blockchain.service.js` - Mẫu tương tác blockchain cốt lõi
- `src/controllers/transaction.controller.js` - Mẫu xử lý HTTP request
- `.env` - Cấu trúc và cách đặt tên environment variable

Khi tạo tính năng mới, hãy tuân theo mẫu service → controller → route đã thiết lập với xử lý lỗi và định dạng response phù hợp.
