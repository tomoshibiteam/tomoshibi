# Setup Guide

This project requires environment variables to be configured for each application.

## Prerequisites
- Node.js (v20+ recommended)
- Supabase account
- Google Maps API Key
- MapTiler Key
- Gemini API Key

## Configuration Steps

### 1. Root Configuration
Copy the example files in the root directory:
```bash
cp .env.example .env
cp .env.shared.example .env.shared
```
Edit `.env` and `.env.shared` to fill in your API keys.

### 2. City Trail LP Configuration
Navigate to `apps/city-trail-lp` and copy the example file:
```bash
cd apps/city-trail-lp
cp .env.local.example .env.local
```
Edit `.env.local` to add your keys. Some keys might be shared with the root or mobile app.

### 3. Mobile App Configuration
Navigate to `apps/mobile` and copy the example file:
```bash
cd apps/mobile
cp .env.example .env
```
Edit `.env` to add your keys.

## Running the Apps
To start both servers concurrently:
```bash
npm run dev
```
- LP: http://localhost:4173
- Mobile: http://localhost:4174
