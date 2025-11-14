// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

// Import the VRF types
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @dev Mock VRF Coordinator for testing VRF V2Plus
 */
contract MockVRFCoordinator {
    uint256 private s_requestCounter;
    mapping(uint256 => address) private s_requestToSender;
    
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint256 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );
    
    // VRF V2Plus function signature
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest memory req
    ) external returns (uint256 requestId) {
        s_requestCounter++;
        requestId = s_requestCounter;
        s_requestToSender[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            req.keyHash,
            requestId,
            block.timestamp,
            req.subId,
            req.requestConfirmations,
            req.callbackGasLimit,
            req.numWords,
            msg.sender
        );
        
        return requestId;
    }
    
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address consumer = s_requestToSender[requestId];
        require(consumer != address(0), "Request not found");
        
        (bool success, ) = consumer.call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords)
        );
        require(success, "Callback failed");
        
        delete s_requestToSender[requestId];
    }
    
    function getRequestSender(uint256 requestId) external view returns (address) {
        return s_requestToSender[requestId];
    }
}

/**
 * @dev Mock Functions Router for testing
 */
contract MockFunctionsRouter {
    uint256 private s_requestCounter;
    mapping(bytes32 => address) private s_requestToSender;
    
    event RequestSent(bytes32 indexed requestId, address indexed requestingContract);
    
    function sendRequest(
        uint64, // subscriptionId
        bytes calldata, // data
        uint16, // dataVersion
        uint32, // callbackGasLimit
        bytes32 // donId
    ) external returns (bytes32 requestId) {
        s_requestCounter++;
        requestId = keccak256(abi.encodePacked(s_requestCounter, msg.sender, block.timestamp));
        s_requestToSender[requestId] = msg.sender;
        
        emit RequestSent(requestId, msg.sender);
        return requestId;
    }
    
    function fulfillRequest(
        address consumer,
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        (bool success, ) = consumer.call(
            abi.encodeWithSignature("handleOracleFulfillment(bytes32,bytes,bytes)", requestId, response, err)
        );
        require(success, "Callback failed");
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        address consumer = s_requestToSender[requestId];
        require(consumer != address(0), "Request not found");
        
        (bool success, ) = consumer.call(
            abi.encodeWithSignature("handleOracleFulfillment(bytes32,bytes,bytes)", requestId, response, err)
        );
        require(success, "Callback failed");
        
        delete s_requestToSender[requestId];
    }

    function fulfillRequestWithInvalidLength(
        address consumer,
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        // Direct call to test the response length validation
        (bool success, ) = consumer.call(
            abi.encodeWithSignature("handleOracleFulfillment(bytes32,bytes,bytes)", requestId, response, err)
        );
        require(success, "Callback failed");
    }
    
    function getRequestSender(bytes32 requestId) external view returns (address) {
        return s_requestToSender[requestId];
    }
}

/**
 * @dev Mock LINK Token for testing
 */
contract MockLinkToken {
    mapping(address => uint256) private s_balances;
    string public constant name = "ChainLink Token";
    string public constant symbol = "LINK";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    constructor() {
        totalSupply = 1000000 * 10**decimals;
        s_balances[msg.sender] = totalSupply;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return s_balances[account];
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(s_balances[msg.sender] >= amount, "Insufficient balance");
        s_balances[msg.sender] -= amount;
        s_balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        s_balances[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}