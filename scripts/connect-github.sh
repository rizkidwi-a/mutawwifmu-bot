#!/usr/bin/env bash
# Attach this repo to GitHub and push.
#
# Usage:
#   ./scripts/connect-github.sh owner/name
#   ./scripts/connect-github.sh https://github.com/owner/name
#   ./scripts/connect-github.sh owner/name ssh     # use SSH instead of HTTPS
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <owner/name | github repo url> [https|ssh]" >&2
  exit 1
fi

arg="$1"
mode="${2:-https}"

# Normalise whatever was passed into owner/name
slug="${arg#https://github.com/}"
slug="${slug#http://github.com/}"
slug="${slug#git@github.com:}"
slug="${slug%.git}"
slug="${slug%/}"

if [[ "$slug" != */* ]]; then
  echo "error: could not parse owner/name from '$arg'" >&2
  exit 1
fi

if [ "$mode" = "ssh" ]; then
  url="git@github.com:${slug}.git"
else
  url="https://github.com/${slug}.git"
fi

cd "$(dirname "$0")/.."

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$url"
  echo "updated remote origin -> $url"
else
  git remote add origin "$url"
  echo "added remote origin -> $url"
fi

branch="$(git symbolic-ref --short HEAD)"
git push -u origin "$branch"
echo "pushed '$branch' to $url"
