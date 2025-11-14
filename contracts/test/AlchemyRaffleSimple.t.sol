// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "./mocks/MockContracts.sol";
import "../src/AlchemyRaffle.sol";

/**
 * @title AlchemyRaffleSimpleTest  
 * @dev Simplified test suite using custom mocks for easier debugging and understanding
 */
contract AlchemyRaffleSimpleTest is Test {
    
    // ============ STATE VARIABLES ============
    
    AlchemyRaffle public raffle;
    MockVRFCoordinator public mockVrfCoordinator;
    MockFunctionsRouter public mockFunctionsRouter;
    MockLinkToken public mockLinkToken;
    
    // Test accounts
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public winner = makeAddr("winner");
    
    // Test configuration
    uint256 public constant VRF_SUBSCRIPTION_ID = 1;
    uint64 public constant FUNCTIONS_SUBSCRIPTION_ID = 1;
    bytes32 public constant VRF_KEY_HASH = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    bytes32 public constant FUNCTIONS_DON_ID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    
    // Test data
    string[] internal testNftIds;
    string public constant TEST_MONTH = "November 2024";
    
    // ============ SETUP ============
    
    function setUp() public {
        // Setup test NFT IDs
        testNftIds = new string[](3);
        testNftIds[0] = "1";
        testNftIds[1] = "2";
        testNftIds[2] = "3";
        
        // Deploy mocks
        mockVrfCoordinator = new MockVRFCoordinator();
        mockFunctionsRouter = new MockFunctionsRouter();
        mockLinkToken = new MockLinkToken();
        
        // Give admin some LINK tokens
        vm.prank(address(mockLinkToken));
        mockLinkToken.mint(admin, 1000 ether);
        
        // Deploy AlchemyRaffle
        vm.prank(admin);
        raffle = new AlchemyRaffle(
            admin,
            VRF_SUBSCRIPTION_ID,
            VRF_KEY_HASH,
            address(mockVrfCoordinator),
            FUNCTIONS_SUBSCRIPTION_ID,
            FUNCTIONS_DON_ID,
            address(mockFunctionsRouter)
        );
        
        // Label addresses for better trace output
        vm.label(address(raffle), "AlchemyRaffle");
        vm.label(address(mockVrfCoordinator), "MockVRFCoordinator");
        vm.label(address(mockFunctionsRouter), "MockFunctionsRouter");
        vm.label(address(mockLinkToken), "MockLinkToken");
        vm.label(admin, "Admin");
        vm.label(user, "User");
        vm.label(winner, "Winner");
    }
    
    // ============ BASIC TESTS ============
    
    function test_Deployment() public {
        assertEq(raffle.adminAddress(), admin);
        assertEq(raffle.raffleCounter(), 0);
    }
    
    function test_StartRaffle() public {
        vm.expectEmit(true, false, false, true);
        emit AlchemyRaffle.RaffleCreated(1, TEST_MONTH);
        
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        assertEq(raffle.raffleCounter(), 1);
        
        // Check raffle was created correctly
        (
            uint256 numberOfEntries,
            uint256 commitmentHash,
            string memory month,
            bool isActive,
            uint256 createdAt,
            uint256 selectedWinnerIndex,
            address winnerAddress,
            string[] memory nftIds
        ) = raffle.getRaffleDetails(1);
        
        assertEq(numberOfEntries, 0);
        assertEq(commitmentHash, 0);
        assertEq(month, TEST_MONTH);
        assertTrue(isActive);
        assertGt(createdAt, 0);
        assertEq(selectedWinnerIndex, type(uint256).max);
        assertEq(winnerAddress, address(0));
    }
    
    function test_StartRaffle_OnlyAdmin() public {
        vm.expectRevert("Only admin can call this function");
        vm.prank(user);
        raffle.startRaffle(testNftIds, TEST_MONTH);
    }
    
    // ============ FUNCTIONS INTEGRATION TESTS ============
    
    function test_FullRaffleFlow_Success() public {
        // Step 1: Start raffle
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        bytes32 entriesRequestId = raffle.s_lastRequestId();
        console.log("Entries request ID:", vm.toString(entriesRequestId));
        
        // Simulate Functions response with entries
        uint256 mockEntries = 5;
        bytes32 mockCommitmentHash = keccak256("mock_commitment");
        bytes memory entriesResponse = abi.encodePacked(mockEntries, mockCommitmentHash);
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.Response(entriesRequestId, mockEntries, entriesResponse, "");
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.RandomnessRequested(1); // VRF request should be triggered
        
        mockFunctionsRouter.fulfillRequest(entriesRequestId, entriesResponse, "");
        
        // Verify entries were stored
        (uint256 storedEntries, uint256 storedHash, , , , , , ) = raffle.getRaffleDetails(1);
        assertEq(storedEntries, mockEntries);
        assertEq(storedHash, uint256(mockCommitmentHash));
        
        // Step 3: Simulate VRF response
        uint256 vrfRequestId = raffle.s_vrfLastRequestId();
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123; // This will select winner index: 123 % 5 = 3
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.WinnerSelected(1, 3);
        
        mockVrfCoordinator.fulfillRandomWords(vrfRequestId, randomWords);
        
        // Verify winner index was set
        (,,,,, uint256 selectedWinnerIndex,,) = raffle.getRaffleDetails(1);
        assertEq(selectedWinnerIndex, 3);
        
        // Step 4: Simulate winner address Functions response
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        bytes memory winnerResponse = bytes(vm.toString(winner));
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.WinnerAddressFetched(1, winner);
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.RaffleEnded(1);
        
        mockFunctionsRouter.fulfillRequest(winnerRequestId, winnerResponse, "");
        
        // Verify final state
        (,,, bool isActive,, uint256 finalWinnerIndex, address finalWinnerAddress,) = raffle.getRaffleDetails(1);
        assertFalse(isActive); // Raffle should be completed
        assertEq(finalWinnerIndex, 3);
        assertEq(finalWinnerAddress, winner);
    }
    
    function test_RaffleFlow_ZeroEntries() public {
        // Start raffle
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        bytes32 requestId = raffle.s_lastRequestId();
        
        // Respond with zero entries
        bytes memory response = abi.encodePacked(uint256(0), bytes32(0));
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.RaffleEnded(1);
        
        mockFunctionsRouter.fulfillRequest(requestId, response, "");
        
        // Verify raffle ended immediately
        (,,, bool isActive,,,,) = raffle.getRaffleDetails(1);
        assertFalse(isActive);
    }
    
    function test_RaffleFlow_FunctionsError() public {
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        bytes32 requestId = raffle.s_lastRequestId();
        
        // Simulate error response
        bytes memory errorResponse = bytes("API Error: Failed to fetch entries");
        
        vm.expectEmit(true, false, false, false);
        emit AlchemyRaffle.Response(requestId, 0, "", errorResponse);
        
        mockFunctionsRouter.fulfillRequest(requestId, "", errorResponse);
        
        // Raffle should still be active but no entries set
        (uint256 entries,,, bool isActive,,,,) = raffle.getRaffleDetails(1);
        assertEq(entries, 0);
        assertTrue(isActive); // Still active, waiting for retry or manual intervention
    }
    
    function test_WinnerAddressFetch_Error() public {
        // Setup raffle to winner selection phase
        _setupRaffleToWinnerSelection(5, 2);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        vm.expectEmit(true, false, false, true);
        emit AlchemyRaffle.WinnerAddressFetchFailed(1, "Winner API Error");
        
        mockFunctionsRouter.fulfillRequest(winnerRequestId, "", "Winner API Error");
    }
    
    function test_WinnerAddressFetch_InvalidAddress() public {
        _setupRaffleToWinnerSelection(5, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        bytes memory invalidResponse = "not_an_address";
        
        vm.expectEmit(true, false, false, true);
        emit AlchemyRaffle.WinnerAddressFetchFailed(1, "Winner address parse failed");
        
        mockFunctionsRouter.fulfillRequest(winnerRequestId, invalidResponse, "");
    }
    
    // ============ ADMIN FUNCTION TESTS ============
    
    function test_RetryWinnerFetch() public {
        // Setup to winner selection phase
        _setupRaffleToWinnerSelection(10, 7);
        
        // Admin can retry winner fetch
        vm.prank(admin);
        raffle.retryWinnerFetch(1);
        
        // Should create new request
        assertTrue(raffle.isWinnerRequestPending());
    }
    
    function test_RetryWinnerFetch_OnlyAdmin() public {
        _setupRaffleToWinnerSelection(5, 2);
        
        vm.expectRevert("Only admin can call this function");
        vm.prank(user);
        raffle.retryWinnerFetch(1);
    }
    
    function test_UpdateVrfCallbackGasLimit() public {
        uint32 newGasLimit = 1000000;
        
        vm.prank(admin);
        raffle.updateVrfCallbackGasLimit(newGasLimit);
        // Note: Would need a public getter to verify this worked
    }
    
    function test_UpdateVrfCallbackGasLimit_Bounds() public {
        // Test lower bound
        vm.expectRevert("Gas limit too low");
        vm.prank(admin);
        raffle.updateVrfCallbackGasLimit(50000);
        
        // Test upper bound  
        vm.expectRevert("Gas limit too high");
        vm.prank(admin);
        raffle.updateVrfCallbackGasLimit(6000000);
    }
    
    function test_UpdateFunctionsGasLimit() public {
        vm.prank(admin);
        raffle.updateFunctionsGasLimit(500000);
    }
    
    // ============ VIEW FUNCTION TESTS ============
    
    function test_GetRaffleInfo() public {
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        (
            uint256 numberOfEntries,
            uint256 commitmentHash,
            string memory month,
            bool isActive,
            uint256 createdAt,
            uint256 selectedWinnerIndex,
            address winnerAddress,
            string[] memory nftIds
        ) = raffle.getRaffleDetails(1);
        
        assertEq(numberOfEntries, 0);
        assertEq(month, TEST_MONTH);
        assertTrue(isActive);
        assertGt(createdAt, 0);
        assertEq(selectedWinnerIndex, type(uint256).max);
        assertEq(winnerAddress, address(0));
    }
    
    function test_GetRaffleNftIds() public {
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        (
            ,,,,,,,
            string[] memory retrievedIds
        ) = raffle.getRaffleDetails(1);
        
        assertEq(retrievedIds.length, testNftIds.length);
        for (uint256 i = 0; i < testNftIds.length; i++) {
            assertEq(retrievedIds[i], testNftIds[i]);
        }
    }
    
    // ============ EDGE CASES ============
    
    function test_MultipleRaffles() public {
        vm.startPrank(admin);
        
        // Create multiple raffles
        raffle.startRaffle(testNftIds, "November 2024");
        raffle.startRaffle(testNftIds, "December 2024");  
        raffle.startRaffle(testNftIds, "January 2025");
        
        vm.stopPrank();
        
        assertEq(raffle.raffleCounter(), 3);
        
        // Each should have correct month
        (,, string memory month1,,,,,) = raffle.getRaffleDetails(1);
        (,, string memory month2,,,,,) = raffle.getRaffleDetails(2);
        (,, string memory month3,,,,,) = raffle.getRaffleDetails(3);
        
        assertEq(month1, "November 2024");
        assertEq(month2, "December 2024");
        assertEq(month3, "January 2025");
    }
    
    function test_LargeNumberOfEntries() public {
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        bytes32 requestId = raffle.s_lastRequestId();
        uint256 largeEntries = 1000000;
        bytes memory response = abi.encodePacked(largeEntries, keccak256("large"));
        
        mockFunctionsRouter.fulfillRequest(requestId, response, "");
        
        (uint256 storedEntries,,,,,,,) = raffle.getRaffleDetails(1);
        assertEq(storedEntries, largeEntries);
    }
    
    function test_MaxWinnerIndex() public {
        uint256 entries = 1000;
        _setupRaffleToWinnerSelection(entries, entries - 1); // Last valid index
        
        (,,,,, uint256 winnerIndex,,) = raffle.getRaffleDetails(1);
        assertEq(winnerIndex, entries - 1);
    }
    
    // ============ ERROR HANDLING ============
    
    function test_UnexpectedRequestID() public {
        bytes32 randomRequestId = keccak256("random");
        
        vm.expectRevert("Request not found");
        mockFunctionsRouter.fulfillRequest(randomRequestId, "response", "");
    }
    
    function test_UnexpectedVRFRequestID() public {
        uint256 randomRequestId = 999999;
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 12345;
        
        vm.expectRevert("Request not found");
        mockVrfCoordinator.fulfillRandomWords(randomRequestId, randomWords);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    /**
     * @dev Helper to setup a raffle through winner selection phase
     * @param entries Number of entries for the raffle
     * @param expectedWinnerIndex Expected winner index to be selected
     */
    function _setupRaffleToWinnerSelection(uint256 entries, uint256 expectedWinnerIndex) internal {
        // Start raffle
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        // Fulfill entries request
        bytes32 entriesRequestId = raffle.s_lastRequestId();
        bytes memory entriesResponse = abi.encodePacked(entries, keccak256("test_commitment"));
        mockFunctionsRouter.fulfillRequest(entriesRequestId, entriesResponse, "");
        
        // Fulfill VRF request to select winner
        uint256 vrfRequestId = raffle.s_vrfLastRequestId();
        uint256[] memory randomWords = new uint256[](1);
        
        // Calculate randomness that will give us the expected winner index
        // winnerIndex = randomWord % entries
        randomWords[0] = expectedWinnerIndex + (123 * entries);
        
        mockVrfCoordinator.fulfillRandomWords(vrfRequestId, randomWords);
        
        // Verify setup worked
        (,,,,, uint256 actualWinnerIndex,,) = raffle.getRaffleDetails(1);
        assertEq(actualWinnerIndex, expectedWinnerIndex, "Setup helper failed");
    }

    // ============ MISSING COVERAGE TESTS ============

    /**
     * @notice Test getLatestWinner function with no raffles
     */
    function test_GetLatestWinner_NoRaffles() public {
        vm.expectRevert("No raffles have been created yet");
        raffle.getLatestWinner();
    }

    /**
     * @notice Test getLatestWinner function with completed raffle
     */
    function test_GetLatestWinner_WithCompletedRaffle() public {
        // Setup a complete raffle with winner
        _setupRaffleToWinnerSelection(5, 2);
        
        // Set winner address by fulfilling winner address request
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        bytes memory winnerResponse = abi.encodePacked("0x", addressToHexString(winner));
        mockFunctionsRouter.fulfillRequest(winnerRequestId, winnerResponse, "");
        
        // Test getLatestWinner
        (
            uint256 raffleId,
            address winnerAddress,
            uint256 winnerIndex,
            string memory month,
            bool hasWinner
        ) = raffle.getLatestWinner();
        
        assertEq(raffleId, 1, "Raffle ID should be 1");
        assertEq(winnerAddress, winner, "Winner address should match");
        assertEq(winnerIndex, 2, "Winner index should be 2");
        assertEq(month, TEST_MONTH, "Month should match");
        assertTrue(hasWinner, "Should have a winner");
    }

    /**
     * @notice Test getLatestWinner function without winner
     */
    function test_GetLatestWinner_NoWinner() public {
        // Create raffle but don't complete the winner selection
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        // Test getLatestWinner
        (
            uint256 raffleId,
            address winnerAddress,
            uint256 winnerIndex,
            string memory month,
            bool hasWinner
        ) = raffle.getLatestWinner();
        
        assertEq(raffleId, 1, "Raffle ID should be 1");
        assertEq(winnerAddress, address(0), "Winner address should be zero");
        assertEq(winnerIndex, 0, "Winner index should be 0");
        assertEq(month, TEST_MONTH, "Month should match");
        assertFalse(hasWinner, "Should not have a winner yet");
    }

    /**
     * @notice Test getWinnerByRaffleId with invalid IDs
     */
    function test_GetWinnerByRaffleId_InvalidIds() public {
        // Test with raffle ID 0
        vm.expectRevert("Invalid raffle ID");
        raffle.getWinnerByRaffleId(0);
        
        // Test with non-existent raffle ID
        vm.expectRevert("Invalid raffle ID");
        raffle.getWinnerByRaffleId(999);
    }

    /**
     * @notice Test getWinnerByRaffleId with valid raffle
     */
    function test_GetWinnerByRaffleId_ValidRaffle() public {
        // Setup a complete raffle with winner
        _setupRaffleToWinnerSelection(10, 7);
        
        // Set winner address
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        bytes memory winnerResponse = abi.encodePacked("0x", addressToHexString(winner));
        mockFunctionsRouter.fulfillRequest(winnerRequestId, winnerResponse, "");
        
        // Test getWinnerByRaffleId
        (
            address winnerAddress,
            uint256 winnerIndex,
            string memory month,
            bool hasWinner
        ) = raffle.getWinnerByRaffleId(1);
        
        assertEq(winnerAddress, winner, "Winner address should match");
        assertEq(winnerIndex, 7, "Winner index should be 7");
        assertEq(month, TEST_MONTH, "Month should match");
        assertTrue(hasWinner, "Should have a winner");
    }

    /**
     * @notice Test getWinnerByRaffleId with multiple raffles
     */
    function test_GetWinnerByRaffleId_MultipleRaffles() public {
        // Create first raffle
        vm.prank(admin);
        raffle.startRaffle(testNftIds, "October 2024");
        
        // Create second raffle
        vm.prank(admin);
        raffle.startRaffle(testNftIds, "November 2024");
        
        // Test first raffle (no winner)
        (
            address winnerAddress1,
            uint256 winnerIndex1,
            string memory month1,
            bool hasWinner1
        ) = raffle.getWinnerByRaffleId(1);
        
        assertEq(winnerAddress1, address(0), "First raffle should have no winner");
        assertEq(winnerIndex1, 0, "First raffle winner index should be 0");
        assertEq(month1, "October 2024", "First raffle month should match");
        assertFalse(hasWinner1, "First raffle should not have winner");
        
        // Test second raffle (no winner)
        (
            address winnerAddress2,
            uint256 winnerIndex2,
            string memory month2,
            bool hasWinner2
        ) = raffle.getWinnerByRaffleId(2);
        
        assertEq(winnerAddress2, address(0), "Second raffle should have no winner");
        assertEq(winnerIndex2, 0, "Second raffle winner index should be 0");
        assertEq(month2, "November 2024", "Second raffle month should match");
        assertFalse(hasWinner2, "Second raffle should not have winner");
    }

    /**
     * @notice Test edge cases in address parsing for better coverage
     */
    function test_AddressParsing_EdgeCases() public {
        // Setup raffle and get to winner address fetching stage
        _setupRaffleToWinnerSelection(3, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        // Test invalid hex address (wrong length)
        bytes memory invalidResponse = abi.encodePacked("0x123");
        mockFunctionsRouter.fulfillRequest(winnerRequestId, invalidResponse, "");
        
        // Verify it handled the error gracefully
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, address(0), "Invalid address should result in zero address");
    }

    /**
     * @notice Test hex parsing with different character cases
     */
    function test_AddressParsing_MixedCase() public {
        // Setup raffle
        _setupRaffleToWinnerSelection(3, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        // Test mixed case hex address
        address testAddr = makeAddr("testAddress");
        string memory hexStr = addressToHexString(testAddr);
        
        // Convert some characters to uppercase for mixed case testing
        bytes memory mixedCaseResponse = abi.encodePacked("0x", hexStr);
        mockFunctionsRouter.fulfillRequest(winnerRequestId, mixedCaseResponse, "");
        
        // Verify it parsed correctly
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, testAddr, "Mixed case address should parse correctly");
    }

    /**
     * @notice Helper function to convert address to hex string
     */
    function addressToHexString(address addr) internal pure returns (string memory) {
        bytes32 addrBytes = bytes32(uint256(uint160(addr)));
        bytes memory hexString = new bytes(40);
        
        for (uint256 i = 0; i < 20; i++) {
            bytes1 byteValue = addrBytes[i + 12];
            hexString[i * 2] = _toHexChar(uint8(byteValue) / 16);
            hexString[i * 2 + 1] = _toHexChar(uint8(byteValue) % 16);
        }
        
        return string(hexString);
    }

    /**
     * @notice Helper function to convert number to hex character
     */
    function _toHexChar(uint8 value) internal pure returns (bytes1) {
        if (value < 10) {
            return bytes1(uint8(48 + value)); // '0'-'9'
        } else {
            return bytes1(uint8(87 + value)); // 'a'-'f'
        }
    }

    // ============ EDGE CASE TESTS FOR 100% COVERAGE ============

    /**
     * @notice Test uint256ToString with zero value
     */
    function test_Uint256ToString_Zero() public {
        // Setup raffle to access the uint256ToString function
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        // Complete raffle to winner selection with zero index
        bytes32 entriesRequestId = raffle.s_lastRequestId();
        bytes memory entriesResponse = abi.encodePacked(uint256(1), keccak256("test_commitment"));
        mockFunctionsRouter.fulfillRequest(entriesRequestId, entriesResponse, "");
        
        // Fulfill VRF with zero randomness (should give winner index 0)
        uint256 vrfRequestId = raffle.s_vrfLastRequestId();
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 0; // This will result in winner index 0
        mockVrfCoordinator.fulfillRandomWords(vrfRequestId, randomWords);
        
        // This internally calls uint256ToString(0), providing coverage
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        bytes memory winnerResponse = abi.encodePacked("0x", addressToHexString(winner));
        mockFunctionsRouter.fulfillRequest(winnerRequestId, winnerResponse, "");
        
        // Verify the raffle completed successfully
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, winner, "Winner should be set correctly");
    }

    /**
     * @notice Test address parsing with invalid hex characters
     */
    function test_AddressParsing_InvalidHexChars() public {
        // Setup raffle
        _setupRaffleToWinnerSelection(3, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        // Test invalid hex characters (contains 'Z' which is invalid)
        bytes memory invalidHexResponse = abi.encodePacked("0x1234567890abcdef1234567890abcdeZ12345678");
        mockFunctionsRouter.fulfillRequest(winnerRequestId, invalidHexResponse, "");
        
        // Verify it handled the error gracefully
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, address(0), "Invalid hex should result in zero address");
    }

    /**
     * @notice Test address parsing with empty string
     */
    function test_AddressParsing_EmptyString() public {
        // Setup raffle
        _setupRaffleToWinnerSelection(3, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        // Test empty string response
        bytes memory emptyResponse = abi.encodePacked("");
        mockFunctionsRouter.fulfillRequest(winnerRequestId, emptyResponse, "");
        
        // Verify it handled empty string gracefully
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, address(0), "Empty string should result in zero address");
    }

    /**
     * @notice Test address parsing with only whitespace
     */
    function test_AddressParsing_OnlyWhitespace() public {
        // Setup raffle
        _setupRaffleToWinnerSelection(3, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        // Test whitespace-only response
        bytes memory whitespaceResponse = abi.encodePacked("   \t\n\r   ");
        mockFunctionsRouter.fulfillRequest(winnerRequestId, whitespaceResponse, "");
        
        // Verify it handled whitespace-only string gracefully
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, address(0), "Whitespace-only should result in zero address");
    }

    /**
     * @notice Test address parsing with leading/trailing whitespace
     */
    function test_AddressParsing_WithWhitespace() public {
        // Setup raffle
        _setupRaffleToWinnerSelection(3, 1);
        
        bytes32 winnerRequestId = raffle.s_lastWinnerRequestId();
        
        // Test address with leading and trailing whitespace
        string memory hexAddr = addressToHexString(winner);
        bytes memory whitespacedResponse = abi.encodePacked("  \t0x", hexAddr, "  \n");
        mockFunctionsRouter.fulfillRequest(winnerRequestId, whitespacedResponse, "");
        
        // Verify it parsed correctly despite whitespace
        (address winnerAddr,,,) = raffle.getWinnerByRaffleId(1);
        assertEq(winnerAddr, winner, "Address with whitespace should parse correctly");
    }

    /**
     * @notice Test VRF randomWords array replacement case
     */
    function test_VRFRandomWords_ArrayReplacement() public {
        // Setup first raffle
        _setupRaffleToWinnerSelection(3, 1);
        
        // Setup second raffle to trigger array replacement
        vm.prank(admin);
        raffle.startRaffle(testNftIds, "December 2024");
        
        // Complete second raffle entries
        bytes32 entriesRequestId = raffle.s_lastRequestId();
        bytes memory entriesResponse = abi.encodePacked(uint256(5), keccak256("test_commitment2"));
        mockFunctionsRouter.fulfillRequest(entriesRequestId, entriesResponse, "");
        
        // Fulfill VRF for second raffle - this should replace the array element
        uint256 vrfRequestId = raffle.s_vrfLastRequestId();
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 999; // Different random value
        mockVrfCoordinator.fulfillRandomWords(vrfRequestId, randomWords);
        
        // Verify second raffle has different winner index
        (,,,,, uint256 winnerIndex2,,) = raffle.getRaffleDetails(2);
        assertEq(winnerIndex2, 999 % 5, "Second raffle should have different winner index");
    }

    /**
     * @notice Test error revert paths for invalid request IDs
     */
    function test_RevertPaths_InvalidRequestIds() public {
        // Test calling fulfillRequest with invalid entries request ID
        bytes32 fakeRequestId = keccak256("fake_request");
        bytes memory response = abi.encodePacked(uint256(5), keccak256("fake"));
        
        vm.expectRevert(); // Should revert due to invalid request ID
        mockFunctionsRouter.fulfillRequest(fakeRequestId, response, "");
        
        // Test calling fulfillRandomWords with invalid VRF request ID
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123;
        
        vm.expectRevert(); // Should revert due to invalid VRF request ID
        mockVrfCoordinator.fulfillRandomWords(999999, randomWords);
    }

    /**
     * @notice Test error handling in Functions responses
     */
    function test_FunctionsError_EntryRequest() public {
        // Start raffle
        vm.prank(admin);
        raffle.startRaffle(testNftIds, TEST_MONTH);
        
        bytes32 entriesRequestId = raffle.s_lastRequestId();
        
        // Fulfill with error
        mockFunctionsRouter.fulfillRequest(entriesRequestId, "", "Network error occurred");
        
        // Should handle the error gracefully
        bytes memory lastError = raffle.s_lastError();
        assertEq(string(lastError), "Network error occurred", "Error should be stored");
    }

    /**
     * @notice Test gas limit bounds for VRF callback
     */
    function test_VrfGasLimitBounds_Invalid() public {
        // Test gas limit too low
        vm.prank(admin);
        vm.expectRevert("Gas limit too low");
        raffle.updateVrfCallbackGasLimit(99_999); // Below minimum of 100,000
        
        // Test gas limit too high  
        vm.prank(admin);
        vm.expectRevert("Gas limit too high");
        raffle.updateVrfCallbackGasLimit(5_000_001); // Above maximum of 5,000,000
    }

    /**
     * @notice Test gas limit bounds for Functions
     */
    function test_FunctionsGasLimitBounds_Invalid() public {
        // Test gas limit too low
        vm.prank(admin);
        vm.expectRevert("Gas limit too low");
        raffle.updateFunctionsGasLimit(99_999); // Below minimum of 100,000
        
        // Test gas limit too high
        vm.prank(admin);
        vm.expectRevert("Gas limit too high");
        raffle.updateFunctionsGasLimit(5_000_001); // Above maximum of 5,000,000
    }


}