#!/bin/bash

echo "Checking branch for deployment... (Current branch: $VERCEL_GIT_COMMIT_REF)"

# Only allow builds on 'main' and 'develop' branches
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" == "develop" ]]; then
  echo "✅ - Branch is main or develop. Build will proceed."
  exit 1
else
  echo "🛑 - Branch is $VERCEL_GIT_COMMIT_REF. Build cancelled. We only deploy main and develop."
  exit 0
fi
