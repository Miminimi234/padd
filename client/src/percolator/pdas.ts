/**
 * Percolator PDA (Program Derived Address) Helpers
 * All PDAs for Router and Padd programs
 */

import { PublicKey } from "@solana/web3.js";
import { Buffer } from "../lib/bufferPolyfill";

// Program IDs from environment
export const ROUTER_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_ROUTER_ID || "RoutR1VdCpHqj89WEMJhb6TkGT9cPfr1rVjhM3e2YQr"
);

export const Padd_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_Padd_CODE_HASH || "PaddZ6PsDLh2X6HzEoqxFDMqCVcJXDKCNEYuPzUvGPk"
);

/**
 * Find vault PDA for a given mint
 * Seeds: [b"vault", mint]
 */
export function findVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mint.toBuffer()],
    ROUTER_PROGRAM_ID
  );
}

/**
 * Find escrow PDA for user, Padd, and mint
 * Seeds: [b"escrow", user, Padd, mint]
 */
export function findEscrowPda(
  user: PublicKey,
  Padd: PublicKey,
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      user.toBuffer(),
      Padd.toBuffer(),
      mint.toBuffer(),
    ],
    ROUTER_PROGRAM_ID
  );
}

/**
 * Find cap PDA for user, Padd, mint, and nonce
 * Seeds: [b"cap", user, Padd, mint, nonce_u64]
 */
export function findCapPda(
  user: PublicKey,
  Padd: PublicKey,
  mint: PublicKey,
  nonce: bigint
): [PublicKey, number] {
  const nonceBuffer = Buffer.allocUnsafe(8);
  nonceBuffer.writeBigUInt64LE(nonce);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("cap"),
      user.toBuffer(),
      Padd.toBuffer(),
      mint.toBuffer(),
      nonceBuffer,
    ],
    ROUTER_PROGRAM_ID
  );
}

/**
 * Find portfolio PDA for a user
 * Seeds: [b"portfolio", user]
 */
export function findPortfolioPda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("portfolio"), user.toBuffer()],
    ROUTER_PROGRAM_ID
  );
}

/**
 * Find registry PDA (global)
 * Seeds: [b"registry"]
 */
export function findRegistryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    ROUTER_PROGRAM_ID
  );
}

/**
 * Find Padd state PDA for a market ID
 * Seeds: [b"Padd", marketId]
 */
export function findPaddStatePda(marketId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("Padd"), marketId.toBuffer()],
    Padd_PROGRAM_ID
  );
}

/**
 * Find Padd authority PDA for a Padd
 * Seeds: [b"authority", Padd]
 */
export function findPaddAuthorityPda(Padd: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), Padd.toBuffer()],
    Padd_PROGRAM_ID
  );
}

/**
 * Find hold receipt PDA for a hold ID
 * Seeds: [b"hold", holdId]
 */
export function findHoldPda(holdId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hold"), holdId.toBuffer()],
    Padd_PROGRAM_ID
  );
}

/**
 * Find position PDA for trader and instrument
 * Seeds: [b"position", trader, Padd, instrumentIndex]
 */
export function findPositionPda(
  trader: PublicKey,
  Padd: PublicKey,
  instrumentIndex: number
): [PublicKey, number] {
  const indexBuffer = Buffer.allocUnsafe(2);
  indexBuffer.writeUInt16LE(instrumentIndex);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      trader.toBuffer(),
      Padd.toBuffer(),
      indexBuffer,
    ],
    Padd_PROGRAM_ID
  );
}
