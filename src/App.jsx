import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Deck from './components/Deck';
import './App.css';

// Fallback data in case Firebase is empty or fails


const CATEGORIES = ['national', 'international', 'business', 'science', 'tech'];

function App() {
  const [activeCategory, setActiveCategory] = useState('national');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track active index globally so the parent can give the "More Info" button the correct link
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const newsQuery = query(collection(db, 'news'));
      const snapshot = await getDocs(newsQuery);
      
      let fetchedNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (fetchedNews.length === 0) {
        setError('No news articles found. Please check back later.');
      } else {
        setNews(fetchedNews);
      }
    } catch (err) {
      console.error('Error fetching from Firestore:', err);
      setError('Failed to load news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveIndex(0); // reset position when switching category
  };

  const currentCategoryNews = news.filter(item => {
    // Normalizing to lowercase to match the button categories
    return item.category && item.category.toLowerCase() === activeCategory;
  });
  
  // Ensure we wrap for infinite iteration
  const safeIndex = currentCategoryNews.length > 0 ? (Math.abs(activeIndex) % currentCategoryNews.length) : 0;
  const currentArticle = currentCategoryNews[safeIndex];

  return (
    <div className="app-container">
      <header className="header">

        <div className="category-picker">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Fetching latest news...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchNews}>Retry</button>
        </div>
      ) : currentCategoryNews.length === 0 ? (
        <div className="empty-state">
          <p>No news in the <strong>{activeCategory}</strong> category today.</p>
        </div>
      ) : (
        <Deck 
          articles={currentCategoryNews} 
          activeIndex={safeIndex} 
          onNext={() => setActiveIndex(prev => prev + 1)}
          onPrev={() => setActiveIndex(prev => prev === 0 ? currentCategoryNews.length - 1 : prev - 1)}
        />
      )}

      {currentArticle && (
        <div className="bottom-bar">
          <a href={currentArticle.link} target="_blank" rel="noopener noreferrer" className="more-info-btn">
            More Info
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
