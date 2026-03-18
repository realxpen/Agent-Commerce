// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Console} from "./Console.sol";

interface Vm {
    function envUint(string calldata name) external returns (uint256 value);
    function envAddress(string calldata name) external returns (address value);
    function addr(uint256 privateKey) external returns (address keyAddr);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

abstract contract ScriptBase {
    address internal constant VM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));
    Vm internal constant vm = Vm(VM_ADDRESS);
    string internal constant PRIMARY_SUBMISSION_CONTRACT_NAME = "ServiceEscrow";
    string internal constant PRIMARY_SUBMISSION_CORE_LOGIC_PATH = "contracts/src/ServiceEscrow.sol";
    string internal constant SUPPORTING_REGISTRY_PATH = "contracts/src/AgentRegistry.sol";

    error ChainIdMismatch(uint256 expectedChainId, uint256 actualChainId);
    error Uint96Overflow(string field, uint256 value);

    struct CommonDeployConfig {
        uint256 deployerPrivateKey;
        address deployer;
        address treasury;
        uint96 platformFeeBps;
        uint256 expectedChainId;
    }

    function _loadCommonDeployConfig() internal returns (CommonDeployConfig memory config) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 platformFeeBps = vm.envUint("PLATFORM_FEE_BPS");

        config = CommonDeployConfig({
            deployerPrivateKey: deployerPrivateKey,
            deployer: vm.addr(deployerPrivateKey),
            treasury: vm.envAddress("TREASURY_ADDRESS"),
            platformFeeBps: _toUint96("PLATFORM_FEE_BPS", platformFeeBps),
            expectedChainId: vm.envUint("APPCHAIN_CHAIN_ID")
        });
    }

    function _loadAgentRegistryAddress() internal returns (address registryAddress) {
        registryAddress = vm.envAddress("AGENT_REGISTRY_ADDRESS");
    }

    function _loadServiceEscrowAddress() internal returns (address escrowAddress) {
        escrowAddress = vm.envAddress("SERVICE_ESCROW_ADDRESS");
    }

    function _assertExpectedChainId(uint256 expectedChainId) internal view {
        if (block.chainid != expectedChainId) {
            revert ChainIdMismatch(expectedChainId, block.chainid);
        }
    }

    function _logHeader(string memory scriptName, CommonDeployConfig memory config) internal view {
        Console.log("=== AgentCommerce Deployment ===");
        Console.log("Script", scriptName);
        Console.log("Chain ID", block.chainid);
        Console.log("Deployer", config.deployer);
        Console.log("Treasury", config.treasury);
        Console.log("Platform fee (bps)", uint256(config.platformFeeBps));
    }

    function _logSubmissionSummary(
        uint256 chainId,
        address primaryDeployedAddress,
        address registryAddress
    ) internal view {
        Console.log("=== Initia Submission Helper ===");
        Console.log("submission.chain_id", chainId);
        Console.log("submission.deployed_address", primaryDeployedAddress);
        Console.log("submission.core_logic_path", PRIMARY_SUBMISSION_CORE_LOGIC_PATH);
        Console.log("submission.primary_contract", PRIMARY_SUBMISSION_CONTRACT_NAME);
        Console.log("supporting.AgentRegistry", registryAddress);
        Console.log("supporting.AgentRegistry.path", SUPPORTING_REGISTRY_PATH);
    }

    function _toUint96(string memory field, uint256 value) internal pure returns (uint96) {
        if (value > type(uint96).max) {
            revert Uint96Overflow(field, value);
        }

        return uint96(value);
    }
}
