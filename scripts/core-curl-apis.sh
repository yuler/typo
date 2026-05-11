#!/usr/bin/env bash

set -e
echo "🌍 Select environment:"
ENV=$(gum choose "local" "production")

if [ "$ENV" = "production" ]; then
  BASE_URL="http://app.typo.yuler.cc/api/v1"
else
  BASE_URL="http://localhost:3000/api/v1"
fi

api_v1_completions() {
  local URL="${BASE_URL}/completions"

  echo "📝 Please enter the text to be processed (Ctrl+D to finish, default: __fake_test_text__):"
  local TEXT=$(gum write --placeholder "Text to process...")

  if [ -z "$TEXT" ]; then
    TEXT="__fake_test_text__"
  fi

  echo "🤖 Please enter the prompt (optional, press Enter to use system default):"
  local PROMPT=$(gum input --placeholder "e.g., Translate to Japanese" --width 80)

  # Safely construct JSON payload using jq
  if [ -n "$PROMPT" ]; then
    local PAYLOAD=$(jq -n --arg text "$TEXT" --arg prompt "$PROMPT" '{text: $text, prompt: $prompt}')
  else
    local PAYLOAD=$(jq -n --arg text "$TEXT" '{text: $text}')
  fi

  echo ""
  gum style --foreground 212 "Payload:"
  echo "$PAYLOAD" | jq .

  echo ""
  gum spin --spinner minidot --title "Sending request to $URL..." -- \
    curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" > response.json

  echo ""
  gum style --foreground 82 "Response:"
  jq . response.json

  rm -f response.json
}

echo "Select an API to test:"
ACTION=$(gum choose "api_v1_completions")

case $ACTION in
  "api_v1_completions")
    api_v1_completions
    ;;
esac
