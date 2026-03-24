// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

contract ServiceEscrow is ReentrancyGuard, Ownable {
    enum OrderStatus {
        PendingPayment,
        Paid,
        InProgress,
        Delivered,
        Completed,
        Cancelled,
        Refunded,
        Disputed
    }

    struct Order {
        uint256 id;
        uint256 agentId;
        uint256 serviceId;
        address customer;
        uint256 amountPaid;
        uint256 platformFeeAmount;
        uint256 agentPayoutAmount;
        OrderStatus status;
        string deliveryRef;
        uint256 createdAt;
        uint256 updatedAt;
    }

    AgentRegistry public immutable registry;
    address public treasury;
    uint256 public platformFeeBps;
    uint256 public nextOrderId = 1;

    mapping(uint256 => Order) public orders;

    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed agentId,
        uint256 indexed serviceId,
        address customer,
        uint256 amountPaid
    );
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus status);
    event DeliverySubmitted(uint256 indexed orderId, string deliveryRef);
    event FundsReleased(
        uint256 indexed orderId,
        address treasury,
        uint256 platformFeeAmount,
        address agentTreasury,
        uint256 agentPayoutAmount
    );
    event Refunded(uint256 indexed orderId, address customer, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    constructor(address registryAddress, address treasuryAddress, uint256 feeBps)
        Ownable(msg.sender)
    {
        require(registryAddress != address(0), "Invalid registry");
        require(treasuryAddress != address(0), "Invalid treasury");
        require(feeBps <= 1000, "Fee too high");

        registry = AgentRegistry(registryAddress);
        treasury = treasuryAddress;
        platformFeeBps = feeBps;
    }

    function createOrder(uint256 agentId, uint256 serviceId) external payable nonReentrant returns (uint256) {
        require(registry.isAgentActive(agentId), "Agent inactive");

        AgentRegistry.Service memory s = registry.getService(serviceId);
        require(s.id != 0, "Service not found");
        require(s.agentId == agentId, "Service mismatch");
        require(s.active, "Service inactive");
        require(msg.value == s.price, "Incorrect payment");

        uint256 fee = (msg.value * platformFeeBps) / 10_000;
        uint256 payout = msg.value - fee;

        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            id: orderId,
            agentId: agentId,
            serviceId: serviceId,
            customer: msg.sender,
            amountPaid: msg.value,
            platformFeeAmount: fee,
            agentPayoutAmount: payout,
            status: OrderStatus.Paid,
            deliveryRef: "",
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit OrderCreated(orderId, agentId, serviceId, msg.sender, msg.value);
        emit OrderStatusChanged(orderId, OrderStatus.Paid);

        return orderId;
    }

    function markInProgress(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.id != 0, "Order not found");
        require(o.status == OrderStatus.Paid, "Invalid status");

        _requireAgentOwner(o.agentId);

        o.status = OrderStatus.InProgress;
        o.updatedAt = block.timestamp;

        emit OrderStatusChanged(orderId, OrderStatus.InProgress);
    }

    function markDelivered(uint256 orderId, string calldata deliveryRef) external {
        Order storage o = orders[orderId];
        require(o.id != 0, "Order not found");
        require(
            o.status == OrderStatus.Paid || o.status == OrderStatus.InProgress,
            "Invalid status"
        );

        _requireAgentOwner(o.agentId);

        o.status = OrderStatus.Delivered;
        o.deliveryRef = deliveryRef;
        o.updatedAt = block.timestamp;

        emit DeliverySubmitted(orderId, deliveryRef);
        emit OrderStatusChanged(orderId, OrderStatus.Delivered);
    }

    function confirmCompletion(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        require(o.id != 0, "Order not found");
        require(msg.sender == o.customer, "Not customer");
        require(o.status == OrderStatus.Delivered, "Not delivered");

        o.status = OrderStatus.Completed;
        o.updatedAt = block.timestamp;

        address agentTreasury = registry.getAgentTreasury(o.agentId);

        (bool feeSent, ) = payable(treasury).call{value: o.platformFeeAmount}("");
        require(feeSent, "Fee transfer failed");

        (bool payoutSent, ) = payable(agentTreasury).call{value: o.agentPayoutAmount}("");
        require(payoutSent, "Payout transfer failed");

        emit OrderStatusChanged(orderId, OrderStatus.Completed);
        emit FundsReleased(orderId, treasury, o.platformFeeAmount, agentTreasury, o.agentPayoutAmount);
    }

    function adminRefund(uint256 orderId) external onlyOwner nonReentrant {
        Order storage o = orders[orderId];
        require(o.id != 0, "Order not found");
        require(
            o.status == OrderStatus.Paid ||
            o.status == OrderStatus.InProgress ||
            o.status == OrderStatus.Delivered,
            "Refund not allowed"
        );

        o.status = OrderStatus.Refunded;
        o.updatedAt = block.timestamp;

        (bool sent, ) = payable(o.customer).call{value: o.amountPaid}("");
        require(sent, "Refund failed");

        emit OrderStatusChanged(orderId, OrderStatus.Refunded);
        emit Refunded(orderId, o.customer, o.amountPaid);
    }

    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high");
        uint256 old = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(old, newFeeBps);
    }

    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address old = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    function _requireAgentOwner(uint256 agentId) internal view {
        require(registry.getAgentOwner(agentId) == msg.sender, "Not agent owner");
    }
}
