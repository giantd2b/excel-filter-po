#!/bin/bash
# Deploy IRIS CRM to Railway
# Builds frontend → copies to API → deploys

set -e

echo "Building frontend..."
cd dashboard
# MSYS_NO_PATHCONV stops Git Bash on Windows from rewriting "/api" into "C:/Program Files/Git/api"
MSYS_NO_PATHCONV=1 VITE_API_URL=/api npm run build
cd ..

echo "Copying frontend to API public..."
rm -rf apps/api/public
cp -r dashboard/dist apps/api/public

echo "Building booking page (outputs into apps/api/public/booking)..."
cd booking
npm run build
cd ..

echo "Deploying to Railway..."
cd apps/api
railway up

echo "Done!"
