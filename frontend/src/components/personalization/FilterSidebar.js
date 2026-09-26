import React, { useState, useEffect } from 'react';
import styles from './FilterSidebar.module.css';
import { apiService } from '../../api';

const FilterSidebar = ({ onFilterChange }) => {
    const [ageGroups, setAgeGroups] = useState([]);
    const [genderCategories, setGenderCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [ecoTags, setEcoTags] = useState([]);
    const [filters, setFilters] = useState({
        age_group: '',
        gender_category: '',
        category: '',
        price_min: '',
        price_max: '',
        eco_tags: [],
        sort_by: '-created_at',
    });

    useEffect(() => {
        const fetchFilterData = async () => {
            const [ages, genders, cats, tags] = await Promise.all([
                apiService.getAgeGroups(),
                apiService.getGenderCategories(),
                apiService.getCategories(),
                apiService.getEcoTags(),
            ]);
            setAgeGroups(Array.isArray(ages) ? ages : []);
            setGenderCategories(Array.isArray(genders) ? genders : []);
            setCategories(Array.isArray(cats) ? cats : []);
            setEcoTags(Array.isArray(tags) ? tags : []);
        };
        fetchFilterData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
    };

    const handleEcoTagChange = (e) => {
        const { value, checked } = e.target;
        const newEcoTags = checked
            ? [...filters.eco_tags, value]
            : filters.eco_tags.filter(tag => tag !== value);
        setFilters({ ...filters, eco_tags: newEcoTags });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onFilterChange(filters);
    };

    return (
        <div className={styles.sidebar}>
            <h3 className={styles.title}>Filters</h3>
            <form onSubmit={handleSubmit}>
                {/* Age Group */}
                <div className={styles.filterGroup}>
                    <label>Age Group</label>
                    <select name="age_group" value={filters.age_group} onChange={handleInputChange}>
                        <option value="">All</option>
                        {ageGroups.map(ag => <option key={ag.id} value={ag.name}>{ag.name}</option>)}
                    </select>
                </div>

                {/* Gender Category */}
                <div className={styles.filterGroup}>
                    <label>Gender</label>
                    <select name="gender_category" value={filters.gender_category} onChange={handleInputChange}>
                        <option value="">All</option>
                        {genderCategories.map(gc => <option key={gc.id} value={gc.name}>{gc.name}</option>)}
                    </select>
                </div>

                {/* Category */}
                <div className={styles.filterGroup}>
                    <label>Category</label>
                    <select name="category" value={filters.category} onChange={handleInputChange}>
                        <option value="">All</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {/* Price Range */}
                <div className={styles.filterGroup}>
                    <label>Price Range</label>
                    <div className={styles.priceInputs}>
                        <input type="number" name="price_min" placeholder="Min" value={filters.price_min} onChange={handleInputChange} />
                        <input type="number" name="price_max" placeholder="Max" value={filters.price_max} onChange={handleInputChange} />
                    </div>
                </div>

                {/* Eco Tags */}
                <div className={styles.filterGroup}>
                    <label>Eco-Friendly</label>
                    {ecoTags.map(tag => (
                        <div key={tag.id} className={styles.checkbox}>
                            <input type="checkbox" id={`eco-${tag.id}`} value={tag.name} onChange={handleEcoTagChange} />
                            <label htmlFor={`eco-${tag.id}`}>{tag.name}</label>
                        </div>
                    ))}
                </div>

                {/* Sort By */}
                <div className={styles.filterGroup}>
                    <label>Sort By</label>
                    <select name="sort_by" value={filters.sort_by} onChange={handleInputChange}>
                        <option value="-created_at">Newest</option>
                        <option value="popularity_score">Popularity</option>
                        <option value="current_price">Price: Low to High</option>
                        <option value="-current_price">Price: High to Low</option>
                    </select>
                </div>

                <button type="submit" className={styles.button}>Apply Filters</button>
            </form>
        </div>
    );
};

export default FilterSidebar;
