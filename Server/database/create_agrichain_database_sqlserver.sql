-- AgriChain Database Schema for SQL Server
-- Creates tables for agricultural data traceability system
-- Version: 1.0
-- Date: 2025-10-06

USE master;
GO

-- Create AgriChain database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'AgriChain')
BEGIN
    CREATE DATABASE AgriChain;
    PRINT 'Database AgriChain created successfully.';
END
ELSE
BEGIN
    PRINT 'Database AgriChain already exists.';
END
GO

USE AgriChain;
GO

-- =====================================================
-- 1. FARMERS TABLE
-- Stores farmer information and registration details
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='farmers' AND xtype='U')
BEGIN
    CREATE TABLE farmers (
        farmer_id NVARCHAR(50) PRIMARY KEY,
        full_name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) UNIQUE,
        phone NVARCHAR(20),
        address NVARCHAR(500),
        province NVARCHAR(100),
        district NVARCHAR(100),
        ward NVARCHAR(100),
        certification_level NVARCHAR(50) DEFAULT 'Standard',
        registration_date DATETIME2 DEFAULT GETDATE(),
        last_updated DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1,
        wallet_address NVARCHAR(42),
        
        -- Indexes for performance
        INDEX IX_farmers_province (province),
        INDEX IX_farmers_certification (certification_level),
        INDEX IX_farmers_wallet (wallet_address)
    );
    PRINT 'Table farmers created successfully.';
END
ELSE
BEGIN
    PRINT 'Table farmers already exists.';
END
GO

-- =====================================================
-- 2. PRODUCTS TABLE
-- Stores product type definitions and categories
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='U')
BEGIN
    CREATE TABLE products (
        product_id INT IDENTITY(1,1) PRIMARY KEY,
        product_code NVARCHAR(20) UNIQUE NOT NULL,
        product_name NVARCHAR(255) NOT NULL,
        category NVARCHAR(100) NOT NULL,
        sub_category NVARCHAR(100),
        description NVARCHAR(1000),
        standard_unit NVARCHAR(20) DEFAULT 'kg',
        created_date DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1,
        
        -- Indexes
        INDEX IX_products_category (category),
        INDEX IX_products_code (product_code)
    );
    
    -- Insert default products
    INSERT INTO products (product_code, product_name, category, sub_category, standard_unit) VALUES
    ('RICE_ORG', 'Organic Rice', 'Grains', 'Rice', 'kg'),
    ('TOMATO_ORG', 'Organic Tomato', 'Vegetables', 'Tomato', 'kg'),
    ('BANANA_ORG', 'Organic Banana', 'Fruits', 'Banana', 'bunch'),
    ('COFFEE_ORG', 'Organic Coffee', 'Beverages', 'Coffee', 'kg'),
    ('PEPPER_ORG', 'Organic Black Pepper', 'Spices', 'Pepper', 'kg');
    
    PRINT 'Table products created and populated successfully.';
END
ELSE
BEGIN
    PRINT 'Table products already exists.';
END
GO

-- =====================================================
-- 3. AGRICULTURAL_DATA TABLE
-- Main table storing agricultural production data
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='agricultural_data' AND xtype='U')
BEGIN
    CREATE TABLE agricultural_data (
        data_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        farmer_id NVARCHAR(50) NOT NULL,
        product_type NVARCHAR(255) NOT NULL,
        location NVARCHAR(500) NOT NULL,
        harvest_date DATETIME2 NOT NULL,
        quantity DECIMAL(18,3),
        quality NVARCHAR(50) DEFAULT 'Standard',
        notes NVARCHAR(2000),
        
        -- Hash and blockchain data
        data_hash NVARCHAR(66) NOT NULL, -- SHA-256 hash with 0x prefix
        combined_hash NVARCHAR(66), -- For file-based storage
        transaction_hash NVARCHAR(66) NOT NULL,
        block_number BIGINT,
        
        -- File information
        has_files BIT DEFAULT 0,
        file_count INT DEFAULT 0,
        total_file_size BIGINT DEFAULT 0,
        
        -- Metadata
        created_date DATETIME2 DEFAULT GETDATE(),
        updated_date DATETIME2 DEFAULT GETDATE(),
        status NVARCHAR(20) DEFAULT 'Active',
        version NVARCHAR(10) DEFAULT '1.0',
        
        -- Foreign key constraints
        FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id),
        
        -- Indexes for performance
        INDEX IX_agri_data_farmer (farmer_id),
        INDEX IX_agri_data_product (product_type),
        INDEX IX_agri_data_harvest_date (harvest_date),
        INDEX IX_agri_data_hash (data_hash),
        INDEX IX_agri_data_tx_hash (transaction_hash),
        INDEX IX_agri_data_location (location)
    );
    PRINT 'Table agricultural_data created successfully.';
END
ELSE
BEGIN
    PRINT 'Table agricultural_data already exists.';
END
GO

-- =====================================================
-- 4. UPLOADED_FILES TABLE
-- Stores information about uploaded files
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uploaded_files' AND xtype='U')
BEGIN
    CREATE TABLE uploaded_files (
        file_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        data_id BIGINT NOT NULL,
        original_name NVARCHAR(255) NOT NULL,
        stored_filename NVARCHAR(255) NOT NULL,
        file_path NVARCHAR(1000) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type NVARCHAR(100) NOT NULL,
        file_hash NVARCHAR(66) NOT NULL, -- SHA-256 hash of file content
        upload_date DATETIME2 DEFAULT GETDATE(),
        is_active BIT DEFAULT 1,
        
        -- Foreign key constraints
        FOREIGN KEY (data_id) REFERENCES agricultural_data(data_id) ON DELETE CASCADE,
        
        -- Indexes
        INDEX IX_files_data_id (data_id),
        INDEX IX_files_hash (file_hash),
        INDEX IX_files_mime_type (mime_type)
    );
    PRINT 'Table uploaded_files created successfully.';
END
ELSE
BEGIN
    PRINT 'Table uploaded_files already exists.';
END
GO

-- =====================================================
-- 5. BLOCKCHAIN_TRANSACTIONS TABLE
-- Stores blockchain transaction details
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='blockchain_transactions' AND xtype='U')
BEGIN
    CREATE TABLE blockchain_transactions (
        transaction_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        transaction_hash NVARCHAR(66) UNIQUE NOT NULL,
        block_number BIGINT,
        block_hash NVARCHAR(66),
        from_address NVARCHAR(42) NOT NULL,
        to_address NVARCHAR(42),
        gas_used BIGINT,
        gas_price BIGINT,
        transaction_fee DECIMAL(28,18),
        network_name NVARCHAR(50) DEFAULT 'amoy',
        network_id INT DEFAULT 80002,
        status NVARCHAR(20) DEFAULT 'Confirmed',
        created_date DATETIME2 DEFAULT GETDATE(),
        confirmed_date DATETIME2,
        transaction_date DATETIME2 NULL
        
        -- Data reference
        data_id BIGINT,
        FOREIGN KEY (data_id) REFERENCES agricultural_data(data_id),
        
        -- Indexes
        INDEX IX_blockchain_tx_hash (transaction_hash),
        INDEX IX_blockchain_block_number (block_number),
        INDEX IX_blockchain_from_address (from_address),
        INDEX IX_blockchain_data_id (data_id)
    );
    PRINT 'Table blockchain_transactions created successfully.';
END
ELSE
BEGIN
    PRINT 'Table blockchain_transactions already exists.';
END
GO

-- =====================================================
-- 6. VERIFICATION_LOGS TABLE
-- Logs all data verification attempts
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='verification_logs' AND xtype='U')
BEGIN
    CREATE TABLE verification_logs (
        log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        data_id BIGINT NOT NULL,
        transaction_hash NVARCHAR(66) NOT NULL,
        verification_date DATETIME2 DEFAULT GETDATE(),
        verification_method NVARCHAR(50) NOT NULL, -- 'data_only', 'combined_hash'
        is_valid BIT NOT NULL,
        stored_hash NVARCHAR(66) NOT NULL,
        current_hash NVARCHAR(66) NOT NULL,
        client_ip NVARCHAR(45),
        user_agent NVARCHAR(500),
        
        -- Foreign key constraints
        FOREIGN KEY (data_id) REFERENCES agricultural_data(data_id),
        
        -- Indexes
        INDEX IX_verification_data_id (data_id),
        INDEX IX_verification_date (verification_date),
        INDEX IX_verification_tx_hash (transaction_hash)
    );
    PRINT 'Table verification_logs created successfully.';
END
ELSE
BEGIN
    PRINT 'Table verification_logs already exists.';
END
GO

-- =====================================================
-- 7. SYSTEM_LOGS TABLE
-- General system logging and audit trail
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_logs' AND xtype='U')
BEGIN
    CREATE TABLE system_logs (
        log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        log_level NVARCHAR(10) NOT NULL, -- 'INFO', 'WARN', 'ERROR', 'DEBUG'
        log_category NVARCHAR(50) NOT NULL, -- 'API', 'BLOCKCHAIN', 'FILE', 'HASH', 'VALIDATION'
        message NVARCHAR(2000) NOT NULL,
        details NVARCHAR(MAX), -- JSON formatted additional details
        error_stack NVARCHAR(MAX),
        
        -- Request information
        request_id NVARCHAR(50),
        client_ip NVARCHAR(45),
        user_agent NVARCHAR(500),
        endpoint NVARCHAR(200),
        http_method NVARCHAR(10),
        
        -- Timing and performance
        execution_time_ms INT,
        timestamp DATETIME2 DEFAULT GETDATE(),
        
        -- Indexes for log analysis
        INDEX IX_system_logs_level (log_level),
        INDEX IX_system_logs_category (log_category),
        INDEX IX_system_logs_timestamp (timestamp)
    );
    PRINT 'Table system_logs created successfully.';
END
ELSE
BEGIN
    PRINT 'Table system_logs already exists.';
END
GO

-- =====================================================
-- 8. API_USAGE_STATS TABLE
-- Tracks API usage statistics
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='api_usage_stats' AND xtype='U')
BEGIN
    CREATE TABLE api_usage_stats (
        stat_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        endpoint NVARCHAR(200) NOT NULL,
        http_method NVARCHAR(10) NOT NULL,
        request_count INT DEFAULT 1,
        success_count INT DEFAULT 0,
        error_count INT DEFAULT 0,
        avg_response_time_ms INT,
        total_data_size_mb DECIMAL(18,6) DEFAULT 0,
        date_recorded DATE DEFAULT CAST(GETDATE() AS DATE),
        hour_recorded INT DEFAULT DATEPART(HOUR, GETDATE()),
        
        -- Indexes
        INDEX IX_api_stats_endpoint (endpoint),
        INDEX IX_api_stats_date (date_recorded),
        INDEX IX_api_stats_date_hour (date_recorded, hour_recorded)
    );
    PRINT 'Table api_usage_stats created successfully.';
END
ELSE
BEGIN
    PRINT 'Table api_usage_stats already exists.';
END
GO

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure to get farmer statistics
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'GetFarmerStatistics')
    DROP PROCEDURE GetFarmerStatistics;
GO

CREATE PROCEDURE GetFarmerStatistics
    @FarmerId NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        f.farmer_id,
        f.full_name,
        f.province,
        f.certification_level,
        COUNT(ad.data_id) as total_records,
        COUNT(CASE WHEN ad.has_files = 1 THEN 1 END) as records_with_files,
        SUM(CASE WHEN ad.quantity IS NOT NULL THEN ad.quantity ELSE 0 END) as total_quantity,
        MAX(ad.harvest_date) as last_harvest_date,
        COUNT(DISTINCT ad.product_type) as unique_products
    FROM farmers f
    LEFT JOIN agricultural_data ad ON f.farmer_id = ad.farmer_id
    WHERE (@FarmerId IS NULL OR f.farmer_id = @FarmerId)
    GROUP BY f.farmer_id, f.full_name, f.province, f.certification_level
    ORDER BY total_records DESC;
END
GO

-- Procedure to get data integrity report
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'GetDataIntegrityReport')
    DROP PROCEDURE GetDataIntegrityReport;
GO

CREATE PROCEDURE GetDataIntegrityReport
    @StartDate DATETIME2 = NULL,
    @EndDate DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @StartDate IS NULL SET @StartDate = DATEADD(DAY, -30, GETDATE());
    IF @EndDate IS NULL SET @EndDate = GETDATE();
    
    SELECT 
        ad.data_id,
        ad.farmer_id,
        ad.product_type,
        ad.harvest_date,
        ad.data_hash,
        ad.transaction_hash,
        bt.status as blockchain_status,
        COUNT(vl.log_id) as verification_attempts,
        COUNT(CASE WHEN vl.is_valid = 1 THEN 1 END) as valid_verifications,
        MAX(vl.verification_date) as last_verification
    FROM agricultural_data ad
    LEFT JOIN blockchain_transactions bt ON ad.transaction_hash = bt.transaction_hash
    LEFT JOIN verification_logs vl ON ad.data_id = vl.data_id
    WHERE ad.created_date BETWEEN @StartDate AND @EndDate
    GROUP BY ad.data_id, ad.farmer_id, ad.product_type, ad.harvest_date, 
             ad.data_hash, ad.transaction_hash, bt.status, ad.created_date
    ORDER BY ad.created_date DESC;
END
GO

-- =====================================================
-- VIEWS
-- =====================================================

-- View for complete agricultural data with files
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_agricultural_data_complete')
    DROP VIEW vw_agricultural_data_complete;
GO

CREATE VIEW vw_agricultural_data_complete AS
SELECT 
    ad.data_id,
    ad.farmer_id,
    f.full_name as farmer_name,
    f.province,
    ad.product_type,
    ad.location,
    ad.harvest_date,
    ad.quantity,
    ad.quality,
    ad.notes,
    ad.data_hash,
    ad.combined_hash,
    ad.transaction_hash,
    ad.block_number,
    ad.has_files,
    ad.file_count,
    ad.total_file_size,
    ad.created_date,
    bt.status as blockchain_status,
    bt.gas_used,
    bt.network_name
FROM agricultural_data ad
LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
LEFT JOIN blockchain_transactions bt ON ad.transaction_hash = bt.transaction_hash
WHERE ad.status = 'Active';
GO

-- View for file upload statistics
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_file_upload_stats')
    DROP VIEW vw_file_upload_stats;
GO

CREATE VIEW vw_file_upload_stats AS
SELECT 
    CAST(ad.created_date AS DATE) as upload_date,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN ad.has_files = 1 THEN 1 END) as uploads_with_files,
    COUNT(CASE WHEN ad.has_files = 0 THEN 1 END) as text_only_uploads,
    SUM(ad.file_count) as total_files,
    SUM(ad.total_file_size) / 1024.0 / 1024.0 as total_size_mb,
    AVG(CASE WHEN ad.has_files = 1 THEN ad.file_count ELSE 0 END) as avg_files_per_upload
FROM agricultural_data ad
GROUP BY CAST(ad.created_date AS DATE);
GO

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update agricultural_data updated_date
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_agricultural_data_update')
    DROP TRIGGER tr_agricultural_data_update;
GO

CREATE TRIGGER tr_agricultural_data_update
ON agricultural_data
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE agricultural_data 
    SET updated_date = GETDATE()
    FROM agricultural_data ad
    INNER JOIN inserted i ON ad.data_id = i.data_id;
END
GO

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample farmers
IF NOT EXISTS (SELECT * FROM farmers WHERE farmer_id = 'FARMER_001')
BEGIN
    INSERT INTO farmers (farmer_id, full_name, email, phone, address, province, district, certification_level, wallet_address) VALUES
    ('FARMER_001', 'Nguyen Van A', 'nguyenvana@example.com', '0901234567', '123 Duong ABC', 'Long An', 'Ben Luc', 'Organic', '0x870109C8D7c00e899361007dc2CaD6919516412b'),
    ('FARMER_002', 'Tran Thi B', 'tranthib@example.com', '0902345678', '456 Duong XYZ', 'Can Tho', 'Ninh Kieu', 'VietGAP', '0x1234567890123456789012345678901234567890'),
    ('FARMER_003', 'Le Van C', 'levanc@example.com', '0903456789', '789 Duong DEF', 'An Giang', 'Long Xuyen', 'Standard', '0x0987654321098765432109876543210987654321');
    
    PRINT 'Sample farmers inserted successfully.';
END
GO

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_agri_data_farmer_date')
    CREATE INDEX IX_agri_data_farmer_date ON agricultural_data (farmer_id, harvest_date DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_agri_data_product_location')
    CREATE INDEX IX_agri_data_product_location ON agricultural_data (product_type, location);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_verification_logs_date_valid')
    CREATE INDEX IX_verification_logs_date_valid ON verification_logs (verification_date DESC, is_valid);

-- =====================================================
-- FINAL STATUS
-- =====================================================

PRINT '=============================================================';
PRINT 'AgriChain Database Schema Creation Completed Successfully!';
PRINT '=============================================================';
PRINT 'Database: AgriChain';
PRINT 'Tables Created: 8';
PRINT 'Views Created: 2';
PRINT 'Stored Procedures: 2';
PRINT 'Triggers: 1';
PRINT 'Sample Data: 3 farmers, 5 products';
PRINT '=============================================================';

-- Show table information
SELECT 
    t.TABLE_NAME as 'Table Name',
    COUNT(c.COLUMN_NAME) as 'Column Count'
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
WHERE t.TABLE_SCHEMA = 'dbo' AND t.TABLE_TYPE = 'BASE TABLE'
GROUP BY t.TABLE_NAME
ORDER BY t.TABLE_NAME;

GO