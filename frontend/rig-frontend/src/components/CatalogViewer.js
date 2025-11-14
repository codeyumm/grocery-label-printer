import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SearchView.css';
import './StickerPrint.css';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://5.161.116.2';

const CatalogViewer = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editedNames, setEditedNames] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '', show: false });
  const [scanMode, setScanMode] = useState(false);
  const [currentStore, setCurrentStore] = useState('');
  const [storeName, setStoreName] = useState('');
  const inputRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  // CSV Export states
  const [csvData, setCsvData] = useState([]);
  const [currentAisle, setCurrentAisle] = useState('');
  const [currentSide, setCurrentSide] = useState('left');

  // Bulk upload states
  const [bulkMode, setBulkMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [processedResults, setProcessedResults] = useState(null);
  const fileInputRef = useRef(null);

  // Store configuration
  const storeConfig = {
    erinmills: { name: 'Royal India Grocers - Erin Mills', color: '#007bff' },
    castlemore: { name: 'Royal India Grocers - Castlemore', color: '#28a745' }
  };

  // Detect store from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const store = urlParams.get('store') || 'erinmills';
    setCurrentStore(store);
    setStoreName(storeConfig[store]?.name || 'Royal India Grocers');
  }, []);

  // Auto-focus input for scanner
  useEffect(() => {
    if (scanMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  // Auto-detect barcode and process with debug logging
  useEffect(() => {
    let searchTimer;
    
    if (scanMode && query.length >= 8 && /^\d+$/.test(query)) {
      if (searchTimer) clearTimeout(searchTimer);
      
      searchTimer = setTimeout(() => {
        console.log('Auto-search triggered for barcode:', query);
        console.log('Store:', currentStore);
        console.log('Barcode length:', query.length);
        handleBarcodeSearch();
      }, 200);
    }
    
    return () => {
      if (searchTimer) clearTimeout(searchTimer);
    };
  }, [query, scanMode, currentStore]);

  const showFeedback = (message, type) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    setFeedback({ message, type, show: true });
    
    const delay = type === 'error' ? 4000 : 2000;
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(prev => ({ ...prev, show: false }));
    }, delay);
  };

  // CSV Export function
  const exportCSV = () => {
    if (csvData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Timestamp', 'Store', 'Aisle', 'Side', 'Product Name', 'Barcode', 'Price'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => [
        row.timestamp,
        row.store,
        row.aisle,
        row.side,
        `"${row.productName}"`,
        row.barcode,
        row.price
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_scan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Function to add item to CSV data
  const addToCSV = (item) => {
    if (currentAisle) {
      item.variations.forEach(variation => {
        setCsvData(prev => [...prev, {
          timestamp: new Date().toISOString(),
          store: currentStore,
          aisle: currentAisle,
          side: currentSide,
          productName: item.name,
          barcode: variation.barcode || variation.name,
          price: (variation.price / 100).toFixed(2)
        }]);
      });
      console.log('Added to CSV:', item.name, 'Aisle:', currentAisle);
    }
  };

  // Parse uploaded file (CSV or Excel)
  const parseUploadedFile = async (file) => {
    return new Promise((resolve, reject) => {
      const fileType = file.name.toLowerCase();
      
      if (fileType.endsWith('.csv')) {
        // Parse CSV using Papa Parse
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            // Simple CSV parsing - split by lines and comma
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            // Find barcode column
            const barcodeIndex = headers.findIndex(h => 
              h.includes('barcode') || h.includes('upc') || h.includes('code')
            );
            
            if (barcodeIndex === -1) {
              reject(new Error('No barcode column found. Expected column named "barcode", "upc", or "code"'));
              return;
            }
            
            const barcodes = lines.slice(1)
              .map(line => line.split(',')[barcodeIndex])
              .filter(barcode => barcode && barcode.trim())
              .map(barcode => barcode.trim().replace(/['"]/g, ''));
            
            resolve(barcodes);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsText(file);
        
      } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
        // Parse Excel using FileReader and basic parsing
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            // For demo purposes, let user know Excel parsing needs SheetJS
            reject(new Error('Excel files not yet supported. Please use CSV format.'));
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
        
      } else {
        reject(new Error('Unsupported file type. Please use CSV or Excel files.'));
      }
    });
  };

  // Process bulk barcodes
  const processBulkBarcodes = async (barcodes) => {
    const results = {
      total: barcodes.length,
      found: [],
      notFound: [],
      errors: []
    };

    setUploadProgress({ current: 0, total: barcodes.length });

    for (let i = 0; i < barcodes.length; i++) {
      const barcode = barcodes[i];
      
      try {
        setUploadProgress({ current: i + 1, total: barcodes.length });
        
        const res = await axios.get(`${BASE_URL}/api/stores/${currentStore}/products/search?query=${barcode}`);
        const foundItems = res.data || [];
        
        if (foundItems.length > 0) {
          const item = foundItems[0];
          results.found.push({
            barcode,
            item,
            name: item.name,
            variations: item.variations.length
          });
          
          // Auto-add to selected items
          const isAlreadySelected = selectedItems.some(i => i.name === item.name);
          if (!isAlreadySelected) {
            setSelectedItems(prev => [...prev, item]);
            addToCSV(item);
          }
        } else {
          results.notFound.push(barcode);
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing barcode ${barcode}:`, error);
        results.errors.push({ barcode, error: error.message });
      }
    }

    setUploadProgress(null);
    setProcessedResults(results);
    
    showFeedback(
      `Processed ${results.total} barcodes: ${results.found.length} found, ${results.notFound.length} not found`,
      results.found.length > 0 ? 'success' : 'error'
    );
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      showFeedback('Parsing file...', 'success');
      const barcodes = await parseUploadedFile(file);
      
      if (barcodes.length === 0) {
        showFeedback('No barcodes found in file', 'error');
        return;
      }
      
      showFeedback(`Found ${barcodes.length} barcodes. Processing...`, 'success');
      await processBulkBarcodes(barcodes);
      
    } catch (error) {
      console.error('File upload error:', error);
      showFeedback(`File error: ${error.message}`, 'error');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleBarcodeSearch = async () => {
    if (!currentStore) {
      showFeedback('Store not selected', 'error');
      return;
    }

    try {
      const searchQuery = query.trim();
      const res = await axios.get(`${BASE_URL}/api/stores/${currentStore}/products/search?query=${searchQuery}`);
      const foundItems = res.data || [];
      
      if (foundItems.length === 0) {
        showFeedback(`Item not found in ${storeConfig[currentStore]?.name} - scan again`, 'error');
        setQuery('');
        return;
      }

      const item = foundItems[0];
      const isSelected = selectedItems.some(i => i.name === item.name);
      const currentLabelCount = selectedItems.reduce((t, i) => t + i.variations.length, 0);
      
      if (!isSelected && currentLabelCount + item.variations.length <= 32) {
        setSelectedItems([...selectedItems, item]);
        addToCSV(item);
        showFeedback(`${item.name} added (${item.variations.length} label${item.variations.length > 1 ? 's' : ''})`, 'success');
        playSound('success');
      } else if (currentLabelCount + item.variations.length > 32) {
        showFeedback(`Queue full - print current batch first`, 'error');
        playSound('error');
      } else {
        setSelectedItems([...selectedItems, item]);
        addToCSV(item);
        showFeedback(`${item.name} added again`, 'success');
        playSound('success');
      }
      
      setItems(foundItems);
      setQuery('');
      setError('');
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      
    } catch (err) {
      console.error('Search error:', err);
      showFeedback(`Search failed - try again`, 'error');
      playSound('error');
      setQuery('');
    }
  };

  const handleManualSearch = async () => {
    if (!currentStore) {
      setError('Store not selected');
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/stores/${currentStore}/products/search?query=${query}`);
      setItems(res.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load items');
    }
  };

  const playSound = (type) => {
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
      const newEditedNames = { ...editedNames };
      delete newEditedNames[item.name];
      setEditedNames(newEditedNames);
    } else if (selectedItems.reduce((t, i) => t + i.variations.length, 0) + item.variations.length <= 32) {
      setSelectedItems([...selectedItems, item]);
      addToCSV(item);
    }
  };

  const getDisplayName = (item) => {
    return editedNames[item.name] || item.name;
  };

  const handleNameEdit = (item, newName) => {
    if (newName.trim() === '') {
      const newEditedNames = { ...editedNames };
      delete newEditedNames[item.name];
      setEditedNames(newEditedNames);
    } else {
      setEditedNames({
        ...editedNames,
        [item.name]: newName.trim()
      });
    }
  };

  const resetName = (item) => {
    const newEditedNames = { ...editedNames };
    delete newEditedNames[item.name];
    setEditedNames(newEditedNames);
    setEditingItem(null);
  };

  const formatNameForLabel = (name) => {
    const words = name.split(' ');
    if (words.length <= 3) return name;
    
    const firstLine = words.slice(0, 3).join(' ');
    const secondLine = words.slice(3).join(' ');
    
    return `${firstLine}\n${secondLine}`;
  };

  const switchStore = (storeId) => {
    const newUrl = `${window.location.pathname}?store=${storeId}`;
    window.location.href = newUrl;
  };

  const currentLabelCount = selectedItems.reduce((t, i) => t + i.variations.length, 0);

  return (
    <div className="app-container">
      {/* Store Header */}
      <div className="store-header" style={{ borderBottomColor: storeConfig[currentStore]?.color }}>
        <h1 className="title">{storeName}</h1>
        <h1 className="title">🛒 Shelf Label Printer</h1>
        
        <div className="store-switcher">
          <button 
            onClick={() => switchStore('erinmills')}
            className={`store-button ${currentStore === 'erinmills' ? 'active' : ''}`}
            style={{ backgroundColor: currentStore === 'erinmills' ? storeConfig.erinmills.color : 'transparent' }}
          >
            Erin Mills
          </button>
          <button 
            onClick={() => switchStore('castlemore')}
            className={`store-button ${currentStore === 'castlemore' ? 'active' : ''}`}
            style={{ backgroundColor: currentStore === 'castlemore' ? storeConfig.castlemore.color : 'transparent' }}
          >
            Castlemore
          </button>
        </div>
      </div>

      {/* CSV Tracker */}
      <div className="csv-tracker">
        <div className="tracker-inputs">
          <input
            type="text"
            value={currentAisle}
            onChange={e => setCurrentAisle(e.target.value)}
            placeholder="Aisle (e.g., A1, Dairy)"
            className="aisle-input"
            maxLength="10"
          />
          <select 
            value={currentSide} 
            onChange={e => setCurrentSide(e.target.value)}
            className="side-select"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
          <button 
            onClick={exportCSV}
            className="export-btn"
            disabled={csvData.length === 0}
          >
            Export CSV ({csvData.length})
          </button>
          <button 
            onClick={() => setCsvData([])}
            className="clear-btn"
            disabled={csvData.length === 0}
          >
            Clear Data
          </button>
        </div>
        {currentAisle && (
          <div className="current-tracking">
            Tracking: {currentAisle} - {currentSide} side
          </div>
        )}
      </div>

      {/* Bulk Upload Section */}
      <div className="bulk-upload-section">
        <div className="bulk-header">
          <button 
            onClick={() => setBulkMode(!bulkMode)}
            className={`bulk-toggle ${bulkMode ? 'active' : ''}`}
          >
            {bulkMode ? 'Bulk Upload ON' : 'Enable Bulk Upload'}
          </button>
        </div>
        
        {bulkMode && (
          <div className="bulk-controls">
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="file-input"
                id="bulk-file-input"
              />
              <label htmlFor="bulk-file-input" className="file-label">
                Choose CSV or Excel file with barcodes
              </label>
              <p className="file-hint">
                File should have a column named "barcode", "upc", or "code"
              </p>
            </div>
            
            {uploadProgress && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <span className="progress-text">
                  Processing {uploadProgress.current} of {uploadProgress.total} barcodes...
                </span>
              </div>
            )}
            
            {processedResults && (
              <div className="bulk-results">
                <h4>Bulk Processing Results:</h4>
                <div className="results-summary">
                  <span className="result-item success">Found: {processedResults.found.length}</span>
                  <span className="result-item error">Not Found: {processedResults.notFound.length}</span>
                  <span className="result-item warning">Errors: {processedResults.errors.length}</span>
                </div>
                <button 
                  onClick={() => setProcessedResults(null)}
                  className="clear-results-btn"
                >
                  Clear Results
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      {!bulkMode && (
        <div className="scan-mode-toggle">
          <button 
            onClick={() => setScanMode(!scanMode)}
            className={`mode-button ${scanMode ? 'active' : ''}`}
          >
            {scanMode ? 'Scan Mode ON' : 'Enable Scan Mode'}
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback.show && (
        <div className={`feedback-banner ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {!bulkMode && (
        <div className="search-bar">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={scanMode ? `Scan barcode here (${currentStore})...` : "Search product..."}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !scanMode && handleManualSearch()}
            onFocus={scanMode ? () => setQuery('') : undefined}
            className={scanMode ? 'scan-input' : ''}
          />
          {!scanMode && (
            <button onClick={handleManualSearch}>Search</button>
          )}
          {scanMode && (
            <button 
              onClick={() => setQuery('')}
              className="clear-input-btn"
              type="button"
            >
              Clear
            </button>
          )}
          <button onClick={() => window.print()} className="print-button">
            Print ({currentLabelCount}/32)
          </button>
        </div>
      )}

      <p className="counter">
        Selected for printing: {currentLabelCount} / 32
        {scanMode && <span className="scan-status"> | 📱 Scan Mode Active ({currentStore})</span>}
        {bulkMode && <span className="bulk-status"> | 📁 Bulk Upload Mode</span>}
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
                  {editingItem === item.name ? (
                    <div className="edit-name-container">
                      <input
                        type="text"
                        value={getDisplayName(item)}
                        onChange={(e) => handleNameEdit(item, e.target.value)}
                        onBlur={() => setEditingItem(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingItem(null);
                          if (e.key === 'Escape') {
                            resetName(item);
                          }
                        }}
                        className="edit-name-input"
                        maxLength="30"
                        autoFocus
                      />
                      <div className="edit-controls">
                        <span className="char-counter">
                          {getDisplayName(item).length}/30
                        </span>
                        <button 
                          className="reset-btn"
                          onClick={() => resetName(item)}
                          title="Reset to original"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h4 
                      onClick={() => setEditingItem(item.name)}
                      className="editable-name"
                      title="Click to edit name"
                    >
                      {getDisplayName(item)}
                      {editedNames[item.name] && <span className="edited-indicator">✎</span>}
                    </h4>
                  )}
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      setSelectedItems(selectedItems.filter(i => i.name !== item.name));
                      const newEditedNames = { ...editedNames };
                      delete newEditedNames[item.name];
                      setEditedNames(newEditedNames);
                    }}
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
            onClick={() => {
              setSelectedItems([]);
              setEditedNames({});
              setEditingItem(null);
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Search Results - only show in manual mode */}
      {!scanMode && !bulkMode && (
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
                    <strong style={{whiteSpace: 'pre-line'}}>
                      {formatNameForLabel(getDisplayName(item))}
                    </strong>
                    <p className="price">${(variant.price / 100).toFixed(2)}</p>
                    <p className="barcode">{variant.barcode}</p>
                </div>
            </div>
          ))
        )}

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