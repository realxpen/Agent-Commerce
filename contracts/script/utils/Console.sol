// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal console logger compatible with Foundry/Hardhat script output.
library Console {
    address internal constant CONSOLE_ADDRESS = 0x000000000000000000636F6e736F6c652e6c6f67;

    function log(string memory message) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string)", message));
    }

    function log(string memory message, address value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address)", message, value));
    }

    function log(string memory message, string memory value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string)", message, value));
    }

    function log(string memory message, uint256 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256)", message, value));
    }

    function _sendLogPayload(bytes memory payload) private view {
        address consoleAddress = CONSOLE_ADDRESS;
        assembly {
            pop(staticcall(gas(), consoleAddress, add(payload, 0x20), mload(payload), 0, 0))
        }
    }
}
