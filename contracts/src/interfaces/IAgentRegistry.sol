// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    enum ServiceType {
        OneTime,
        Subscription
    }

    enum BillingInterval {
        None,
        Daily,
        Weekly,
        Monthly,
        Yearly
    }

    function getAgentSettlementDetails(
        uint256 agentId
    ) external view returns (address owner, address treasury, bool active);

    function getServiceSettlementDetails(
        uint256 serviceId
    )
        external
        view
        returns (
            uint256 agentId,
            uint256 price,
            bool active,
            ServiceType serviceType,
            BillingInterval billingInterval,
            uint256 recurringPrice
        );
}
