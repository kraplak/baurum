#!/bin/zsh
set -euo pipefail

cd /Users/kraplak/Documents/BAURUM

mkdir -p notion_os

echo "Buarum OS Notion token setup"
echo
echo "Paste the Notion access token below and press Enter."
echo "It will be saved locally to notion_os/.env and will not be printed back."
echo

stty -echo
printf "NOTION_TOKEN: "
read token
stty echo
echo

if [[ -z "$token" ]]; then
  echo "Token is empty. Nothing was changed."
  exit 1
fi

cat > notion_os/.env <<EOF
NOTION_TOKEN=$token
NOTION_PARENT_PAGE_ID=3657222f634881f0b757fa4d0e9ace36
EOF

chmod 600 notion_os/.env

prefix="${token[1,4]}"
length="${#token}"

echo
echo "Saved token to notion_os/.env"
echo "Token prefix: ${prefix}..."
echo "Token length: ${length}"
echo "Next: return to Codex and say: token saved"
echo
read "?Press Enter to close this window..."
