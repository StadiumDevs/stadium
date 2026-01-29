import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Copy,
  CheckCircle2,
  Zap,
  ExternalLink,
  Wallet,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CURRENT_MULTISIG,
  CURRENT_NETWORK_NAME,
  NETWORK_ENV,
  isTestnet,
  getTransactionUrl,
  PASEO_RPC,
} from "@/lib/polkadot-config";
import { web3Enable, web3Accounts, web3FromAddress } from '@polkadot/extension-dapp';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { sortAddresses } from '@polkadot/util-crypto';

interface TestPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Authorized signers (should match backend config)
const AUTHORIZED_SIGNERS = [
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Alice
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // Bob
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', // Charlie
];

export function TestPaymentModal({
  open,
  onOpenChange,
}: TestPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);
  const [cancelTxHash, setCancelTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useMultisig, setUseMultisig] = useState(true); // Default to multisig
  const [cancelRequested, setCancelRequested] = useState(false); // Flag to cancel ongoing operation
  const [initiatorAddress, setInitiatorAddress] = useState<string | null>(null); // Track who initiated

  // Store multisig info for approval
  const [multisigInfo, setMultisigInfo] = useState<{
    callHash: string;
    timepoint: { height: number; index: number } | null;
    callData: string;
    approvalCount: number;
  } | null>(null);

  // Hardcoded test configuration
  const TEST_CONFIG = {
    recipients: [
      "5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF", // Recipient 1
      "5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9", // Recipient 2
    ],
    amounts: [0.1, 0.05], // 0.1 DOT and 0.05 DOT
    threshold: 2, // 2-of-3 multisig
    currency: "DOT",
    network: "Paseo Asset Hub",
  };

  const handleMultisigSend = async () => {
    if (!isTestnet()) {
      toast.error("Test payment only available on testnet!");
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);
    setCancelRequested(false); // Reset cancel flag

    console.log("🧪 [TestPaymentModal] Starting MULTISIG test payment...");
    console.log("📝 Test Configuration:", TEST_CONFIG);

    try {
      // Step 1: Connect to wallet
      console.log("1️⃣ Connecting to wallet...");
      toast.info("Connecting to wallet...");

      const extensions = await web3Enable('Blockspace Stadium');
      if (extensions.length === 0) {
        throw new Error("No wallet extension found. Please install Polkadot.js, Talisman, or SubWallet.");
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found in wallet. Please create or import an account.");
      }

      const account = accounts[0];
      console.log("👛 Connected wallet (INITIATOR):", account.address);
      console.log("   Name:", account.meta.name);
      console.log("   ⚠️  NOTE: This account will be the FIRST approver");
      console.log("   ⚠️  Second approval MUST use a DIFFERENT account!");
      toast.success(`Connected: ${account.meta.name || account.address.slice(0, 8)}`);

      // Step 2: Connect to blockchain
      console.log("2️⃣ Connecting to blockchain...");
      toast.info("Connecting to blockchain...");

      const wsProvider = new WsProvider(PASEO_RPC);
      const api = await ApiPromise.create({ provider: wsProvider });

      console.log("✅ Connected to", TEST_CONFIG.network);

      // Step 3: Create batch call with multiple transfers
      console.log("3️⃣ Creating batched transfers...");
      const transfers = TEST_CONFIG.recipients.map((recipient, idx) => {
        const amount = BigInt(TEST_CONFIG.amounts[idx] * 10 ** 10); // Convert to plancks
        console.log(`   Transfer ${idx + 1}: ${TEST_CONFIG.amounts[idx]} DOT → ${recipient.slice(0, 10)}...`);
        return api.tx.balances.transferKeepAlive(recipient, amount);
      });

      const batchCall = api.tx.utility.batchAll(transfers);
      console.log("✅ Batch call created with", transfers.length, "transfers");

      // Step 4: Wrap in multisig
      console.log("4️⃣ Preparing multisig transaction...");
      const sortedSignatories = sortAddresses(AUTHORIZED_SIGNERS, 42); // 42 = SS58 format for Paseo
      const otherSignatories = sortedSignatories.filter(
        (addr) => addr !== account.address
      );

      console.log(`   Multisig address: ${CURRENT_MULTISIG}`);
      console.log(`   Threshold: ${TEST_CONFIG.threshold} of ${AUTHORIZED_SIGNERS.length}`);
      console.log(`   Initiator: ${account.address.slice(0, 10)}...`);
      console.log(`   Other signatories: ${otherSignatories.length}`);

      // Get call hash and weight
      const callHash = batchCall.method.hash.toHex();
      console.log(`   Call hash: ${callHash}`);

      // Create multisig transaction (asMulti to initiate)
      const MAX_WEIGHT = {
        refTime: 1000000000,
        proofSize: 64 * 1024,
      };

      const multisigTx = api.tx.multisig.asMulti(
        TEST_CONFIG.threshold,
        otherSignatories,
        null, // timepoint is null for first approval
        batchCall.method,
        MAX_WEIGHT
      );

      console.log("5️⃣ Requesting signature from wallet...");
      toast.info("Please sign the multisig transaction in your wallet...", { duration: 10000 });

      // Step 5: Sign and submit
      const injector = await web3FromAddress(account.address);
      const unsub = await multisigTx.signAndSend(
        account.address,
        { signer: injector.signer },
        async (result) => {
          // Check if user requested cancellation
          if (cancelRequested) {
            console.log("❌ Operation cancelled by user");
            toast.error("Operation cancelled");
            unsub();
            await api.disconnect();
            setLoading(false);
            setCancelRequested(false);
            return;
          }

          console.log(`📡 Transaction status: ${result.status.type}`);

          if (result.status.isInBlock) {
            console.log(`✅ Transaction included in block: ${result.status.asInBlock.toHex()}`);
            toast.info("Transaction in block, waiting for finalization...");
          }

          if (result.status.isFinalized) {
            const txHashHex = result.txHash.toHex();
            const blockHash = result.status.asFinalized.toHex();

            console.log("🎉 Multisig transaction finalized!");
            console.log("   Tx Hash:", txHashHex);
            console.log("   Block:", blockHash);
            console.log(`   Subscan: ${getTransactionUrl(txHashHex)}`);

            // Extract timepoint from events
            // The NewMultisig event contains the actual timepoint
            let timepoint = null;

            result.events.forEach(({ event }) => {
              if (api.events.multisig.NewMultisig.is(event)) {
                const [_approving, _multisig, _callHash, timepointData] = event.data;
                timepoint = {
                  height: timepointData.height.toNumber(),
                  index: timepointData.index.toNumber(),
                };
                console.log("📍 Extracted timepoint from NewMultisig event:");
                console.log(`   height: ${timepoint.height}`);
                console.log(`   index: ${timepoint.index}`);
              }
            });

            if (!timepoint) {
              // Fallback: extract from block if event parsing failed
              console.warn("⚠️  Could not find NewMultisig event, using block data as fallback");
              const header = await api.rpc.chain.getHeader(blockHash);
              const signedBlock = await api.rpc.chain.getBlock(blockHash);

              // Find our extrinsic in the block
              let extrinsicIndex = -1;
              for (let i = 0; i < signedBlock.block.extrinsics.length; i++) {
                const ex = signedBlock.block.extrinsics[i];
                if (ex.hash.toHex() === txHashHex) {
                  extrinsicIndex = i;
                  break;
                }
              }

              timepoint = {
                height: header.number.toNumber(),
                index: extrinsicIndex,
              };
              console.log(`   Fallback timepoint: height=${timepoint.height}, index=${timepoint.index}`);
            }

            console.log("");
            console.log("⏳ This multisig transaction requires", TEST_CONFIG.threshold - 1, "more approval(s)");
            console.log("   Other signers must approve with approveAsMulti or final asMulti");

            // Store multisig info for second approval
            setMultisigInfo({
              callHash,
              timepoint,
              callData: batchCall.method.toHex(),
              approvalCount: 1,
            });

            console.log("💾 Stored multisig info:");
            console.log(`   Initiator: ${account.address}`);
            console.log(`   Call Hash: ${callHash}`);
            console.log(`   Timepoint: height=${timepoint.height}, index=${timepoint.index}`);

            // Store initiator address for validation
            setInitiatorAddress(account.address);

            setTxHash(txHashHex);
            toast.success("Multisig transaction initiated! Needs more approvals.");

            unsub();
            await api.disconnect();
            setLoading(false);
          }

          if (result.isError) {
            console.error("❌ Transaction error");
            throw new Error("Transaction failed");
          }
        }
      );

    } catch (err: any) {
      console.error("❌ Multisig test payment failed:", err);

      let errorMessage = err.message || "Transaction failed";

      if (errorMessage.includes("Cancelled")) {
        errorMessage = "Transaction cancelled by user";
      } else if (errorMessage.includes("No wallet")) {
        errorMessage = "Please install a Polkadot wallet extension (Polkadot.js, Talisman, or SubWallet)";
      } else if (errorMessage.includes("No accounts")) {
        errorMessage = "No accounts found. Please create an account in your wallet.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const handleCancelMultisig = async () => {
    if (!isTestnet()) {
      toast.error("Test payment only available on testnet!");
      return;
    }

    if (!multisigInfo) {
      toast.error("No pending multisig transaction to cancel!");
      return;
    }

    setLoadingApproval(true);
    setError(null);
    setCancelRequested(false); // Reset cancel flag

    console.log("🧪 [TestPaymentModal] Cancelling multisig transaction...");
    console.log("📝 Multisig Info:", multisigInfo);

    try {
      // Step 1: Connect to wallet
      console.log("1️⃣ Connecting to wallet...");
      toast.info("Connecting to wallet...");

      const extensions = await web3Enable('Blockspace Stadium');
      if (extensions.length === 0) {
        throw new Error("No wallet extension found.");
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found in wallet.");
      }

      const account = accounts[0];
      console.log("👛 Connected wallet:", account.address);
      toast.success(`Connected: ${account.meta.name || account.address.slice(0, 8)}`);

      // Step 2: Connect to blockchain
      console.log("2️⃣ Connecting to blockchain...");
      const wsProvider = new WsProvider(PASEO_RPC);
      const api = await ApiPromise.create({ provider: wsProvider });

      console.log("✅ Connected to", TEST_CONFIG.network);

      // Step 3: Query multisig storage to get the correct timepoint
      console.log("3️⃣ Querying multisig storage...");
      const sortedSignatories = sortAddresses(AUTHORIZED_SIGNERS, 42);
      const otherSignatories = sortedSignatories.filter(
        (addr) => addr !== account.address
      );

      // Query the multisig storage
      const multisigs = await api.query.multisig.multisigs(
        CURRENT_MULTISIG,
        multisigInfo.callHash
      );

      let timepoint;
      if (multisigs.isSome) {
        const multisigData = multisigs.unwrap();
        // Convert Codec timepoint to plain object
        timepoint = {
          height: multisigData.when.height.toNumber(),
          index: multisigData.when.index.toNumber()
        };
        console.log("📍 Queried timepoint from chain storage:");
        console.log(`   height: ${timepoint.height}`);
        console.log(`   index: ${timepoint.index}`);
      } else {
        console.warn("⚠️  Multisig not found in storage, using stored timepoint");
        timepoint = multisigInfo.timepoint;
      }

      console.log(`   Call hash: ${multisigInfo.callHash}`);
      console.log("   Creating cancelAsMulti transaction...");

      // Create cancel transaction
      const cancelTx = api.tx.multisig.cancelAsMulti(
        TEST_CONFIG.threshold,
        otherSignatories,
        timepoint,
        multisigInfo.callHash
      );

      console.log("4️⃣ Requesting signature from wallet...");
      toast.info("Please sign the cancellation in your wallet...", { duration: 10000 });

      // Step 4: Sign and submit
      const injector = await web3FromAddress(account.address);
      const unsub = await cancelTx.signAndSend(
        account.address,
        { signer: injector.signer },
        async (result) => {
          // Check if user requested cancellation
          if (cancelRequested) {
            console.log("❌ Operation cancelled by user");
            toast.error("Operation cancelled");
            unsub();
            await api.disconnect();
            setLoadingApproval(false);
            setCancelRequested(false);
            return;
          }

          console.log(`📡 Cancellation status: ${result.status.type}`);

          if (result.status.isInBlock) {
            console.log(`✅ Cancellation included in block: ${result.status.asInBlock.toHex()}`);
            toast.info("Cancellation in block, waiting for finalization...");
          }

          if (result.status.isFinalized) {
            const txHashHex = result.txHash.toHex();
            const blockHash = result.status.asFinalized.toHex();

            console.log("🎉 Multisig cancelled successfully!");
            console.log("   Tx Hash:", txHashHex);
            console.log("   Block:", blockHash);
            console.log(`   Subscan: ${getTransactionUrl(txHashHex)}`);
            console.log("");
            console.log("🗑️  The pending multisig transaction has been cancelled and removed from storage.");

            toast.success("Multisig transaction cancelled successfully!", { duration: 5000 });

            // Clear multisig info
            setMultisigInfo(null);
            setCancelTxHash(txHashHex);

            unsub();
            await api.disconnect();
            setLoadingApproval(false);
          }

          if (result.isError) {
            console.error("❌ Cancellation error");
            throw new Error("Cancellation failed");
          }
        }
      );

    } catch (err: any) {
      console.error("❌ Cancellation failed:", err);

      let errorMessage = err.message || "Cancellation failed";

      if (errorMessage.includes("Cancelled")) {
        errorMessage = "Transaction cancelled by user";
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoadingApproval(false);
    }
  };

  const handleSecondApproval = async () => {
    if (!isTestnet()) {
      toast.error("Test payment only available on testnet!");
      return;
    }

    if (!multisigInfo) {
      toast.error("No pending multisig transaction to approve!");
      return;
    }

    setLoadingApproval(true);
    setError(null);
    setApprovalTxHash(null);
    setCancelRequested(false); // Reset cancel flag

    console.log("🧪 [TestPaymentModal] Second signer approving multisig...");
    console.log("📝 Multisig Info:", multisigInfo);

    try {
      // Step 1: Connect to wallet
      console.log("1️⃣ Connecting to wallet...");
      toast.info("Connecting to wallet...");

      const extensions = await web3Enable('Blockspace Stadium');
      if (extensions.length === 0) {
        throw new Error("No wallet extension found.");
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found in wallet.");
      }

      // For testing, we'll use the first account
      // In production, you'd verify this is one of the authorized signers
      const account = accounts[0];
      console.log("👛 Connected wallet (SECOND APPROVER):", account.address);
      console.log("   Name:", account.meta.name);
      console.log("   ⚠️  NOTE: This account should be DIFFERENT from the initiator!");

      // Check if same account is trying to approve twice
      if (initiatorAddress && account.address === initiatorAddress) {
        console.error("❌ SAME ACCOUNT DETECTED!");
        console.error(`   Initiator: ${initiatorAddress}`);
        console.error(`   Current account: ${account.address}`);
        console.error("   ⚠️  You must use a DIFFERENT account for the second approval!");
        toast.error("Cannot approve with the same account! Please switch to a different wallet account.");
        setLoadingApproval(false);
        return;
      }

      toast.success(`Connected: ${account.meta.name || account.address.slice(0, 8)}`);

      // Step 2: Connect to blockchain
      console.log("2️⃣ Connecting to blockchain...");
      const wsProvider = new WsProvider(PASEO_RPC);
      const api = await ApiPromise.create({ provider: wsProvider });

      console.log("✅ Connected to", TEST_CONFIG.network);

      // Step 3: Query multisig storage to get the correct timepoint
      console.log("3️⃣ Querying multisig storage for correct timepoint...");
      const sortedSignatories = sortAddresses(AUTHORIZED_SIGNERS, 42);
      const otherSignatories = sortedSignatories.filter(
        (addr) => addr !== account.address
      );

      // Query the multisig storage
      const multisigs = await api.query.multisig.multisigs(
        CURRENT_MULTISIG,
        multisigInfo.callHash
      );

      let timepoint;
      if (multisigs.isSome) {
        const multisigData = multisigs.unwrap();
        // CRITICAL FIX: Convert Codec timepoint to plain object
        timepoint = {
          height: multisigData.when.height.toNumber(),
          index: multisigData.when.index.toNumber()
        };
        console.log("📍 Queried timepoint from chain storage:");
        console.log(`   height: ${timepoint.height}`);
        console.log(`   index: ${timepoint.index}`);
        console.log(`   Stored timepoint (from React state): height=${multisigInfo.timepoint?.height}, index=${multisigInfo.timepoint?.index}`);

        if (multisigInfo.timepoint) {
          const matches = timepoint.height === multisigInfo.timepoint.height &&
                         timepoint.index === multisigInfo.timepoint.index;
          console.log(`   Timepoints match: ${matches ? '✅ YES' : '❌ NO'}`);
        }
      } else {
        console.warn("⚠️  Multisig not found in storage, using stored timepoint");
        timepoint = multisigInfo.timepoint;
        console.log(`   Using stored timepoint: height=${timepoint?.height}, index=${timepoint?.index}`);
      }

      console.log(`   Call hash: ${multisigInfo.callHash}`);
      console.log(`   This is approval ${multisigInfo.approvalCount + 1} of ${TEST_CONFIG.threshold}`);

      // VALIDATION: Ensure timepoint exists and is valid
      if (!timepoint || typeof timepoint.height !== 'number' || typeof timepoint.index !== 'number') {
        console.error("❌ INVALID TIMEPOINT!");
        console.error(`   Timepoint: ${JSON.stringify(timepoint)}`);
        throw new Error("Invalid timepoint. Cannot proceed with multisig approval.");
      }

      console.log("✅ Timepoint validation passed");

      const MAX_WEIGHT = {
        refTime: 1000000000,
        proofSize: 64 * 1024,
      };

      // Since this is the final approval (threshold reached), use asMulti
      // If more approvals were needed, we'd use approveAsMulti
      const isFinalApproval = (multisigInfo.approvalCount + 1) >= TEST_CONFIG.threshold;

      let approvalTx;
      if (isFinalApproval) {
        console.log("   Using asMulti (final approval - will execute!)");
        // Decode the stored call data back into a Call object
        const call = api.registry.createType('Call', multisigInfo.callData);

        approvalTx = api.tx.multisig.asMulti(
          TEST_CONFIG.threshold,
          otherSignatories,
          timepoint,
          call,
          MAX_WEIGHT
        );
      } else {
        console.log("   Using approveAsMulti (intermediate approval)");
        approvalTx = api.tx.multisig.approveAsMulti(
          TEST_CONFIG.threshold,
          otherSignatories,
          timepoint,
          multisigInfo.callHash,
          MAX_WEIGHT
        );
      }

      console.log("4️⃣ Requesting signature from wallet...");
      toast.info("Please sign the approval in your wallet...", { duration: 10000 });

      // Step 4: Sign and submit
      const injector = await web3FromAddress(account.address);
      const unsub = await approvalTx.signAndSend(
        account.address,
        { signer: injector.signer },
        async (result) => {
          // Check if user requested cancellation
          if (cancelRequested) {
            console.log("❌ Operation cancelled by user");
            toast.error("Operation cancelled");
            unsub();
            await api.disconnect();
            setLoadingApproval(false);
            setCancelRequested(false);
            return;
          }

          console.log(`📡 Approval status: ${result.status.type}`);

          if (result.status.isInBlock) {
            console.log(`✅ Approval included in block: ${result.status.asInBlock.toHex()}`);
            toast.info("Approval in block, waiting for finalization...");
          }

          if (result.status.isFinalized) {
            const txHashHex = result.txHash.toHex();
            const blockHash = result.status.asFinalized.toHex();

            console.log("🎉 Approval transaction finalized!");
            console.log("   Tx Hash:", txHashHex);
            console.log("   Block:", blockHash);
            console.log(`   Subscan: ${getTransactionUrl(txHashHex)}`);

            if (isFinalApproval) {
              console.log("");
              console.log("✅✅✅ MULTISIG EXECUTED! ✅✅✅");
              console.log(`   All ${TEST_CONFIG.recipients.length} batched transfers have been executed!`);
              console.log("   Transfer 1:", TEST_CONFIG.amounts[0], "DOT →", TEST_CONFIG.recipients[0].slice(0, 10) + "...");
              console.log("   Transfer 2:", TEST_CONFIG.amounts[1], "DOT →", TEST_CONFIG.recipients[1].slice(0, 10) + "...");
              console.log("");
              toast.success("🎉 Multisig executed! All transfers completed!", { duration: 10000 });
            } else {
              console.log("");
              console.log(`⏳ Approval ${multisigInfo.approvalCount + 1} of ${TEST_CONFIG.threshold} recorded`);
              console.log(`   Still need ${TEST_CONFIG.threshold - (multisigInfo.approvalCount + 1)} more approval(s)`);
              toast.success(`Approval ${multisigInfo.approvalCount + 1} of ${TEST_CONFIG.threshold} recorded!`);
            }

            setApprovalTxHash(txHashHex);

            // Update multisig info
            if (!isFinalApproval) {
              setMultisigInfo({
                ...multisigInfo,
                approvalCount: multisigInfo.approvalCount + 1,
              });
            } else {
              // Clear multisig info after execution
              setMultisigInfo(null);
            }

            unsub();
            await api.disconnect();
            setLoadingApproval(false);
          }

          if (result.isError) {
            console.error("❌ Approval error");
            throw new Error("Approval failed");
          }
        }
      );

    } catch (err: any) {
      console.error("❌ Approval failed:", err);

      let errorMessage = err.message || "Approval failed";

      if (errorMessage.includes("Cancelled")) {
        errorMessage = "Transaction cancelled by user";
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoadingApproval(false);
    }
  };

  const handleCancelSignature = () => {
    setCancelRequested(true);
    toast.info("Cancelling...");
  };

  const handleTestSend = async () => {
    if (useMultisig) {
      return handleMultisigSend();
    }

    // Original single-signature flow (kept for reference/fallback)
    if (!isTestnet()) {
      toast.error("Test payment only available on testnet!");
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    console.log("🧪 [TestPaymentModal] Starting single-sig test payment...");

    try {
      const extensions = await web3Enable('Blockspace Stadium');
      if (extensions.length === 0) {
        throw new Error("No wallet extension found.");
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found in wallet.");
      }

      const account = accounts[0];
      const wsProvider = new WsProvider(PASEO_RPC);
      const api = await ApiPromise.create({ provider: wsProvider });

      const injector = await web3FromAddress(account.address);
      const transfer = api.tx.balances.transferKeepAlive(
        TEST_CONFIG.recipients[0],
        BigInt(TEST_CONFIG.amounts[0] * 10 ** 10)
      );

      const unsub = await transfer.signAndSend(
        account.address,
        { signer: injector.signer },
        async (result) => {
          if (result.status.isFinalized) {
            const txHashHex = result.txHash.toHex();
            setTxHash(txHashHex);
            toast.success("Transaction finalized!");
            unsub();
            await api.disconnect();
            setLoading(false);
          }

          if (result.isError) {
            throw new Error("Transaction failed");
          }
        }
      );

    } catch (err: any) {
      console.error("❌ Test payment failed:", err);

      let errorMessage = err.message || "Transaction failed";

      if (errorMessage.includes("Cancelled")) {
        errorMessage = "Transaction cancelled by user";
      } else if (errorMessage.includes("No wallet")) {
        errorMessage = "Please install a Polkadot wallet extension (Polkadot.js, Talisman, or SubWallet)";
      } else if (errorMessage.includes("No accounts")) {
        errorMessage = "No accounts found. Please create an account in your wallet.";
      } else if (errorMessage.includes("fetch")) {
        errorMessage = "Failed to connect to backend. Ensure server is running on port 2000.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      toast.success("Transaction hash copied!");
    }
  };

  const handleClose = () => {
    setTxHash(null);
    setApprovalTxHash(null);
    setCancelTxHash(null);
    setMultisigInfo(null);
    setInitiatorAddress(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Test Multisig Payment (Batched)
          </DialogTitle>
          <DialogDescription>
            Initiate a multisig transaction with batched transfers using your browser wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Network Warning */}
          {!isTestnet() && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                <strong>⚠️ Mainnet Detected:</strong> Test payments are only
                available on testnet. Please switch to testnet in your
                .env.local configuration.
              </AlertDescription>
            </Alert>
          )}

          {isTestnet() && (
            <Alert className="border-purple-500 bg-purple-500/10">
              <Users className="h-4 w-4 text-purple-500" />
              <AlertTitle>Multisig Transaction</AlertTitle>
              <AlertDescription>
                This will initiate a {TEST_CONFIG.threshold}-of-{AUTHORIZED_SIGNERS.length} multisig transaction on Asset Hub Paseo testnet
                with {TEST_CONFIG.recipients.length} batched transfers using utility.batchAll.
                You'll need to sign with your browser wallet, and then {TEST_CONFIG.threshold - 1} other signer(s)
                must approve before execution.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Configuration */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Network:</span>
              <Badge
                variant="outline"
                className="bg-yellow-500/20 border-yellow-500"
              >
                {TEST_CONFIG.network}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Multisig (From):</span>
              <code className="text-xs bg-background px-2 py-1 rounded">
                {CURRENT_MULTISIG.slice(0, 10)}...{CURRENT_MULTISIG.slice(-8)}
              </code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Transaction Type:</span>
              <Badge variant="outline" className="bg-purple-500/20 border-purple-500">
                <Users className="w-3 h-3 mr-1" />
                Multisig {TEST_CONFIG.threshold}-of-{AUTHORIZED_SIGNERS.length}
              </Badge>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Batched Transfers:</span>
              {TEST_CONFIG.recipients.map((recipient, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs ml-4">
                  <span className="text-muted-foreground">#{idx + 1}:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {recipient.slice(0, 8)}...{recipient.slice(-6)}
                  </code>
                  <Badge variant="outline" className="text-xs">{TEST_CONFIG.amounts[idx]} DOT</Badge>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Amount:</span>
              <Badge variant="outline">
                {TEST_CONFIG.amounts.reduce((a, b) => a + b, 0)} {TEST_CONFIG.currency}
              </Badge>
            </div>
          </div>

          {/* Success Result - Initiation */}
          {txHash && !approvalTxHash && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Multisig Transaction Initiated!</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Transaction Hash:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                    {txHash.slice(0, 20)}...{txHash.slice(-20)}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyTxHash}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href={getTransactionUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    View on Subscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {multisigInfo && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500 rounded text-xs">
                    <strong>⏳ Pending Approvals:</strong> Approval {multisigInfo.approvalCount} of {TEST_CONFIG.threshold}
                    <br />
                    <strong>Call Hash:</strong> <code>{multisigInfo.callHash.slice(0, 20)}...</code>
                    <br />
                    <strong>Timepoint:</strong> height={multisigInfo.timepoint?.height}, index={multisigInfo.timepoint?.index}
                    <br />
                    {initiatorAddress && (
                      <>
                        <strong>Initiated by:</strong> <code>{initiatorAddress.slice(0, 10)}...{initiatorAddress.slice(-8)}</code>
                        <br />
                      </>
                    )}
                    <br />
                    <strong>⚠️  IMPORTANT:</strong> You MUST use a DIFFERENT wallet account for the second approval!
                    <br />
                    <strong>✅ Ready for second approval!</strong> Click the button below to approve and execute.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Result - Approval/Execution */}
          {approvalTxHash && !cancelTxHash && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>🎉 Multisig Executed Successfully!</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Execution Tx Hash:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                    {approvalTxHash.slice(0, 20)}...{approvalTxHash.slice(-20)}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(approvalTxHash);
                      toast.success("Transaction hash copied!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href={getTransactionUrl(approvalTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    View on Subscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500 rounded text-xs">
                  <strong>✅✅✅ ALL TRANSFERS EXECUTED!</strong>
                  <br />
                  All {TEST_CONFIG.recipients.length} batched transfers have been completed:
                  <ul className="list-disc ml-4 mt-1">
                    <li>{TEST_CONFIG.amounts[0]} DOT → {TEST_CONFIG.recipients[0].slice(0, 10)}...</li>
                    <li>{TEST_CONFIG.amounts[1]} DOT → {TEST_CONFIG.recipients[1].slice(0, 10)}...</li>
                  </ul>
                  <br />
                  Check Subscan to verify the transfers on-chain!
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Result - Cancellation */}
          {cancelTxHash && (
            <Alert className="border-orange-500 bg-orange-500/10">
              <X className="h-4 w-4 text-orange-500" />
              <AlertTitle>🗑️ Multisig Transaction Cancelled</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Cancellation Tx Hash:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                    {cancelTxHash.slice(0, 20)}...{cancelTxHash.slice(-20)}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(cancelTxHash);
                      toast.success("Transaction hash copied!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href={getTransactionUrl(cancelTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    View on Subscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500 rounded text-xs">
                  <strong>🗑️ Multisig Cancelled</strong>
                  <br />
                  The pending multisig transaction has been cancelled and removed from on-chain storage.
                  <br />
                  No transfers were executed.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Result */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertTitle>Test Failed</AlertTitle>
              <AlertDescription className="mt-2">
                <code className="text-xs">{error}</code>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded">
            <p className="font-medium">What this does:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Connects to your browser wallet extension</li>
              <li>Creates a batch of {TEST_CONFIG.recipients.length} transfers using utility.batchAll</li>
              <li>Wraps the batch in a multisig transaction (asMulti)</li>
              <li>Prompts you to sign and initiate the multisig</li>
              <li>Submits to {TEST_CONFIG.network} and waits for finalization</li>
              <li>Shows transaction hash and Subscan link</li>
              <li>Requires {TEST_CONFIG.threshold - 1} more approval(s) from other signers</li>
            </ul>
            <p className="mt-2 font-medium">Requirements:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Browser wallet installed (Polkadot.js, Talisman, or SubWallet)</li>
              <li>Your wallet must be one of the authorized signers</li>
              <li>Account with testnet DOT for transaction fees</li>
            </ul>
            <p className="mt-2 text-purple-600 font-medium">
              💡 Multisig Flow:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Step 1: You initiate the multisig with asMulti (first approval)</li>
              <li>Step 2: Other signers approve with approveAsMulti</li>
              <li>Step 3: Final signer executes with asMulti when threshold is reached</li>
              <li>All {TEST_CONFIG.recipients.length} transfers execute atomically at the end</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading || loadingApproval}
            >
              Close
            </Button>
            {(loading || loadingApproval) && (
              <Button
                onClick={handleCancelSignature}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Signature
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            <Button
              onClick={handleTestSend}
              disabled={loading || loadingApproval || !isTestnet() || !!multisigInfo}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {loading ? (
                <>
                  <span className="animate-pulse">Initiating...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  1. Initiate Multisig
                </>
              )}
            </Button>

            {multisigInfo && (
              <>
                <Button
                  onClick={handleSecondApproval}
                  disabled={loading || loadingApproval || !isTestnet()}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {loadingApproval ? (
                    <>
                      <span className="animate-pulse">Approving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      2. Approve & Execute
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancelMultisig}
                  disabled={loading || loadingApproval || !isTestnet()}
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600"
                >
                  {loadingApproval ? (
                    <>
                      <span className="animate-pulse">Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Multisig
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
