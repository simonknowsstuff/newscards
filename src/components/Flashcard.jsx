import React from 'react';

export default function Flashcard({ article, style, isTop }) {
  const placeholderImg = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80";

  return (
    <div className="flashcard" style={style}>
      <div className="card-image-container">
        <img 
          src={article.imageUrl || placeholderImg} 
          alt={article.title} 
          className="card-image" 
          onError={(e) => { e.target.src = placeholderImg; }} 
        />
      </div>
      <div className="card-content">
        <span className="card-category">{article.category}</span>
        <h3 className="card-title">{article.title}</h3>
      </div>
    </div>
  );
}
