#!/bin/bash

echo "🧹 Cleaning pull-robot for fresh rebuild..."

# Remove all compiled files and caches
rm -rf dist/
rm -rf node_modules/.cache/

# Keep only essential source files
echo "📁 Keeping only essential files..."

# List of files to KEEP (core functionality)
KEEP_FILES=(
  "config.ts"
  "logger.ts" 
  "databasePoller.ts"
  "databaseReader.ts"
  "databaseProcessor.ts"
  "poster.ts"
  "index.ts"
)

cd src/

# Remove all .ts files except the ones we want to keep
for file in *.ts; do
  keep=false
  for keep_file in "${KEEP_FILES[@]}"; do
    if [[ "$file" == "$keep_file" ]]; then
      keep=true
      break
    fi
  done
  
  if [[ "$keep" == false ]]; then
    echo "🗑️  Removing $file"
    rm -f "$file"
  else
    echo "✅ Keeping $file"
  fi
done

cd ..

echo "🔨 Running clean build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  echo "🚀 Starting pull-robot..."
  npm start
else
  echo "❌ Build failed - check errors above"
fi