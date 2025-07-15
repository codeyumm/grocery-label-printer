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
      console.log(res);
      setItems(res.data || []);
      setSelectedItems([]); // Reset selection on new search
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
      <h1>🛒 Shelf Label Printer</h1>

      <div className="search-bar">
        <input
          type="text"
          value={query}
          placeholder="Search product..."
          onChange={e => setQuery(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
        <button onClick={() => window.print()} className="print-button">🖨️ Print</button>
      </div>

      <p className="counter">Selected for printing: {selectedItems.length} / 32</p>
      {error && <p className="error">{error}</p>}

      <div className="search-results">
        {items.map((item, index) => {
          const isSelected = selectedItems.some(i => i.name === item.name);
          return (
            <div key={index} className="search-card">
              <label>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item)}
                  disabled={!isSelected && selectedItems.length >= 32}
                />
                Select
              </label>
              <h3>{item.name}</h3>
              {item.variations.map((v, i) => (
                <p key={i}>{v.name}${v.price / 100}</p>
              ))}

              {item.variations.map((v, i) => (
                <p key={i}>{v.barcode}</p>

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
        <strong>{item.name}</strong>
        <p>${variant.price / 100}</p>
        <p>{variant.barcode}</p>
      </div>
    ))
  )}

  {/* Add blank labels only during print */}
  {Array.from({ length: 32 - selectedItems.reduce((total, item) => total + item.variations.length, 0) }).map((_, i) => (
    <div key={`blank-${i}`} className="label print-only" />
  ))}
</div>

    </div>
  );
};

export default CatalogViewer;