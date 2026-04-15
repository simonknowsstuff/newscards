const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// Retrieve the API key securely from Firebase Secrets
const newsdataApiKey = defineSecret("NEWSDATA_API_KEY");

/**
 * Core logic to fetch news from NewsData API and sync to Firestore.
 * This is called by both the scheduled trigger and the direct function.
 */
async function performNewsSync() {
  const apiKey = newsdataApiKey.value();
  const categories = ["international", "tech", "science"];
  
  console.log("Starting news sync for categories:", categories);
  
  const fetchPromises = categories.map(async (cat) => {
    try {
      const response = await axios.get("https://newsdata.io/api/1/latest", {
        params: {
          apikey: apiKey,
          q: cat,
          removeduplicate: 1,
          language: "en",
          size: 8,
        },
      });
      
      let articles = response.data.results || [];
      if (articles.length > 8) {
        articles = articles.slice(0, 8);
      }
      console.log(`Fetched ${articles.length} articles for category: ${cat}`);
      return { category: cat, articles };
    } catch (error) {
      console.error(`Error fetching category '${cat}':`, error.message);
      return { category: cat, articles: [] };
    }
  });

  const allNews = await Promise.all(fetchPromises);

  const batch = db.batch();
  const newsCollection = db.collection("news");

  // Clear the old news before adding fresh ones
  const snapshot = await newsCollection.get();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  let itemsAdded = 0;
  // Add the newly fetched articles to Firestore
  allNews.forEach((newsGroup) => {
    newsGroup.articles.forEach((article) => {
      const docRef = newsCollection.doc();
      batch.set(docRef, {
        category: newsGroup.category,
        title: article.title || "No Title",
        link: article.link || article.url || "#",
        imageUrl: article.image_url || null,
        description: article.description || null,
        source: article.source_id || "",
        pubDate: article.pubDate || new Date().toISOString(),
      });
      itemsAdded++;
    });
  });

  await batch.commit();
  const message = `Successfully completed news sync. Total added: ${itemsAdded}`;
  console.log(message);
  return { success: true, itemsAdded, message };
}

/**
 * HTTP function that actually fetches the daily news.
 * Can be triggered via browser (GET) or via POST.
 */
exports.fetchDailyNews = onRequest(
  {
    secrets: [newsdataApiKey],
    timeoutSeconds: 120,
    cors: true, // Enable CORS so it can be called from the web app if needed
  },
  async (req, res) => {
    try {
      const result = await performNewsSync();
      res.status(200).send(result);
    } catch (err) {
      console.error("Error in fetchDailyNews execution:", err);
      res.status(500).send({ error: "Failed to fetch news." });
    }
  }
);

/**
 * Scheduled function whose only job is to trigger the news fetch every 24 hours.
 */
exports.scheduleDailyNews = onSchedule(
  {
    schedule: "every 24 hours",
    secrets: [newsdataApiKey],
    timeoutSeconds: 120,
  },
  async (event) => {
    console.log("Schedule triggered: Calling fetchDailyNews logic...");
    try {
      await performNewsSync();
    } catch (err) {
      console.error("Critical error in scheduleDailyNews execution:", err);
    }
  }
);
