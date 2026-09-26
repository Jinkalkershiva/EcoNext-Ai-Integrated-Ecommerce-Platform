import React, { useState, useEffect } from 'react';
import { apiService } from '../../api';
import styles from './PreferenceForm.module.css';

const PreferenceForm = () => {
    const [preferences, setPreferences] = useState({
        age_group: '',
        gender_category: '',
        preferred_categories: [],
        budget_min: '',
        budget_max: '',
        eco_preferences: [],
    });
    const [ageGroups, setAgeGroups] = useState([]);
    const [genderCategories, setGenderCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [ecoTags, setEcoTags] = useState([]);

    const safeAgeGroups = Array.isArray(ageGroups) ? ageGroups : [];
    const safeGenderCategories = Array.isArray(genderCategories) ? genderCategories : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeEcoTags = Array.isArray(ecoTags) ? ecoTags : [];

    useEffect(() => {
        const fetchData = async () => {
            const [userPrefs, ageGroupsData, genderCatsData, catsData, ecoTagsData] = await Promise.all([
                apiService.getUserPreferences(),
                apiService.getAgeGroups(),
                apiService.getGenderCategories(),
                apiService.getCategories(),
                apiService.getEcoTags(),
            ]);
            if (Array.isArray(userPrefs) && userPrefs.length > 0) {
                setPreferences(userPrefs[0]);
            }
            setAgeGroups(Array.isArray(ageGroupsData) ? ageGroupsData : []);
            setGenderCategories(Array.isArray(genderCatsData) ? genderCatsData : []);
            setCategories(Array.isArray(catsData) ? catsData : []);
            setEcoTags(Array.isArray(ecoTagsData) ? ecoTagsData : []);
        };
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPreferences({ ...preferences, [name]: value });
    };

    const handleMultiSelectChange = (e, field) => {
        const { options } = e.target;
        const value = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setPreferences({ ...preferences, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await apiService.updateUserPreferences(preferences);
        alert('Preferences saved!');
    };

    return (
        <div className={styles.formContainer}>
            <h2 className={styles.title}>Your Preferences</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Age Group */}
                <div className={styles.formGroup}>
                    <label>Your Age Group</label>
                    <select name="age_group" value={preferences.age_group} onChange={handleInputChange}>
                        <option value="">Select...</option>
                        {safeAgeGroups.map(ag => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </select>
                </div>

                {/* Gender Category */}
                <div className={styles.formGroup}>
                    <label>Preferred Gender Category</label>
                    <select name="gender_category" value={preferences.gender_category} onChange={handleInputChange}>
                        <option value="">Select...</option>
                        {safeGenderCategories.map(gc => <option key={gc.id} value={gc.id}>{gc.name}</option>)}
                    </select>
                </div>

                {/* Preferred Categories */}
                <div className={styles.formGroup}>
                    <label>Favorite Categories (Ctrl+Click to select multiple)</label>
                    <select multiple name="preferred_categories" value={preferences.preferred_categories} onChange={(e) => handleMultiSelectChange(e, 'preferred_categories')} className={styles.multiSelect}>
                        {safeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Budget */}
                <div className={styles.formGroup}>
                    <label>Budget</label>
                    <div className={styles.priceInputs}>
                        <input type="number" name="budget_min" placeholder="Min" value={preferences.budget_min} onChange={handleInputChange} />
                        <input type="number" name="budget_max" placeholder="Max" value={preferences.budget_max} onChange={handleInputChange} />
                    </div>
                </div>

                {/* Eco Preferences */}
                <div className={styles.formGroup}>
                    <label>Eco-Friendly Preferences (Ctrl+Click to select multiple)</label>
                    <select multiple name="eco_preferences" value={preferences.eco_preferences} onChange={(e) => handleMultiSelectChange(e, 'eco_preferences')} className={styles.multiSelect}>
                        {safeEcoTags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                    </select>
                </div>

                <button type="submit" className={styles.button}>Save Preferences</button>
            </form>
        </div>
    );
};

export default PreferenceForm;
