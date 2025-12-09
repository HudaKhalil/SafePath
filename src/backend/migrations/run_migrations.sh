#!/bin/bash

# Migration Runner Script
# Usage: ./run_migrations.sh [database_name] [postgres_user]
# Example: ./run_migrations.sh safety_routing postgres

set -e  # Exit on error

# Database connection parameters
DB_NAME=${1:-safety_routing}
DB_USER=${2:-postgres}
DB_HOST=${3:-localhost}
DB_PORT=${4:-5432}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "SafePath Database Migration Runner"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    exit 1
fi

# Function to run a migration file
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")
    
    echo -e "${YELLOW}Running migration: $migration_name${NC}"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        echo -e "${GREEN}✓ $migration_name completed successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ $migration_name failed${NC}"
        return 1
    fi
}

# Run migrations in order
echo "Starting migrations..."
echo ""

MIGRATION_DIR="$(dirname "$0")"

# Migration 0: Drop unused view
if [ -f "$MIGRATION_DIR/000_drop_unused_view.sql" ]; then
    run_migration "$MIGRATION_DIR/000_drop_unused_view.sql" || exit 1
else
    echo -e "${YELLOW}Warning: 000_drop_unused_view.sql not found, skipping${NC}"
fi

# Migration 1: Cleanup users table
if [ -f "$MIGRATION_DIR/001_cleanup_users_table.sql" ]; then
    run_migration "$MIGRATION_DIR/001_cleanup_users_table.sql" || exit 1
else
    echo -e "${YELLOW}Warning: 001_cleanup_users_table.sql not found, skipping${NC}"
fi

# Migration 2: Create user_safety_preferences table
if [ -f "$MIGRATION_DIR/002_create_user_safety_preferences.sql" ]; then
    run_migration "$MIGRATION_DIR/002_create_user_safety_preferences.sql" || exit 1
else
    echo -e "${RED}Error: 002_create_user_safety_preferences.sql not found${NC}"
    exit 1
fi

echo "=========================================="
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart your backend server: npm run dev"
echo "2. Test the safety preferences API endpoints"
echo "3. Update frontend to use new API"
