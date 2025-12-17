#!/bin/bash

# Ezoic Ads.txt Manager Update Script
# This script fetches the latest ads.txt content from Ezoic and updates your local file

# Configuration
ACCOUNT_ID="19390"
DOMAIN="braydenistallgames.online"
ADS_TXT_URL="https://srv.adstxtmanager.com/${ACCOUNT_ID}/${DOMAIN}"
LOCAL_ADS_TXT="ads.txt"

echo "Updating ads.txt from Ezoic Ads.txt Manager..."
echo "URL: ${ADS_TXT_URL}"

# Fetch the ads.txt content from Ezoic
curl -s "${ADS_TXT_URL}" > "${LOCAL_ADS_TXT}"

# Check if the curl command was successful
if [ $? -eq 0 ]; then
    echo "✅ Successfully updated ads.txt"
    echo "📄 File size: $(wc -c < ${LOCAL_ADS_TXT}) bytes"
    echo "📅 Updated at: $(date)"
else
    echo "❌ Failed to update ads.txt"
    exit 1
fi
