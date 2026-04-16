import React from 'react';

export default function Flashcard({ article, style, isTop }) {
  // Generate a stable gradient based on the article ID
  const getGradient = (id = 'default') => {
    const colors = [
      ['#FF3CAC', '#784BA0', '#2B86C5'],
      ['#00DBDE', '#FC00FF'],
      ['#f093fb', '#f5576c'],
      ['#667eea', '#764ba2'],
      ['#2af598', '#009efd'],
      ['#ff0844', '#ffb199'],
      ['#96fbc4', '#f9f586'],
      ['#0093E9', '#80D0C7'],
      ['#8EC5FC', '#E0C3FC'],
      ['#FBAB7E', '#F7CE68']
    ];
    let hash = 0;
    const str = id.toString();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pair = colors[Math.abs(hash) % colors.length];
    return `linear-gradient(135deg, ${pair.join(', ')})`;
  };

  const cardStyle = {
    ...style,
    background: getGradient(article.id),
  };

  const titleSize = article.title?.length > 80 ? '1.4rem' : article.title?.length > 50 ? '1.6rem' : '1.8rem';
  const descSize = article.description?.length > 150 ? '0.85rem' : '1rem';

  return (
    <div className="flashcard" style={cardStyle}>
      <div className="card-content full-card">
        <h3 className="card-title" style={{ fontSize: titleSize }}>{article.title}</h3>
        {article.description && (
          <p className="card-description" style={{ fontSize: descSize }}>{article.description}</p>
        )}
        
        <div className="card-spacer"></div>

        <div className="card-actions">
          <a 
            href={article.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="more-info-btn inverse"
            style={{ 
              pointerEvents: isTop ? 'auto' : 'none',
              backgroundColor: article.biasScore > 0.5 ? '#60a5fa' : article.biasScore < -0.5 ? '#f87171' : 'rgba(255, 255, 255, 0.2)',
              color: (article.biasScore > 0.5 || article.biasScore < -0.5) ? '#111' : '#fff',
              borderColor: (article.biasScore > 0.5 || article.biasScore < -0.5) ? 'transparent' : 'rgba(255, 255, 255, 0.3)'
            }}
          >
            More Info
          </a>
        </div>
      </div>
    </div>
  );
}
