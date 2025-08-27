#!/bin/bash

echo "🧹 COMPLETELY WIPING src directory..."

# Remove entire src directory
rm -rf src/

# Create fresh src directory
mkdir -p src/

echo "✅ Fresh src directory created"
echo "📁 Contents of src/:"
ls -la src/