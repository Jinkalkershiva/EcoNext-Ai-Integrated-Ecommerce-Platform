import React from 'react';
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';

const ProductGrid = ({ products = [], onViewDetails, onAddToCart }) => {
    if (!products.length) {
        return <p className={styles.empty}>No products found for this segment yet.</p>;
    }

    return (
        <div className={styles.grid}>
            {products.map(product => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetails={onViewDetails}
                    onAddToCart={onAddToCart}
                />
            ))}
        </div>
    );
};

export default ProductGrid;
