// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface Vm {
    function prank(address caller) external;
    function startPrank(address caller) external;
    function stopPrank() external;
    function deal(address who, uint256 newBalance) external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
}

/// @notice Tiny assertion and cheatcode harness to keep the project dependency-free.
contract TestBase {
    address internal constant VM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));
    Vm internal constant vm = Vm(VM_ADDRESS);

    function assertTrue(bool condition, string memory message) internal pure {
        require(condition, message);
    }

    function assertFalse(bool condition, string memory message) internal pure {
        require(!condition, message);
    }

    function assertEq(uint256 actual, uint256 expected, string memory message) internal pure {
        require(actual == expected, message);
    }

    function assertEq(address actual, address expected, string memory message) internal pure {
        require(actual == expected, message);
    }

    function assertEq(bool actual, bool expected, string memory message) internal pure {
        require(actual == expected, message);
    }

    function assertEq(string memory actual, string memory expected, string memory message) internal pure {
        require(keccak256(bytes(actual)) == keccak256(bytes(expected)), message);
    }
}
