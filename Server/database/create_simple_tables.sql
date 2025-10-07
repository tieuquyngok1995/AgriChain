-- Simple AgriChain Database Schema for SQL Server
-- Basic tables for agricultural data traceability
-- Version: 1.0 Simple
-- Date: 2025-10-06

-- Create database
CREATE DATABASE AgriChain;
GO

USE AgriChain;
GO

-- 1. Farmers table
CREATE TABLE farmers (
    farmer_id NVARCHAR(50) PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    phone NVARCHAR(20),
    location NVARCHAR(500),
    created_date DATETIME2 DEFAULT GETDATE()
);

-- 2. Agricultural data table
CREATE TABLE agricultural_data (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    farmer_id NVARCHAR(50) NOT NULL,
    product_type NVARCHAR(255) NOT NULL,
    location NVARCHAR(500) NOT NULL,
    harvest_date DATETIME2 NOT NULL,
    quantity DECIMAL(18,3),
    quality NVARCHAR(50) DEFAULT 'Standard',
    notes NVARCHAR(2000),
    data_hash NVARCHAR(66) NOT NULL,
    transaction_hash NVARCHAR(66) NOT NULL,
    block_number BIGINT,
    has_files BIT DEFAULT 0,
    file_count INT DEFAULT 0,
    created_date DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id)
);

-- 3. Uploaded files table
CREATE TABLE uploaded_files (
    file_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    data_id BIGINT NOT NULL,
    original_name NVARCHAR(255) NOT NULL,
    stored_filename NVARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type NVARCHAR(100) NOT NULL,
    file_hash NVARCHAR(66) NOT NULL,
    upload_date DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (data_id) REFERENCES agricultural_data(id)
);

-- 4. Verification logs table
CREATE TABLE verification_logs (
    log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    data_id BIGINT NOT NULL,
    transaction_hash NVARCHAR(66) NOT NULL,
    verification_date DATETIME2 DEFAULT GETDATE(),
    is_valid BIT NOT NULL,
    stored_hash NVARCHAR(66) NOT NULL,
    current_hash NVARCHAR(66) NOT NULL,
    
    FOREIGN KEY (data_id) REFERENCES agricultural_data(id)
);

-- Insert sample data
INSERT INTO farmers (farmer_id, full_name, email, location) VALUES
('FARMER_001', 'Nguyen Van A', 'nguyenvana@example.com', 'Long An, Vietnam'),
('FARMER_002', 'Tran Thi B', 'tranthib@example.com', 'Can Tho, Vietnam'),
('FARMER_003', 'Le Van C', 'levanc@example.com', 'An Giang, Vietnam');

PRINT 'AgriChain database and tables created successfully!';
GO