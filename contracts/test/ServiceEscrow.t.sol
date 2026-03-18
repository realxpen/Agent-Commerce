// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ServiceEscrow} from "../src/ServiceEscrow.sol";
import {IAgentRegistry} from "../src/interfaces/IAgentRegistry.sol";
import {TestBase} from "./utils/TestBase.sol";

contract ServiceEscrowTest is TestBase {
    AgentRegistry internal registry;
    ServiceEscrow internal escrow;

    address internal constant AGENT_OWNER = address(0xA11CE);
    address internal constant CUSTOMER = address(0xBEEF);
    address internal constant OTHER_USER = address(0xB0B);
    address internal constant AGENT_TREASURY = address(0xCAFE);
    address internal constant FEE_TREASURY = address(0xFEE1);
    address internal constant UPDATED_FEE_TREASURY = address(0xD00D);

    uint96 internal constant PLATFORM_FEE_BPS = 500;
    uint96 internal constant UPDATED_PLATFORM_FEE_BPS = 750;
    uint96 internal constant MAX_PLATFORM_FEE_BPS = 1_000;
    uint256 internal constant SERVICE_PRICE = 1 ether;
    uint256 internal constant SUBSCRIPTION_PRICE = 0.25 ether;

    uint256 internal agentId;
    uint256 internal serviceId;

    function setUp() public {
        registry = new AgentRegistry();
        escrow = new ServiceEscrow(address(registry), FEE_TREASURY, PLATFORM_FEE_BPS);

        vm.prank(AGENT_OWNER);
        agentId = registry.createAgent(
            "Studio Alpha",
            "Automation",
            "Runs agent services",
            AGENT_TREASURY,
            "studio-alpha"
        );

        vm.prank(AGENT_OWNER);
        serviceId = registry.createService(
            agentId,
            "Research Sprint",
            "Runs an AI-assisted research sprint",
            SERVICE_PRICE
        );

        vm.deal(CUSTOMER, 10 ether);
    }

    function testCreateOrderWithPayment() public {
        uint256 orderId = _createOrder();

        ServiceEscrow.Order memory order = escrow.getOrder(orderId);

        assertEq(order.orderId, 1, "order id should start at one");
        assertEq(order.agentId, agentId, "order should store agent id");
        assertEq(order.serviceId, serviceId, "order should store service id");
        assertEq(order.customer, CUSTOMER, "order should store customer");
        assertEq(order.subscriptionId, 0, "one-time order should not be linked to a subscription");
        assertEq(order.amountPaid, SERVICE_PRICE, "order should store paid amount");
        assertEq(
            order.platformFeeAmount,
            (SERVICE_PRICE * PLATFORM_FEE_BPS) / 10_000,
            "platform fee should be calculated"
        );
        assertEq(
            order.agentPayoutAmount,
            SERVICE_PRICE - ((SERVICE_PRICE * PLATFORM_FEE_BPS) / 10_000),
            "agent payout should be calculated"
        );
        assertEq(
            uint256(order.status),
            uint256(ServiceEscrow.OrderStatus.Paid),
            "new order should be paid"
        );
    }

    function testCreateSubscriptionWithPayment() public {
        uint256 subscriptionServiceId = _createSubscriptionService();

        vm.prank(CUSTOMER);
        (uint256 subscriptionId, uint256 orderId) = escrow.createSubscription{value: SUBSCRIPTION_PRICE}(
            agentId,
            subscriptionServiceId
        );

        ServiceEscrow.Subscription memory subscription = escrow.getSubscription(subscriptionId);
        ServiceEscrow.Order memory order = escrow.getOrder(orderId);
        uint256[] memory subscriberSubscriptionIds = escrow.getSubscriberSubscriptionIds(CUSTOMER);

        assertEq(subscription.subscriptionId, 1, "subscription id should start at one");
        assertEq(subscription.agentId, agentId, "subscription should store agent id");
        assertEq(subscription.serviceId, subscriptionServiceId, "subscription should store service id");
        assertEq(subscription.latestOrderId, orderId, "subscription should link to the initial order");
        assertEq(subscription.subscriber, CUSTOMER, "subscription should store the subscriber");
        assertEq(subscription.recurringPrice, SUBSCRIPTION_PRICE, "subscription should store price");
        assertEq(
            uint256(subscription.billingInterval),
            uint256(IAgentRegistry.BillingInterval.Monthly),
            "subscription should store interval"
        );
        assertTrue(subscription.active, "subscription should start active");
        assertEq(subscriberSubscriptionIds.length, 1, "subscriber should have one subscription");
        assertEq(subscriberSubscriptionIds[0], subscriptionId, "subscription id should be indexed");
        assertEq(order.subscriptionId, subscriptionId, "initial order should link back to subscription");
        assertEq(order.amountPaid, SUBSCRIPTION_PRICE, "initial order should store subscription payment");
    }

    function testFeeUpdate() public {
        escrow.setPlatformFeeBps(UPDATED_PLATFORM_FEE_BPS);

        assertEq(
            uint256(escrow.platformFeeBps()),
            uint256(UPDATED_PLATFORM_FEE_BPS),
            "platform fee bps should update"
        );
    }

    function testInvalidFeeCapRejection() public {
        vm.expectRevert(ServiceEscrow.InvalidPlatformFeeBps.selector);
        escrow.setPlatformFeeBps(MAX_PLATFORM_FEE_BPS + 1);
    }

    function testTreasuryUpdate() public {
        escrow.setFeeTreasury(UPDATED_FEE_TREASURY);

        assertEq(escrow.feeTreasury(), UPDATED_FEE_TREASURY, "fee treasury should update");
    }

    function testWrongPaymentAmountFails() public {
        vm.prank(CUSTOMER);
        vm.expectRevert(ServiceEscrow.WrongPaymentAmount.selector);
        escrow.createOrder{value: SERVICE_PRICE - 1}(agentId, serviceId);
    }

    function testSubscriptionWrongPaymentAmountFails() public {
        uint256 subscriptionServiceId = _createSubscriptionService();

        vm.prank(CUSTOMER);
        vm.expectRevert(ServiceEscrow.WrongPaymentAmount.selector);
        escrow.createSubscription{value: SUBSCRIPTION_PRICE - 1}(agentId, subscriptionServiceId);
    }

    function testInactiveServiceFails() public {
        vm.prank(AGENT_OWNER);
        registry.deactivateService(serviceId);

        vm.prank(CUSTOMER);
        vm.expectRevert(ServiceEscrow.ServiceInactive.selector);
        escrow.createOrder{value: SERVICE_PRICE}(agentId, serviceId);
    }

    function testSubscriptionServiceRejectsOneTimeOrderPath() public {
        uint256 subscriptionServiceId = _createSubscriptionService();

        vm.prank(CUSTOMER);
        vm.expectRevert(ServiceEscrow.ServiceTypeMismatch.selector);
        escrow.createOrder{value: SUBSCRIPTION_PRICE}(agentId, subscriptionServiceId);
    }

    function testMarkInProgress() public {
        uint256 orderId = _createOrder();

        vm.prank(AGENT_OWNER);
        escrow.markInProgress(orderId);

        assertEq(
            uint256(escrow.getOrder(orderId).status),
            uint256(ServiceEscrow.OrderStatus.InProgress),
            "order should move to in progress"
        );
    }

    function testMarkDelivered() public {
        uint256 orderId = _createOrder();

        vm.startPrank(AGENT_OWNER);
        escrow.markInProgress(orderId);
        escrow.markDelivered(orderId, "ipfs://delivery-proof");
        vm.stopPrank();

        ServiceEscrow.Order memory order = escrow.getOrder(orderId);

        assertEq(
            uint256(order.status),
            uint256(ServiceEscrow.OrderStatus.Delivered),
            "order should move to delivered"
        );
        assertEq(order.deliveryRef, "ipfs://delivery-proof", "delivery ref should be stored");
    }

    function testCustomerConfirmsCompletion() public {
        uint256 orderId = _createOrderAndDeliver();

        vm.prank(CUSTOMER);
        escrow.confirmCompletion(orderId);

        assertEq(
            uint256(escrow.getOrder(orderId).status),
            uint256(ServiceEscrow.OrderStatus.Completed),
            "order should move to completed"
        );
    }

    function testPayoutSplitIsCorrect() public {
        uint256 orderId = _createOrderAndDeliver();
        uint256 expectedFee = (SERVICE_PRICE * PLATFORM_FEE_BPS) / 10_000;
        uint256 expectedPayout = SERVICE_PRICE - expectedFee;

        uint256 feeTreasuryBalanceBefore = FEE_TREASURY.balance;
        uint256 agentTreasuryBalanceBefore = AGENT_TREASURY.balance;

        vm.prank(CUSTOMER);
        escrow.confirmCompletion(orderId);

        assertEq(
            FEE_TREASURY.balance,
            feeTreasuryBalanceBefore + expectedFee,
            "fee treasury should receive the platform fee"
        );
        assertEq(
            AGENT_TREASURY.balance,
            agentTreasuryBalanceBefore + expectedPayout,
            "agent treasury should receive the payout"
        );
    }

    function testPayoutWithNonZeroFee() public {
        escrow.setPlatformFeeBps(MAX_PLATFORM_FEE_BPS);

        uint256 orderId = _createOrderAndDeliver();
        uint256 expectedFee = (SERVICE_PRICE * MAX_PLATFORM_FEE_BPS) / 10_000;
        uint256 expectedPayout = SERVICE_PRICE - expectedFee;
        ServiceEscrow.Order memory order = escrow.getOrder(orderId);

        assertEq(order.platformFeeAmount, expectedFee, "stored platform fee should be updated");
        assertEq(order.agentPayoutAmount, expectedPayout, "stored payout should be updated");

        uint256 feeTreasuryBalanceBefore = FEE_TREASURY.balance;
        uint256 agentTreasuryBalanceBefore = AGENT_TREASURY.balance;

        vm.prank(CUSTOMER);
        escrow.confirmCompletion(orderId);

        assertEq(
            FEE_TREASURY.balance,
            feeTreasuryBalanceBefore + expectedFee,
            "updated fee treasury balance should reflect non-zero fee"
        );
        assertEq(
            AGENT_TREASURY.balance,
            agentTreasuryBalanceBefore + expectedPayout,
            "updated agent treasury balance should reflect non-zero fee payout"
        );
    }

    function testUnauthorizedTransitionsFail() public {
        uint256 orderId = _createOrder();

        vm.prank(OTHER_USER);
        vm.expectRevert(ServiceEscrow.NotAgentOwner.selector);
        escrow.markInProgress(orderId);

        vm.startPrank(AGENT_OWNER);
        escrow.markInProgress(orderId);
        escrow.markDelivered(orderId, "ipfs://delivery-proof");
        vm.stopPrank();

        vm.prank(OTHER_USER);
        vm.expectRevert(ServiceEscrow.NotCustomer.selector);
        escrow.confirmCompletion(orderId);
    }

    function testRefundFlow() public {
        uint256 orderId = _createOrder();
        uint256 customerBalanceAfterCreate = CUSTOMER.balance;

        escrow.emergencyRefund(orderId);

        assertEq(
            uint256(escrow.getOrder(orderId).status),
            uint256(ServiceEscrow.OrderStatus.Refunded),
            "order should move to refunded"
        );
        assertEq(CUSTOMER.balance, customerBalanceAfterCreate + SERVICE_PRICE, "customer should be refunded");
    }

    function testCancelSubscription() public {
        uint256 subscriptionServiceId = _createSubscriptionService();

        vm.prank(CUSTOMER);
        (uint256 subscriptionId, ) = escrow.createSubscription{value: SUBSCRIPTION_PRICE}(
            agentId,
            subscriptionServiceId
        );

        vm.prank(CUSTOMER);
        escrow.cancelSubscription(subscriptionId);

        assertFalse(escrow.getSubscription(subscriptionId).active, "subscription should be inactive");
    }

    function _createOrder() internal returns (uint256 orderId) {
        vm.prank(CUSTOMER);
        orderId = escrow.createOrder{value: SERVICE_PRICE}(agentId, serviceId);
    }

    function _createOrderAndDeliver() internal returns (uint256 orderId) {
        orderId = _createOrder();

        vm.startPrank(AGENT_OWNER);
        escrow.markInProgress(orderId);
        escrow.markDelivered(orderId, "ipfs://delivery-proof");
        vm.stopPrank();
    }

    function _createSubscriptionService() internal returns (uint256 subscriptionServiceId) {
        vm.prank(AGENT_OWNER);
        subscriptionServiceId = registry.createSubscriptionService(
            agentId,
            "Retainer Copilot",
            "Provides ongoing support",
            IAgentRegistry.BillingInterval.Monthly,
            SUBSCRIPTION_PRICE
        );
    }
}
