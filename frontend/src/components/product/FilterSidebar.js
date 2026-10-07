import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Check, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { apiService } from '../../api';
import PriceRangeSlider from '../common/PriceRangeSlider';
import './FilterSidebar.css';

export const FilterSidebar = ({
  initialFilters = {},
  onFilterChange,
  hideSegments = false,
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
    setFilters({
      category: initialFilters.category || '',
      age_group: initialFilters.age_group || '',
      gender_category: initialFilters.gender_category || '',
      price_min: initialFilters.price_min || '',
      price_max: initialFilters.price_max || '',
      eco_tags: initialFilters.eco_tags || [],
      sort_by: initialFilters.sort_by || '-created_at',
    });
  }, [initialFilters]);

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.gender_category) count++;
    if (filters.age_group) count++;
    if (filters.price_min !== '' || filters.price_max !== '') count++;
    if (filters.eco_tags && filters.eco_tags.length > 0) count += filters.eco_tags.length;
    return count;
  }, [filters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    if (onFilterChange) onFilterChange(nextFilters);
  };

  const handleCategorySelect = (catName) => {
    const nextCat = filters.category === catName ? '' : catName;
    const nextFilters = { ...filters, category: nextCat };
    setFilters(nextFilters);
    if (onFilterChange) onFilterChange(nextFilters);
  };

  const handlePriceSliderChange = ({ price_min, price_max }) => {
    const nextFilters = {
      ...filters,
      price_min: price_min !== '' ? price_min : '',
      price_max: price_max !== '' ? price_max : '',
    };
    setFilters(nextFilters);
    if (onFilterChange) onFilterChange(nextFilters);
  };

  const toggleEcoTag = (tagName) => {
    const nextTags = filters.eco_tags.includes(tagName)
      ? filters.eco_tags.filter((t) => t !== tagName)
      : [...filters.eco_tags, tagName];

    const nextFilters = { ...filters, eco_tags: nextTags };
    setFilters(nextFilters);
    if (onFilterChange) onFilterChange(nextFilters);
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
    if (onFilterChange) onFilterChange(cleared);
  };

  return (
    <aside className="filter-sidebar-container">
      {/* Header */}
      <div className="filter-sidebar-header">
        <div className="filter-sidebar-title">
          <Filter size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-count-badge">{activeFilterCount}</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button type="button" className="filter-clear-btn" onClick={handleReset}>
            <RotateCcw size={12} style={{ display: 'inline', marginRight: '3px' }} />
            Reset all
          </button>
        )}
      </div>

      {/* 1. Sort By Dropdown */}
      <div className="filter-group">
        <div className="filter-section-title">Sort By</div>
        <select
          name="sort_by"
          className="form-select"
          value={filters.sort_by}
          onChange={handleInputChange}
        >
          <option value="-created_at">Newest Arrivals</option>
          <option value="popularity_score">Most Popular</option>
          <option value="current_price">Price: Low to High</option>
          <option value="-current_price">Price: High to Low</option>
          <option value="-rating">Highest Rated</option>
        </select>
      </div>

      {/* 2. Dual-Handle Price Range Slider */}
      <div className="filter-group">
        <div className="filter-section-title">
          <span>Price Range</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'none', fontWeight: 600 }}>
            ₹{filters.price_min || 0} - ₹{filters.price_max || '5000+'}
          </span>
        </div>
        <PriceRangeSlider
          min={0}
          max={5000}
          step={50}
          valueMin={filters.price_min}
          valueMax={filters.price_max}
          onChange={handlePriceSliderChange}
        />
      </div>

      {/* 3. Category List */}
      {categories.length > 0 && (
        <div className="filter-group">
          <div className="filter-section-title">Categories</div>
          <div className="filter-category-list">
            <button
              type="button"
              className={`filter-category-item ${filters.category === '' ? 'active' : ''}`}
              onClick={() => handleCategorySelect('')}
            >
              <div className="filter-radio-circle" />
              <span>All Categories</span>
            </button>
            {categories.map((c) => {
              const catName = c.name || c;
              const isSelected = filters.category === catName;
              return (
                <button
                  key={c.id || catName}
                  type="button"
                  className={`filter-category-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(catName)}
                >
                  <div className="filter-radio-circle" />
                  <span>{catName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Target Persona (Gender) */}
      {!hideSegments && genderCategories.length > 0 && (
        <div className="filter-group">
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

      {/* 5. Age Demographic */}
      {!hideSegments && ageGroups.length > 0 && (
        <div className="filter-group">
          <div className="filter-section-title">Age Group</div>
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

      {/* 6. Eco Sustainability Verification Tags */}
      {ecoTags.length > 0 && (
        <div className="filter-group">
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
                  {isSelected && (
                    <Check size={12} style={{ display: 'inline', marginRight: '3px' }} />
                  )}
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
