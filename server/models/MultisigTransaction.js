import mongoose from "mongoose";
import { generateId } from "../api/utils/id.js";

/**
 * MultisigTransaction Model
 *
 * Stores pending multisig transactions that require multiple signatures
 * from authorized signers before execution.
 */
const MultisigTransactionSchema = new mongoose.Schema({
  _id: { type: String, required: true },

  // Transaction details
  callData: { type: String, required: true }, // Hex-encoded call data
  callHash: { type: String, required: true }, // Hash of the call data

  // Multisig configuration
  threshold: { type: Number, required: true }, // Number of approvals needed
  signatories: [{ type: String, required: true }], // All signatory addresses (sorted)

  // Transaction metadata
  transactionType: {
    type: String,
    required: true,
    enum: ['transfer', 'payment', 'batch', 'other']
  },
  description: { type: String, required: true },

  // For transfers/payments (supports single or batch)
  recipients: [{ type: String }], // Array of recipient addresses
  amounts: [{ type: String }], // Amounts in plancks (as strings to handle BigInt)
  amountsFormatted: [{ type: String }], // Human-readable amounts (e.g., "0.1 DOT")
  totalAmount: { type: String }, // Total amount for batch transactions
  totalAmountFormatted: { type: String }, // Human-readable total
  batchSize: { type: Number, default: 1 }, // Number of operations in batch

  // Blockchain data
  network: {
    type: String,
    required: true,
    enum: ['testnet', 'mainnet']
  },
  blockNumber: { type: Number }, // Block where the multisig was initiated
  extrinsicIndex: { type: Number }, // Extrinsic index in the block
  timepoint: {
    height: { type: Number },
    index: { type: Number }
  },

  // Status tracking
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'executed', 'cancelled', 'expired'],
    default: 'pending'
  },

  // Approvals
  approvals: [{
    _id: false,
    signerAddress: { type: String, required: true },
    txHash: { type: String }, // Transaction hash of the approval
    timestamp: { type: Date, required: true, default: Date.now },
    action: {
      type: String,
      required: true,
      enum: ['initiated', 'approved', 'executed']
    }
  }],

  // Execution details
  executionTxHash: { type: String }, // Final transaction hash when executed
  executionBlockHash: { type: String },
  executedAt: { type: Date },
  executedBy: { type: String }, // Address of the signer who executed

  // Timestamps
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date }, // Optional expiration

  // Metadata
  initiatedBy: { type: String, required: true }, // Address of the initiator
  notes: { type: String }
}, {
  timestamps: true
});

// Indexes for efficient queries
MultisigTransactionSchema.index({ status: 1, network: 1 });
MultisigTransactionSchema.index({ initiatedBy: 1 });
MultisigTransactionSchema.index({ callHash: 1 });
MultisigTransactionSchema.index({ 'approvals.signerAddress': 1 });
MultisigTransactionSchema.index({ createdAt: -1 });

// Static method to create a new multisig transaction
MultisigTransactionSchema.statics.createTransaction = async function(data) {
  const id = generateId();
  return await this.create({
    _id: id,
    ...data
  });
};

// Instance method to add approval
MultisigTransactionSchema.methods.addApproval = async function(signerAddress, txHash, action = 'approved') {
  this.approvals.push({
    signerAddress,
    txHash,
    timestamp: new Date(),
    action
  });

  // Update status if threshold is reached
  if (this.approvals.length >= this.threshold) {
    this.status = 'approved';
  }

  this.updatedAt = new Date();
  return await this.save();
};

// Instance method to mark as executed
MultisigTransactionSchema.methods.markExecuted = async function(txHash, blockHash, executedBy) {
  this.status = 'executed';
  this.executionTxHash = txHash;
  this.executionBlockHash = blockHash;
  this.executedAt = new Date();
  this.executedBy = executedBy;
  this.updatedAt = new Date();
  return await this.save();
};

// Instance method to check if signer has already approved
MultisigTransactionSchema.methods.hasApproved = function(signerAddress) {
  return this.approvals.some(approval =>
    approval.signerAddress.toLowerCase() === signerAddress.toLowerCase()
  );
};

// Instance method to get remaining signers
MultisigTransactionSchema.methods.getRemainingSigners = function() {
  const approvedAddresses = this.approvals.map(a => a.signerAddress.toLowerCase());
  return this.signatories.filter(addr =>
    !approvedAddresses.includes(addr.toLowerCase())
  );
};

const MultisigTransaction = mongoose.model("MultisigTransaction", MultisigTransactionSchema);

export default MultisigTransaction;
