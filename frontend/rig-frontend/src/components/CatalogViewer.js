import React, { useState } from 'react';
import axios from 'axios';

const CatalogViewer = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/products/search`);
      console.log(res)
      setItems(res.data.items || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not load items');
    }
  };

  return (
    <div>
      <h1>🛒 Grocery Shelf Label Printer</h1>
      <input
        type="text"
        value={query}
        placeholder="Search product..."
        onChange={e => setQuery(e.target.value)}
        style={{ padding: '8px', fontSize: '16px' }}
      />
      <button onClick={handleSearch} style={{ marginLeft: '8px' }}>Search</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '20px' }}>
        {items.map(item => (
          <div key={item.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '8px' }}>
            <strong>{item.item_data?.name}</strong>
            <p>{item.item_data?.description}</p>
            {item.item_data?.variations?.map(v => (
              <div key={v.id}>
                🧴 <em>{v.item_variation_data?.name}</em> — 💲{(v.item_variation_data?.price_money?.amount || 0) / 100}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CatalogViewer;
