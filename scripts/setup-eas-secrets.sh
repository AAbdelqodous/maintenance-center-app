#!/bin/bash
# One-time EAS Secrets Setup Script
# Run this script once by a developer with access to the EAS project
# before the first preview/production build.

echo "Setting up EAS Secrets for Maintenance Center App"
echo "===================================================="
echo ""
echo "Note: The 'development' profile uses hardcoded localhost values in eas.json"
echo "      and does not require secrets. Only 'preview' and 'production' need secrets."
echo ""

echo "Setting up PREVIEW environment secrets..."
echo "-------------------------------------------"

# Preview environment secrets
eas secret:create --scope project --environment preview --name EXPO_PUBLIC_API_BASE_URL --value "<REPLACE_ME_WITH_PREVIEW_API_URL>"
eas secret:create --scope project --environment preview --name EXPO_PUBLIC_WS_URL --value "<REPLACE_ME_WITH_PREVIEW_WS_URL>"
eas secret:create --scope project --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value "<REPLACE_ME_WITH_PREVIEW_SENTRY_DSN>"
eas secret:create --scope project --environment preview --name SENTRY_ORG --value "<REPLACE_ME_WITH_SENTRY_ORG>"
eas secret:create --scope project --environment preview --name SENTRY_PROJECT --value "<REPLACE_ME_WITH_SENTRY_PROJECT>"
eas secret:create --scope project --environment preview --name EAS_PROJECT_ID --value "<REPLACE_ME_WITH_EAS_PROJECT_ID>"

echo ""
echo "Preview secrets configured."
echo ""

echo "Setting up PRODUCTION environment secrets..."
echo "----------------------------------------------"

# Production environment secrets
eas secret:create --scope project --environment production --name EXPO_PUBLIC_API_BASE_URL --value "<REPLACE_ME_WITH_PRODUCTION_API_URL>"
eas secret:create --scope project --environment production --name EXPO_PUBLIC_WS_URL --value "<REPLACE_ME_WITH_PRODUCTION_WS_URL>"
eas secret:create --scope project --environment production --name EXPO_PUBLIC_SENTRY_DSN --value "<REPLACE_ME_WITH_PRODUCTION_SENTRY_DSN>"
eas secret:create --scope project --environment production --name SENTRY_ORG --value "<REPLACE_ME_WITH_SENTRY_ORG>"
eas secret:create --scope project --environment production --name SENTRY_PROJECT --value "<REPLACE_ME_WITH_SENTRY_PROJECT>"
eas secret:create --scope project --environment production --name EAS_PROJECT_ID --value "<REPLACE_ME_WITH_EAS_PROJECT_ID>"

echo ""
echo "Production secrets configured."
echo ""
echo "===================================================="
echo "EAS Secrets setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify secrets are set: eas secret:list"
echo "2. Build preview: eas build --profile preview --platform ios"
echo "3. Build production: eas build --profile production --platform ios"
echo ""
