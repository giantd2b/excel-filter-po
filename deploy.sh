#!/bin/bash
# Deploy IRIS CRM to Railway
# Builds frontend → copies to API → deploys

set -e

echo "Building frontend..."
cd dashboard
VITE_API_URL=/api npm run build
cd ..

echo "Copying frontend to API public..."
rm -rf apps/api/public
cp -r dashboard/dist apps/api/public

echo "Deploying to Railway..."
cd apps/api
railway up

echo "Done!"
