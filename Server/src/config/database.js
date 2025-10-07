// SQL Server database configuration for AgriChain
// Database connection and configuration settings

import sql from "mssql";

/**
 * SQL Server database configuration
 * Connection details for AgriChain database
 */
export const databaseConfig = {
  server: "172.16.6.157",
  database: "AgriChain",
  user: "sa",
  password: "Abc12345",
  port: 1433,
  options: {
    encrypt: false, // Use true for Azure SQL
    trustServerCertificate: true, // Use true for local dev / self-signed certs
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
};

/**
 * Create and configure SQL Server connection pool
 */
let pool = null;

/**
 * Get database connection pool
 * @returns {Promise<sql.ConnectionPool>} Database connection pool
 */
export const getConnectionPool = async () => {
  try {
    if (pool) {
      return pool;
    }

    console.log("🔌 Connecting to SQL Server database...");
    pool = await sql.connect(databaseConfig);

    console.log("✅ SQL Server connected successfully");
    console.log(`📊 Database: ${databaseConfig.database}`);
    console.log(`🖥️  Server: ${databaseConfig.server}`);

    return pool;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("🔌 Database connection closed");
    }
  } catch (error) {
    console.error("❌ Error closing database connection:", error.message);
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection test result
 */
export const testConnection = async () => {
  try {
    const connection = await getConnectionPool();
    const result = await connection.request().query("SELECT 1 AS test");

    if (result.recordset && result.recordset[0].test === 1) {
      console.log("✅ Database connection test successful");
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Database connection test failed:", error.message);
    return false;
  }
};

/**
 * Execute SQL query with parameters
 * @param {string} query - SQL query string
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export const executeQuery = async (query, params = {}) => {
  try {
    const connection = await getConnectionPool();
    const request = connection.request();

    // Add parameters to request
    Object.keys(params).forEach((key) => {
      request.input(key, params[key]);
    });

    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error("❌ Query execution error:", error.message);
    throw error;
  }
};

/**
 * Execute stored procedure with parameters
 * @param {string} procedureName - Stored procedure name
 * @param {Object} params - Procedure parameters
 * @returns {Promise<Object>} Procedure result
 */
export const executeProcedure = async (procedureName, params = {}) => {
  try {
    const connection = await getConnectionPool();
    const request = connection.request();

    // Add parameters to request
    Object.keys(params).forEach((key) => {
      request.input(key, params[key]);
    });

    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    console.error("❌ Procedure execution error:", error.message);
    throw error;
  }
};

export default {
  databaseConfig,
  getConnectionPool,
  closeConnection,
  testConnection,
  executeQuery,
  executeProcedure,
};
