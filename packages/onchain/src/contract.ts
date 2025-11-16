import type { Account, Chain, Client, Transport } from 'viem';
import { getContract } from 'viem';

import { firstBloodContestAbi } from './abi/first-blood-contest';
import { getFirstBloodContestAddress } from './addresses';
import type { AddressOptions } from './types';

// Note: Return type is simplified in declaration file due to ABI size, but correctly inferred at usage sites
export const createFirstBloodContestContract = <
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined,
>(
  client: Client<TTransport, TChain, TAccount>,
  chainId: number,
  options?: AddressOptions,
) => {
  const address = getFirstBloodContestAddress(chainId, options);

  return getContract({
    address,
    abi: firstBloodContestAbi,
    client,
  }) as ReturnType<typeof getContract>;
};
