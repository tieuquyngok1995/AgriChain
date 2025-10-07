/**
 * Blockchain service for handling Ethereum/Polygon operations
 * Provides methods for interacting with blockchain networks
 */

import { ethers } from "ethers";
import { blockchainConfig } from "../config/blockchain.js";
import { BlockchainError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

// Initialize provider and wallet with error handling
let provider;
let wallet;

try {
  provider = new ethers.JsonRpcProvider(blockchainConfig.rpcUrl);
  wallet = new ethers.Wallet(blockchainConfig.privateKey, provider);

  logger.info("Blockchain service initialized", {
    network: blockchainConfig.network,
    rpcUrl: blockchainConfig.rpcUrl,
    walletAddress: wallet.address,
  });
} catch (error) {
  logger.error("Failed to initialize blockchain service", {
    error: error.message,
  });
  throw new BlockchainError(
    `Blockchain initialization failed: ${error.message}`,
    "INIT_ERROR"
  );
}

export const BlockchainService = {
  /**
   * Get balance for a specific address
   * @param {string} address - Ethereum address to check balance
   * @returns {string} - Balance in ETH format
   */
  async getBalance(address) {
    try {
      // Validate address format
      if (!ethers.isAddress(address)) {
        throw new BlockchainError(
          "Invalid Ethereum address format",
          "INVALID_ADDRESS",
          400
        );
      }

      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);

      logger.info("Balance retrieved successfully", {
        address,
        balance: formattedBalance,
      });

      return formattedBalance;
    } catch (error) {
      logger.error("Failed to get balance", {
        address,
        error: error.message,
      });

      if (error instanceof BlockchainError) {
        throw error;
      }

      // Handle specific ethers errors
      if (error.code === "NETWORK_ERROR") {
        throw new BlockchainError(
          "Network connection failed",
          "NETWORK_ERROR",
          503
        );
      }

      if (error.code === "SERVER_ERROR") {
        throw new BlockchainError("RPC server error", "RPC_ERROR", 502);
      }

      throw new BlockchainError(
        `Failed to get balance: ${error.message}`,
        "BALANCE_ERROR"
      );
    }
  },

  /**
   * Send transaction to blockchain
   * @param {string} to - Recipient address
   * @param {string} amountEth - Amount in ETH to send
   * @returns {Object} - Transaction receipt
   */
  async sendTransaction(to, amountEth) {
    try {
      // Validate recipient address
      if (!ethers.isAddress(to)) {
        throw new BlockchainError(
          "Invalid recipient address format",
          "INVALID_ADDRESS",
          400
        );
      }

      // Validate amount
      if (isNaN(parseFloat(amountEth)) || parseFloat(amountEth) <= 0) {
        throw new BlockchainError(
          "Invalid amount specified",
          "INVALID_AMOUNT",
          400
        );
      }

      // Check wallet balance before transaction
      const senderBalance = await provider.getBalance(wallet.address);
      const amountWei = ethers.parseEther(amountEth);

      if (senderBalance < amountWei) {
        throw new BlockchainError(
          "Insufficient funds for transaction",
          "INSUFFICIENT_FUNDS",
          400
        );
      }

      logger.info("Sending transaction", {
        from: wallet.address,
        to,
        amount: amountEth,
      });

      const tx = await wallet.sendTransaction({
        to,
        value: amountWei,
      });

      logger.info("Transaction sent", {
        txHash: tx.hash,
        from: wallet.address,
        to,
        amount: amountEth,
      });

      const receipt = await tx.wait();

      logger.info("Transaction confirmed", {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      return receipt;
    } catch (error) {
      logger.error("Failed to send transaction", {
        to,
        amount: amountEth,
        error: error.message,
      });

      if (error instanceof BlockchainError) {
        throw error;
      }

      // Handle specific ethers errors
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new BlockchainError(
          "Insufficient funds for transaction",
          "INSUFFICIENT_FUNDS",
          400
        );
      }

      if (error.code === "TRANSACTION_REVERTED") {
        throw new BlockchainError(
          "Transaction was reverted",
          "TRANSACTION_REVERTED",
          400
        );
      }

      if (error.code === "NETWORK_ERROR") {
        throw new BlockchainError(
          "Network connection failed",
          "NETWORK_ERROR",
          503
        );
      }

      throw new BlockchainError(
        `Transaction failed: ${error.message}`,
        "TRANSACTION_ERROR"
      );
    }
  },

  /**
   * Get current network information
   * @returns {Object} - Network details
   */
  async getNetworkInfo() {
    try {
      const network = await provider.getNetwork();

      return {
        name: network.name,
        chainId: network.chainId.toString(),
        rpcUrl: blockchainConfig.rpcUrl,
      };
    } catch (error) {
      logger.error("Failed to get network info", { error: error.message });
      throw new BlockchainError(
        `Failed to get network info: ${error.message}`,
        "NETWORK_INFO_ERROR"
      );
    }
  },

  /**
   * Store hash on blockchain using transaction data
   * @param {string} hash - SHA-256 hash to store
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Transaction receipt with hash storage info
   */
  async storeHashOnBlockchain(hash, metadata = {}) {
    try {
      // Validate hash format
      if (!hash || typeof hash !== "string") {
        throw new BlockchainError("Invalid hash format", "INVALID_HASH", 400);
      }

      const cleanHash = hash.startsWith("0x") ? hash.slice(2) : hash;
      if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
        throw new BlockchainError(
          "Hash must be 64 hex characters",
          "INVALID_HASH_LENGTH",
          400
        );
      }

      // Create transaction data with hash embedded
      const txData = {
        timestamp: new Date().toISOString(),
        hash: `0x${cleanHash}`,
        ...metadata,
      };

      // Convert data to hex for transaction input
      const dataString = JSON.stringify(txData);
      const hexData = ethers.hexlify(ethers.toUtf8Bytes(dataString));

      logger.info("Storing hash on blockchain", {
        hash: hash.substring(0, 10) + "...",
        dataSize: dataString.length,
      });

      // Send transaction with hash data embedded
      const tx = await wallet.sendTransaction({
        to: wallet.address, // Send to self
        value: 0, // No ETH transfer, just data storage
        data: hexData,
      });

      logger.info("Hash storage transaction sent", {
        txHash: tx.hash,
        hash: hash.substring(0, 10) + "...",
      });

      const receipt = await tx.wait();

      logger.info("Hash stored on blockchain successfully", {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        storedHash: hash,
        metadata: txData,
        blockchainProof: {
          network: blockchainConfig.network,
          chainId: (await provider.getNetwork()).chainId.toString(),
          timestamp: txData.timestamp,
          fromAddress: receipt.from,
          toAddress: receipt.to,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: receipt.gasPrice?.toString() || "0",
          transactionFee:
            receipt.gasUsed && receipt.gasPrice
              ? ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
              : "0",
        },
      };
    } catch (error) {
      logger.error("Failed to store hash on blockchain", {
        hash: hash?.substring(0, 10) + "...",
        error: error.message,
      });

      if (error instanceof BlockchainError) {
        throw error;
      }

      throw new BlockchainError(
        `Hash storage failed: ${error.message}`,
        "HASH_STORAGE_ERROR"
      );
    }
  },

  /**
   * Retrieve hash from blockchain transaction
   * @param {string} transactionHash - Transaction hash to retrieve data from
   * @returns {Object} - Retrieved hash and metadata
   */
  async retrieveHashFromBlockchain(transactionHash) {
    try {
      // Validate transaction hash format
      if (!transactionHash || !ethers.isHexString(transactionHash, 32)) {
        throw new BlockchainError(
          "Invalid transaction hash format",
          "INVALID_TX_HASH",
          400
        );
      }

      logger.info("Retrieving hash from blockchain", {
        txHash: transactionHash.substring(0, 10) + "...",
      });

      // Get transaction details
      const tx = await provider.getTransaction(transactionHash);
      if (!tx) {
        throw new BlockchainError("Transaction not found", "TX_NOT_FOUND", 404);
      }

      // Get transaction receipt for confirmation
      const receipt = await provider.getTransactionReceipt(transactionHash);
      if (!receipt) {
        throw new BlockchainError(
          "Transaction not confirmed",
          "TX_NOT_CONFIRMED",
          404
        );
      }

      // Decode transaction data
      let decodedData = null;
      let storedHash = null;

      if (tx.data && tx.data !== "0x") {
        try {
          const dataString = ethers.toUtf8String(tx.data);
          decodedData = JSON.parse(dataString);
          storedHash = decodedData.hash;
        } catch (decodeError) {
          logger.warn("Could not decode transaction data", {
            txHash: transactionHash,
            error: decodeError.message,
          });
        }
      }

      const result = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? "success" : "failed",
        from: tx.from,
        to: tx.to,
        timestamp: decodedData?.timestamp || null,
        storedHash,
        metadata: decodedData,
        blockchainProof: {
          network: blockchainConfig.network,
          chainId: (await provider.getNetwork()).chainId.toString(),
          confirmed: receipt.status === 1,
        },
      };

      logger.info("Hash retrieved from blockchain successfully", {
        txHash: transactionHash.substring(0, 10) + "...",
        blockNumber: receipt.blockNumber,
        hash: storedHash?.substring(0, 10) + "...",
      });

      return result;
    } catch (error) {
      logger.error("Failed to retrieve hash from blockchain", {
        txHash: transactionHash?.substring(0, 10) + "...",
        error: error.message,
      });

      if (error instanceof BlockchainError) {
        throw error;
      }

      throw new BlockchainError(
        `Hash retrieval failed: ${error.message}`,
        "HASH_RETRIEVAL_ERROR"
      );
    }
  },

  /**
   * Get transaction history for hash operations
   * @param {number} limit - Number of recent transactions to fetch
   * @returns {Array} - Array of hash operation transactions
   */
  async getHashTransactionHistory(limit = 10) {
    try {
      logger.info("Getting hash transaction history", { limit });

      // Get recent blocks to search for transactions
      const currentBlock = await provider.getBlockNumber();
      const transactions = [];

      // Search last 100 blocks for wallet transactions
      const searchBlocks = Math.min(100, currentBlock);

      for (let i = 0; i < searchBlocks && transactions.length < limit; i++) {
        const blockNumber = currentBlock - i;
        const block = await provider.getBlock(blockNumber, true);

        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (
              (tx.from === wallet.address || tx.to === wallet.address) &&
              tx.data &&
              tx.data !== "0x"
            ) {
              try {
                const dataString = ethers.toUtf8String(tx.data);
                const decodedData = JSON.parse(dataString);

                if (decodedData.hash) {
                  transactions.push({
                    transactionHash: tx.hash,
                    blockNumber: blockNumber,
                    timestamp: decodedData.timestamp,
                    hash: decodedData.hash,
                    gasUsed: tx.gasLimit.toString(),
                  });
                }
              } catch (e) {
                // Skip transactions that can't be decoded
              }
            }
          }
        }
      }

      logger.info("Hash transaction history retrieved", {
        count: transactions.length,
      });

      return transactions.slice(0, limit);
    } catch (error) {
      logger.error("Failed to get hash transaction history", {
        error: error.message,
      });

      throw new BlockchainError(
        `History retrieval failed: ${error.message}`,
        "HISTORY_RETRIEVAL_ERROR"
      );
    }
  },

  /**
   * Get wallet address
   * @returns {string} - Wallet address
   */
  getWalletAddress() {
    return wallet.address;
  },
};
