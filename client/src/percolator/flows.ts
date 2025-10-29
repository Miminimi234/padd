/**
 * Percolator High-Level Trading Flows
 * Composite operations that combine multiple transactions
 */

import { PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "../lib/bufferPolyfill";
import * as router from "./router";
import * as Padd from "./Padd";
import {
  Side,
  toFixed,
  type PlaceOrderParams,
  type PaddHeader,
  type TransactionResult,
} from "./types";
import { connection } from "./connection";
import { findPaddStatePda, findCapPda, findEscrowPda } from "./pdas";

/**
 * Place a perpetual order - full flow
 * 
 * Steps:
 * 1. Reserve order on Padd (creates hold receipt)
 * 2. Mint cap token (spending authorization)
 * 3. Commit order using cap
 * 4. On failure: cancel hold
 */
export async function placePerpOrder(
  params: PlaceOrderParams,
  user: PublicKey,
  PaddAddress: PublicKey,
  quoteMint: PublicKey
): Promise<TransactionResult> {
  try {
    // Convert to fixed-point
    const quantity = toFixed(params.quantity);
    const limitPrice = params.limitPrice ? toFixed(params.limitPrice) : BigInt(0);

    // Step 1: Reserve order
    const holdId = PublicKey.unique();
    const commitmentHash = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));

    const reserveTx = await Padd.reserve(
      {
        routeId: PaddAddress,
        instrumentIndex: 0,  // TODO: Map market symbol to instrument index
        side: params.side,
        quantity,
        limitPrice,
        ttlMs: 60000,  // 60 second hold
        commitmentHash,
      },
      user,
      user
    );

    // Step 2: Mint cap token
    const nonce = BigInt(Date.now());
    const capTx = await router.mintCap(
      {
        user,
        Padd: PaddAddress,
        mint: quoteMint,
        amountMax: quantity,  // Max spend amount
        ttlMs: 120000,  // 120 second cap (max allowed)
      },
      user
    );

    const [cap] = findCapPda(user, PaddAddress, quoteMint, nonce);

    // Step 3: Commit order
    const commitTx = await Padd.commit(
      {
        holdId,
        cap,
      },
      user,
      user
    );

    // TODO: Sign and send transactions in sequence
    // For now, return placeholder
    console.warn("Order flow prepared but requires wallet integration");

    return {
      signature: "placeholder",
      success: false,
      error: "Wallet integration required - use Solana wallet adapter",
    };
  } catch (error) {
    // On failure, attempt to cancel hold
    // TODO: Implement cancel flow

    return {
      signature: "",
      success: false,
      error: error instanceof Error ? error.message : "Order placement failed",
    };
  }
}

/**
 * Check warmup guards for a market
 * Enforces long-only and short leverage caps during warmup
 */
export async function checkWarmupGuards(
  PaddAddress: PublicKey,
  side: Side,
  leverage: number
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    // Fetch Padd header
    const [PaddState] = findPaddStatePda(PaddAddress);
    const accountInfo = await connection.getAccountInfo(PaddState);

    if (!accountInfo) {
      return {
        allowed: false,
        reason: "Market not found",
      };
    }

    // TODO: Deserialize Padd header to get warmup config
    // For now, return mock data
    const warmupEnabled = false;  // Parse from account data
    const shortEnabled = true;  // Parse from account data
    const shortLeverageCap = 5;  // Parse from account data

    if (warmupEnabled) {
      if (side === Side.Ask && !shortEnabled) {
        return {
          allowed: false,
          reason: "Shorts disabled during warmup period",
        };
      }

      if (side === Side.Ask && leverage > shortLeverageCap) {
        return {
          allowed: false,
          reason: `Short leverage capped at ${shortLeverageCap}x during warmup`,
        };
      }
    }

    return {
      allowed: true,
    };
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Failed to check warmup guards",
    };
  }
}

/**
 * Validate cap token hasn't expired
 */
export function validateCapExpiry(expiryTimestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now < expiryTimestamp;
}

/**
 * Validate debit doesn't exceed cap remaining
 */
export function validateCapDebit(
  debit: bigint,
  capMax: bigint,
  capUsed: bigint
): boolean {
  const remaining = capMax - capUsed;
  return debit <= remaining;
}

/**
 * Check if price is within allowed bands
 */
export function validatePriceBands(
  price: bigint,
  oraclePrice: bigint,
  bandBps: number
): boolean {
  const bandMultiplier = BigInt(10000 + bandBps) / BigInt(10000);
  const upperBand = (oraclePrice * bandMultiplier) / BigInt(10000);
  const lowerBand = (oraclePrice * BigInt(10000)) / bandMultiplier;

  return price >= lowerBand && price <= upperBand;
}

/**
 * Calculate required margin for a position
 */
export function calculateRequiredMargin(
  positionValue: bigint,
  initialMarginBps: number
): bigint {
  return (positionValue * BigInt(initialMarginBps)) / BigInt(10000);
}

/**
 * Calculate liquidation price for a position
 */
export function calculateLiquidationPrice(
  entryPrice: bigint,
  leverage: number,
  side: Side,
  maintenanceMarginBps: number
): bigint {
  const mmFactor = BigInt(maintenanceMarginBps) / BigInt(10000);

  if (side === Side.Bid) {
    // Long position: liq price = entry * (1 - mm%)
    return (entryPrice * (BigInt(10000) - mmFactor)) / BigInt(10000);
  } else {
    // Short position: liq price = entry * (1 + mm%)
    return (entryPrice * (BigInt(10000) + mmFactor)) / BigInt(10000);
  }
}
