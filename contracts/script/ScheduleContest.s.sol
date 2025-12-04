// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from 'forge-std/Script.sol';
import {FirstBloodContest} from '../src/FirstBloodContest.sol';

contract ScheduleContest is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint('PRIVATE_KEY');
    address contractAddress = vm.envAddress('CONTEST_ADDRESS');
    vm.startBroadcast(deployerPrivateKey);

    FirstBloodContest contest = FirstBloodContest(contractAddress);

    // Default test parameters
    uint256 releaseBlock = block.number + vm.envOr('RELEASE_BLOCK_OFFSET', uint256(10));
    string memory generatorCodeCid = vm.envOr('GENERATOR_CODE_CID', string('QmTest123'));
    string memory engineVersion = vm.envOr('ENGINE_VERSION', string('1.0.0'));
    uint8 size = uint8(vm.envOr('SIZE', uint256(6)));
    uint256 commitWindow = vm.envOr('COMMIT_WINDOW', uint256(100));
    uint256 commitBuffer = vm.envOr('COMMIT_BUFFER', uint256(5));
    uint256 revealWindow = vm.envOr('REVEAL_WINDOW', uint256(200));
    uint8 topN = uint8(vm.envOr('TOP_N', uint256(3)));
    uint256 entryDepositWei = vm.envOr('ENTRY_DEPOSIT_WEI', uint256(0));
    uint256 prizePoolWei = vm.envOr('PRIZE_POOL_WEI', uint256(1 ether));

    FirstBloodContest.ContestParams memory params = FirstBloodContest.ContestParams({
      generatorCodeCid: generatorCodeCid,
      engineVersion: engineVersion,
      size: size,
      releaseBlock: releaseBlock,
      commitWindow: commitWindow,
      commitBuffer: commitBuffer,
      revealWindow: revealWindow,
      topN: topN,
      entryDepositWei: entryDepositWei,
      prizePoolWei: prizePoolWei,
      sponsor: address(0)
    });

    uint256 contestId = contest.scheduleContest{value: prizePoolWei}(params);

    console.log('Contest scheduled!');
    console.log('Contest ID:', contestId);
    console.log('Release block:', releaseBlock);
    console.log('Prize pool:', prizePoolWei);
    console.log('Top N:', topN);

    vm.stopBroadcast();
  }
}

