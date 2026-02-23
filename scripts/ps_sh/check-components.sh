#!/bin/bash
for file in $(find . -name "*.tsx"); do
  if ! grep -q "export default" "$file"; then
    echo "Warning: $file missing default export"
  fi
done
