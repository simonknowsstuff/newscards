# Newscards
This project is more of a personal project that I don't intend to fully make public or display anywhere in my website. This project was developed to create a convenient way for me to read news from The Hindu in a flashcard format. I could probably add other newspapers as well but I'm not sure if I'll ever get around to doing that.

## Overview

The project consists of three main components:
- **Frontend**: A React + Vite application for the card-based UI.
- **Backend**: Firestore for data management.
- **News Scraper**: A standalone Node.js service that scrapes news from RSS feeds and syncs them to Firestore.

## Project Structure

```text
.
├── src/                # React frontend source code
├── news-scraper/       # Node.js scraper service
├── public/             # Static assets
├── firebase.json       # Firebase configuration
└── package.json        # Main project dependencies and scripts
```

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally (`npm install -g firebase-tools`)

### 1. Repository Setup
```bash
git clone <repository-url>
cd newscards
npm install
```

### 2. News Scraper Setup
Detailed instructions can be found in the [News Scraper README](./news-scraper/README.md).
```bash
cd news-scraper
npm install
# Configure your service-account.json and .env file as per the sub-directory README
cd ..
```

## Local Development

The project is configured to work with Firebase Emulators for safe local testing.

### Run everything together
```bash
npm run dev:all
```
This command will:
- Start the **Firebase Emulators** (Firestore).
- Start the **Vite Dev Server** for the frontend.

### Individual Commands
- **Frontend only**: `npm run dev`
- **Emulators only**: `npm run emulators`
- **Linting**: `npm run lint`

## Deployment

### Firestore
```bash
firebase deploy --only firestore
```

### News Scraper
The news scraper is designed to be run as a cron job on a server. See the [Scraper Documentation](./news-scraper/README.md) for more details.

## License
MIT

