import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../api';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Check, ArrowLeft, Sparkles, Leaf } from 'lucide-react';

export const PreferencePage = () => {
  const { navigateTo, goBack } = useNavigation();
  const { showToast } = useCart();

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const [userPrefs, ages, genders, cats, tags] = await Promise.all([
          apiService.getUserPreferences().catch(() => []),
          apiService.getAgeGroups().catch(() => []),
          apiService.getGenderCategories().catch(() => []),
          apiService.getCategories().catch(() => []),
          apiService.getEcoTags().catch(() => []),
        ]);

        if (Array.isArray(userPrefs) && userPrefs.length > 0) {
          setPreferences(prev => ({ ...prev, ...userPrefs[0] }));
        }

        setAgeGroups(Array.isArray(ages) ? ages : []);
        setGenderCategories(Array.isArray(genders) ? genders : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setEcoTags(Array.isArray(tags) ? tags : []);
      } catch (err) {
        console.warn('Error loading preferences metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (catId) => {
    setPreferences(prev => {
      const current = prev.preferred_categories || [];
      const updated = current.includes(catId)
        ? current.filter(id => id !== catId)
        : [...current, catId];
      return { ...prev, preferred_categories: updated };
    });
  };

  const toggleEcoTag = (tagId) => {
    setPreferences(prev => {
      const current = prev.eco_preferences || [];
      const updated = current.includes(tagId)
        ? current.filter(id => id !== tagId)
        : [...current, tagId];
      return { ...prev, eco_preferences: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.updateUserPreferences(preferences);
      showToast('Personalized eco preferences updated successfully!', 'success');
      setTimeout(() => navigateTo('home'), 1000);
    } catch (err) {
      showToast('Preferences saved locally for this session.', 'info');
      setTimeout(() => navigateTo('home'), 1000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <LoadingSpinner text="Loading your personalization profile..." fullPage />
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ margin: '1rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
      </div>

      <div
        className="card-base"
        style={{
          padding: '2.5rem',
          margin: '1.5rem 0 4rem 0'
        }}
      >
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
          <Badge variant="accent" size="sm" icon={<Sparkles size={12} />}>
            AI Recommendation Engine
          </Badge>
          <h1 style={{ fontSize: '1.85rem', marginTop: '0.5rem', marginBottom: '0.35rem' }}>
            Eco Personalization Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Help our recommendation algorithms tailor sustainable product selections to your tastes, budget, and ethical standards.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Demographic & Age Group */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Primary Persona</label>
              <select
                name="gender_category"
                className="form-select"
                value={preferences.gender_category}
                onChange={handleInputChange}
              >
                <option value="">Select Persona...</option>
                {genderCategories.map(g => (
                  <option key={g.id} value={g.id || g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Age Demographic</label>
              <select
                name="age_group"
                className="form-select"
                value={preferences.age_group}
                onChange={handleInputChange}
              >
                <option value="">Select Age Demographic...</option>
                {ageGroups.map(a => (
                  <option key={a.id} value={a.id || a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Target Budget Range (₹)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input
                type="number"
                name="budget_min"
                placeholder="Min Budget (₹)"
                className="form-input"
                value={preferences.budget_min || ''}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="budget_max"
                placeholder="Max Budget (₹)"
                className="form-input"
                value={preferences.budget_max || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Preferred Categories */}
          {categories.length > 0 && (
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                Favorite Eco Categories
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {categories.map(c => {
                  const id = c.id || c.name;
                  const isSelected = (preferences.preferred_categories || []).includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`filter-tag-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleCategory(id)}
                    >
                      {isSelected && <Check size={13} style={{ display: 'inline', marginRight: '4px' }} />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Specific Eco Attributes */}
          {ecoTags.length > 0 && (
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Leaf size={15} style={{ color: 'var(--color-primary)' }} />
                <span>Priority Environmental Standards</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {ecoTags.map(t => {
                  const id = t.id || t.name;
                  const name = t.name || t;
                  const isSelected = (preferences.eco_preferences || []).includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`filter-tag-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleEcoTag(id)}
                    >
                      {isSelected && <Check size={13} style={{ display: 'inline', marginRight: '4px' }} />}
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              icon={<Check size={18} />}
            >
              {saving ? 'Saving Preferences...' : 'Save & Update My Recommendations'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreferencePage;
