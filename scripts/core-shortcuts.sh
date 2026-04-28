#!/bin/bash

# Use `gum` to list some shortcut operations for users to quickly select and execute.

declare -A shortcuts=(
  [console]="cd core && ./bin/rails console"
  [db:reset]="cd core && ./bin/rails db:reset"
  [db:schema:refresh]="cd core && ./bin/rails db:drop && ./bin/rails db:migrate && ./bin/rails db:schema:dump"
)

chosen=$(gum filter --header "Pick a shortcut to run:" --placeholder "Type to search..." "${!shortcuts[@]}")

if [[ -z "$chosen" ]]; then
  echo "No selection made."
  exit 1
fi

eval "${shortcuts[$chosen]}"
