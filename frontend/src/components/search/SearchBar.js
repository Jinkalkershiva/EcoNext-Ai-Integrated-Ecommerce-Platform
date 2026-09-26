import React, { useState } from 'react';
import { Search, Camera, X } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const SearchBar = ({
  initialValue = '',
  onSearch,
  placeholder = 'Search eco-friendly products...',
  size = 'md',
  autoFocus = false
}) => {
  const [query, setQuery] = useState(initialValue);
  const { navigateTo } = useNavigation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (onSearch) {
      onSearch(query.trim());
    } else {
      navigateTo('search', { q: query.trim() });
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) onSearch('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
      }}
    >
      <Search
        size={size === 'lg' ? 20 : 16}
        style={{
          position: 'absolute',
          left: size === 'lg' ? '1.25rem' : '1rem',
          color: 'var(--text-muted)',
          pointerEvents: 'none'
        }}
      />
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          paddingLeft: size === 'lg' ? '3.25rem' : '2.75rem',
          paddingRight: '5.5rem',
          height: size === 'lg' ? '54px' : '44px',
          fontSize: size === 'lg' ? '1.05rem' : '0.925rem',
          borderRadius: 'var(--radius-full)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}
      >
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              borderRadius: '50%',
              cursor: 'pointer'
            }}
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={() => navigateTo('visual-search')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size === 'lg' ? '38px' : '32px',
            height: size === 'lg' ? '38px' : '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color var(--transition-fast)'
          }}
          title="Visual Search (Snap & Shop)"
        >
          <Camera size={size === 'lg' ? 18 : 16} />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
