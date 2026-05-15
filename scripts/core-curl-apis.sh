#!/usr/bin/env bash

set -e

gum style --foreground 212 "🌍 Select environment:"
ENV=$(gum choose "local" "production")

if [ "$ENV" = "production" ]; then
  BASE_URL="https://app.typo.yuler.cc/api/v1"
else
  BASE_URL="http://localhost:3000/api/v1"
fi

api_v1_completions() {
  local URL="${BASE_URL}/completions"

  local TEXT=$(gum write --placeholder "Text to process..." --value "你好，世界" --header "📝 Please enter the text:")
  local PROMPT=$(gum write --placeholder "e.g., Translate to English" --width 80 --header "🤖 Please enter the prompt (optional):" --value "Translate to English")

  local PAYLOAD=$(jq -n --arg text "$TEXT" --arg prompt "$PROMPT" '{text: $text, prompt: $prompt}')

  printf "\n"
  gum style --foreground 212 "📦 Payload:"
  echo "$PAYLOAD" | jq .

  printf "\n"
  gum style --foreground 212 "🚀 Curl Command:"
  gum style --foreground 245 "curl -X POST ${URL} \\
    -H 'Content-Type: application/json' \\
    -d '${PAYLOAD}'"

  printf "\n"
  start_time=$(date +%s%3N)
  gum spin --spinner minidot --title "Sending request to $URL..." -- \
    curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" > response.json
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))

  printf "\n"
  gum style --foreground 82 "✅ Response (took $((duration))ms):"
  jq . response.json

  rm -f response.json
}

api_v1_device_authorization() {
  local URL="${BASE_URL}/device/authorization"

  printf "\n"
  gum style --foreground 212 "🚀 Curl Command:"
  gum style --foreground 245 "curl -X POST ${URL} -H 'Content-Type: application/json'"

  printf "\n"
  start_time=$(date +%s%3N)
  gum spin --spinner minidot --title "Sending request to $URL..." -- \
    curl -s -X POST "$URL" \
    -H "Content-Type: application/json" > response.json
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))

  printf "\n"
  gum style --foreground 82 "✅ Response (took $((duration))ms):"
  jq . response.json

  rm -f response.json
}

api_v1_device_token() {
  local URL="${BASE_URL}/device/token"

  local DEVICE_CODE=$(gum input --placeholder "Enter device_code..." --header "🔑 Please enter the device_code:")

  local PAYLOAD=$(jq -n --arg device_code "$DEVICE_CODE" '{device_code: $device_code}')

  printf "\n"
  gum style --foreground 212 "📦 Payload:"
  echo "$PAYLOAD" | jq .

  printf "\n"
  gum style --foreground 212 "🚀 Curl Command:"
  gum style --foreground 245 "curl -X POST ${URL} \\
    -H 'Content-Type: application/json' \\
    -d '${PAYLOAD}'"

  printf "\n"
  start_time=$(date +%s%3N)
  gum spin --spinner minidot --title "Sending request to $URL..." -- \
    curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" > response.json
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))

  printf "\n"
  gum style --foreground 82 "✅ Response (took $((duration))ms):"
  jq . response.json

  rm -f response.json
}

gum style --foreground 212 "🛠️ Select API action:"
ACTION=$(gum choose "api_v1_completions" "api_v1_device_authorization" "api_v1_device_token")

case $ACTION in
  "api_v1_completions")
    api_v1_completions
    ;;
  "api_v1_device_authorization")
    api_v1_device_authorization
    ;;
  "api_v1_device_token")
    api_v1_device_token
    ;;
esac
