// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice Stores AgentCommerce agent identities and their sellable services.
/// @dev Events are intentionally rich so an off-chain indexer can rebuild registry state
///      without needing to re-read storage for every lifecycle change.
contract AgentRegistry is IAgentRegistry {
    struct Agent {
        uint256 agentId;
        address owner;
        string name;
        string category;
        string description;
        address treasury;
        bool active;
        string initUsername;
        uint64 createdAt;
        uint64 updatedAt;
    }

    struct Service {
        uint256 serviceId;
        uint256 agentId;
        string title;
        string description;
        uint256 price;
        IAgentRegistry.ServiceType serviceType;
        IAgentRegistry.BillingInterval billingInterval;
        uint256 recurringPrice;
        bool active;
        uint64 createdAt;
        uint64 updatedAt;
    }

    error AgentNotFound(uint256 agentId);
    error ServiceNotFound(uint256 serviceId);
    error NotAgentOwner(uint256 agentId, address caller);
    error InvalidAddress(string field);
    error InvalidString(string field);
    error InvalidPrice();
    error InvalidRecurringPrice();
    error InvalidBillingInterval();
    error ServiceTypeMismatch(
        uint256 serviceId,
        IAgentRegistry.ServiceType expectedType,
        IAgentRegistry.ServiceType actualType
    );
    error AgentAlreadyActive(uint256 agentId);
    error AgentAlreadyInactive(uint256 agentId);
    error ServiceAlreadyActive(uint256 serviceId);
    error ServiceAlreadyInactive(uint256 serviceId);

    uint256 public nextAgentId = 1;
    uint256 public nextServiceId = 1;

    mapping(uint256 agentId => Agent agent) private _agents;
    mapping(address owner => uint256[] agentIds) private _ownerAgentIds;
    mapping(uint256 serviceId => Service service) private _services;
    mapping(uint256 agentId => uint256[] serviceIds) private _agentServiceIds;

    event AgentCreated(
        uint256 indexed agentId,
        address indexed owner,
        address indexed treasury,
        string name,
        string category,
        string description,
        string initUsername,
        bool active,
        uint64 createdAt,
        uint64 updatedAt
    );
    event AgentUpdated(
        uint256 indexed agentId,
        address indexed owner,
        address indexed treasury,
        string name,
        string category,
        string description,
        string initUsername,
        bool active,
        uint64 updatedAt
    );
    event AgentStatusChanged(
        uint256 indexed agentId,
        address indexed owner,
        bool active,
        uint64 updatedAt
    );

    event ServiceCreated(
        uint256 indexed serviceId,
        uint256 indexed agentId,
        address indexed owner,
        string title,
        string description,
        uint256 price,
        IAgentRegistry.ServiceType serviceType,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice,
        bool active,
        uint64 createdAt,
        uint64 updatedAt
    );
    event ServiceUpdated(
        uint256 indexed serviceId,
        uint256 indexed agentId,
        address indexed owner,
        string title,
        string description,
        uint256 price,
        IAgentRegistry.ServiceType serviceType,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice,
        bool active,
        uint64 updatedAt
    );
    event ServiceStatusChanged(
        uint256 indexed serviceId,
        uint256 indexed agentId,
        address indexed owner,
        bool active,
        uint64 updatedAt
    );

    /// @notice Creates a new AI business agent owned by the caller.
    function createAgent(
        string calldata name,
        string calldata category,
        string calldata description,
        address treasury,
        string calldata initUsername
    ) external returns (uint256 agentId) {
        _requireNonEmpty(name, "name");
        _requireNonEmpty(category, "category");
        _requireNonEmpty(description, "description");
        _requireNonZeroAddress(treasury, "treasury");

        agentId = nextAgentId;
        nextAgentId = agentId + 1;

        uint64 timestamp = uint64(block.timestamp);

        _agents[agentId] = Agent({
            agentId: agentId,
            owner: msg.sender,
            name: name,
            category: category,
            description: description,
            treasury: treasury,
            active: true,
            initUsername: initUsername,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        _ownerAgentIds[msg.sender].push(agentId);

        emit AgentCreated(
            agentId,
            msg.sender,
            treasury,
            name,
            category,
            description,
            initUsername,
            true,
            timestamp,
            timestamp
        );
    }

    /// @notice Updates mutable agent metadata and treasury routing.
    function updateAgent(
        uint256 agentId,
        string calldata name,
        string calldata category,
        string calldata description,
        address treasury,
        string calldata initUsername
    ) external {
        Agent storage agent = _getAgentStorage(agentId);
        _requireAgentOwner(agentId, agent.owner, msg.sender);
        _requireNonEmpty(name, "name");
        _requireNonEmpty(category, "category");
        _requireNonEmpty(description, "description");
        _requireNonZeroAddress(treasury, "treasury");

        agent.name = name;
        agent.category = category;
        agent.description = description;
        agent.treasury = treasury;
        agent.initUsername = initUsername;
        agent.updatedAt = uint64(block.timestamp);

        emit AgentUpdated(
            agentId,
            msg.sender,
            treasury,
            name,
            category,
            description,
            initUsername,
            agent.active,
            agent.updatedAt
        );
    }

    function activateAgent(uint256 agentId) external {
        Agent storage agent = _getAgentStorage(agentId);
        _requireAgentOwner(agentId, agent.owner, msg.sender);

        if (agent.active) {
            revert AgentAlreadyActive(agentId);
        }

        agent.active = true;
        agent.updatedAt = uint64(block.timestamp);

        emit AgentStatusChanged(agentId, msg.sender, true, agent.updatedAt);
    }

    function deactivateAgent(uint256 agentId) external {
        Agent storage agent = _getAgentStorage(agentId);
        _requireAgentOwner(agentId, agent.owner, msg.sender);

        if (!agent.active) {
            revert AgentAlreadyInactive(agentId);
        }

        agent.active = false;
        agent.updatedAt = uint64(block.timestamp);

        emit AgentStatusChanged(agentId, msg.sender, false, agent.updatedAt);
    }

    /// @notice Adds a new service under an existing agent.
    function createService(
        uint256 agentId,
        string calldata title,
        string calldata description,
        uint256 price
    ) external returns (uint256 serviceId) {
        serviceId = _createService(
            agentId,
            title,
            description,
            price,
            IAgentRegistry.ServiceType.OneTime,
            IAgentRegistry.BillingInterval.None,
            0
        );
    }

    /// @notice Adds a recurring subscription service under an existing agent.
    function createSubscriptionService(
        uint256 agentId,
        string calldata title,
        string calldata description,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice
    ) external returns (uint256 serviceId) {
        serviceId = _createService(
            agentId,
            title,
            description,
            0,
            IAgentRegistry.ServiceType.Subscription,
            billingInterval,
            recurringPrice
        );
    }

    /// @notice Updates a service listing owned by the agent owner.
    function updateService(
        uint256 serviceId,
        string calldata title,
        string calldata description,
        uint256 price
    ) external {
        _updateService(
            serviceId,
            title,
            description,
            price,
            IAgentRegistry.ServiceType.OneTime,
            IAgentRegistry.BillingInterval.None,
            0
        );
    }

    /// @notice Updates a subscription service owned by the agent owner.
    function updateSubscriptionService(
        uint256 serviceId,
        string calldata title,
        string calldata description,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice
    ) external {
        _updateService(
            serviceId,
            title,
            description,
            0,
            IAgentRegistry.ServiceType.Subscription,
            billingInterval,
            recurringPrice
        );
    }

    function activateService(uint256 serviceId) external {
        Service storage service = _getServiceStorage(serviceId);
        Agent storage agent = _getAgentStorage(service.agentId);
        _requireAgentOwner(service.agentId, agent.owner, msg.sender);

        if (service.active) {
            revert ServiceAlreadyActive(serviceId);
        }

        service.active = true;
        service.updatedAt = uint64(block.timestamp);

        emit ServiceStatusChanged(serviceId, service.agentId, msg.sender, true, service.updatedAt);
    }

    function deactivateService(uint256 serviceId) external {
        Service storage service = _getServiceStorage(serviceId);
        Agent storage agent = _getAgentStorage(service.agentId);
        _requireAgentOwner(service.agentId, agent.owner, msg.sender);

        if (!service.active) {
            revert ServiceAlreadyInactive(serviceId);
        }

        service.active = false;
        service.updatedAt = uint64(block.timestamp);

        emit ServiceStatusChanged(serviceId, service.agentId, msg.sender, false, service.updatedAt);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return _getAgent(agentId);
    }

    function getOwnerAgentIds(address owner) external view returns (uint256[] memory) {
        return _ownerAgentIds[owner];
    }

    function getService(uint256 serviceId) external view returns (Service memory) {
        return _getService(serviceId);
    }

    function getAgentServiceIds(uint256 agentId) external view returns (uint256[] memory) {
        _requireAgentExists(agentId);
        return _agentServiceIds[agentId];
    }

    function getAgentSettlementDetails(
        uint256 agentId
    ) external view override returns (address owner, address treasury, bool active) {
        Agent memory agent = _getAgent(agentId);
        return (agent.owner, agent.treasury, agent.active);
    }

    function getServiceSettlementDetails(
        uint256 serviceId
    )
        external
        view
        override
        returns (
            uint256 agentId,
            uint256 price,
            bool active,
            IAgentRegistry.ServiceType serviceType,
            IAgentRegistry.BillingInterval billingInterval,
            uint256 recurringPrice
        )
    {
        Service memory service = _getService(serviceId);
        return (
            service.agentId,
            service.price,
            service.active,
            service.serviceType,
            service.billingInterval,
            service.recurringPrice
        );
    }

    function _createService(
        uint256 agentId,
        string calldata title,
        string calldata description,
        uint256 price,
        IAgentRegistry.ServiceType serviceType,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice
    ) internal returns (uint256 serviceId) {
        Agent storage agent = _getAgentStorage(agentId);
        _requireAgentOwner(agentId, agent.owner, msg.sender);
        _requireNonEmpty(title, "title");
        _requireNonEmpty(description, "description");
        _validateBilling(serviceType, price, billingInterval, recurringPrice);

        serviceId = nextServiceId;
        nextServiceId = serviceId + 1;

        uint64 timestamp = uint64(block.timestamp);

        _services[serviceId] = Service({
            serviceId: serviceId,
            agentId: agentId,
            title: title,
            description: description,
            price: price,
            serviceType: serviceType,
            billingInterval: billingInterval,
            recurringPrice: recurringPrice,
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        _agentServiceIds[agentId].push(serviceId);

        emit ServiceCreated(
            serviceId,
            agentId,
            msg.sender,
            title,
            description,
            price,
            serviceType,
            billingInterval,
            recurringPrice,
            true,
            timestamp,
            timestamp
        );
    }

    function _updateService(
        uint256 serviceId,
        string calldata title,
        string calldata description,
        uint256 price,
        IAgentRegistry.ServiceType expectedType,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice
    ) internal {
        Service storage service = _getServiceStorage(serviceId);
        Agent storage agent = _getAgentStorage(service.agentId);
        _requireAgentOwner(service.agentId, agent.owner, msg.sender);
        _requireServiceType(serviceId, expectedType, service.serviceType);
        _requireNonEmpty(title, "title");
        _requireNonEmpty(description, "description");
        _validateBilling(expectedType, price, billingInterval, recurringPrice);

        service.title = title;
        service.description = description;
        service.price = price;
        service.billingInterval = billingInterval;
        service.recurringPrice = recurringPrice;
        service.updatedAt = uint64(block.timestamp);

        emit ServiceUpdated(
            serviceId,
            service.agentId,
            msg.sender,
            title,
            description,
            price,
            service.serviceType,
            service.billingInterval,
            service.recurringPrice,
            service.active,
            service.updatedAt
        );
    }

    function _getAgentStorage(uint256 agentId) internal view returns (Agent storage agent) {
        agent = _agents[agentId];
        if (agent.agentId == 0) {
            revert AgentNotFound(agentId);
        }
    }

    function _getServiceStorage(
        uint256 serviceId
    ) internal view returns (Service storage service) {
        service = _services[serviceId];
        if (service.serviceId == 0) {
            revert ServiceNotFound(serviceId);
        }
    }

    function _getAgent(uint256 agentId) internal view returns (Agent memory agent) {
        agent = _agents[agentId];
        if (agent.agentId == 0) {
            revert AgentNotFound(agentId);
        }
    }

    function _getService(uint256 serviceId) internal view returns (Service memory service) {
        service = _services[serviceId];
        if (service.serviceId == 0) {
            revert ServiceNotFound(serviceId);
        }
    }

    function _requireAgentExists(uint256 agentId) internal view {
        if (_agents[agentId].agentId == 0) {
            revert AgentNotFound(agentId);
        }
    }

    function _requireAgentOwner(uint256 agentId, address owner, address caller) internal pure {
        if (owner != caller) {
            revert NotAgentOwner(agentId, caller);
        }
    }

    function _requireNonZeroAddress(address value, string memory field) internal pure {
        if (value == address(0)) {
            revert InvalidAddress(field);
        }
    }

    function _requireNonEmpty(string calldata value, string memory field) internal pure {
        if (bytes(value).length == 0) {
            revert InvalidString(field);
        }
    }

    function _requirePositivePrice(uint256 price) internal pure {
        if (price == 0) {
            revert InvalidPrice();
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

    function _validateBilling(
        IAgentRegistry.ServiceType serviceType,
        uint256 price,
        IAgentRegistry.BillingInterval billingInterval,
        uint256 recurringPrice
    ) internal pure {
        if (serviceType == IAgentRegistry.ServiceType.OneTime) {
            _requirePositivePrice(price);

            if (billingInterval != IAgentRegistry.BillingInterval.None) {
                revert InvalidBillingInterval();
            }
            if (recurringPrice != 0) {
                revert InvalidRecurringPrice();
            }

            return;
        }

        if (price != 0) {
            revert InvalidPrice();
        }
        if (billingInterval == IAgentRegistry.BillingInterval.None) {
            revert InvalidBillingInterval();
        }
        if (recurringPrice == 0) {
            revert InvalidRecurringPrice();
        }
    }
}
