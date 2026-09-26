import React, { useState, useEffect } from 'react';
import { Filter, Check, Sparkles } from 'lucide-react';
import { apiService } from '../../api';
import './FilterSidebar.css';

export const FilterSidebar = ({
  initialFilters = {},
  onFilterChange,
  hideSegments = false
}) => {
  const [categories, setCategories] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  const [genderCategories, setGenderCategories] = useState([]);
  const [ecoTags, setEcoTags] = useState([]);

  const [filters, setFilters] = useState({
    category: initialFilters.category || '',
    age_group: initialFilters.age_group || '',
    gender_category: initialFilters.gender_category || '',
    price_min: initialFilters.price_min || '',
    price_max: initialFilters.price_max || '',
    eco_tags: initialFilters.eco_tags || [],
    sort_by: initialFilters.sort_by || '-created_at',
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [cats, ages, genders, tags] = await Promise.all([
          apiService.getCategories(),
          apiService.getAgeGroups(),
          apiService.getGenderCategories(),
          apiService.getEcoTags(),
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setAgeGroups(Array.isArray(ages) ? ages : []);
        setGenderCategories(Array.isArray(genders) ? genders : []);
        setEcoTags(Array.isArray(tags) ? tags : []);
      } catch (err) {
        console.warn('Error loading filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    onFilterChange && onFilterChange(nextFilters);
  };

  const toggleEcoTag = (tagName) => {
    const nextTags = filters.eco_tags.includes(tagName)
      ? filters.eco_tags.filter(t => t !== tagName)
      : [...filters.eco_tags, tagName];

    const nextFilters = { ...filters, eco_tags: nextTags };
    setFilters(nextFilters);
    onFilterChange && onFilterChange(nextFilters);
  };

  const handleReset = () => {
    const cleared = {
      category: '',
      age_group: hideSegments ? initialFilters.age_group || '' : '',
      gender_category: hideSegments ? initialFilters.gender_category || '' : '',
      price_min: '',
      price_max: '',
      eco_tags: [],
      sort_by: '-created_at',
    };
    setFilters(cleared);
    onFilterChange && onFilterChange(cleared);
  };

  return (
    <aside className="filter-sidebar-container">
      <div className="filter-sidebar-header">
        <div className="filter-sidebar-title">
          <Filter size={18} />
          <span>Filters & Sort</span>
        </div>
        <button type="button" className="filter-clear-btn" onClick={handleReset}>
          Reset all
        </button>
      </div>

      {/* Sort By */}
      <div>
        <div className="filter-section-title">Sort By</div>
        <select
          name="sort_by"
          className="form-select"
          value={filters.sort_by}
          onChange={handleInputChange}
        >
          <option value="-created_at">✨ Newest Arrivals</option>
          <option value="popularity_score">🔥 Most Popular</option>
          <option value="current_price">💰 Price: Low to High</option>
          <option value="-current_price">💎 Price: High to Low</option>
        </select>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <div className="filter-section-title">Category</div>
          <select
            name="category"
            className="form-select"
            value={filters.category}
            onChange={handleInputChange}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Gender Category (if not on a dedicated segment page) */}
      {!hideSegments && genderCategories.length > 0 && (
        <div>
          <div className="filter-section-title">Target Persona</div>
          <select
            name="gender_category"
            className="form-select"
            value={filters.gender_category}
            onChange={handleInputChange}
          >
            <option value="">All Personas</option>
            {genderCategories.map((g) => (
              <option key={g.id || g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Age Group */}
      {!hideSegments && ageGroups.length > 0 && (
        <div>
          <div className="filter-section-title">Age Demographic</div>
          <select
            name="age_group"
            className="form-select"
            value={filters.age_group}
            onChange={handleInputChange}
          >
            <option value="">All Ages</option>
            {ageGroups.map((a) => (
              <option key={a.id || a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range */}
      <div>
        <div className="filter-section-title">Price Range (₹)</div>
        <div className="price-inputs-row">
          <input
            type="number"
            name="price_min"
            placeholder="Min ₹"
            className="form-input"
            value={filters.price_min}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="price_max"
            placeholder="Max ₹"
            className="form-input"
            value={filters.price_max}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Eco Sustainability Tags */}
      {ecoTags.length > 0 && (
        <div>
          <div className="filter-section-title">
            <span>Eco Verification</span>
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="filter-tags-grid">
            {ecoTags.map((tag) => {
              const name = typeof tag === 'object' ? tag.name : tag;
              const isSelected = filters.eco_tags.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`filter-tag-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleEcoTag(name)}
                >
                  {isSelected && <Check size={12} style={{ display: 'inline', marginRight: '3px' }} />}
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default FilterSidebar;
