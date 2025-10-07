-- AgriChain Stored Procedures
-- Common database operations for AgriChain API
-- Date: 2025-10-06

USE AgriChain;
GO

-- =====================================================
-- 1. Store Agricultural Data Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_StoreAgriData
    @FarmerId NVARCHAR(50),
    @ProductType NVARCHAR(255),
    @Location NVARCHAR(500),
    @HarvestDate DATETIME2,
    @Quantity DECIMAL(18,3) = NULL,
    @Quality NVARCHAR(50) = 'Standard',
    @Notes NVARCHAR(2000) = NULL,
    @DataHash NVARCHAR(66),
    @TransactionHash NVARCHAR(66),
    @BlockNumber BIGINT = NULL,
    @HasFiles BIT = 0,
    @FileCount INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @DataId BIGINT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Insert agricultural data
        INSERT INTO agricultural_data (
            farmer_id, product_type, location, harvest_date,
            quantity, quality, notes, data_hash, transaction_hash,
            block_number, has_files, file_count
        ) VALUES (
            @FarmerId, @ProductType, @Location, @HarvestDate,
            @Quantity, @Quality, @Notes, @DataHash, @TransactionHash,
            @BlockNumber, @HasFiles, @FileCount
        );
        
        SET @DataId = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
        
        -- Return the inserted data
        SELECT 
            data_id as id, farmer_id, product_type, location, harvest_date,
            quantity, quality, notes, data_hash, transaction_hash,
            block_number, has_files, file_count, created_date
        FROM agricultural_data 
        WHERE data_id = @DataId;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- =====================================================
-- 2. Store File Information Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_StoreFileInfo
    @DataId BIGINT,
    @OriginalName NVARCHAR(255),
    @StoredFilename NVARCHAR(255),
    @FileSize BIGINT,
    @MimeType NVARCHAR(100),
    @FileHash NVARCHAR(66)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        INSERT INTO uploaded_files (
            data_id, original_name, stored_filename,
            file_size, mime_type, file_hash
        ) VALUES (
            @DataId, @OriginalName, @StoredFilename,
            @FileSize, @MimeType, @FileHash
        );
        
        -- Return the inserted file info
        SELECT 
            file_id, data_id, original_name, stored_filename,
            file_size, mime_type, file_hash, upload_date
        FROM uploaded_files 
        WHERE file_id = SCOPE_IDENTITY();
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- =====================================================
-- 3. Retrieve Agricultural Data Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_RetrieveAgriData
    @TransactionHash NVARCHAR(66)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ad.data_id as id, ad.farmer_id, f.full_name as farmer_name,
        ad.product_type, ad.location, ad.harvest_date,
        ad.quantity, ad.quality, ad.notes,
        ad.data_hash, ad.transaction_hash, ad.block_number,
        ad.has_files, ad.file_count, ad.created_date
    FROM agricultural_data ad
    LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
    WHERE ad.transaction_hash = @TransactionHash;
    
    -- Also return file information if exists
    IF EXISTS (SELECT 1 FROM agricultural_data WHERE transaction_hash = @TransactionHash AND has_files = 1)
    BEGIN
        SELECT 
            uf.file_id, uf.original_name, uf.stored_filename,
            uf.file_size, uf.mime_type, uf.file_hash, uf.upload_date
        FROM uploaded_files uf
        INNER JOIN agricultural_data ad ON uf.data_id = ad.data_id
        WHERE ad.transaction_hash = @TransactionHash;
    END
END
GO

-- =====================================================
-- 4. Log Verification Attempt Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_LogVerification
    @DataId BIGINT,
    @TransactionHash NVARCHAR(66),
    @IsValid BIT,
    @StoredHash NVARCHAR(66),
    @CurrentHash NVARCHAR(66)
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO verification_logs (
        data_id, transaction_hash, is_valid, stored_hash, current_hash
    ) VALUES (
        @DataId, @TransactionHash, @IsValid, @StoredHash, @CurrentHash
    );
    
    SELECT 
        log_id, data_id, transaction_hash, verification_date,
        is_valid, stored_hash, current_hash
    FROM verification_logs 
    WHERE log_id = SCOPE_IDENTITY();
END
GO

-- =====================================================
-- 5. Get Farmer Statistics Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_GetFarmerStats
    @FarmerId NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        f.farmer_id,
        f.full_name,
        f.province + ', ' + f.district as location,
        COUNT(ad.data_id) as total_records,
        COUNT(CASE WHEN ad.has_files = 1 THEN 1 END) as records_with_files,
        SUM(CASE WHEN ad.quantity IS NOT NULL THEN ad.quantity ELSE 0 END) as total_quantity,
        MAX(ad.harvest_date) as last_harvest_date,
        COUNT(DISTINCT ad.product_type) as unique_products,
        MIN(ad.created_date) as first_record_date,
        MAX(ad.created_date) as last_record_date
    FROM farmers f
    LEFT JOIN agricultural_data ad ON f.farmer_id = ad.farmer_id
    WHERE (@FarmerId IS NULL OR f.farmer_id = @FarmerId)
    GROUP BY f.farmer_id, f.full_name, f.province, f.district
    ORDER BY total_records DESC;
END
GO

-- =====================================================
-- 6. Get Data by Date Range Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_GetDataByDateRange
    @StartDate DATETIME2,
    @EndDate DATETIME2,
    @FarmerId NVARCHAR(50) = NULL,
    @ProductType NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ad.data_id as id, ad.farmer_id, f.full_name as farmer_name,
        ad.product_type, ad.location, ad.harvest_date,
        ad.quantity, ad.quality, ad.data_hash, ad.transaction_hash,
        ad.has_files, ad.file_count, ad.created_date
    FROM agricultural_data ad
    LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
    WHERE ad.harvest_date BETWEEN @StartDate AND @EndDate
        AND (@FarmerId IS NULL OR ad.farmer_id = @FarmerId)
        AND (@ProductType IS NULL OR ad.product_type LIKE '%' + @ProductType + '%')
    ORDER BY ad.harvest_date DESC;
END
GO

-- =====================================================
-- 7. Get Verification History Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_GetVerificationHistory
    @TransactionHash NVARCHAR(66) = NULL,
    @DataId BIGINT = NULL,
    @DaysBack INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @StartDate DATETIME2 = DATEADD(DAY, -@DaysBack, GETDATE());
    
    SELECT 
        vl.log_id, vl.data_id, vl.transaction_hash,
        vl.verification_date, vl.is_valid,
        vl.stored_hash, vl.current_hash,
        ad.farmer_id, ad.product_type, ad.harvest_date
    FROM verification_logs vl
    LEFT JOIN agricultural_data ad ON vl.data_id = ad.data_id
    WHERE vl.verification_date >= @StartDate
        AND (@TransactionHash IS NULL OR vl.transaction_hash = @TransactionHash)
        AND (@DataId IS NULL OR vl.data_id = @DataId)
    ORDER BY vl.verification_date DESC;
END
GO

-- =====================================================
-- 8. Search Agricultural Data Procedure
-- =====================================================
CREATE OR ALTER PROCEDURE sp_SearchAgriData
    @SearchTerm NVARCHAR(255) = NULL,
    @FarmerId NVARCHAR(50) = NULL,
    @ProductType NVARCHAR(255) = NULL,
    @Location NVARCHAR(500) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        ad.data_id as id, ad.farmer_id, f.full_name as farmer_name,
        ad.product_type, ad.location, ad.harvest_date,
        ad.quantity, ad.quality, ad.notes,
        ad.data_hash, ad.transaction_hash, ad.has_files,
        ad.file_count, ad.created_date,
        COUNT(*) OVER() as total_count
    FROM agricultural_data ad
    LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
    WHERE 
        (@SearchTerm IS NULL OR 
         ad.product_type LIKE '%' + @SearchTerm + '%' OR
         ad.location LIKE '%' + @SearchTerm + '%' OR
         ad.notes LIKE '%' + @SearchTerm + '%' OR
         f.full_name LIKE '%' + @SearchTerm + '%')
        AND (@FarmerId IS NULL OR ad.farmer_id = @FarmerId)
        AND (@ProductType IS NULL OR ad.product_type LIKE '%' + @ProductType + '%')
        AND (@Location IS NULL OR ad.location LIKE '%' + @Location + '%')
    ORDER BY ad.created_date DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- =====================================================
-- Test the procedures
-- =====================================================

PRINT 'Stored procedures created successfully!';
PRINT 'Available procedures:';
PRINT '- sp_StoreAgriData: Store agricultural data';
PRINT '- sp_StoreFileInfo: Store file information';
PRINT '- sp_RetrieveAgriData: Retrieve data by transaction hash';
PRINT '- sp_LogVerification: Log verification attempts';
PRINT '- sp_GetFarmerStats: Get farmer statistics';
PRINT '- sp_GetDataByDateRange: Get data by date range';
PRINT '- sp_GetVerificationHistory: Get verification history';
PRINT '- sp_SearchAgriData: Search agricultural data';

-- Example usage:
-- EXEC sp_GetFarmerStats 'FARMER_001';
-- EXEC sp_GetDataByDateRange '2024-01-01', '2024-12-31';
-- EXEC sp_SearchAgriData 'Organic', NULL, NULL, NULL, 1, 10;

GO