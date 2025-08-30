import React, { useState } from 'react';
import axios from 'axios';
import './SearchView.css';
import './StickerPrint.css';

const CatalogViewer = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/products/search?query=${query}`);
      setItems(res.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load items');
    }
  };

  const toggleSelect = (item) => {
    const isSelected = selectedItems.some(i => i.name === item.name);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => i.name !== item.name));
    } else if (selectedItems.length < 32) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">Royal India Grocers</h1>
      <h1 className="title">🛒 Shelf Label Printer</h1>

      <div className="search-bar">
        <input
          type="text"
          value={query}
          placeholder="Search product..."
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
        <button onClick={() => window.print()} className="print-button">Print</button>
        
      </div>

      {selectedItems.length > 0 && (
  <div className="selected-section">
    <h3>Selected for Printing ({selectedItems.reduce((t, i) => t + i.variations.length, 0)} labels)</h3>
    <div className="selected-items">
      {selectedItems.map((item, index) => (
        <div key={index} className="selected-card">
          <div className="card-header">
            <h4>{item.name}</h4>
            <button 
              className="remove-btn"
              onClick={() => setSelectedItems(selectedItems.filter(i => i.name !== item.name))}
            >
              ✕
            </button>
          </div>
          <div className="variations-count">
            {item.variations.map((v, i) => (
              <div key={i} className="selected-variant">
                <span>{v.name}</span>
                <span className="price">${(v.price / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <button 
      className="clear-all-btn"
      onClick={() => setSelectedItems([])}
    >
      Clear All
    </button>
  </div>
)}

      <p className="counter">Selected for printing: {selectedItems.reduce((t, i) => t + i.variations.length, 0)} / 32</p>
      {error && <p className="error">{error}</p>}

      <div className="search-results">
        {items.map((item, index) => {
          const isSelected = selectedItems.some(i => i.name === item.name);
          const disableClick = !isSelected && selectedItems.reduce((t, i) => t + i.variations.length, 0) >= 32;

          return (
            <div
              key={index}
              className={`search-card ${isSelected ? 'selected' : ''} ${disableClick ? 'disabled' : ''}`}
              onClick={() => {
                if (!disableClick || isSelected) toggleSelect(item);
              }}
            >
              <div className="card-header">
                <h3>{item.name}</h3>
                {isSelected && <span className="badge">✔</span>}
              </div>
              {item.variations.map((v, i) => (
                <div key={i} className="variant">
                  <p>{v.name}</p>
                  <p className="price">${(v.price / 100).toFixed(2)}</p>
                  <p className="barcode">{v.barcode}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Print-only label grid */}
      <div id="printArea" className="label-grid">
        {selectedItems.flatMap((item, itemIndex) =>
          item.variations.map((variant, vIndex) => (
            <div key={`label-${itemIndex}-${vIndex}`} className="label">
              <div className="label-content">
                <strong>{item.name}</strong>
                <p className="price">${(variant.price / 100).toFixed(2)}</p>
                <p className="barcode">{variant.barcode}</p>
              </div>
            </div>
          ))
        )}

        

        {/* Add blank labels to make up 32 total */}
        {Array.from({
          length: 32 - selectedItems.reduce((total, item) => total + item.variations.length, 0),
        }).map((_, i) => (
          <div key={`blank-${i}`} className="label print-only" />
        ))}
      </div>
    </div>
  );
};

export default CatalogViewer;
