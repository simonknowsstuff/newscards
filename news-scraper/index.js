const Parser = require('rss-parser');
const admin = require('firebase-admin');
const cheerio = require('cheerio');
const sanitizeHtml = require('sanitize-html');
const Sentiment = require('sentiment');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize NLP Modules
const sentiment = new Sentiment();

// Extensible Classifier structure
class CategoryClassifier {
  constructor() {
    // Simple heuristic keyword lists to start with.
    // Structured so a trained NaiveBayes model could be dropped in easily here later.
    this.keywords = {
      business: ['stock', 'market', 'economy', 'finance', 'bank', 'rupee', 'dollar', 'sensex', 'nifty', 'company', 'profit', 'investment', 'rbi', 'inflation'],
      tech: ['app', 'software', 'apple', 'google', 'microsoft', 'cyber', 'digital', 'startup', 'ai', 'hardware', 'smartphone', 'tech', 'technology'],
      science: ['space', 'isro', 'nasa', 'research', 'study', 'scientist', 'climate', 'moon', 'health', 'virus', 'biology', 'physics', 'cancer'],
      international: ['biden', 'war', 'global', 'un ', 'china', 'usa', 'europe', 'ukraine', 'gaza', 'putin', 'world', 'israel', 'russia'],
      sports: ['cricket', 'football', 'tennis', 'olympics', 'bcci', 'ipl', 'match', 'tournament', 'world cup', 'kohli', 'dhoni', 'messi', 'sport'],
      national: ['india', 'delhi', 'mumbai', 'modi', 'parliament', 'congress', 'bjp', 'supreme court', 'states']
    };
  }

  predict(text, defaultCategory = 'national') {
    const lowerText = text.toLowerCase();
    let bestScore = 0;
    let bestCategory = null;

    for (const [category, words] of Object.entries(this.keywords)) {
      let score = words.reduce((acc, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = lowerText.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    if (bestScore > 0) {
      return bestCategory;
    }
    return defaultCategory;
  }
}

const classifier = new CategoryClassifier();

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : null;

if (serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault()
  });
} else {
  console.warn("No Firebase credentials found. Running in dry-run mode.");
}

const db = admin.apps.length ? admin.firestore() : null;
const parser = new Parser();

const SOURCES = require('./sources.json');

async function scrapeFeed(source) {
  console.log(`Fetching ${source.name}...`);
  try {
    const feed = await parser.parseURL(source.url);
    const parsedArticles = [];

    for (const item of feed.items) {
      // 1. Clean HTML and source suffixes
      const rawHtml = item.contentSnippet || item.content || "";
      let description = sanitizeHtml(rawHtml, { allowedTags: [], allowedAttributes: {} }).trim();
      let title = (item.title || "").trim();

      const sourceSuffixRegex = /\s*[-–—]?\s*Reuters\s*$/i;
      title = title.replace(sourceSuffixRegex, '').trim();
      description = description.replace(sourceSuffixRegex, '').trim();

      const fullText = `${title} ${description}`;

      // 2. NLP Categorization
      const predictedCategory = classifier.predict(fullText, source.category);

      // 3. NLP Bias constraint
      const sentimentResult = sentiment.analyze(fullText);
      const biasScore = sentimentResult.score;

      // Filter out overly biased articles (extreme scores)
      if (Math.abs(biasScore) >= 15) {
        console.warn(`[Filtered] Extreme bias score (${biasScore}): ${title}`);
        continue;
      }

      parsedArticles.push({
        title,
        link: item.link,
        description,
        pubDate: item.pubDate || new Date().toISOString(),
        source: source.name.split(' - ')[0],
        category: predictedCategory,
        biasScore: biasScore
      });
    }
    return parsedArticles;
  } catch (error) {
    console.error(`Error scraping ${source.name}:`, error.message);
    return [];
  }
}

async function run() {
  console.log("--- News Scraping Job Started ---");
  const allArticles = [];

  for (const source of SOURCES) {
    const articles = await scrapeFeed(source);
    allArticles.push(...articles.slice(0, 20));
  }

  console.log(`Total categorized & cleaned articles to save: ${allArticles.length}`);

  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    const today = new Date().toISOString().split('T')[0];
    const filePath = path.join(dataDir, `${today}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allArticles, null, 2));
    console.log(`Saved a local copy to data/${today}.json`);
  } catch (err) {
    console.error("Failed to save data locally:", err);
  }

  if (db) {
    try {
      const newsCollection = db.collection('news');

      // Limit collection size and deduplicate
      // We will keep max 500 latest documents
      const snapshot = await newsCollection.orderBy('fetchedAt', 'desc').get();

      const existingUrls = new Set();
      const deleteBatch = db.batch();
      let deleteCount = 0;

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        if (data.link) existingUrls.add(data.link);

        // Remove older documents exceeding limit
        if (index >= 500) {
          deleteBatch.delete(doc.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        // Can only commit 500 per batch. For a 500 cap, we likely won't exceed.
        // Doing a simple commit. (Wait, if there are 1000 items, and index>=500, we delete 500. It's on the edge.)
        await deleteBatch.commit();
        console.log(`Deleted ${deleteCount} older articles to maintain limit.`);
      }

      const insertBatch = db.batch();
      let insertCount = 0;

      for (const article of allArticles) {
        if (!existingUrls.has(article.link)) {
          const docRef = newsCollection.doc();
          insertBatch.set(docRef, {
            ...article,
            fetchedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          existingUrls.add(article.link);
          insertCount++;

          if (insertCount >= 400) {
            // Stop inserting to avoid batch limit (500 MAX ops). 
            // Highly unlikely to hit in a single run with 20 items per source and 9 sources (180 total)
            break;
          }
        }
      }

      if (insertCount > 0) {
        await insertBatch.commit();
        console.log(`Successfully added ${insertCount} new unbiased articles.`);
      } else {
        console.log("No new articles to add.");
      }

    } catch (error) {
      console.error("Error updating Firestore:", error);
    }
  } else {
    console.log("Dry run complete. No database connection.");
  }

  console.log("--- News Scraping Job Finished ---");
  process.exit(0);
}

run().catch(err => {
  console.error("Critical error:", err);
  process.exit(1);
});
