// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Console} from "./utils/Console.sol";
import {ScriptBase} from "./utils/ScriptBase.sol";

/// @notice Prints submission-friendly values for an existing deployment.
/// @dev For this architecture, `ServiceEscrow` is the primary contract for
///      `.initia/submission.json` because it is the main order, escrow, and settlement entrypoint.
///      `AgentRegistry` is a supporting contract and should be listed separately in project notes
///      if you want reviewers to see the full architecture.
contract PrintSubmissionInfo is ScriptBase {
    function run() external {
        uint256 expectedChainId = vm.envUint("APPCHAIN_CHAIN_ID");
        address registryAddress = _loadAgentRegistryAddress();
        address escrowAddress = _loadServiceEscrowAddress();

        _assertExpectedChainId(expectedChainId);

        Console.log("=== AgentCommerce Submission Info ===");
        _logSubmissionSummary(expectedChainId, escrowAddress, registryAddress);
        Console.log("submission.placeholder_note", "Use env-loaded deployed addresses above");
    }
}
