# News Scraper Backend

This is a standalone Node.js script designed to scrape news from Indian newspapers (starting with **The Hindu**) and sync them directly to your Firestore database.

## Features
- Scrapes RSS feeds for reliable data.
- Extracts images and descriptions.
- Cleans and updates Firestore automatically.
- Designed for 24/7 server deployment (via Cron).

## Setup

1. **Install Dependencies**:
   ```bash
   cd news-scraper
   npm install
   ```

2. **Configure Firebase**:
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Project Settings > Service Accounts.
   - Click "Generate new private key".
   - Save the JSON file as `service-account.json` inside this folder.

3. **Environment Variables**:
   - Create a `.env` file from the example:
     ```bash
     cp .env.example .env
     ```
   - Set `FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json`.

4. **Test Run**:
   ```bash
   npm start
   ```

## Deployment as a Cron Job

To run this every hour on a Linux server:

1. Open crontab:
   ```bash
   crontab -e
   ```

2. Add the following line (adjust paths):
   ```bash
   0 * * * * /usr/bin/node /path/to/newscards/news-scraper/index.js >> /path/to/newscards/news-scraper/scraper.log 2>&1
   ```

## Categories
Currently scrapes:
- National
- International
- Business

using thehindu.com's RSS feeds.