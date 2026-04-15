import React, { useState, useEffect } from 'react';
import Flashcard from './Flashcard';

export default function Deck({ articles, activeIndex, onNext, onPrev }) {
  const [rotations, setRotations] = useState([]);

  useEffect(() => {
    // Generate random rotations for each article to simulate a stacked deck
    const newRots = articles.map(() => (Math.random() * 8) - 4); // -4deg to 4deg
    setRotations(newRots);
  }, [articles]);

  if (!articles || articles.length === 0) {
    return <div className="empty-state">No news available in this category.</div>;
  }

  const currentIdx = activeIndex % articles.length;

  const renderCards = () => {
    const cardsToRender = [];
    
    // Reverse loop so top card is rendered last (z-index naturally higher)
    // Render up to 4 cards behind
    for (let i = 3; i >= 0; i--) {
      const targetIdx = (currentIdx + i) % articles.length;
      if (articles[targetIdx]) {
        const isTop = i === 0;
        
        // Depth simulation
        let scale = 1 - (i * 0.05); 
        let translateY = i * 15;
        let rotation = rotations[targetIdx] || 0;
        
        // Make the top card straight for readability, background ones randomly rotated
        if (isTop) rotation = 0; 
        else rotation += (i % 2 === 0 ? 3 : -3); // exaggerated slightly for depth

        const style = {
          transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
          opacity: 1 - (i * 0.25),
          zIndex: 10 - i,
          filter: isTop ? 'none' : `blur(${i * 1.5}px)`,
        };

        cardsToRender.push(
          <Flashcard 
            key={`${articles[targetIdx].id || targetIdx}-${i}`} 
            article={articles[targetIdx]} 
            style={style}
            isTop={isTop}
          />
        );
      }
    }
    return cardsToRender;
  };

  return (
    <div className="deck-container">
      <button className="nav-btn prev" onClick={onPrev}>&#8592;</button>
      
      <div className="card-stack">
        {renderCards()}
      </div>

      <button className="nav-btn next" onClick={onNext}>&#8594;</button>
    </div>
  );
}
