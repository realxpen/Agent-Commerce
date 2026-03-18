// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ServiceEscrow} from "../src/ServiceEscrow.sol";
import {Console} from "./utils/Console.sol";
import {ScriptBase} from "./utils/ScriptBase.sol";

/// @notice Deploys the full AgentCommerce contract stack in dependency order.
/// @dev For `.initia/submission.json`, use the deployed `ServiceEscrow` address as the primary
///      `deployed_address` because it is the main settlement and order-entry contract.
///      Use `contracts/src/ServiceEscrow.sol` as the primary `core_logic_path`.
contract DeployAll is ScriptBase {
    function run() external returns (AgentRegistry registry, ServiceEscrow escrow) {
        CommonDeployConfig memory config = _loadCommonDeployConfig();
        _assertExpectedChainId(config.expectedChainId);
        _logHeader("DeployAll", config);

        vm.startBroadcast(config.deployerPrivateKey);
        registry = new AgentRegistry();
        escrow = new ServiceEscrow(address(registry), config.treasury, config.platformFeeBps);
        vm.stopBroadcast();

        Console.log("AgentRegistry", address(registry));
        Console.log("ServiceEscrow", address(escrow));
        _logSubmissionSummary(config.expectedChainId, address(escrow), address(registry));
    }
}
