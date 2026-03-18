// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {Ownable} from "./utils/Ownable.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @title ServiceEscrow
/// @notice Holds native-token customer payments and settles them after delivery confirmation.
/// @dev Events are shaped for backend indexing: one creation event for static order data,
///      one status-transition event for lifecycle reconstruction, and dedicated settlement events.
contract ServiceEscrow is Ownable, ReentrancyGuard {
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
        uint256 orderId;
        uint256 subscriptionId;
        uint256 agentId;
        uint256 serviceId;
        address customer;
        uint256 amountPaid;
        uint256 platformFeeAmount;
        uint256 agentPayoutAmount;
        OrderStatus status;
        string deliveryRef;
        uint64 createdAt;
        uint64 updatedAt;
    }

    struct Subscription {
        uint256 subscriptionId;
        uint256 agentId;
        uint256 serviceId;
        uint256 latestOrderId;
        address subscriber;
        uint256 recurringPrice;
        IAgentRegistry.BillingInterval billingInterval;
        bool active;
        uint64 createdAt;
        uint64 updatedAt;
    }

    error InvalidAddress(string field);
    error InvalidPlatformFeeBps(uint256 feeBps);
    error AgentInactive(uint256 agentId);
    error ServiceInactive(uint256 serviceId);
    error ServiceTypeMismatch(
        uint256 serviceId,
        IAgentRegistry.ServiceType expectedType,
        IAgentRegistry.ServiceType actualType
    );
    error InvalidServiceAgent(uint256 serviceId, uint256 expectedAgentId, uint256 actualAgentId);
    error WrongPaymentAmount(uint256 expectedAmount, uint256 actualAmount);
    error OrderNotFound(uint256 orderId);
    error InvalidOrderStatus(uint256 orderId, OrderStatus currentStatus);
    error NotCustomer(uint256 orderId, address caller);
    error NotAgentOwner(uint256 orderId, address caller);
    error InvalidDeliveryRef();
    error SubscriptionNotFound(uint256 subscriptionId);
    error NotSubscriber(uint256 subscriptionId, address caller);
    error SubscriptionAlreadyInactive(uint256 subscriptionId);
    error SubscriptionAlreadyActive(uint256 serviceId, address subscriber);
    error NativeTransferFailed(address recipient, uint256 amount);

    uint256 public constant MAX_BPS = 10_000;
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1_000;

    IAgentRegistry public immutable agentRegistry;

    address public feeTreasury;
    uint96 public platformFeeBps;
    uint256 public nextOrderId = 1;
    uint256 public nextSubscriptionId = 1;

    mapping(uint256 orderId => Order order) private _orders;
    mapping(address customer => uint256[] orderIds) private _customerOrderIds;
    mapping(uint256 agentId => uint256[] orderIds) private _agentOrderIds;
    mapping(uint256 subscriptionId => Subscription subscription) private _subscriptions;
    mapping(address subscriber => uint256[] subscriptionIds) private _subscriberSubscriptionIds;
    mapping(uint256 agentId => uint256[] subscriptionIds) private _agentSubscriptionIds;
    mapping(bytes32 subscriptionKey => uint256 subscriptionId) private _activeSubscriptionIds;

    event PlatformFeeUpdated(
        uint256 previousFeeBps,
        uint256 newFeeBps,
        address indexed actor,
        uint64 updatedAt
    );
    event FeeTreasuryUpdated(
        address indexed previousTreasury,
        address indexed newTreasury,
        address indexed actor,
        uint64 updatedAt
    );

    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed agentId,
        address indexed customer,
        uint256 subscriptionId,
        uint256 serviceId,
        uint256 amountPaid,
        uint256 platformFeeAmount,
        uint256 agentPayoutAmount,
        OrderStatus status,
        uint64 createdAt,
        uint64 updatedAt
    );
    event OrderStatusChanged(
        uint256 indexed orderId,
        uint256 indexed agentId,
        address indexed actor,
        OrderStatus previousStatus,
        OrderStatus newStatus,
        uint64 updatedAt
    );
    event DeliverySubmitted(
        uint256 indexed orderId,
        uint256 indexed agentId,
        address indexed actor,
        string deliveryRef,
        uint64 updatedAt
    );
    event FundsReleased(
        uint256 indexed orderId,
        uint256 indexed agentId,
        address indexed agentTreasury,
        address customer,
        address feeTreasury,
        uint256 platformFeeAmount,
        uint256 agentPayoutAmount,
        uint64 updatedAt
    );
    event Refunded(
        uint256 indexed orderId,
        uint256 indexed agentId,
        address indexed customer,
        address actor,
        uint256 amountRefunded,
        OrderStatus previousStatus,
        uint64 updatedAt
    );
    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        uint256 indexed agentId,
        address indexed subscriber,
        uint256 serviceId,
        uint256 initialOrderId,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice,
        bool active,
        uint64 createdAt,
        uint64 updatedAt
    );
    event SubscriptionStatusChanged(
        uint256 indexed subscriptionId,
        uint256 indexed agentId,
        address indexed actor,
        bool active,
        uint64 updatedAt
    );

    constructor(
        address registry_,
        address feeTreasury_,
        uint96 platformFeeBps_
    ) Ownable(msg.sender) {
        if (registry_ == address(0)) {
            revert InvalidAddress("agentRegistry");
        }
        if (feeTreasury_ == address(0)) {
            revert InvalidAddress("feeTreasury");
        }
        if (platformFeeBps_ > MAX_PLATFORM_FEE_BPS) {
            revert InvalidPlatformFeeBps(platformFeeBps_);
        }

        agentRegistry = IAgentRegistry(registry_);
        feeTreasury = feeTreasury_;
        platformFeeBps = platformFeeBps_;
    }

    function setPlatformFeeBps(uint96 newPlatformFeeBps) external onlyOwner {
        if (newPlatformFeeBps > MAX_PLATFORM_FEE_BPS) {
            revert InvalidPlatformFeeBps(newPlatformFeeBps);
        }

        uint256 previousFeeBps = platformFeeBps;
        platformFeeBps = newPlatformFeeBps;

        emit PlatformFeeUpdated(previousFeeBps, newPlatformFeeBps, msg.sender, uint64(block.timestamp));
    }

    function setFeeTreasury(address newFeeTreasury) external onlyOwner {
        if (newFeeTreasury == address(0)) {
            revert InvalidAddress("feeTreasury");
        }

        address previousTreasury = feeTreasury;
        feeTreasury = newFeeTreasury;

        emit FeeTreasuryUpdated(
            previousTreasury,
            newFeeTreasury,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    /// @notice Creates a native-token order and places the exact service price into escrow.
    function createOrder(
        uint256 agentId,
        uint256 serviceId
    ) external payable nonReentrant returns (uint256 orderId) {
        (
            ,
            ,
            IAgentRegistry.ServiceType serviceType,
            uint256 oneTimePrice,
            ,
            uint256 _ignoredRecurringPrice
        ) = _getValidatedService(agentId, serviceId);

        _requireServiceType(
            serviceId,
            IAgentRegistry.ServiceType.OneTime,
            serviceType
        );

        if (msg.value != oneTimePrice) {
            revert WrongPaymentAmount(oneTimePrice, msg.value);
        }

        orderId = _createPaidOrder(agentId, serviceId, msg.sender, oneTimePrice, 0);
    }

    /// @notice Creates a lightweight subscription record and escrows the first recurring payment.
    function createSubscription(
        uint256 agentId,
        uint256 serviceId
    ) external payable nonReentrant returns (uint256 subscriptionId, uint256 orderId) {
        (
            ,
            ,
            IAgentRegistry.ServiceType serviceType,
            ,
            IAgentRegistry.BillingInterval billingInterval,
            uint256 recurringPrice
        ) = _getValidatedService(agentId, serviceId);
        _requireServiceType(
            serviceId,
            IAgentRegistry.ServiceType.Subscription,
            serviceType
        );

        if (msg.value != recurringPrice) {
            revert WrongPaymentAmount(recurringPrice, msg.value);
        }

        bytes32 activeSubscriptionKey = _subscriptionKey(msg.sender, serviceId);
        if (_activeSubscriptionIds[activeSubscriptionKey] != 0) {
            revert SubscriptionAlreadyActive(serviceId, msg.sender);
        }

        subscriptionId = nextSubscriptionId;
        nextSubscriptionId = subscriptionId + 1;

        orderId = _createPaidOrder(agentId, serviceId, msg.sender, recurringPrice, subscriptionId);

        uint64 timestamp = uint64(block.timestamp);

        _subscriptions[subscriptionId] = Subscription({
            subscriptionId: subscriptionId,
            agentId: agentId,
            serviceId: serviceId,
            latestOrderId: orderId,
            subscriber: msg.sender,
            recurringPrice: recurringPrice,
            billingInterval: billingInterval,
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        _subscriberSubscriptionIds[msg.sender].push(subscriptionId);
        _agentSubscriptionIds[agentId].push(subscriptionId);
        _activeSubscriptionIds[activeSubscriptionKey] = subscriptionId;

        emit SubscriptionCreated(
            subscriptionId,
            agentId,
            msg.sender,
            serviceId,
            orderId,
            billingInterval,
            recurringPrice,
            true,
            timestamp,
            timestamp
        );
    }

    /// @notice Marks a subscription inactive without affecting already-created orders.
    function cancelSubscription(uint256 subscriptionId) external {
        Subscription storage subscription = _getSubscriptionStorage(subscriptionId);

        if (subscription.subscriber != msg.sender) {
            revert NotSubscriber(subscriptionId, msg.sender);
        }
        if (!subscription.active) {
            revert SubscriptionAlreadyInactive(subscriptionId);
        }

        subscription.active = false;
        subscription.updatedAt = uint64(block.timestamp);
        _activeSubscriptionIds[_subscriptionKey(subscription.subscriber, subscription.serviceId)] = 0;

        emit SubscriptionStatusChanged(
            subscriptionId,
            subscription.agentId,
            msg.sender,
            false,
            subscription.updatedAt
        );
    }

    function markInProgress(uint256 orderId) external {
        Order storage order = _getOrderStorage(orderId);
        _requireOrderStatus(order, OrderStatus.Paid);
        _requireAgentOwner(order, msg.sender);

        _setOrderStatus(order, OrderStatus.InProgress, msg.sender);
    }

    function markDelivered(uint256 orderId, string calldata deliveryRef) external {
        Order storage order = _getOrderStorage(orderId);
        _requireOrderStatus(order, OrderStatus.InProgress);
        _requireAgentOwner(order, msg.sender);

        if (bytes(deliveryRef).length == 0) {
            revert InvalidDeliveryRef();
        }

        order.deliveryRef = deliveryRef;
        _setOrderStatus(order, OrderStatus.Delivered, msg.sender);

        emit DeliverySubmitted(orderId, order.agentId, msg.sender, deliveryRef, order.updatedAt);
    }

    function raiseDispute(uint256 orderId, string calldata) external {
        Order storage order = _getOrderStorage(orderId);
        _requireOrderStatus(order, OrderStatus.Delivered);
        _requireCustomer(order, msg.sender);

        _setOrderStatus(order, OrderStatus.Disputed, msg.sender);
    }

    /// @notice Completes a delivered order and settles escrow using the current registry treasury.
    function confirmCompletion(uint256 orderId) external nonReentrant {
        Order storage order = _getOrderStorage(orderId);
        _requireOrderStatus(order, OrderStatus.Delivered);
        _requireCustomer(order, msg.sender);

        (, address agentTreasury, ) = agentRegistry.getAgentSettlementDetails(order.agentId);
        if (agentTreasury == address(0)) {
            revert InvalidAddress("agentTreasury");
        }

        uint256 feeAmount = order.platformFeeAmount;
        uint256 payoutAmount = order.agentPayoutAmount;

        _setOrderStatus(order, OrderStatus.Completed, msg.sender);

        if (feeAmount > 0) {
            _sendNative(feeTreasury, feeAmount);
        }
        if (payoutAmount > 0) {
            _sendNative(agentTreasury, payoutAmount);
        }

        emit FundsReleased(
            orderId,
            order.agentId,
            agentTreasury,
            order.customer,
            feeTreasury,
            feeAmount,
            payoutAmount,
            order.updatedAt
        );
    }

    /// @notice Admin-only refund path kept intentionally simple for hackathon dispute handling.
    function emergencyRefund(uint256 orderId) external onlyOwner nonReentrant {
        Order storage order = _getOrderStorage(orderId);

        if (
            order.status != OrderStatus.Paid &&
            order.status != OrderStatus.InProgress &&
            order.status != OrderStatus.Delivered &&
            order.status != OrderStatus.Disputed
        ) {
            revert InvalidOrderStatus(orderId, order.status);
        }

        OrderStatus previousStatus = order.status;
        _setOrderStatus(order, OrderStatus.Refunded, msg.sender);

        _sendNative(order.customer, order.amountPaid);

        emit Refunded(
            orderId,
            order.agentId,
            order.customer,
            msg.sender,
            order.amountPaid,
            previousStatus,
            order.updatedAt
        );
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return _getOrder(orderId);
    }

    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        return _getSubscription(subscriptionId);
    }

    function getCustomerOrderIds(address customer) external view returns (uint256[] memory) {
        return _customerOrderIds[customer];
    }

    function getAgentOrderIds(uint256 agentId) external view returns (uint256[] memory) {
        return _agentOrderIds[agentId];
    }

    function getSubscriberSubscriptionIds(
        address subscriber
    ) external view returns (uint256[] memory) {
        return _subscriberSubscriptionIds[subscriber];
    }

    function getAgentSubscriptionIds(uint256 agentId) external view returns (uint256[] memory) {
        return _agentSubscriptionIds[agentId];
    }

    function _getOrderStorage(uint256 orderId) internal view returns (Order storage order) {
        order = _orders[orderId];
        if (order.orderId == 0) {
            revert OrderNotFound(orderId);
        }
    }

    function _getSubscriptionStorage(
        uint256 subscriptionId
    ) internal view returns (Subscription storage subscription) {
        subscription = _subscriptions[subscriptionId];
        if (subscription.subscriptionId == 0) {
            revert SubscriptionNotFound(subscriptionId);
        }
    }

    function _getOrder(uint256 orderId) internal view returns (Order memory order) {
        order = _orders[orderId];
        if (order.orderId == 0) {
            revert OrderNotFound(orderId);
        }
    }

    function _getSubscription(
        uint256 subscriptionId
    ) internal view returns (Subscription memory subscription) {
        subscription = _subscriptions[subscriptionId];
        if (subscription.subscriptionId == 0) {
            revert SubscriptionNotFound(subscriptionId);
        }
    }

    function _createPaidOrder(
        uint256 agentId,
        uint256 serviceId,
        address customer,
        uint256 amount,
        uint256 subscriptionId
    ) internal returns (uint256 orderId) {
        orderId = nextOrderId;
        nextOrderId = orderId + 1;

        uint256 feeAmount = _calculatePlatformFee(amount);
        uint256 payoutAmount = amount - feeAmount;
        uint64 timestamp = uint64(block.timestamp);

        _orders[orderId] = Order({
            orderId: orderId,
            subscriptionId: subscriptionId,
            agentId: agentId,
            serviceId: serviceId,
            customer: customer,
            amountPaid: amount,
            platformFeeAmount: feeAmount,
            agentPayoutAmount: payoutAmount,
            status: OrderStatus.Paid,
            deliveryRef: "",
            createdAt: timestamp,
            updatedAt: timestamp
        });
        _customerOrderIds[customer].push(orderId);
        _agentOrderIds[agentId].push(orderId);

        emit OrderCreated(
            orderId,
            agentId,
            customer,
            subscriptionId,
            serviceId,
            amount,
            feeAmount,
            payoutAmount,
            OrderStatus.Paid,
            timestamp,
            timestamp
        );
        emit OrderStatusChanged(
            orderId,
            agentId,
            customer,
            OrderStatus.PendingPayment,
            OrderStatus.Paid,
            timestamp
        );
    }

    function _getValidatedService(
        uint256 agentId,
        uint256 serviceId
    )
        internal
        view
        returns (
            address agentOwner,
            address agentTreasury,
            IAgentRegistry.ServiceType serviceType,
            uint256 price,
            IAgentRegistry.BillingInterval billingInterval,
            uint256 recurringPrice
        )
    {
        bool agentActive;
        bool serviceActive;
        uint256 serviceAgentId;

        (agentOwner, agentTreasury, agentActive) = agentRegistry.getAgentSettlementDetails(agentId);
        (
            serviceAgentId,
            price,
            serviceActive,
            serviceType,
            billingInterval,
            recurringPrice
        ) = agentRegistry.getServiceSettlementDetails(serviceId);

        if (!agentActive) {
            revert AgentInactive(agentId);
        }
        if (!serviceActive) {
            revert ServiceInactive(serviceId);
        }
        if (serviceAgentId != agentId) {
            revert InvalidServiceAgent(serviceId, agentId, serviceAgentId);
        }
        if (agentOwner == address(0)) {
            revert InvalidAddress("agentOwner");
        }
        if (agentTreasury == address(0)) {
            revert InvalidAddress("agentTreasury");
        }
    }

    function _requireOrderStatus(Order storage order, OrderStatus expectedStatus) internal view {
        if (order.status != expectedStatus) {
            revert InvalidOrderStatus(order.orderId, order.status);
        }
    }

    function _requireCustomer(Order storage order, address caller) internal view {
        if (order.customer != caller) {
            revert NotCustomer(order.orderId, caller);
        }
    }

    function _requireAgentOwner(Order storage order, address caller) internal view {
        (address agentOwner, , ) = agentRegistry.getAgentSettlementDetails(order.agentId);
        if (agentOwner != caller) {
            revert NotAgentOwner(order.orderId, caller);
        }
    }

    function _requireServiceType(
        uint256 serviceId,
        IAgentRegistry.ServiceType expectedType,
        IAgentRegistry.ServiceType actualType
    ) internal pure {
        if (expectedType != actualType) {
            revert ServiceTypeMismatch(serviceId, expectedType, actualType);
        }
    }

    function _setOrderStatus(
        Order storage order,
        OrderStatus newStatus,
        address actor
    ) internal {
        OrderStatus previousStatus = order.status;
        order.status = newStatus;
        order.updatedAt = uint64(block.timestamp);

        emit OrderStatusChanged(
            order.orderId,
            order.agentId,
            actor,
            previousStatus,
            newStatus,
            order.updatedAt
        );
    }

    /// @dev Deterministic floor rounding keeps the split stable for off-chain accounting.
    function _calculatePlatformFee(uint256 amount) internal view returns (uint256) {
        return (amount * uint256(platformFeeBps)) / MAX_BPS;
    }

    function _sendNative(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert NativeTransferFailed(recipient, amount);
        }
    }

    function _subscriptionKey(address subscriber, uint256 serviceId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(subscriber, serviceId));
    }
}
