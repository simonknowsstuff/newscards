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
  const [direction, setDirection] = useState('next');

  const currentCategoryNews = news.filter(item => {
    // Normalizing to lowercase to match the button categories
    return item.category && item.category.toLowerCase() === activeCategory;
  });
  
  const lastFetched = currentCategoryNews.length > 0 
    ? new Date(Math.max(...currentCategoryNews.map(a => a.pubDate ? new Date(a.pubDate).getTime() : 0))).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const newsQuery = query(collection(db, 'news'));
      const snapshot = await getDocs(newsQuery);
      
      let fetchedNews = snapshot.docs.map(doc => {
        const data = doc.data();
        let title = data.title || '';
        let description = data.description || '';
        
        // Filter out trailing "Reuters" found in existing data
        const reutersRegex = /\s*[-–—]?\s*Reuters\s*$/i;
        if (title) title = title.replace(reutersRegex, '').trim();
        if (description) description = description.replace(reutersRegex, '').trim();

        return { 
          id: doc.id, 
          ...data,
          title,
          description
        };
      });
      
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
    setDirection('next');
  };

  const handleNext = () => {
    setDirection('next');
    setActiveIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    setDirection('prev');
    setActiveIndex(prev => prev === 0 ? currentCategoryNews.length - 1 : prev - 1);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentCategoryNews.length === 0) return;
      
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCategoryNews.length]); // Re-bind if news length changes

  // Ensure we wrap for infinite iteration
  const safeIndex = currentCategoryNews.length > 0 ? (Math.abs(activeIndex) % currentCategoryNews.length) : 0;
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
          direction={direction}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}

      {(() => {
        const article = currentCategoryNews[safeIndex];
        if (!article || typeof article.biasScore === 'undefined') return null;
        const absScore = Math.abs(article.biasScore);
        if (absScore <= 0.5) return null;

        const isRight = article.biasScore > 0;
        const biasType = absScore > 1.5 ? (isRight ? 'Strongly Right-leaning' : 'Strongly Left-leaning') : (isRight ? 'Right-leaning' : 'Left-leaning');
        const biasDesc = isRight ? 'This article may favor conservative or traditional perspectives.' : 'This article may favor liberal or progressive perspectives.';
        
        return (
          <div className={`bias-info-box ${isRight ? 'right' : 'left'}`}>
            <div className="bias-type">
              {biasType} <span className="bias-score-value">({article.biasScore})</span>
            </div>
            <div className="bias-description">{biasDesc}</div>
          </div>
        );
      })()}

      {lastFetched && (
        <footer className="footer">
          <p>Latest {activeCategory} news from {lastFetched}</p>
        </footer>
      )}
    </div>
  );
}

export default App;
