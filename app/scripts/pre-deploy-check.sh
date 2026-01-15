#!/bin/bash
# Pre-deploy checklist for Chronicle
# Run this before deploying to production

set -e

echo "🔍 Chronicle Pre-Deploy Checklist"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. TypeScript check
echo "1. TypeScript compilation..."
if npm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
    echo -e "   ${GREEN}✓ TypeScript OK${NC}"
else
    echo -e "   ${RED}✗ TypeScript errors${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. Build check
echo "2. Production build..."
if npm run build > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Build OK${NC}"
else
    echo -e "   ${RED}✗ Build failed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3. Check for console.log in production code
echo "3. Checking for debug statements..."
CONSOLE_LOGS=$(grep -r "console.log" src/app src/components src/lib --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "console.error" | wc -l | tr -d ' ')
if [ "$CONSOLE_LOGS" -gt 10 ]; then
    echo -e "   ${YELLOW}⚠ Found $CONSOLE_LOGS console.log statements${NC}"
else
    echo -e "   ${GREEN}✓ Debug statements OK${NC}"
fi

# 4. Check environment variables
echo "4. Checking required env vars..."
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "ANTHROPIC_API_KEY"
)
MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "   ${RED}✗ Missing: $var${NC}"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done
if [ "$MISSING_VARS" -eq 0 ]; then
    echo -e "   ${GREEN}✓ Environment variables OK${NC}"
else
    ERRORS=$((ERRORS + MISSING_VARS))
fi

# 5. Check bundle size
echo "5. Checking bundle size..."
LARGE_CHUNKS=$(find .next/static/chunks -name "*.js" -size +500k 2>/dev/null | wc -l | tr -d ' ')
if [ "$LARGE_CHUNKS" -gt 3 ]; then
    echo -e "   ${YELLOW}⚠ Found $LARGE_CHUNKS chunks > 500KB${NC}"
else
    echo -e "   ${GREEN}✓ Bundle size OK${NC}"
fi

# 6. Staging test (if staging URL available)
echo "6. Staging health check..."
STAGING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.chronicle.town/ 2>/dev/null || echo "000")
if [ "$STAGING_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Staging responding OK${NC}"
else
    echo -e "   ${YELLOW}⚠ Staging returned $STAGING_STATUS${NC}"
fi

echo ""
echo "================================="
if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}✗ Found $ERRORS critical issues. Fix before deploying.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All checks passed. Safe to deploy.${NC}"
    exit 0
fi
