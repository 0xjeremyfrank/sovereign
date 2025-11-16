import type { Abi, Hex } from 'viem';

export interface AddressOverrides {
  readonly [chainId: number]: Hex | undefined;
}

export interface AddressOptions {
  readonly overrides?: AddressOverrides;
  readonly env?: Record<string, string | undefined>;
}

export interface ContractConfig<TAbi extends Abi = Abi> {
  readonly chainId: number;
  readonly address: Hex;
  readonly abi: TAbi;
}

