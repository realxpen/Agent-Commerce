// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ServiceEscrow} from "../src/ServiceEscrow.sol";
import {Console} from "./utils/Console.sol";
import {ScriptBase} from "./utils/ScriptBase.sol";

/// @notice Deploys ServiceEscrow using an existing AgentRegistry address from env.
/// @dev For `.initia/submission.json`, use the deployed `ServiceEscrow` address as the primary
///      `deployed_address` and `contracts/src/ServiceEscrow.sol` as the primary `core_logic_path`.
contract DeployServiceEscrow is ScriptBase {
    function run() external returns (ServiceEscrow escrow) {
        CommonDeployConfig memory config = _loadCommonDeployConfig();
        address registryAddress = _loadAgentRegistryAddress();

        _assertExpectedChainId(config.expectedChainId);
        _logHeader("DeployServiceEscrow", config);
        Console.log("AgentRegistry", registryAddress);

        vm.startBroadcast(config.deployerPrivateKey);
        escrow = new ServiceEscrow(registryAddress, config.treasury, config.platformFeeBps);
        vm.stopBroadcast();

        Console.log("ServiceEscrow", address(escrow));
        _logSubmissionSummary(config.expectedChainId, address(escrow), registryAddress);
    }
}
