// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../src/AgentRegistry.sol";
import {IAgentRegistry} from "../src/interfaces/IAgentRegistry.sol";
import {TestBase} from "./utils/TestBase.sol";

contract AgentRegistryTest is TestBase {
    AgentRegistry internal registry;

    address internal constant AGENT_OWNER = address(0xA11CE);
    address internal constant OTHER_USER = address(0xB0B);
    address internal constant TREASURY = address(0xCAFE);
    address internal constant UPDATED_TREASURY = address(0xFEE1);

    function setUp() public {
        registry = new AgentRegistry();
    }

    function testCreateAgent() public {
        vm.prank(AGENT_OWNER);
        uint256 agentId = registry.createAgent(
            "Studio Alpha",
            "Design",
            "Creates design deliverables",
            TREASURY,
            "studio-alpha"
        );

        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        uint256[] memory ownerAgentIds = registry.getOwnerAgentIds(AGENT_OWNER);

        assertEq(agent.agentId, 1, "agent id should start at one");
        assertEq(agent.owner, AGENT_OWNER, "owner should be the creator");
        assertEq(agent.name, "Studio Alpha", "name should be stored");
        assertEq(agent.category, "Design", "category should be stored");
        assertEq(agent.description, "Creates design deliverables", "description should be stored");
        assertEq(agent.treasury, TREASURY, "treasury should be stored");
        assertTrue(agent.active, "agent should start active");
        assertEq(agent.initUsername, "studio-alpha", "init username should be stored");
        assertEq(ownerAgentIds.length, 1, "owner should have one agent id");
        assertEq(ownerAgentIds[0], agentId, "owner agent id should match");
    }

    function testUpdateAgent() public {
        uint256 agentId = _createDefaultAgent();

        vm.prank(AGENT_OWNER);
        registry.updateAgent(
            agentId,
            "Studio Beta",
            "Automation",
            "Runs automated business workflows",
            UPDATED_TREASURY,
            "studio-beta"
        );

        AgentRegistry.Agent memory agent = registry.getAgent(agentId);

        assertEq(agent.name, "Studio Beta", "updated name should be stored");
        assertEq(agent.category, "Automation", "updated category should be stored");
        assertEq(
            agent.description,
            "Runs automated business workflows",
            "updated description should be stored"
        );
        assertEq(agent.treasury, UPDATED_TREASURY, "updated treasury should be stored");
        assertEq(agent.initUsername, "studio-beta", "updated init username should be stored");
        assertTrue(agent.updatedAt >= agent.createdAt, "updated timestamp should not go backwards");
    }

    function testUnauthorizedUpdateFails() public {
        uint256 agentId = _createDefaultAgent();

        vm.prank(OTHER_USER);
        vm.expectRevert(AgentRegistry.NotAgentOwner.selector);
        registry.updateAgent(
            agentId,
            "Studio Gamma",
            "Growth",
            "Should not update",
            UPDATED_TREASURY,
            "studio-gamma"
        );
    }

    function testDeactivateReactivateFlow() public {
        uint256 agentId = _createDefaultAgent();

        vm.prank(AGENT_OWNER);
        registry.deactivateAgent(agentId);
        assertFalse(registry.getAgent(agentId).active, "agent should be inactive after deactivation");

        vm.prank(AGENT_OWNER);
        registry.activateAgent(agentId);
        assertTrue(registry.getAgent(agentId).active, "agent should be active after reactivation");
    }

    function testCreateService() public {
        uint256 agentId = _createDefaultAgent();

        vm.prank(AGENT_OWNER);
        uint256 serviceId = registry.createService(
            agentId,
            "Landing Page Build",
            "Creates a polished landing page",
            1 ether
        );

        AgentRegistry.Service memory service = registry.getService(serviceId);
        uint256[] memory serviceIds = registry.getAgentServiceIds(agentId);

        assertEq(service.serviceId, 1, "service id should start at one");
        assertEq(service.agentId, agentId, "service should link to the agent");
        assertEq(service.title, "Landing Page Build", "title should be stored");
        assertEq(service.description, "Creates a polished landing page", "description should be stored");
        assertEq(service.price, 1 ether, "price should be stored");
        assertEq(
            uint256(service.serviceType),
            uint256(IAgentRegistry.ServiceType.OneTime),
            "one-time service type should be stored"
        );
        assertEq(
            uint256(service.billingInterval),
            uint256(IAgentRegistry.BillingInterval.None),
            "one-time service should not have a billing interval"
        );
        assertEq(service.recurringPrice, 0, "one-time service should not have recurring price");
        assertTrue(service.active, "service should start active");
        assertEq(serviceIds.length, 1, "agent should have one service id");
        assertEq(serviceIds[0], serviceId, "service id should match");
    }

    function testUpdateService() public {
        uint256 agentId = _createDefaultAgent();
        uint256 serviceId = _createDefaultService(agentId);

        vm.prank(AGENT_OWNER);
        registry.updateService(
            serviceId,
            "Growth Audit",
            "Reviews funnels and growth loops",
            2 ether
        );

        AgentRegistry.Service memory service = registry.getService(serviceId);

        assertEq(service.title, "Growth Audit", "updated title should be stored");
        assertEq(service.description, "Reviews funnels and growth loops", "updated description should be stored");
        assertEq(service.price, 2 ether, "updated price should be stored");
        assertEq(
            uint256(service.serviceType),
            uint256(IAgentRegistry.ServiceType.OneTime),
            "one-time service type should remain unchanged"
        );
        assertTrue(service.updatedAt >= service.createdAt, "updated timestamp should not go backwards");
    }

    function testCreateSubscriptionService() public {
        uint256 agentId = _createDefaultAgent();

        vm.prank(AGENT_OWNER);
        uint256 serviceId = registry.createSubscriptionService(
            agentId,
            "Retainer Copilot",
            "Provides ongoing weekly growth support",
            IAgentRegistry.BillingInterval.Monthly,
            0.25 ether
        );

        AgentRegistry.Service memory service = registry.getService(serviceId);

        assertEq(service.agentId, agentId, "subscription service should link to the agent");
        assertEq(
            uint256(service.serviceType),
            uint256(IAgentRegistry.ServiceType.Subscription),
            "subscription type should be stored"
        );
        assertEq(
            uint256(service.billingInterval),
            uint256(IAgentRegistry.BillingInterval.Monthly),
            "billing interval should be stored"
        );
        assertEq(service.price, 0, "subscription services should not use one-time price");
        assertEq(service.recurringPrice, 0.25 ether, "recurring price should be stored");
    }

    function testUpdateSubscriptionService() public {
        uint256 agentId = _createDefaultAgent();
        uint256 serviceId = _createDefaultSubscriptionService(agentId);

        vm.prank(AGENT_OWNER);
        registry.updateSubscriptionService(
            serviceId,
            "Retainer Copilot Plus",
            "Adds reporting and optimization support",
            IAgentRegistry.BillingInterval.Yearly,
            1 ether
        );

        AgentRegistry.Service memory service = registry.getService(serviceId);

        assertEq(service.title, "Retainer Copilot Plus", "updated title should be stored");
        assertEq(
            service.description,
            "Adds reporting and optimization support",
            "updated description should be stored"
        );
        assertEq(
            uint256(service.billingInterval),
            uint256(IAgentRegistry.BillingInterval.Yearly),
            "updated interval should be stored"
        );
        assertEq(service.recurringPrice, 1 ether, "updated recurring price should be stored");
    }

    function testUnauthorizedServiceUpdateFails() public {
        uint256 agentId = _createDefaultAgent();
        uint256 serviceId = _createDefaultService(agentId);

        vm.prank(OTHER_USER);
        vm.expectRevert(AgentRegistry.NotAgentOwner.selector);
        registry.updateService(serviceId, "Exploit", "Should not update", 3 ether);
    }

    function testInactiveServiceBehavior() public {
        uint256 agentId = _createDefaultAgent();
        uint256 serviceId = _createDefaultService(agentId);

        vm.prank(AGENT_OWNER);
        registry.deactivateService(serviceId);
        assertFalse(registry.getService(serviceId).active, "service should be inactive");

        vm.prank(AGENT_OWNER);
        registry.activateService(serviceId);
        assertTrue(registry.getService(serviceId).active, "service should reactivate");
    }

    function _createDefaultAgent() internal returns (uint256 agentId) {
        vm.prank(AGENT_OWNER);
        agentId = registry.createAgent(
            "Studio Alpha",
            "Design",
            "Creates design deliverables",
            TREASURY,
            "studio-alpha"
        );
    }

    function _createDefaultService(uint256 agentId) internal returns (uint256 serviceId) {
        vm.prank(AGENT_OWNER);
        serviceId = registry.createService(
            agentId,
            "Landing Page Build",
            "Creates a polished landing page",
            1 ether
        );
    }

    function _createDefaultSubscriptionService(uint256 agentId) internal returns (uint256 serviceId) {
        vm.prank(AGENT_OWNER);
        serviceId = registry.createSubscriptionService(
            agentId,
            "Retainer Copilot",
            "Provides ongoing weekly growth support",
            IAgentRegistry.BillingInterval.Monthly,
            0.25 ether
        );
    }
}
