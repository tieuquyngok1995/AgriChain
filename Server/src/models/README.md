# AgriChain Models Documentation

## Tổng quan

Hệ thống models của AgriChain được thiết kế theo mẫu **Repository Pattern** với **BaseModel** làm lớp cơ sở, cung cấp các chức năng CRUD chuẩn và các phương thức tiện ích cho tất cả models.

## Cấu trúc Models

```
src/models/
├── base.model.js              # Lớp cơ sở cho tất cả models
├── farmer.model.js            # Model quản lý nông dân
├── product.model.js           # Model quản lý sản phẩm
├── agricultural-data.model.js # Model dữ liệu nông nghiệp
├── uploaded-files.model.js    # Model file upload
├── blockchain-transactions.model.js # Model giao dịch blockchain
├── verification-logs.model.js # Model log xác minh
└── index.js                   # Export tổng hợp
```

## BaseModel

### Chức năng cơ bản

```javascript
import { BaseModel } from "../models/base.model.js";

// Tạo instance model
const model = new BaseModel("table_name", "primary_key");

// CRUD operations
await model.findById(id);
await model.findAll(conditions, orderBy, limit, offset);
await model.create(data);
await model.update(id, data);
await model.delete(id);
await model.count(conditions);
await model.exists(conditions);
```

### Tính năng

- ✅ **Auto validation** - Tự động validate dữ liệu
- ✅ **Error handling** - Xử lý lỗi thống nhất
- ✅ **Logging** - Ghi log tất cả operations
- ✅ **Pagination** - Hỗ trợ phân trang
- ✅ **Flexible queries** - Truy vấn linh hoạt

## Các Models Chính

### 1. Farmer Model

**Table**: `farmers`  
**Primary Key**: `farmer_id`

```javascript
import { Farmer } from "../models/index.js";

// Tạo nông dân mới
const farmer = await Farmer.createFarmer({
  farmer_id: "FARMER_001",
  full_name: "Nguyen Van A",
  email: "nguyenvana@example.com",
  phone: "0901234567",
  province: "Long An",
  certification_level: "Organic",
});

// Tìm theo province
const farmers = await Farmer.findByProvince("Long An");

// Lấy thống kê
const stats = await Farmer.getFarmerStatistics("FARMER_001");
```

**Tính năng đặc biệt:**

- Validation email, phone, wallet address
- Soft delete (deactivate/activate)
- Thống kê theo province, certification
- Search với pagination

### 2. Product Model

**Table**: `products`  
**Primary Key**: `product_id`

```javascript
import { Product } from "../models/index.js";

// Tạo sản phẩm mới
const product = await Product.createProduct({
  product_code: "RICE_ORG_001",
  product_name: "Organic Rice Premium",
  category: "Grains",
  sub_category: "Rice",
  standard_unit: "kg",
});

// Tìm kiếm sản phẩm
const products = await Product.searchProducts("rice", 10);

// Lấy categories
const categories = await Product.getCategories();
```

**Tính năng đặc biệt:**

- Unique product codes
- Category management
- Full-text search
- Usage analytics

### 3. Agricultural Data Model

**Table**: `agricultural_data`  
**Primary Key**: `data_id`

```javascript
import { AgriculturalData } from "../models/index.js";

// Tạo dữ liệu nông nghiệp
const data = await AgriculturalData.createAgriculturalData({
  farmer_id: "FARMER_001",
  product_type: "Organic Rice",
  location: "Ben Luc, Long An",
  harvest_date: new Date(),
  quantity: 1000,
  data_hash: "0x...",
  transaction_hash: "0x...",
});

// Tìm theo farmer
const farmerData = await AgriculturalData.findByFarmerId("FARMER_001");

// Thống kê
const stats = await AgriculturalData.getStatistics();
```

**Tính năng đặc biệt:**

- Hash validation
- Complex search filters
- Production statistics
- File integration

### 4. Uploaded Files Model

**Table**: `uploaded_files`  
**Primary Key**: `file_id`

```javascript
import { UploadedFiles } from "../models/index.js";

// Tạo record file
const file = await UploadedFiles.createFile({
  data_id: 123,
  original_name: "harvest.jpg",
  stored_filename: "harvest_12345.jpg",
  file_path: "/uploads/harvest_12345.jpg",
  file_size: 1024000,
  mime_type: "image/jpeg",
  file_hash: "0x...",
});

// Lấy files theo data ID
const files = await UploadedFiles.findByDataId(123);

// Thống kê upload
const stats = await UploadedFiles.getUploadStatistics();
```

**Tính năng đặc biệt:**

- File size validation
- MIME type analysis
- Storage statistics
- Large file tracking

### 5. Blockchain Transactions Model

**Table**: `blockchain_transactions`  
**Primary Key**: `transaction_id`

```javascript
import { BlockchainTransactions } from "../models/index.js";

// Tạo transaction record
const tx = await BlockchainTransactions.createTransaction({
  transaction_hash: "0x...",
  from_address: "0x...",
  block_number: 12345,
  gas_used: 21000,
  network_name: "amoy",
  status: "Confirmed",
});

// Update status
await BlockchainTransactions.updateTransactionStatus(
  "0x...",
  "Confirmed",
  12345,
  "0x..."
);

// Thống kê gas
const gasStats = await BlockchainTransactions.getGasStatsByNetwork();
```

**Tính năng đặc biệt:**

- Address validation
- Status tracking
- Gas analytics
- Network statistics

### 6. Verification Logs Model

**Table**: `verification_logs`  
**Primary Key**: `log_id`

```javascript
import { VerificationLogs } from "../models/index.js";

// Log verification
const log = await VerificationLogs.logVerification(
  123, // data_id
  "0x...", // transaction_hash
  "data_only", // method
  true, // is_valid
  "0x...", // stored_hash
  "0x...", // current_hash
  "127.0.0.1", // client_ip
  "Mozilla/5.0..." // user_agent
);

// Thống kê verification
const stats = await VerificationLogs.getVerificationStatistics();

// Failed verifications
const failed = await VerificationLogs.getFailedVerifications();
```

**Tính năng đặc biệt:**

- Method tracking
- Success rate analytics
- IP address logging
- Activity patterns

## Sử dụng trong Controllers

### Ví dụ Controller sử dụng Models

```javascript
import { Farmer, AgriculturalData } from "../models/index.js";
import { asyncHandler } from "../middlewares/error.middleware.js";
import { success, error } from "../utils/response.js";

export const getFarmerWithData = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Lấy thông tin farmer
  const farmer = await Farmer.findById(id);
  if (!farmer) {
    return res.status(404).json(error("Farmer not found"));
  }

  // Lấy dữ liệu nông nghiệp của farmer
  const agriculturalData = await AgriculturalData.findByFarmerId(id, 1, 10);

  // Lấy thống kê
  const statistics = await Farmer.getFarmerStatistics(id);

  const result = {
    farmer,
    agriculturalData,
    statistics: statistics[0],
  };

  res.json(success(result, "Farmer data retrieved successfully"));
});
```

## Validation và Error Handling

### Automatic Validation

```javascript
// Tất cả models đều có validation tự động
try {
  const farmer = await Farmer.createFarmer({
    farmer_id: "INVALID", // Sẽ trigger validation error
    // missing required fields
  });
} catch (error) {
  // ValidationError sẽ được throw
  console.log(error.name); // "ValidationError"
  console.log(error.fields); // Array of validation errors
}
```

### Custom Validation

```javascript
// Mỗi model có validate method riêng
Farmer.validateFarmerData(data, isUpdate);
Product.validateProductData(data, isUpdate);
// ... etc
```

## Best Practices

### 1. Import Models

```javascript
// Recommended: Import specific models
import { Farmer, Product } from "../models/index.js";

// Alternative: Import all models
import { models } from "../models/index.js";
const { Farmer, Product } = models;
```

### 2. Error Handling

```javascript
// Always use asyncHandler in controllers
export const createFarmer = asyncHandler(async (req, res) => {
  // Model methods will throw appropriate errors
  const farmer = await Farmer.createFarmer(req.body);
  res.json(success(farmer));
});
```

### 3. Pagination

```javascript
// Consistent pagination pattern
const { page = 1, pageSize = 10 } = req.query;
const result = await Model.findAll(
  conditions,
  orderBy,
  parseInt(pageSize),
  (parseInt(page) - 1) * parseInt(pageSize)
);
```

### 4. Search và Filtering

```javascript
// Use model-specific search methods
const farmers = await Farmer.getActiveFarmers(page, pageSize, searchTerm);
const data = await AgriculturalData.searchData(filters, page, pageSize);
```

## Testing Models

Chạy test script để kiểm tra models:

```bash
node test-models.js
```

Script sẽ test:

- ✅ CRUD operations
- ✅ Validation
- ✅ Search functionality
- ✅ Statistics queries
- ✅ Complex relationships

## Mở rộng Models

### Thêm Model mới

1. Tạo file model mới extend từ BaseModel
2. Implement validation logic
3. Thêm business methods
4. Export trong index.js
5. Tạo tests

### Ví dụ Model mới

```javascript
import { BaseModel } from "./base.model.js";

class NewModel extends BaseModel {
  constructor() {
    super("table_name", "primary_key");
  }

  validateData(data, isUpdate = false) {
    // Custom validation
  }

  async customMethod() {
    // Business logic
  }
}

export const NewModelInstance = new NewModel();
```

## Kết luận

Hệ thống models AgriChain cung cấp:

- 🏗️ **Cấu trúc rõ ràng** - BaseModel + specific models
- 🔒 **Validation mạnh mẽ** - Tự động validate tất cả inputs
- 📊 **Analytics built-in** - Statistics và reporting methods
- 🚀 **Performance** - Optimized queries với indexing
- 🛡️ **Error handling** - Consistent error responses
- 📝 **Logging** - Complete audit trail
- 🔄 **Extensible** - Dễ dàng thêm models mới

Models đã sẵn sàng để sử dụng trong production với full validation, error handling và performance optimization!
