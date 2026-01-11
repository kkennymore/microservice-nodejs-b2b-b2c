#!/bin/bash

# Artillery Load Testing Runner Script
# This script provides easy commands to run load tests against the microservices platform

set -e

# Configuration
ARTILLERY_CONFIG="testing/load-tests/artillery-config.yml"
REPORTS_DIR="testing/load-tests/reports"
SCENARIOS_DIR="testing/load-tests/scenarios"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Artillery Load Testing for Marketplace${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  run-all              Run all load tests"
    echo "  run-service SERVICE  Run load tests for specific service"
    echo "  run-scenario FILE    Run specific scenario file"
    echo "  smoke-test           Run quick smoke test"
    echo "  stress-test          Run stress test with high load"
    echo "  custom-test FILE     Run custom test configuration"
    echo "  report               Generate HTML report from last run"
    echo "  compare REPORTS      Compare multiple test reports"
    echo "  cleanup              Clean up old test reports"
    echo "  help                 Show this help message"
    echo ""
    echo "Services:"
    echo "  auth, products, transactions, messaging,"
    echo "  notifications, analytics, shipping, system"
    echo ""
    echo "Examples:"
    echo "  $0 run-all"
    echo "  $0 run-service auth"
    echo "  $0 smoke-test"
    echo "  $0 report"
}

check_dependencies() {
    if ! command -v artillery &> /dev/null; then
        echo -e "${RED}Error: Artillery is not installed${NC}"
        echo "Install with: npm install -g artillery"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq is not installed. JSON processing will be limited.${NC}"
    fi
}

create_reports_dir() {
    mkdir -p "$REPORTS_DIR"
}

run_smoke_test() {
    echo -e "${GREEN}Running smoke test...${NC}"

    artillery run \
        --config "$ARTILLERY_CONFIG" \
        --overrides '{"phases": [{"duration": 30, "arrivalRate": 2}]}' \
        --output "$REPORTS_DIR/smoke-test-$(date +%Y%m%d-%H%M%S).json"

    echo -e "${GREEN}Smoke test completed${NC}"
}

run_stress_test() {
    echo -e "${YELLOW}Running stress test (high load)...${NC}"

    artillery run \
        --config "$ARTILLERY_CONFIG" \
        --overrides '{"phases": [{"duration": 60, "arrivalRate": 100}]}' \
        --output "$REPORTS_DIR/stress-test-$(date +%Y%m%d-%H%M%S).json"

    echo -e "${YELLOW}Stress test completed${NC}"
}

run_all_tests() {
    echo -e "${GREEN}Running comprehensive load test...${NC}"

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    OUTPUT_FILE="$REPORTS_DIR/full-test-$TIMESTAMP.json"

    artillery run \
        --config "$ARTILLERY_CONFIG" \
        --output "$OUTPUT_FILE"

    echo -e "${GREEN}Full test completed${NC}"
    echo -e "${BLUE}Results saved to: $OUTPUT_FILE${NC}"

    # Generate quick summary
    if command -v jq &> /dev/null; then
        echo ""
        echo -e "${BLUE}Quick Summary:${NC}"
        jq -r '
        .aggregate |
        {
          duration: (.counters."http.requests.duration.total" / 1000),
          requests: .counters."http.requests.total",
          rps: (.counters."http.requests.total" / (.counters."http.requests.duration.total" / 1000)),
          errors: (.counters."http.codes.4xx" + .counters."http.codes.5xx"),
          p95: .summaries."http.response_time".p95,
          p99: .summaries."http.response_time".p99
        } | "Duration: \(.duration)s, Requests: \(.requests), RPS: \(.rps | floor), Errors: \(.errors), P95: \(.p95)ms, P99: \(.p99)ms"
        ' "$OUTPUT_FILE" 2>/dev/null || echo "Could not parse results"
    fi
}

run_service_test() {
    SERVICE=$1

    if [[ ! -f "$SCENARIOS_DIR/${SERVICE}-service.yml" ]]; then
        echo -e "${RED}Error: Scenario file for service '$SERVICE' not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}Running load test for $SERVICE service...${NC}"

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    OUTPUT_FILE="$REPORTS_DIR/${SERVICE}-test-$TIMESTAMP.json"

    artillery run \
        --config "$ARTILLERY_CONFIG" \
        --overrides "{\"include\": [\"$SCENARIOS_DIR/${SERVICE}-service.yml\"]}" \
        --output "$OUTPUT_FILE"

    echo -e "${GREEN}$SERVICE test completed${NC}"
    echo -e "${BLUE}Results saved to: $OUTPUT_FILE${NC}"
}

run_custom_test() {
    CONFIG_FILE=$1

    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo -e "${RED}Error: Configuration file '$CONFIG_FILE' not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}Running custom test with config: $CONFIG_FILE${NC}"

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    OUTPUT_FILE="$REPORTS_DIR/custom-test-$TIMESTAMP.json"

    artillery run \
        --config "$CONFIG_FILE" \
        --output "$OUTPUT_FILE"

    echo -e "${GREEN}Custom test completed${NC}"
    echo -e "${BLUE}Results saved to: $OUTPUT_FILE${NC}"
}

generate_report() {
    LATEST_REPORT=$(ls -t "$REPORTS_DIR"/*.json | head -1)

    if [[ -z "$LATEST_REPORT" ]]; then
        echo -e "${RED}Error: No test reports found${NC}"
        exit 1
    fi

    echo -e "${GREEN}Generating HTML report from: $LATEST_REPORT${NC}"

    artillery report "$LATEST_REPORT"

    echo -e "${GREEN}HTML report generated${NC}"
}

compare_reports() {
    if [[ $# -lt 2 ]]; then
        echo -e "${RED}Error: Need at least 2 report files to compare${NC}"
        exit 1
    fi

    echo -e "${GREEN}Comparing test reports...${NC}"

    # Simple comparison - in production, use more sophisticated tools
    for report in "$@"; do
        if [[ -f "$report" ]]; then
            echo -e "${BLUE}Report: $report${NC}"
            if command -v jq &> /dev/null; then
                jq -r '
                .aggregate |
                "  Requests: \(.counters."http.requests.total"), RPS: \((.counters."http.requests.total" / (.counters."http.requests.duration.total" / 1000)) | floor), P95: \(.summaries."http.response_time".p95)ms, Errors: \(.counters."http.codes.4xx" + .counters."http.codes.5xx")"
                ' "$report" 2>/dev/null || echo "  Could not parse"
            else
                echo "  Install jq for detailed comparison"
            fi
        else
            echo -e "${RED}Report file not found: $report${NC}"
        fi
    done
}

cleanup_reports() {
    echo -e "${YELLOW}Cleaning up old test reports...${NC}"

    # Keep only last 10 reports
    ls -t "$REPORTS_DIR"/*.json | tail -n +11 | xargs -r rm

    echo -e "${GREEN}Cleanup completed${NC}"
}

# Main script logic
print_header
check_dependencies
create_reports_dir

case "${1:-help}" in
    "run-all")
        run_all_tests
        ;;
    "run-service")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Error: Service name required${NC}"
            echo "Usage: $0 run-service SERVICE_NAME"
            exit 1
        fi
        run_service_test "$2"
        ;;
    "run-scenario")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Error: Scenario file required${NC}"
            echo "Usage: $0 run-scenario SCENARIO_FILE"
            exit 1
        fi
        run_custom_test "$2"
        ;;
    "smoke-test")
        run_smoke_test
        ;;
    "stress-test")
        run_stress_test
        ;;
    "custom-test")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Error: Configuration file required${NC}"
            echo "Usage: $0 custom-test CONFIG_FILE"
            exit 1
        fi
        run_custom_test "$2"
        ;;
    "report")
        generate_report
        ;;
    "compare")
        shift
        if [[ $# -eq 0 ]]; then
            echo -e "${RED}Error: Report files required${NC}"
            echo "Usage: $0 compare REPORT1.json REPORT2.json ..."
            exit 1
        fi
        compare_reports "$@"
        ;;
    "cleanup")
        cleanup_reports
        ;;
    "help"|*)
        print_usage
        ;;
esac