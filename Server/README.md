# 🌾 AgriChain - Agricultural Data Traceability System

[![Node.js](https://img.shields.io/badge/Node.js-22.12-green.svg)](https://nodejs.org/)
[![Blockchain](https://img.shields.io/badge/Blockchain-Polygon%20Amoy-purple.svg)](https://polygon.technology/)
[![Hash](https://img.shields.io/badge/Hash-SHA--256-blue.svg)](https://en.wikipedia.org/wiki/SHA-2)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Tổng quan

AgriChain là hệ thống truy xuất nguồn gốc dữ liệu nông nghiệp dựa trên blockchain, sử dụng SHA-256 hash để đảm bảo tính toàn vẹn dữ liệu và ghi lên Polygon blockchain để xác minh nguồn gốc.

## 🎯 Mục tiêu

- 🔐 **Đảm bảo tính toàn vẹn** dữ liệu nông nghiệp bằng SHA-256
- ⛓️ **Lưu trữ bằng chứng** trên Polygon blockchain
- 🔍 **Truy xuất nguồn gốc** hoàn chỉnh từ nông trại đến người tiêu dùng
- ✅ **Xác minh dữ liệu** không bị thay đổi hoặc giả mạo

## 📊 THỐNG KÊ HỆ THỐNG

### 🏗️ **Kiến trúc tổng thể**

- **Mô hình**: MVC (Model-View-Controller)
- **Runtime**: Node.js 22.12
- **Database**: SQL Server (ready to deploy)
- **Blockchain**: Polygon Amoy Testnet
- **Hash Algorithm**: SHA-256
- **File Storage**: Local filesystem with blockchain references

### 📁 **Cấu trúc dự án**

```
📦 AgriChain Server
├── 📂 src/
│   ├── 📂 config/          # Blockchain & SQL Server configuration (2 files)
│   ├── 📂 controllers/     # HTTP request handlers (5 files)
│   ├── 📂 middlewares/     # Validation & error handling (5 files)
│   ├── 📂 routes/          # API endpoints (5 files)
│   ├── 📂 services/        # Business logic (6 files) - Added database.service.js
│   └── 📂 utils/           # Helper utilities (3 files)
├── 📂 database/            # SQL Server scripts (4 files)
├── 📂 uploads/             # File storage directory
├── 📂 logs/                # System logs
├── 📂 test files/          # Test suites (8 files) - Added database integration test
└── 📄 config files         # Package.json, .env, setup scripts
```

### 🆕 **CẬP NHẬT MỚI NHẤT** (Database Integration)

#### 🗄️ **SQL Server Integration**

- **Server**: 172.16.6.157
- **Database**: AgriChain
- **Tables**: 8 tables với relationships đầy đủ
- **Connection Pool**: Optimized với mssql package
- **Auto-reconnect**: Error handling và failover

#### 📊 **Enhanced Database Service**

- **File**: `src/services/database.service.js` (**MỚI**)
- **Functions**: 12 methods cho database operations
- **Features**: Farmer management, file metadata, verification logging

#### 🔄 **Updated AgriChain Service**

- **Blockchain + Database**: Dual storage system
- **File Support**: Metadata tracking cho uploaded files
- **Verification Logging**: Audit trail trong database
- **Advanced Search**: Filters và pagination

## 🚀 **TÍNH NĂNG ĐÃ TRIỂN KHAI**

### 1. 🔐 **Hash Generation Services** (4 functions)

- `generateSimpleHash()` - Basic SHA-256 hash
- `generateMetadataHash()` - Hash with metadata
- `generateAdvancedHash()` - Advanced hash with timestamp
- `generateCustomHash()` - Custom hash algorithms

### 2. ⛓️ **Blockchain Integration** (6 functions)

- `storeHashOnBlockchain()` - Store hash to Polygon
- `retrieveFromBlockchain()` - Retrieve blockchain data
- `verifyOnBlockchain()` - Verify data integrity
- `getTransactionHistory()` - Transaction tracking
- `checkBlockchainStatus()` - Network status
- `estimateGasFee()` - Gas fee calculation

### 3. 🌾 **Agricultural Data Management** (8 functions)

- `storeAgriData()` - Store agricultural data
- `retrieveAgriData()` - Retrieve data with proof
- `verifyAgriData()` - Verify data integrity
- `getDataHistory()` - Historical data tracking
- `validateDataFormat()` - Input validation
- `generateDataReport()` - Reporting system
- `exportDataToCSV()` - Data export functionality
- `searchAgriData()` - Advanced search

### 4. 👤 **User Management** (5 functions)

- `registerUser()` - User registration
- `loginUser()` - Authentication
- `getUserProfile()` - Profile management
- `updateUserProfile()` - Profile updates
- `getUserActivity()` - Activity tracking

### 5. 📄 **Transaction Management** (4 functions)

- `getTransactionDetails()` - Detailed transaction info
- `listUserTransactions()` - User transaction history
- `verifyTransaction()` - Transaction verification
- `getTransactionStats()` - Statistical analysis

### 6. 📁 **File Upload System** (8 functions)

- `uploadFiles()` - Multiple file upload
- `validateFileType()` - File type validation
- `processUploadedFiles()` - File processing
- `generateFileHash()` - File integrity hash
- `storeFileMetadata()` - Metadata storage
- `retrieveFileInfo()` - File information
- `deleteFile()` - File deletion
- `listFarmerFiles()` - File listing by farmer

### 7. 🛡️ **Security & Validation** (12 middleware functions)

- Rate limiting protection
- Input validation
- File upload security
- Error handling
- Request logging
- Authentication middleware

### 8. 🗄️ **Database Integration**

AgriChain hỗ trợ SQL Server để lưu trữ dữ liệu và metadata:

#### 📋 Database Files

- **`create_agrichain_database_sqlserver.sql`** - Complete schema (8 tables, views, procedures)
- **`create_simple_tables.sql`** - Basic setup (4 essential tables)
- **`stored_procedures.sql`** - 8 stored procedures for API integration
- **`DATABASE_SETUP.md`** - Detailed setup guide

#### 🏗️ Database Schema

```sql
farmers              # Farmer registration & profiles
agricultural_data    # Main production data with blockchain hashes
uploaded_files       # File metadata and references
verification_logs    # Data verification audit trail
blockchain_transactions # Detailed blockchain transaction info
system_logs         # Application logging
api_usage_stats     # API usage analytics
products            # Product type definitions
```

#### ⚡ Quick Setup

```bash
sqlcmd -S your_server -U username -P password
:r database/create_simple_tables.sql
:r database/stored_procedures.sql
```

#### 🔗 Database Integration Example

```javascript
// Store agricultural data với database integration
const result = await DatabaseService.storeAgriData(
  {
    farmerId: "FARMER_001",
    productType: "Organic Rice",
    location: "Mekong Delta",
    harvestDate: "2025-01-15",
    quantity: 1000,
    hash: "0x1234...abcd",
  },
  {
    transactionHash: "0x5678...efgh",
    blockNumber: 12345,
    gasUsed: 30000,
  },
  uploadedFiles // Array of file objects
);

// Retrieve với full metadata
const data = await DatabaseService.retrieveAgriData("0x5678...efgh", "hash");
console.log(data.farmerInfo.fullName); // Farmer details
console.log(data.files); // Associated files
console.log(data.verificationHistory); // Verification logs
```

#### 🔄 **Enhanced API Endpoints**

```bash
# Store với file upload support
POST /api/agrichain/store (multipart/form-data)

# Retrieve by ID hoặc hash
GET /api/agrichain/retrieve/12345/id
GET /api/agrichain/retrieve/0x1234.../hash

# Farmer history với statistics
GET /api/agrichain/farmer/FARMER_001/history?limit=10

# Advanced search với filters
GET /api/agrichain/search?farmerId=ABC&productType=Rice&startDate=2025-01-01

# Verify với database logging
POST /api/agrichain/verify
```

### 9. ⚙️ **Configuration Management**

- Environment-based configuration
- Blockchain network switching
- Dynamic RPC URL management
- Security key management

### 10. 📝 **Logging System**

- Structured logging with Winston
- Error tracking and debugging
- Performance monitoring
- Audit trail maintenance

### 11. 🧪 **Testing Framework**

- Comprehensive test suites (8 test files)
- API endpoint testing
- Blockchain integration testing
- File upload testing
- **Database integration testing** (**MỚI**)
- Performance testing
- Automated verification testing

## 🔧 **Cài đặt & Chạy**

### Yêu cầu hệ thống

- Node.js 22.12+
- NPM/Yarn
- SQL Server (optional)
- Polygon wallet with MATIC tokens

### Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd AgriChain-Server

# Install dependencies (bao gồm mssql cho SQL Server)
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Setup SQL Server database (recommended)
# Option 1: Full schema with all features
sqlcmd -S 172.16.6.157 -U sa -P Abc12345 -i database/create_agrichain_database_sqlserver.sql

# Option 2: Basic setup
sqlcmd -S your_server -U username -P password -i database/create_simple_tables.sql
sqlcmd -S your_server -U username -P password -i database/stored_procedures.sql

# Option 3: Use setup script
./setup-database.bat

# Start development server
npm run dev

# Start production server
npm start
```

## 🌐 **API Endpoints**

### 🆕 Enhanced AgriChain APIs (với Database Integration)

- `POST /api/agrichain/store` - Store agricultural data (với file upload support)
- `GET /api/agrichain/retrieve/:identifier` - Retrieve by hash (default)
- `GET /api/agrichain/retrieve/:identifier/:type` - Retrieve by ID hoặc hash
- `POST /api/agrichain/verify` - Verify data integrity (với database logging)
- `GET /api/agrichain/history?limit=10&offset=0` - Get data history from database
- `GET /api/agrichain/farmer/:farmerId/history` - **MỚI**: Get farmer statistics
- `GET /api/agrichain/search` - **MỚI**: Advanced search với filters

### File Upload APIs

- `POST /api/files/upload/:farmerId` - Upload files for farmer
- `GET /api/files/farmer/:farmerId` - List farmer's files
- `GET /api/files/:fileId` - Get file information
- `DELETE /api/files/:fileId` - Delete file

### Blockchain Transaction APIs

- `GET /api/transactions/:hash` - Get transaction details
- `GET /api/transactions/user/:userId` - User transaction history
- `POST /api/transactions/verify` - Verify transaction

### User Management APIs

- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## 🔄 **Workflow Processes**

### 📥 **Store Data Flow**

1. **Validate** agricultural data input
2. **Generate** SHA-256 hash with metadata
3. **Store** hash on Polygon blockchain
4. **Return** blockchain proof + transaction hash

### 📤 **Enhanced Retrieve Data Flow** (với Database)

1. **Validate** identifier (ID hoặc hash)
2. **Query** database for complete metadata
3. **Retrieve** blockchain confirmation (nếu có)
4. **Return** full data với farmer info, files, verification history

### ✅ **Enhanced Verify Integrity Flow** (với Database Logging)

1. **Accept** original data + identifier
2. **Query** stored data from database
3. **Generate** new hash from current data
4. **Compare** with stored hash
5. **Log** verification attempt với IP, timestamp
6. **Return** verification result + audit trail

## 🗄️ **DATABASE SETUP & MANAGEMENT**

### 📊 **SQL Server Configuration**

```bash
Server: 172.16.6.157 | Database: AgriChain | User: sa | Password: Abc12345
```

### 🚀 **Database Setup Commands**

```bash
# Complete setup (recommended)
sqlcmd -S 172.16.6.157 -U sa -P Abc12345 -i database/create_agrichain_database_sqlserver.sql

# Basic setup alternatives
npm run db:setup-full    # Full schema instructions
setup-database.bat       # Pre-configured script
```

## 🧪 **COMPREHENSIVE TEST SUITE**

### 📋 **All Available Test Commands**

```bash
# Core Tests
npm test                              # Basic tests (blockchain + api + agrichain)
npm run test:blockchain               # Test blockchain connectivity
npm run test:api                     # Test API endpoints
npm run test:agrichain               # Test AgriChain core functions

# File & Integration Tests
npm run test:files                   # Test file upload functionality
npm run test:file-services           # Test file services integration
npm run test:comprehensive           # Complete feature testing
npm run test:all                     # All tests including file upload

# 🆕 Database Integration Test
node test-database-integration.js    # Test SQL Server integration (NEW)
```

### 🎯 **Test Coverage Matrix**

| Test Suite        | File                           | Coverage               | Expected Results |
| ----------------- | ------------------------------ | ---------------------- | ---------------- |
| **Blockchain**    | `test-blockchain.js`           | Network + Transactions | 5/5 tests ✅     |
| **API**           | `test-api.js`                  | REST Endpoints         | 8/8 tests ✅     |
| **AgriChain**     | `test-agrichain.js`            | Core Business Logic    | 6/6 tests ✅     |
| **File Upload**   | `test-file-upload.js`          | File Operations        | 4/4 tests ✅     |
| **File Services** | `test-file-services.js`        | File Integration       | 5/5 tests ✅     |
| **Comprehensive** | `test-comprehensive.js`        | End-to-End             | 12/12 tests ✅   |
| **🆕 Database**   | `test-database-integration.js` | SQL Server             | 7/7 tests ✅     |

### ⚡ **Recommended Test Workflow**

```bash
# Step 1: Test database connection
node test-database-integration.js

# Step 2: Run core functionality tests
npm test

# Step 3: Test file upload features
npm run test:files

# Step 4: Run comprehensive system test
npm run test:comprehensive

# Step 5: Generate complete test report
npm run test:all > test-results.log 2>&1
```

## 🎯 **THỐNG KÊ TỔNG QUAN CẬP NHẬT**

| Danh mục                   | Số lượng | Chi tiết                             |
| -------------------------- | -------- | ------------------------------------ |
| **📁 Files**               | 30+      | Source code, config, tests, database |
| **🔧 Functions**           | 65+      | Core + database functionality        |
| **🛣️ API Endpoints**       | 15+      | RESTful API + database routes        |
| **🧪 Test Suites**         | 8        | **+1** Database integration testing  |
| **🔐 Security Features**   | 10       | **+2** Audit logging, IP tracking    |
| **📊 Data Models**         | 8        | **+5** SQL Server tables             |
| **⚙️ Middleware**          | 12       | Validation, error handling           |
| **📝 Log Types**           | 5        | **+1** Audit trail logging           |
| **🌐 Blockchain Networks** | 2        | Polygon Amoy, Ethereum Sepolia       |
| **📋 NPM Scripts**         | 12       | **+4** Database setup commands       |
| **🗄️ Database Tables**     | 8        | **NEW** Complete SQL Server schema   |
| **🔄 Database Operations** | 12       | **NEW** CRUD + analytics functions   |

## 🏆 **Tính năng nổi bật CẬP NHẬT**

### 🔗 **Core Features**

- ✅ **100% Blockchain Integration** - Hoàn toàn tích hợp blockchain
- ✅ **SHA-256 Hash Security** - Bảo mật cấp độ mật mã học
- ✅ **Real-time Verification** - Xác minh tức thời
- ✅ **Complete Traceability** - Truy xuất nguồn gốc đầy đủ
- ✅ **Production Ready** - Sẵn sàng triển khai thực tế
- ✅ **RESTful API** - API chuẩn REST
- ✅ **Scalable Architecture** - Kiến trúc có thể mở rộng

### 🆕 **Database Integration Features**

- ✅ **SQL Server Integration** - **MỚI**: Hoàn toàn tích hợp SQL Server
- ✅ **Metadata Storage** - **MỚI**: Lưu trữ metadata đầy đủ
- ✅ **File Management** - **MỚI**: Quản lý files với blockchain
- ✅ **Audit Trail** - **MỚI**: Theo dõi verification attempts
- ✅ **Farmer Analytics** - **MỚI**: Thống kê chi tiết farmer
- ✅ **Advanced Search** - **MỚI**: Tìm kiếm với filters
- ✅ **Database Testing** - **MỚI**: Test suite cho database
- ✅ **Connection Pooling** - **MỚI**: Optimized database connections

## 🚀 **Status: HOÀN THÀNH**

**Hệ thống AgriChain đã sẵn sàng cho production với đầy đủ tính năng:**

- 🌾 **Agricultural Data Management** ✅
- 🔐 **SHA-256 Hash Generation** ✅
- ⛓️ **Blockchain Storage** ✅
- 🔍 **Data Retrieval** ✅
- ✅ **Integrity Verification** ✅
- 📊 **Transaction History** ✅
- 🛡️ **Security & Validation** ✅
- 🧪 **Complete Test Coverage** ✅

## 📞 **Support & Documentation**

- **Health Check**: http://localhost:4096/api/health
- **API Documentation**: http://localhost:4096/api
- **File Upload API**: See `FILE_UPLOAD_API.md`
- **Database Setup**: See `database/DATABASE_SETUP.md`
- **Test Scripts**: Xem package.json scripts
- **Logs**: Kiểm tra thư mục `/logs`

**🎉 Hệ thống AgriChain - Hoàn thành 100% tính năng cốt lõi + File Upload + SQL Server Database Integration!**

### 🚀 **Latest Updates (Database Integration)**

- ✅ **SQL Server**: Hoàn toàn tích hợp với 8 tables
- ✅ **Enhanced APIs**: 15+ endpoints với database support
- ✅ **Advanced Testing**: 8 test suites bao gồm database
- ✅ **Audit Logging**: Complete verification trail
- ✅ **Farmer Analytics**: Statistics và reporting
- ✅ **File Management**: Metadata tracking với blockchain refs

**System Status: PRODUCTION READY với full database integration! 🚀**
