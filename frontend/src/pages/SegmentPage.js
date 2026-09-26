import React, { useState, useEffect } from 'react';
import ProductGrid from '../components/products/ProductGrid';
import FilterSidebar from '../components/personalization/FilterSidebar';
import { apiService } from '../api';
import styles from './SegmentPage.module.css';

const SegmentPage = ({ segmentName, defaultFilters = {}, onViewDetails, onAddToCart }) => {
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState(defaultFilters);

    useEffect(() => {
        const fetchProducts = async () => {
            const allFilters = { ...defaultFilters, ...filters };
            const fetchedProducts = await apiService.getProducts(allFilters);
            setProducts(fetchedProducts.products || []);
        };
        fetchProducts();
    }, [filters, defaultFilters]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>EcoNext {segmentName}</h1>
                <p className={styles.subtitle}>Sustainable choices for the {segmentName.toLowerCase()} generation.</p>
            </header>
            <div className={styles.content}>
                <div className={styles.sidebar}>
                    <FilterSidebar onFilterChange={handleFilterChange} />
                </div>
                <main className={styles.main}>
                    <ProductGrid
                        products={products}
                        onViewDetails={onViewDetails}
                        onAddToCart={onAddToCart}
                    />
                </main>
            </div>
        </div>
    );
};

export default SegmentPage;
