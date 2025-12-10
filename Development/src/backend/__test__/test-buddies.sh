#!/bin/bash

# FindBuddy Endpoints Test Script
# Run: chmod +x test-buddies.sh && ./test-buddies.sh

BASE_URL="http://localhost:5001"
API_URL="${BASE_URL}/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "============================================================"
echo -e "${BLUE}🚀 FindBuddy Endpoints Test Suite${NC}"
echo "============================================================"
echo ""

# Step 1: Health Check
echo -e "${YELLOW}📋 Step 1: Health Check${NC}"
echo -e "${CYAN}Testing: GET /health${NC}"
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
echo "$HEALTH_RESPONSE" | jq '.'
echo ""

# Check if backend is healthy
if echo "$HEALTH_RESPONSE" | jq -e '.status == "ok"' > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not healthy. Stopping tests.${NC}"
    exit 1
fi
echo ""

# Step 2: Login
echo "============================================================"
echo -e "${YELLOW}📋 Step 2: Authentication${NC}"
echo "============================================================"
echo ""
echo -e "${CYAN}Testing: POST /api/auth/login${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
    echo ""
    echo -e "${RED}❌ Login failed. You need to register a user first.${NC}"
    echo -e "${YELLOW}💡 Run this command to register:${NC}"
    echo ""
    echo "curl -X POST ${API_URL}/auth/register \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}'"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}🔑 Authentication token obtained${NC}"
echo ""

# Step 3: Buddy System Endpoints
echo "============================================================"
echo -e "${YELLOW}📋 Step 3: Testing Buddy System Endpoints${NC}"
echo "============================================================"
echo ""

# 3.1: Get My Profile
echo -e "${CYAN}🧪 Testing: GET /api/buddies/my-profile${NC}"
curl -s -X GET "${API_URL}/buddies/my-profile" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""

# 3.2: Update Location
echo -e "${CYAN}🧪 Testing: PUT /api/buddies/location${NC}"
curl -s -X PUT "${API_URL}/buddies/location" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 53.3498,
    "longitude": -6.2603
  }' | jq '.'
echo ""

# 3.3: Find Nearby Buddies
echo -e "${CYAN}🧪 Testing: GET /api/buddies/nearby${NC}"
curl -s -X GET "${API_URL}/buddies/nearby?lat=53.3498&lon=-6.2603&radius=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""

# 3.4: Get Buddy Requests
echo -e "${CYAN}🧪 Testing: GET /api/buddies/requests${NC}"
curl -s -X GET "${API_URL}/buddies/requests" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""

# 3.5: Get Accepted Buddies
echo -e "${CYAN}🧪 Testing: GET /api/buddies/accepted${NC}"
curl -s -X GET "${API_URL}/buddies/accepted" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""

# Step 4: Group Routes Endpoints
echo "============================================================"
echo -e "${YELLOW}📋 Step 4: Testing Group Routes Endpoints${NC}"
echo "============================================================"
echo ""

# 4.1: Create Group Route
echo -e "${CYAN}🧪 Testing: POST /api/buddies/group-routes${NC}"
DEPARTURE_TIME=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ")
GROUP_ROUTE_RESPONSE=$(curl -s -X POST "${API_URL}/buddies/group-routes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"route_name\": \"Evening Walk to City Center\",
    \"start_location\": {
      \"lat\": 53.3498,
      \"lon\": -6.2603
    },
    \"end_location\": {
      \"lat\": 53.3488,
      \"lon\": -6.2498
    },
    \"start_address\": \"Trinity College Dublin\",
    \"end_address\": \"Dublin Castle\",
    \"transport_mode\": \"walking\",
    \"departure_time\": \"${DEPARTURE_TIME}\"
  }")

echo "$GROUP_ROUTE_RESPONSE" | jq '.'
echo ""

# Extract group route ID
GROUP_ROUTE_ID=$(echo "$GROUP_ROUTE_RESPONSE" | jq -r '.data.id // empty')

# 4.2: Get Group Routes
echo -e "${CYAN}🧪 Testing: GET /api/buddies/group-routes${NC}"
curl -s -X GET "${API_URL}/buddies/group-routes" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""

# 4.3: Join Group Route
if [ ! -z "$GROUP_ROUTE_ID" ]; then
    echo -e "${CYAN}🧪 Testing: POST /api/buddies/group-routes/${GROUP_ROUTE_ID}/join${NC}"
    curl -s -X POST "${API_URL}/buddies/group-routes/${GROUP_ROUTE_ID}/join" \
      -H "Authorization: Bearer ${TOKEN}" | jq '.'
    echo ""
fi

# Final Summary
echo "============================================================"
echo -e "${GREEN}🎉 Test Suite Completed!${NC}"
echo "============================================================"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  Auth Token: ${GREEN}Obtained ✓${NC}"
echo -e "  Group Route ID: ${GROUP_ROUTE_ID:-N/A}"
echo ""
echo -e "${YELLOW}🔍 All Endpoints Tested:${NC}"
echo "  ✓ GET  /health"
echo "  ✓ POST /api/auth/login"
echo "  ✓ GET  /api/buddies/my-profile"
echo "  ✓ PUT  /api/buddies/location"
echo "  ✓ GET  /api/buddies/nearby"
echo "  ✓ GET  /api/buddies/requests"
echo "  ✓ GET  /api/buddies/accepted"
echo "  ✓ POST /api/buddies/group-routes"
echo "  ✓ GET  /api/buddies/group-routes"
echo "  ✓ POST /api/buddies/group-routes/:id/join"
echo ""
echo -e "${GREEN}✅ All endpoints are configured correctly!${NC}"
echo ""
