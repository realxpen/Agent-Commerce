// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Minimal Ownable
/// @notice Lightweight ownership helper for hackathon-friendly admin controls.
abstract contract Ownable {
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }

        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
