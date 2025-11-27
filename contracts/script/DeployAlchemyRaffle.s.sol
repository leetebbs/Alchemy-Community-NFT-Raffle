// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {AlchemyRaffle} from "../src/AlchemyRaffle.sol";

/**
 * @notice Deployment script for AlchemyRaffle contract
 * @dev Supports multiple networks with Chainlink VRF and Functions configurations
 *
 * IMPORTANT: Always verify the latest Chainlink configurations at:
 * - VRF: https://docs.chain.link/vrf/v2-5/supported-networks
 * - Functions: https://docs.chain.link/functions/supported-networks
 *
 * The configurations in this script may become outdated.
 */

contract DeployAlchemyRaffle is Script {
    struct NetworkConfig {
        address vrfCoordinator;
        bytes32 vrfKeyHash;
        bytes32 functionsDonId;
        address functionsRouter;
        string name;
    }

    function getNetworkConfig(string memory network) internal pure returns (NetworkConfig memory) {
        if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("sepolia"))) {
            return NetworkConfig({
                vrfCoordinator: 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B,
                vrfKeyHash: 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae, // 500 gwei
                functionsDonId: 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000,
                functionsRouter: 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0,
                name: "Sepolia"
            });
        } else if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("mainnet"))) {
            return NetworkConfig({
                vrfCoordinator: 0xD7f86b4b8Cae7D942340FF628F82735b7a20893a,
                vrfKeyHash: 0x3fd2fec10d06ee8f65e7f2e95f5c56511359ece3f33960ad8a866ae24a8ff10b, // 500 gwei
                functionsDonId: 0x66756e2d657468657265756d2d6d61696e6e65742d3100000000000000000000,
                functionsRouter: 0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6,
                name: "Mainnet"
            });
        } else if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("polygon-mainnet"))) {
            return NetworkConfig({
                vrfCoordinator: 0xec0Ed46f36576541C75739E915ADbCb3DE24bD77,
                vrfKeyHash: 0x719ed7d7664abc3001c18aac8130a2265e1e70b7e036ae20f3ca8b92b3154d86, // 500 gwei 
                functionsDonId: 0x66756e2d706f6c79676f6e2d6d61696e6e65742d310000000000000000000000,
                functionsRouter: 0xdc2AAF042Aeff2E68B3e8E33F19e4B9fA7C73F10,
                name: "Polygon Mainnet"
            });
        } else if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("amoy"))) {
            return NetworkConfig({
                vrfCoordinator: 0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2,
                vrfKeyHash: 0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899, // 500 gwei
                functionsDonId: 0x66756e2d706f6c79676f6e2d616d6f792d310000000000000000000000000000,
                functionsRouter: 0xC22a79eBA640940ABB6dF0f7982cc119578E11De,
                name: "Amoy"
            });
        } else if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("arbitrum-sepolia"))) {
            return NetworkConfig({
                vrfCoordinator: 0x5CE8D5A2BC84beb22a398CCA51996F7930313D61,
                vrfKeyHash: 0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be, // 50 gwei
                functionsDonId: 0x66756e2d617262697472756d2d7365706f6c69612d3100000000000000000000,
                functionsRouter: 0x234a5fb5Bd614a7AA2FfAB244D603abFA0Ac5C5C,
                name: "Arbitrum Sepolia"
            });
        } else if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("optimism-sepolia"))) {
            return NetworkConfig({
                vrfCoordinator: 0x02667f44a6a44E4BDddCF80e724512Ad3426B17d,
                vrfKeyHash: 0xc3d5bc4d5600fa71f7a50b9ad841f14f24f9ca4236fd00bdb5fda56b052b28a4, // 30 gwei
                functionsDonId: 0x66756e2d6f7074696d69736d2d7365706f6c69612d3100000000000000000000,
                functionsRouter: 0xC17094E3A1348E5C7544D4fF8A36c28f2C6AAE28,
                name: "Optimism Sepolia"
            });
        } else if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("base-sepolia"))) {
            return NetworkConfig({
                vrfCoordinator: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE,
                vrfKeyHash: 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71, // 30 gwei
                functionsDonId: 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000,
                functionsRouter: 0xf9B8fc078197181C841c296C876945aaa425B278,
                name: "Base Sepolia"
            });
        } else {
            revert(string(abi.encodePacked("Unsupported network: ", network, ". Supported: sepolia, mainnet, polygon-mainnet, amoy, arbitrum-sepolia, optimism-sepolia, base-sepolia")));
        }
    }

    function run() external {
        // Get network from environment or default to sepolia
        string memory network = vm.envOr("NETWORK", string("sepolia"));
        NetworkConfig memory config = getNetworkConfig(network);

        // Validate required environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 vrfSubscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint64 functionsSubscriptionId = uint64(vm.envUint("FUNCTIONS_SUBSCRIPTION_ID"));

        require(deployerPrivateKey != 0, "PRIVATE_KEY not set");
        require(vrfSubscriptionId != 0, "VRF_SUBSCRIPTION_ID not set");
        require(functionsSubscriptionId != 0, "FUNCTIONS_SUBSCRIPTION_ID not set");

        // Admin address - defaults to deployer address if not set
        address adminAddress = vm.envOr("ADMIN_ADDRESS", address(0));
        if (adminAddress == address(0)) {
            adminAddress = vm.addr(deployerPrivateKey);
        }

        vm.startBroadcast(deployerPrivateKey);

        AlchemyRaffle raffle = new AlchemyRaffle(
            adminAddress,
            vrfSubscriptionId,
            config.vrfKeyHash,
            config.vrfCoordinator,
            functionsSubscriptionId,
            config.functionsDonId,
            config.functionsRouter
        );

        vm.stopBroadcast();

        // Log deployment info
        console.log("Network:", config.name);
        console.log("AlchemyRaffle deployed to:", address(raffle));
        console.log("Admin Address:", adminAddress);
        console.log("VRF Subscription ID:", vrfSubscriptionId);
        console.log("Functions Subscription ID:", functionsSubscriptionId);
        console.log("");
        console.log("Update your frontend .env with:");
        console.log("NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=", address(raffle));
        console.log("RAFFLE_CONTRACT_NETWORK=", network);
    }
}