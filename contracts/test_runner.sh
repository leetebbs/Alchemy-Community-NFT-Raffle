#!/bin/bash

# AlchemyRaffle Test Runner
# This script provides easy commands to run different test scenarios

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the contracts directory
if [ ! -f "foundry.toml" ]; then
    print_error "Please run this script from the contracts directory"
    exit 1
fi

# Function to compile contracts
compile_contracts() {
    print_status "Compiling contracts..."
    if forge build; then
        print_success "Contracts compiled successfully"
    else
        print_error "Contract compilation failed"
        exit 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Running all AlchemyRaffle tests..."
    forge test -vvv --match-contract "AlchemyRaffle"
}

# Function to run simple tests only
run_simple_tests() {
    print_status "Running simple AlchemyRaffle tests..."
    forge test -vvv --match-contract "AlchemyRaffleSimpleTest"
}

# Function to run comprehensive tests only
run_comprehensive_tests() {
    print_status "Running comprehensive AlchemyRaffle tests..."
    forge test -vvv --match-contract "AlchemyRaffleTest"
}

# Function to run a specific test
run_specific_test() {
    local test_name=$1
    print_status "Running specific test: $test_name"
    forge test -vvv --match-test "$test_name"
}

# Function to run tests with gas reporting
run_tests_with_gas() {
    print_status "Running tests with gas reporting..."
    forge test --gas-report --match-contract "AlchemyRaffle"
}

# Function to run tests and generate coverage
run_coverage() {
    print_status "Running test coverage analysis..."
    forge coverage --match-contract "AlchemyRaffle"
}

# Function to run fuzz tests
run_fuzz_tests() {
    print_status "Running fuzz tests..."
    forge test -vvv --match-test "testFuzz"
}

# Function to show test structure
show_test_structure() {
    print_status "AlchemyRaffle Test Structure:"
    echo ""
    echo "📁 Test Files:"
    echo "  ├── test/AlchemyRaffleSimple.t.sol     (Simplified tests with custom mocks)"
    echo "  ├── test/AlchemyRaffle.t.sol           (Comprehensive tests with toolkit)"
    echo "  └── test/mocks/AlchemyRaffleMocks.sol  (Mock contracts for testing)"
    echo ""
    echo "🧪 Test Categories:"
    echo "  ├── Basic functionality (deployment, raffle creation)"
    echo "  ├── Chainlink Functions integration (entries, winner address)"  
    echo "  ├── Chainlink VRF integration (randomness)"
    echo "  ├── Admin functions (gas limits, retry mechanisms)"
    echo "  ├── Error handling (invalid requests, parsing errors)"
    echo "  ├── Edge cases (multiple raffles, large entries)"
    echo "  └── View functions (raffle info, NFT IDs)"
    echo ""
}

# Function to show available commands
show_help() {
    echo "AlchemyRaffle Test Runner"
    echo "========================"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  compile                 Compile all contracts"
    echo "  all                    Run all tests"
    echo "  simple                 Run simple tests only (recommended for debugging)"
    echo "  comprehensive          Run comprehensive tests with foundry-chainlink-toolkit"
    echo "  gas                    Run tests with gas reporting"
    echo "  coverage               Run test coverage analysis"
    echo "  fuzz                   Run fuzz tests"
    echo "  structure              Show test file structure"
    echo "  specific <test_name>   Run a specific test function"
    echo "  help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 simple                              # Run simple tests"
    echo "  $0 specific test_StartRaffle           # Run specific test"
    echo "  $0 gas                                 # Run with gas reporting"
    echo ""
    echo "Recommended workflow:"
    echo "  1. $0 compile                          # First compile"
    echo "  2. $0 simple                           # Run simple tests for quick feedback"
    echo "  3. $0 comprehensive                    # Run full test suite"
    echo "  4. $0 coverage                         # Check coverage"
}

# Main script logic
case "$1" in
    "compile")
        compile_contracts
        ;;
    "all")
        compile_contracts
        run_all_tests
        ;;
    "simple")
        compile_contracts
        run_simple_tests
        ;;
    "comprehensive")
        compile_contracts
        run_comprehensive_tests
        ;;
    "specific")
        if [ -z "$2" ]; then
            print_error "Please provide a test name"
            echo "Example: $0 specific test_StartRaffle"
            exit 1
        fi
        compile_contracts
        run_specific_test "$2"
        ;;
    "gas")
        compile_contracts
        run_tests_with_gas
        ;;
    "coverage")
        compile_contracts
        run_coverage
        ;;
    "fuzz")
        compile_contracts
        run_fuzz_tests
        ;;
    "structure")
        show_test_structure
        ;;
    "help"|""|*)
        show_help
        ;;
esac