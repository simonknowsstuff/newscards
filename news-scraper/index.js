const Parser = require('rss-parser');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// Initialize Firebase Admin
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS in your environment
// or provide the path to the service account JSON file.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
  ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) 
  : null;

if (serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault()
  });
} else {
  console.warn("No Firebase credentials found. Running in dry-run mode.");
  console.warn("Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS in .env");
}

const db = admin.apps.length ? admin.firestore() : null;
const parser = new Parser();

const SOURCES = [
  {
    name: 'The Hindu - National',
    url: 'https://www.thehindu.com/news/national/feeder/default.rss',
    category: 'national'
  },
  {
    name: 'The Hindu - International',
    url: 'https://www.thehindu.com/news/international/feeder/default.rss',
    category: 'international'
  },
  {
    name: 'The Hindu - Business',
    url: 'https://www.thehindu.com/business/feeder/default.rss',
    category: 'business'
  }
];

/**
 * Scrapes a single RSS feed and returns formatted articles.
 */
async function scrapeFeed(source) {
  console.log(`Fetching ${source.name}...`);
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      description: item.contentSnippet || item.content || "",
      pubDate: item.pubDate || new Date().toISOString(),
      source: 'The Hindu',
      category: source.category,
      imageUrl: extractImage(item)
    }));
  } catch (error) {
    console.error(`Error scraping ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Attempts to extract an image URL from RSS item content or enclosures.
 */
function extractImage(item) {
  // 1. Try enclosures first
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  
  // 2. Try media:content (sometimes parsed by rss-parser into special fields)
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }

  // 3. Try parsing content with Cheerio if it looks like HTML
  const content = item.content || item.contentSnippet || "";
  if (content.includes('<img')) {
    const $ = cheerio.load(content);
    const imgSrc = $('img').attr('src');
    if (imgSrc) return imgSrc;
  }
  
  return null;
}

/**
 * Main function to run the scraping and update Firestore.
 */
async function run() {
  console.log("--- News Scraping Job Started ---");
  const allArticles = [];
  
  for (const source of SOURCES) {
    const articles = await scrapeFeed(source);
    allArticles.push(...articles);
  }

  console.log(`Total articles found: ${allArticles.length}`);

  if (db) {
    try {
      const newsCollection = db.collection('news');
      const batch = db.batch();

      // For a clean update, we might want to clear old news or just add new ones.
      // Here we update based on link to avoid duplicates but for simplicity 
      // in this "daily/hourly" job, we'll just add new ones or overwrite.
      
      // Let's implement a simple "clear and refill" or "add recent"
      // Clear old news (optional - depending on how data should persist)
      const snapshot = await newsCollection.limit(100).get();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));

      allArticles.slice(0, 50).forEach(article => {
        const docRef = newsCollection.doc();
        batch.set(docRef, {
          ...article,
          fetchedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log("Successfully updated Firestore with latest news.");
    } catch (error) {
      console.error("Error updating Firestore:", error);
    }
  } else {
    console.log("Dry run complete. No database connection.");
    console.log("Top 3 articles:", allArticles.slice(0, 3));
  }
  
  console.log("--- News Scraping Job Finished ---");
}

// Run the script
run().catch(err => {
  console.error("Critical error:", err);
  process.exit(1);
});
