import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Validate private key format
 * @param {string} privateKey - Private key to validate
 * @returns {string} - Validated private key
 */
const validatePrivateKey = (privateKey) => {
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Remove any whitespace and comments
  const cleanKey = privateKey.split("#")[0].trim();

  // Check if it's a valid hex string (64 characters) with or without 0x prefix
  const hexPattern = /^(0x)?[a-fA-F0-9]{64}$/;

  if (!hexPattern.test(cleanKey)) {
    throw new Error(
      "Invalid private key format. Must be 64 hex characters with optional 0x prefix"
    );
  }

  // Ensure it has 0x prefix
  return cleanKey.startsWith("0x") ? cleanKey : `0x${cleanKey}`;
};

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {string} - Validated address
 */
const validateAddress = (address) => {
  if (!address) return null;

  const cleanAddress = address.split("#")[0].trim();
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;

  if (!addressPattern.test(cleanAddress)) {
    throw new Error("Invalid contract address format");
  }

  return cleanAddress;
};

export const blockchainConfig = {
  network: process.env.NETWORK || "amoy",
  rpcUrl: process.env.RPC_URL || "https://rpc-amoy.polygon.technology",
  privateKey: validatePrivateKey(process.env.PRIVATE_KEY),
  contractAddress: validateAddress(process.env.CONTRACT_ADDRESS),
};
