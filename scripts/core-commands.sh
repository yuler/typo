#!/bin/bash

# Use `gum` to list some shortcut operations for users to quickly select and execute.
# Parallel arrays preserve insertion order.

names=()
commands=()
arg_prompts=()
default_args=()

add() { names+=("$1"); commands+=("$2"); arg_prompts+=("${3-}"); default_args+=("${4-}"); }

add "console" "./bin/rails console"
add "db:reset" "./bin/rails db:reset"
add "db:schema:refresh" "./bin/rails db:drop && ./bin/rails db:migrate:reset && ./bin/rails db:schema:dump"
add "generate:controller" "./bin/rails g controller" "Controller name and actions (e.g. Posts index show)" "--skip-routes --skip-helper --no-test-framework"

chosen=$(printf '%s\n' "${names[@]}" | gum filter --header "Pick a shortcut to run:" --placeholder "Type to search...")

if [[ -z "$chosen" ]]; then
  echo "No selection made."
  exit 1
fi

# Find the index of the chosen shortcut.
idx=-1
for i in "${!names[@]}"; do
  if [[ "${names[$i]}" == "$chosen" ]]; then
    idx=$i
    break
  fi
done

args=""
if [[ -n "${arg_prompts[$idx]}" ]]; then
  args=$(gum input --placeholder "${arg_prompts[$idx]}")
  if [[ -z "$args" ]]; then
    echo "No arguments provided, aborting."
    exit 1
  fi
fi

eval "cd core && ${commands[$idx]} $args ${default_args[$idx]}"
