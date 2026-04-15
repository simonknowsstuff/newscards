import React, { useState, useEffect, useRef } from 'react';
import Flashcard from './Flashcard';

export default function Deck({ articles, activeIndex, onNext, onPrev, direction }) {
  const [rotations, setRotations] = useState([]);
  const [exitingCard, setExitingCard] = useState(null);
  const [animatingDir, setAnimatingDir] = useState(direction);
  
  const prevIndexRef = useRef(activeIndex);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    // Generate random rotations for each article to simulate a stacked deck
    const newRots = articles.map(() => (Math.random() * 8) - 4); // -4deg to 4deg
    setRotations(newRots);
  }, [articles]);

  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      const oldIdx = prevIndexRef.current % articles.length;
      if (articles[oldIdx]) {
        setExitingCard(articles[oldIdx]);
        setAnimatingDir(direction);
        const timer = setTimeout(() => setExitingCard(null), 400);
        prevIndexRef.current = activeIndex;
        return () => clearTimeout(timer);
      }
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex, articles, direction]);

  if (!articles || articles.length === 0) {
    return <div className="empty-state">No news available in this category.</div>;
  }

  const onTouchStart = (e) => {
    setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      onNext();
    } else if (isRightSwipe) {
      onPrev();
    }
  };

  const currentIdx = activeIndex % articles.length;

  const renderCards = () => {
    const cardsToRender = [];
    
    // Render cards in stack
    for (let i = 3; i >= 0; i--) {
      const targetIdx = (currentIdx + i) % articles.length;
      if (articles[targetIdx]) {
        const isTop = i === 0;
        
        let scale = 1 - (i * 0.05); 
        let translateY = i * 15;
        let rotation = rotations[targetIdx] || 0;
        
        if (isTop) rotation = 0; 
        else rotation += (i % 2 === 0 ? 3 : -3);

        const style = {
          transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
          opacity: 1 - (i * 0.25),
          zIndex: 10 - i,
          filter: isTop ? 'none' : `blur(${i * 1.5}px)`,
        };

        cardsToRender.push(
          <Flashcard 
            key={articles[targetIdx].id || `article-${targetIdx}`} 
            article={articles[targetIdx]} 
            style={style}
            isTop={isTop}
          />
        );
      }
    }

    // Add exiting card on top if it exists
    if (exitingCard) {
      const exitStyle = {
        zIndex: 20,
        transform: animatingDir === 'next' 
          ? 'translateX(-150%) rotate(-20deg)' 
          : 'translateX(150%) rotate(20deg)',
        opacity: 0,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      };
      
      cardsToRender.push(
        <Flashcard 
          key={`exiting-${exitingCard.id}`} 
          article={exitingCard} 
          style={exitStyle}
          isTop={false} 
        />
      );
    }

    return cardsToRender;
  };

  return (
    <div className="deck-container">
      <button className="nav-btn prev" onClick={onPrev}>&#8592;</button>
      
      <div 
        className="card-stack"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        {renderCards()}
      </div>

      <button className="nav-btn next" onClick={onNext}>&#8594;</button>
    </div>
  );
}
