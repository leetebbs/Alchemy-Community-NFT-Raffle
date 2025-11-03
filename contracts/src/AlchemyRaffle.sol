//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @title Alchemy Community NFT Raffle Contract
/// @author Tebbo
/// @notice A decentralized raffle system using Chainlink Functions and VRF for fair random selection
/// @dev Integrates with external APIs to fetch NFT ownership data and select winners randomly

contract AlchemyRaffle is FunctionsClient, VRFConsumerBaseV2Plus {
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables for Functions
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // State variables
    address public adminAddress; 
    uint256 private vrfSubscriptionId; 
    bytes32 private vrfKeyHash; 
    uint32 private vrfCallbackGasLimit = 800000; 
    uint16 private vrfRequestConfirmations = 3; 
    uint32 private vrfNumWords = 1;
    bool private vrfNativePayment = false; 
    uint256 public s_vrfLastRequestId; 
    uint256 public vrfRequestId;
    uint256[] public s_randomWords;
    uint64 private functionsSubscriptionId;
    uint32 private functionsGasLimit = 300000; 
    bytes32 private functionsDonId;
    uint256 public entries;
    uint256 public raffleCounter;
    bytes32 public s_lastWinnerRequestId;
    bytes public s_lastWinnerAddressBytes; 

    // Request bookkeeping
    mapping(bytes32 => uint256) private entriesRequestToRaffle;
    mapping(bytes32 => uint256) private winnerRequestToRaffle;
    mapping(uint256 => uint256) private vrfRequestToRaffle;
    
    // Debug variables to track request status
    bool public isWinnerRequestPending;
    uint256 public lastWinnerRequestTimestamp;
    string public lastWinnerRequestError;

    string fetchEntriesWithCommitmentHash = "const nftIdsString = args[0];"
    "const nftIds = nftIdsString.split(',').map(id => id.trim());"
    "const apiResponse = await Functions.makeHttpRequest({"
    "url: 'https://alchemy-community-nft-raffle.vercel.app/api/FetchNumberOfEntries',"
    "method: 'POST',"
    "headers: {"
        "'Content-Type': 'application/json'"
    "},"
    "data: {"
        "nftIds: nftIds,"
        "shuffle: false,"
        "includeEntries: true"
    "}"
    "});"
    "if (apiResponse.error) {"
    "throw Error('Request failed');"
    "}"
    "const { data } = apiResponse;"
    "const commitmentHashHex = data.commitmentHash;"
    "const encodedEntries = Functions.encodeUint256(data.totalEntries);"
    "const hashBytes = new Uint8Array(32);"
    "for (let i = 0; i < 32; i++) {"
    "hashBytes[i] = parseInt(commitmentHashHex.substr(i * 2, 2), 16);"
    "}"
    "const result = new Uint8Array(64);"
    "result.set(encodedEntries, 0);"
    "result.set(hashBytes, 32);"

    "return result;";

    string fetchWinnerAddressSource = "const nftIdsString = args[0];" "const winnerIndex = parseInt(args[1]);"
        "if (!nftIdsString || isNaN(winnerIndex)) {" "throw new Error('Invalid arguments');" "}"
        "const nftIds = nftIdsString.split(',').map(id => id.trim());"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: 'https://alchemy-community-nft-raffle.vercel.app/api/FetchNumberOfEntries'," "method: 'POST',"
        "headers: { 'Content-Type': 'application/json' },"
        "data: { nftIds: nftIds, shuffle: true, includeEntries: true }" "});"
        "if (apiResponse.error) {" "throw new Error('API request failed: ' + apiResponse.error);" "}"
        "const { data } = apiResponse;"
        "if (!data || !data.entries || !Array.isArray(data.entries)) {"
        "throw new Error('Invalid API response structure');" "}"
        "if (winnerIndex >= data.entries.length) {"
        "throw new Error('Winner index out of bounds: ' + winnerIndex + ' >= ' + data.entries.length);" "}"
    "const winnerAddress = data.entries[winnerIndex];"
    "if (!winnerAddress) {" "throw new Error('Winner address is null or undefined');" "}"
    "return Functions.encodeString(winnerAddress);";

    /// @notice Mapping of raffle IDs to raffle data
    mapping(uint256 => Raffle) public raffles;

    /// @notice Struct representing a raffle
    struct Raffle {
        uint256 numberOfEntries;      /// @notice Number of entries in the raffle
        uint256 commitmentHash;       /// @notice Hash of the commitment for verification
        string month;                 /// @notice Month identifier for the raffle
        bool isActive;                /// @notice Whether the raffle is currently active
        uint256 createdAt;            /// @notice Timestamp when the raffle was created
        uint256 selectedWinnerIndex;  /// @notice Index of the selected winner
        address winnerAddress;        /// @notice Address of the winner
        string[] nftIds;              /// @notice Array of NFT IDs required for entry
    }

    // Events
    /// @notice Emitted when a Chainlink Functions request receives a response
    event Response(bytes32 indexed requestId, uint256 entries, bytes response, bytes error);
    /// @notice Emitted when a new raffle is created
    event RaffleCreated(uint256 indexed raffleId, string month);
    /// @notice Emitted when a raffle ends
    event RaffleEnded(uint256 indexed raffleId);
    /// @notice Emitted when randomness is requested from Chainlink VRF
    event RandomnessRequested(uint256 indexed vrfRequestId);
    /// @notice Emitted when randomness is fulfilled by Chainlink VRF
    event RandomnessFulfilled(uint256 indexed vrfRequestId, uint256[] randomWords);
    /// @notice Emitted when a winner index is selected
    event WinnerSelected(uint256 indexed raffleId, uint256 winnerIndex);
    /// @notice Emitted when a winner address is successfully fetched
    event WinnerAddressFetched(uint256 indexed raffleId, address winnerAddress);
    /// @notice Emitted when winner address fetching fails
    event WinnerAddressFetchFailed(uint256 indexed raffleId, string errorMessage);

    // Errors
    error UnexpectedRequestID(bytes32 requestId);
    error UnexpectedVRFRequestID(uint256 requestId);

    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    function _onlyAdmin() internal view {
        require(msg.sender == adminAddress, "Only admin can call this function");
    }

    /// @notice Initializes the raffle contract with Chainlink configurations
    /// @param _adminAddress The address of the contract administrator
    /// @param _vrfSubscriptionId Chainlink VRF subscription ID for randomness
    /// @param _vrfKeyHash Chainlink VRF key hash for gas lane selection
    /// @param _vrfCoordinator Address of the Chainlink VRF coordinator
    /// @param _functionsSubscriptionId Chainlink Functions subscription ID
    /// @param _functionsDonId Chainlink Functions DON ID
    /// @param _functionsRouter Address of the Chainlink Functions router
    constructor(
        address _adminAddress,
        uint256 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        address _vrfCoordinator,
        uint64 _functionsSubscriptionId,
        bytes32 _functionsDonId,
        address _functionsRouter
    ) FunctionsClient(_functionsRouter) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        adminAddress = _adminAddress;
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;
        functionsSubscriptionId = _functionsSubscriptionId;
        functionsDonId = _functionsDonId;
    }

    /// @notice Starts a new raffle for the given month with specified NFT IDs
    /// @param _nftIds Array of NFT IDs that qualify for entry
    /// @param _month The month identifier for this raffle
    /// @dev Only callable by admin. Creates a new raffle entry and emits RaffleCreated event
    function startRaffle(
        string[] calldata _nftIds,
        string calldata _month
    )
        external
        onlyAdmin
    {
        // Implementation for starting the raffle
        
        raffleCounter++;

        raffles[raffleCounter] = Raffle({
            numberOfEntries: 0,
            commitmentHash: 0,
            month: _month,
            isActive: true,
            createdAt: block.timestamp,
            selectedWinnerIndex: type(uint256).max,
            winnerAddress: address(0),
            nftIds: _nftIds
        });

        emit RaffleCreated(raffleCounter, _month);
        
        sendFetchEntriesRequest(raffleCounter, _nftIds);
    }

    /**
     * @notice Sends an HTTP request for character information
     * @param args The arguments to pass to the HTTP request
     * @return requestId The ID of the request
     */
    function sendFetchEntriesRequest(uint256 raffleId, string[] calldata args) internal returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(fetchEntriesWithCommitmentHash); 

        // Join the args into a single comma-separated string
        string memory joinedArgs = args[0];
        for (uint i = 1; i < args.length; i++) {
            joinedArgs = string(abi.encodePacked(joinedArgs, ",", args[i]));
        }
        string[] memory requestArgs = new string[](1);
        requestArgs[0] = joinedArgs;
        req.setArgs(requestArgs); 

        // Send the request and store the request ID
        s_lastRequestId = _sendRequest(req.encodeCBOR(), functionsSubscriptionId, functionsGasLimit, functionsDonId);
        entriesRequestToRaffle[s_lastRequestId] = raffleId;

        return s_lastRequestId;
    }

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    if (entriesRequestToRaffle[requestId] != 0) {
        // Handle entries count request
        uint256 raffleId = entriesRequestToRaffle[requestId];
        if (raffleId == 0) {
            revert UnexpectedRequestID(requestId);
        }
        delete entriesRequestToRaffle[requestId];

        s_lastResponse = response;
        s_lastError = err;

        if (err.length > 0) {
            emit Response(requestId, 0, s_lastResponse, s_lastError);
            return;
        }

        // Decode both totalEntries and commitmentHash from 64-byte response
        require(response.length == 64, "Invalid response length");
        
        uint256 decodedEntries;
        bytes32 commitmentHash;
        
        assembly {
            decodedEntries := mload(add(response, 32))
            commitmentHash := mload(add(response, 64))
        }
        
        entries = decodedEntries; // Maintain legacy accessor

        // Update the current raffle with the entries count and commitment hash
        Raffle storage raffle = raffles[raffleId];
        raffle.numberOfEntries = decodedEntries;
        raffle.commitmentHash = uint256(commitmentHash);

        emit Response(requestId, decodedEntries, s_lastResponse, s_lastError);

        if (decodedEntries > 0) {
            requestRandomness(raffleId);
        } else {
            raffle.isActive = false;
            emit RaffleEnded(raffleId);
        }
        
    } else if (winnerRequestToRaffle[requestId] != 0) {
        // Handle winner address request (unchanged)
        uint256 raffleId = winnerRequestToRaffle[requestId];
        if (raffleId == 0) {
            revert UnexpectedRequestID(requestId);
        }
        delete winnerRequestToRaffle[requestId];

        isWinnerRequestPending = false;

        if (err.length > 0) {
            lastWinnerRequestError = string(err);
            emit WinnerAddressFetchFailed(raffleId, lastWinnerRequestError);
            return;
        }

        s_lastWinnerAddressBytes = response;
        string memory winnerAddressString = string(response);

        (bool success, address winnerAddress) = _tryParseAddress(winnerAddressString);
        if (!success) {
            lastWinnerRequestError = "Winner address parse failed";
            emit WinnerAddressFetchFailed(raffleId, lastWinnerRequestError);
            return;
        }

        lastWinnerRequestError = "";

        // Update the raffle with winner address and mark as complete
        Raffle storage raffle = raffles[raffleId];
        raffle.winnerAddress = winnerAddress;
        raffle.isActive = false;

        emit WinnerAddressFetched(raffleId, winnerAddress);
        emit RaffleEnded(raffleId);
        
    } else {
        revert UnexpectedRequestID(requestId);
    }
}
    // Function to request randomness
    function requestRandomness(uint256 raffleId) internal returns (uint256 requestId) {
        // Create the request with extra args for native payment
        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient.RandomWordsRequest({
            keyHash: vrfKeyHash,
            subId: vrfSubscriptionId,
            requestConfirmations: vrfRequestConfirmations,
            callbackGasLimit: vrfCallbackGasLimit,
            numWords: vrfNumWords,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: vrfNativePayment}))
        });

        vrfRequestId = s_vrfCoordinator.requestRandomWords(request);
        s_vrfLastRequestId = vrfRequestId;
        vrfRequestToRaffle[vrfRequestId] = raffleId;

        emit RandomnessRequested(vrfRequestId);
        return vrfRequestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 raffleId = vrfRequestToRaffle[requestId];
        if (raffleId == 0) {
            revert UnexpectedVRFRequestID(requestId);
        }
        delete vrfRequestToRaffle[requestId];

        // Only store the first random word to save gas
        if (randomWords.length > 0) {
            uint256 randomWord = randomWords[0];
            
            Raffle storage currentRaffle = raffles[raffleId];
            if (currentRaffle.numberOfEntries > 0) {
                uint256 winnerIndex = randomWord % currentRaffle.numberOfEntries;
                
                // Single storage write - update raffle struct efficiently
                currentRaffle.selectedWinnerIndex = winnerIndex;

                // Make the second Functions call to get winner address using stored NFT IDs
                sendFetchWinnerRequest(raffleId, currentRaffle.nftIds, winnerIndex);

                emit WinnerSelected(raffleId, winnerIndex);
            }
            
            // Store only the used random word instead of entire array
            if (s_randomWords.length == 0) {
                s_randomWords.push(randomWord);
            } else {
                s_randomWords[0] = randomWord;
            }
        }

        emit RandomnessFulfilled(requestId, randomWords);
    }

    function sendFetchWinnerRequest(uint256 raffleId, string[] storage nftIds, uint256 winnerIndex) internal returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(fetchWinnerAddressSource);

        // Convert NFT IDs array to comma-separated string
        string memory nftIdsString = "";
        for (uint256 i = 0; i < nftIds.length; i++) {
            if (i > 0) {
                nftIdsString = string(abi.encodePacked(nftIdsString, ","));
            }
            nftIdsString = string(abi.encodePacked(nftIdsString, nftIds[i]));
        }

        // Convert winnerIndex to string and create args array
        string[] memory args = new string[](2);
        args[0] = nftIdsString;
        args[1] = uint256ToString(winnerIndex);

        req.setArgs(args);

    s_lastWinnerRequestId = _sendRequest(req.encodeCBOR(), functionsSubscriptionId, functionsGasLimit, functionsDonId);
    winnerRequestToRaffle[s_lastWinnerRequestId] = raffleId;
        
        // Track the pending request
        isWinnerRequestPending = true;
        lastWinnerRequestTimestamp = block.timestamp;
        lastWinnerRequestError = "";
        
        return s_lastWinnerRequestId;
    }

    // Helper function to convert uint to string
    function uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @notice Get the latest winner information
     * @return raffleId The ID of the latest raffle
     * @return winnerAddress The address of the winner
     * @return winnerIndex The index of the winner in the entries array
     * @return month The month of the raffle
     * @return hasWinner Whether a winner has been selected
     */
    function getLatestWinner() 
        external 
        view 
        returns (
            uint256 raffleId,
            address winnerAddress,
            uint256 winnerIndex,
            string memory month,
            bool hasWinner
        ) 
    {
        require(raffleCounter > 0, "No raffles have been created yet");
        
        raffleId = raffleCounter;
        Raffle memory latestRaffle = raffles[raffleCounter];
        
        winnerAddress = latestRaffle.winnerAddress;
        winnerIndex = latestRaffle.selectedWinnerIndex == type(uint256).max ? 0 : latestRaffle.selectedWinnerIndex;
        month = latestRaffle.month;
        hasWinner = latestRaffle.winnerAddress != address(0);
    }

    /**
     * @notice Get winner information for a specific raffle
     * @param _raffleId The ID of the raffle to query
     * @return winnerAddress The address of the winner
     * @return winnerIndex The index of the winner in the entries array
     * @return month The month of the raffle
     * @return hasWinner Whether a winner has been selected
     */
    function getWinnerByRaffleId(uint256 _raffleId) 
        external 
        view 
        returns (
            address winnerAddress,
            uint256 winnerIndex,
            string memory month,
            bool hasWinner
        ) 
    {
        require(_raffleId > 0 && _raffleId <= raffleCounter, "Invalid raffle ID");
        
        Raffle memory raffle = raffles[_raffleId];
        
        winnerAddress = raffle.winnerAddress;
        winnerIndex = raffle.selectedWinnerIndex == type(uint256).max ? 0 : raffle.selectedWinnerIndex;
        month = raffle.month;
        hasWinner = raffle.winnerAddress != address(0);
    }

    /**
     * @notice Get complete information about a raffle
     * @param raffleId The ID of the raffle to query
     */
    function getRaffleDetails(uint256 raffleId) 
        external 
        view 
        returns (
            uint256 numberOfEntries,
            uint256 commitmentHash,
            string memory month,
            bool isActive,
            uint256 createdAt,
            uint256 selectedWinnerIndex,
            address winnerAddress,
            string[] memory nftIds
        ) 
    {
        require(raffleId > 0 && raffleId <= raffleCounter, "Invalid raffle ID");
        
        Raffle memory raffle = raffles[raffleId];
        
        return (
            raffle.numberOfEntries,
            raffle.commitmentHash,
            raffle.month,
            raffle.isActive,
            raffle.createdAt,
            raffle.selectedWinnerIndex,
            raffle.winnerAddress,
            raffle.nftIds
        );
    }

    /**
     * @notice Manual function to retry fetching winner address (admin only)
     * @param raffleId The raffle ID to retry winner fetching for
     */
    function retryWinnerFetch(uint256 raffleId) external onlyAdmin {
        require(raffleId > 0 && raffleId <= raffleCounter, "Invalid raffle ID");
        require(raffles[raffleId].selectedWinnerIndex != type(uint256).max, "Winner index not set");
        
        // Retry the winner fetch request
        sendFetchWinnerRequest(raffleId, raffles[raffleId].nftIds, raffles[raffleId].selectedWinnerIndex);
    }

    /**
     * @notice Update the VRF callback gas limit (admin only)
     * @param newGasLimit The new gas limit for VRF callbacks
     */
    function updateVrfCallbackGasLimit(uint32 newGasLimit) external onlyAdmin {
        require(newGasLimit >= 100000, "Gas limit too low");
        require(newGasLimit <= 5000000, "Gas limit too high");
        vrfCallbackGasLimit = newGasLimit;
    }


    /**
     * @notice Update the Functions callback gas limit (admin only)
     * @param newGasLimit The new gas limit for Functions callbacks
     */
    function updateFunctionsGasLimit(uint32 newGasLimit) external onlyAdmin {
        require(newGasLimit >= 100000, "Gas limit too low");
        require(newGasLimit <= 5000000, "Gas limit too high");
        functionsGasLimit = newGasLimit;
    }

    function _tryParseAddress(string memory value) private pure returns (bool, address) {
        bytes memory strBytes = bytes(value);
        uint256 length = strBytes.length;
        if (length == 0) {
            return (false, address(0));
        }

        // Trim leading whitespace
        uint256 start = 0;
        while (start < length && _isWhitespace(strBytes[start])) {
            start++;
        }

        // Trim trailing whitespace
        uint256 end = length;
        while (end > start && _isWhitespace(strBytes[end - 1])) {
            end--;
        }

        if (end - start == 0) {
            return (false, address(0));
        }

        if (end - start >= 2 && strBytes[start] == '0' && (strBytes[start + 1] == 'x' || strBytes[start + 1] == 'X')) {
            start += 2;
        }

        if (end - start != 40) {
            return (false, address(0));
        }

        uint160 acc;
        for (uint256 i = start; i < end; i++) {
            uint8 c = uint8(strBytes[i]);
            uint8 nibble;

            if (c >= 48 && c <= 57) {
                nibble = c - 48; // '0'-'9'
            } else if (c >= 65 && c <= 70) {
                nibble = c - 55; // 'A'-'F'
            } else if (c >= 97 && c <= 102) {
                nibble = c - 87; // 'a'-'f'
            } else {
                return (false, address(0));
            }

            acc = (acc << 4) | nibble;
        }

        return (true, address(acc));
    }

    function _isWhitespace(bytes1 char) private pure returns (bool) {
        return char == 0x20 || char == 0x09 || char == 0x0a || char == 0x0d;
    }

}
