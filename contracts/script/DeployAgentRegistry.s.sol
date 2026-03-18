// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Console} from "./utils/Console.sol";
import {ScriptBase} from "./utils/ScriptBase.sol";

/// @notice Deploys AgentRegistry to the configured Initia EVM appchain.
/// @dev This script only deploys the supporting registry. For `.initia/submission.json`,
///      the primary `deployed_address` should still be the `ServiceEscrow` address once deployed.
contract DeployAgentRegistry is ScriptBase {
    function run() external returns (AgentRegistry registry) {
        CommonDeployConfig memory config = _loadCommonDeployConfig();
        _assertExpectedChainId(config.expectedChainId);
        _logHeader("DeployAgentRegistry", config);

        vm.startBroadcast(config.deployerPrivateKey);
        registry = new AgentRegistry();
        vm.stopBroadcast();

        Console.log("AgentRegistry", address(registry));
        Console.log("submission.primary_contract", PRIMARY_SUBMISSION_CONTRACT_NAME);
        Console.log("submission.core_logic_path", PRIMARY_SUBMISSION_CORE_LOGIC_PATH);
    }
}
