// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/ServiceEscrow.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 feeBps = vm.envUint("PLATFORM_FEE_BPS");

        vm.startBroadcast(deployerPrivateKey);

        AgentRegistry registry = new AgentRegistry();
        ServiceEscrow escrow = new ServiceEscrow(address(registry), treasury, feeBps);

        vm.stopBroadcast();

        console2.log("AgentRegistry deployed at:", address(registry));
        console2.log("ServiceEscrow deployed at:", address(escrow));
    }
}
