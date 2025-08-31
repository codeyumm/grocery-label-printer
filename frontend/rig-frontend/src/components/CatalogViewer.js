import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SearchView.css';
import './StickerPrint.css';

const CatalogViewer = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '', show: false });
  const [scanMode, setScanMode] = useState(false);
  const inputRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  // Auto-focus input for scanner
  useEffect(() => {
    if (scanMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // Auto-detect barcode and process
  useEffect(() => {
    if (scanMode && query.length >= 8 && /^\d+$/.test(query)) {
      // Looks like a barcode - auto search and add
      handleBarcodeSearch();
    }
  }, [query, scanMode]);

  const showFeedback = (message, type) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    setFeedback({ message, type, show: true });
    
    // Auto-hide feedback after delay
    const delay = type === 'error' ? 4000 : 2000;
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(prev => ({ ...prev, show: false }));
    }, delay);
  };

  const handleBarcodeSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/products/search?query=${query}`);
      const foundItems = res.data || [];
      
      if (foundItems.length === 0) {
        showFeedback(`❌ Item not found - scan again`, 'error');
        setQuery(''); // Clear for next scan
        return;
      }

      // Auto-add first item found
      const item = foundItems[0];
      const isSelected = selectedItems.some(i => i.name === item.name);
      const currentLabelCount = selectedItems.reduce((t, i) => t + i.variations.length, 0);
      
      if (!isSelected && currentLabelCount + item.variations.length <= 32) {
        setSelectedItems([...selectedItems, item]);
        showFeedback(`✓ ${item.name} added (${item.variations.length} label${item.variations.length > 1 ? 's' : ''})`, 'success');
        
        // Play success sound
        playSound('success');
      } else if (currentLabelCount + item.variations.length > 32) {
        showFeedback(`❌ Queue full - print current batch first`, 'error');
        playSound('error');
      } else {
        // Item already selected - add duplicate anyway
        setSelectedItems([...selectedItems, item]);
        showFeedback(`✓ ${item.name} added again`, 'success');
        playSound('success');
      }
      
      setItems(foundItems);
      setQuery(''); // Clear for next scan
      setError('');
      
      // Keep focus on input for continuous scanning
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      
    } catch (err) {
      console.error(err);
      showFeedback(`❌ Search failed - try again`, 'error');
      playSound('error');
      setQuery(''); // Clear for next scan
    }
  };

  const handleManualSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/products/search?query=${query}`);
      setItems(res.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load items');
    }
  };

  const playSound = (type) => {
    // Create audio feedback
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    if (type === 'success') {
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.setValueAtTime(1000, context.currentTime + 0.1);
    } else {
      oscillator.frequency.setValueAtTime(400, context.currentTime);
      oscillator.frequency.setValueAtTime(300, context.currentTime + 0.1);
    }
    
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.2);
  };

  const toggleSelect = (item) => {
    const isSelected = selectedItems.some(i => i.name === item.name);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => i.name !== item.name));
    } else if (selectedItems.reduce((t, i) => t + i.variations.length, 0) + item.variations.length <= 32) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const currentLabelCount = selectedItems.reduce((t, i) => t + i.variations.length, 0);

  return (
    <div className="app-container">
      <h1 className="title">Royal India Grocers</h1>
      <h1 className="title">🛒 Shelf Label Printer</h1>

      {/* Scanning Mode Toggle */}
      <div className="scan-mode-toggle">
        <button 
          onClick={() => setScanMode(!scanMode)}
          className={`mode-button ${scanMode ? 'active' : ''}`}
        >
          {scanMode ? '📱 Scan Mode ON' : '📱 Enable Scan Mode'}
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback.show && (
        <div className={`feedback-banner ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <div className="search-bar">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={scanMode ? "Scan barcode here..." : "Search product..."}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !scanMode && handleManualSearch()}
          className={scanMode ? 'scan-input' : ''}
        />
        {!scanMode && (
          <button onClick={handleManualSearch}>Search</button>
        )}
        <button onClick={() => window.print()} className="print-button">
          Print ({currentLabelCount}/32)
        </button>
      </div>

      <p className="counter">
        Selected for printing: {currentLabelCount} / 32
        {scanMode && <span className="scan-status"> | 📱 Scan Mode Active</span>}
      </p>
      {error && <p className="error">{error}</p>}

      {/* Selected Items Section */}
      {selectedItems.length > 0 && (
        <div className="selected-section">
          <h3>Selected for Printing ({currentLabelCount} labels)</h3>
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

      {/* Search Results - only show in manual mode */}
      {!scanMode && (
        <div className="search-results">
          {items.map((item, index) => {
            const isSelected = selectedItems.some(i => i.name === item.name);
            const disableClick = !isSelected && currentLabelCount + item.variations.length > 32;

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
      )}

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
          length: 32 - currentLabelCount,
        }).map((_, i) => (
          <div key={`blank-${i}`} className="label print-only" />
        ))}
      </div>
    </div>
  );
};

export default CatalogViewer;