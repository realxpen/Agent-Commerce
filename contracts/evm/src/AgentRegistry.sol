// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        uint256 id;
        address owner;
        string name;
        string category;
        string description;
        address treasury;
        bool active;
        string initUsername;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Service {
        uint256 id;
        uint256 agentId;
        string title;
        string description;
        uint256 price;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public nextAgentId = 1;
    uint256 public nextServiceId = 1;

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Service) public services;
    mapping(address => uint256[]) private ownerToAgentIds;
    mapping(uint256 => uint256[]) private agentToServiceIds;

    event AgentCreated(uint256 indexed agentId, address indexed owner, address treasury, string name);
    event AgentUpdated(uint256 indexed agentId);
    event AgentStatusChanged(uint256 indexed agentId, bool active);

    event ServiceCreated(uint256 indexed serviceId, uint256 indexed agentId, uint256 price, string title);
    event ServiceUpdated(uint256 indexed serviceId);
    event ServiceStatusChanged(uint256 indexed serviceId, bool active);

    modifier onlyAgentOwner(uint256 agentId) {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }

    function createAgent(
        string calldata name,
        string calldata category,
        string calldata description,
        address treasury,
        string calldata initUsername
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(treasury != address(0), "Invalid treasury");

        uint256 agentId = nextAgentId++;

        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            name: name,
            category: category,
            description: description,
            treasury: treasury,
            active: true,
            initUsername: initUsername,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        ownerToAgentIds[msg.sender].push(agentId);

        emit AgentCreated(agentId, msg.sender, treasury, name);
        return agentId;
    }

    function updateAgent(
        uint256 agentId,
        string calldata name,
        string calldata category,
        string calldata description,
        address treasury,
        string calldata initUsername
    ) external onlyAgentOwner(agentId) {
        require(bytes(name).length > 0, "Name required");
        require(treasury != address(0), "Invalid treasury");

        Agent storage a = agents[agentId];
        a.name = name;
        a.category = category;
        a.description = description;
        a.treasury = treasury;
        a.initUsername = initUsername;
        a.updatedAt = block.timestamp;

        emit AgentUpdated(agentId);
    }

    function setAgentStatus(uint256 agentId, bool active) external onlyAgentOwner(agentId) {
        agents[agentId].active = active;
        agents[agentId].updatedAt = block.timestamp;
        emit AgentStatusChanged(agentId, active);
    }

    function createService(
        uint256 agentId,
        string calldata title,
        string calldata description,
        uint256 price
    ) external onlyAgentOwner(agentId) returns (uint256) {
        require(agents[agentId].active, "Agent inactive");
        require(bytes(title).length > 0, "Title required");
        require(price > 0, "Price required");

        uint256 serviceId = nextServiceId++;

        services[serviceId] = Service({
            id: serviceId,
            agentId: agentId,
            title: title,
            description: description,
            price: price,
            active: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        agentToServiceIds[agentId].push(serviceId);

        emit ServiceCreated(serviceId, agentId, price, title);
        return serviceId;
    }

    function updateService(
        uint256 serviceId,
        string calldata title,
        string calldata description,
        uint256 price
    ) external {
        Service storage s = services[serviceId];
        require(s.id != 0, "Service not found");
        require(agents[s.agentId].owner == msg.sender, "Not agent owner");
        require(bytes(title).length > 0, "Title required");
        require(price > 0, "Price required");

        s.title = title;
        s.description = description;
        s.price = price;
        s.updatedAt = block.timestamp;

        emit ServiceUpdated(serviceId);
    }

    function setServiceStatus(uint256 serviceId, bool active) external {
        Service storage s = services[serviceId];
        require(s.id != 0, "Service not found");
        require(agents[s.agentId].owner == msg.sender, "Not agent owner");

        s.active = active;
        s.updatedAt = block.timestamp;

        emit ServiceStatusChanged(serviceId, active);
    }

    function getOwnerAgentIds(address owner) external view returns (uint256[] memory) {
        return ownerToAgentIds[owner];
    }

    function getAgentServiceIds(uint256 agentId) external view returns (uint256[] memory) {
        return agentToServiceIds[agentId];
    }

    function getAgentTreasury(uint256 agentId) external view returns (address) {
        return agents[agentId].treasury;
    }

    function isAgentActive(uint256 agentId) external view returns (bool) {
        return agents[agentId].active;
    }

    function getService(uint256 serviceId) external view returns (Service memory) {
        return services[serviceId];
    }

    function getAgentOwner(uint256 agentId) external view returns (address) {
        return agents[agentId].owner;
    }
}
