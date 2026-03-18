// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ServiceEscrow} from "../src/ServiceEscrow.sol";
import {Console} from "./utils/Console.sol";
import {ScriptBase} from "./utils/ScriptBase.sol";

/// @notice End-to-end live smoke test for a deployed AgentCommerce stack on an Initia EVM appchain.
/// @dev Required env:
///      - APPCHAIN_CHAIN_ID
///      - AGENT_REGISTRY_ADDRESS
///      - SERVICE_ESCROW_ADDRESS
///      - AGENT_OWNER_PRIVATE_KEY
///      - CUSTOMER_PRIVATE_KEY
///      - SMOKE_TEST_AGENT_TREASURY_ADDRESS
///      - SMOKE_TEST_SERVICE_PRICE_WEI
contract SmokeTestLiveDeployment is ScriptBase {
    string internal constant AGENT_NAME = "Smoke Test Agent";
    string internal constant AGENT_CATEGORY = "Automation";
    string internal constant AGENT_DESCRIPTION = "Live deployment validation agent";
    string internal constant AGENT_INIT_USERNAME = "smoke-agent";
    string internal constant SERVICE_TITLE = "Smoke Test Service";
    string internal constant SERVICE_DESCRIPTION = "Validates live escrow settlement";
    string internal constant DELIVERY_REF = "ipfs://agentcommerce/smoke-test-delivery";

    error InvalidSmokeServicePrice(uint256 price);
    error OrderStatusMismatch(
        uint256 orderId,
        ServiceEscrow.OrderStatus expectedStatus,
        ServiceEscrow.OrderStatus actualStatus
    );
    error AgentTreasuryMismatch(address expectedTreasury, address actualTreasury);
    error ServicePriceMismatch(uint256 expectedPrice, uint256 actualPrice);

    function run()
        external
        returns (
            uint256 agentId,
            uint256 serviceId,
            uint256 orderId
        )
    {
        uint256 expectedChainId = vm.envUint("APPCHAIN_CHAIN_ID");
        address registryAddress = _loadAgentRegistryAddress();
        address escrowAddress = _loadServiceEscrowAddress();
        uint256 agentOwnerPrivateKey = vm.envUint("AGENT_OWNER_PRIVATE_KEY");
        uint256 customerPrivateKey = vm.envUint("CUSTOMER_PRIVATE_KEY");
        address agentOwner = vm.addr(agentOwnerPrivateKey);
        address customer = vm.addr(customerPrivateKey);
        address smokeAgentTreasury = vm.envAddress("SMOKE_TEST_AGENT_TREASURY_ADDRESS");
        uint256 servicePrice = vm.envUint("SMOKE_TEST_SERVICE_PRICE_WEI");

        if (servicePrice == 0) {
            revert InvalidSmokeServicePrice(servicePrice);
        }

        _assertExpectedChainId(expectedChainId);

        AgentRegistry registry = AgentRegistry(registryAddress);
        ServiceEscrow escrow = ServiceEscrow(escrowAddress);
        address feeTreasury = escrow.feeTreasury();
        uint256 platformFeeBps = uint256(escrow.platformFeeBps());

        Console.log("=== AgentCommerce Live Smoke Test ===");
        Console.log("Chain ID", block.chainid);
        Console.log("AgentRegistry", registryAddress);
        Console.log("ServiceEscrow", escrowAddress);
        Console.log("Agent owner", agentOwner);
        Console.log("Customer", customer);
        Console.log("Agent treasury", smokeAgentTreasury);
        Console.log("Fee treasury", feeTreasury);
        Console.log("Service price", servicePrice);
        Console.log("Platform fee (bps)", platformFeeBps);

        _logBalances("Initial balances", customer, smokeAgentTreasury, feeTreasury, escrowAddress);

        vm.startBroadcast(agentOwnerPrivateKey);
        agentId = registry.createAgent(
            AGENT_NAME,
            AGENT_CATEGORY,
            AGENT_DESCRIPTION,
            smokeAgentTreasury,
            AGENT_INIT_USERNAME
        );
        serviceId = registry.createService(
            agentId,
            SERVICE_TITLE,
            SERVICE_DESCRIPTION,
            servicePrice
        );
        vm.stopBroadcast();

        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        AgentRegistry.Service memory service = registry.getService(serviceId);

        if (agent.treasury != smokeAgentTreasury) {
            revert AgentTreasuryMismatch(smokeAgentTreasury, agent.treasury);
        }
        if (service.price != servicePrice) {
            revert ServicePriceMismatch(servicePrice, service.price);
        }

        Console.log("Created agentId", agentId);
        Console.log("Created serviceId", serviceId);

        vm.startBroadcast(customerPrivateKey);
        orderId = escrow.createOrder{value: servicePrice}(agentId, serviceId);
        vm.stopBroadcast();

        Console.log("Created orderId", orderId);
        _assertOrderStatus(escrow, orderId, ServiceEscrow.OrderStatus.Paid);
        _logBalances("After order creation", customer, smokeAgentTreasury, feeTreasury, escrowAddress);

        vm.startBroadcast(agentOwnerPrivateKey);
        escrow.markInProgress(orderId);
        vm.stopBroadcast();
        _assertOrderStatus(escrow, orderId, ServiceEscrow.OrderStatus.InProgress);

        vm.startBroadcast(agentOwnerPrivateKey);
        escrow.markDelivered(orderId, DELIVERY_REF);
        vm.stopBroadcast();
        _assertOrderStatus(escrow, orderId, ServiceEscrow.OrderStatus.Delivered);

        _logBalances("Before customer completion", customer, smokeAgentTreasury, feeTreasury, escrowAddress);

        vm.startBroadcast(customerPrivateKey);
        escrow.confirmCompletion(orderId);
        vm.stopBroadcast();

        _assertOrderStatus(escrow, orderId, ServiceEscrow.OrderStatus.Completed);
        _logBalances("After settlement", customer, smokeAgentTreasury, feeTreasury, escrowAddress);

        ServiceEscrow.Order memory order = escrow.getOrder(orderId);
        Console.log("Order platform fee amount", order.platformFeeAmount);
        Console.log("Order agent payout amount", order.agentPayoutAmount);
        Console.log("Final order status", uint256(order.status));
    }

    function _assertOrderStatus(
        ServiceEscrow escrow,
        uint256 orderId,
        ServiceEscrow.OrderStatus expectedStatus
    ) internal view {
        ServiceEscrow.Order memory order = escrow.getOrder(orderId);

        if (order.status != expectedStatus) {
            revert OrderStatusMismatch(orderId, expectedStatus, order.status);
        }

        Console.log("Order status", uint256(order.status));
    }

    function _logBalances(
        string memory label,
        address customer,
        address agentTreasury,
        address feeTreasury,
        address escrowAddress
    ) internal view {
        Console.log(label);
        Console.log("Customer balance", customer.balance);
        Console.log("Agent treasury balance", agentTreasury.balance);
        Console.log("Fee treasury balance", feeTreasury.balance);
        Console.log("Escrow balance", escrowAddress.balance);
    }
}
