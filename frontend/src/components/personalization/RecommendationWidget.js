import React, { useState, useEffect } from 'react';
import { apiService } from '../../api';
import ProductGrid from '../products/ProductGrid';
import styles from './RecommendationWidget.module.css';

const RecommendationWidget = () => {
    const [recommendations, setRecommendations] = useState([]);

    const normalizeRecommendations = (response) => {
        if (Array.isArray(response)) {
            return response;
        }
        if (Array.isArray(response?.recommendations)) {
            return response.recommendations;
        }
        if (Array.isArray(response?.results)) {
            return response.results;
        }
        return [];
    };

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const response = await apiService.getRecommendations();
                setRecommendations(normalizeRecommendations(response));
            } catch (error) {
                console.error("Failed to fetch recommendations:", error);
                setRecommendations([]);
            }
        };
        fetchRecommendations();
    }, []);

    if (recommendations.length === 0) {
        return null;
    }

    return (
        <div className={styles.widget}>
            <h2 className={styles.title}>Recommended for You</h2>
            <ProductGrid products={recommendations} />
        </div>
    );
};

export default RecommendationWidget;
