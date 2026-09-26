import React from 'react';
import styles from './ProductCard.module.css';

const ProductCard = ({ product, onViewDetails, onAddToCart }) => {
    const ecoTags = Array.isArray(product?.eco_tags) ? product.eco_tags : [];

    return (
        <div className={styles.card}>
            <img
                src={product?.image_url || 'https://via.placeholder.com/300x220?text=Eco+Product'}
                alt={product?.name || 'Product'}
                className={styles.image}
            />
            <div className={styles.info}>
                <h3 className={styles.name}>{product.name}</h3>
                <p className={styles.price}>₹{Number(product?.current_price || 0).toFixed(2)}</p>
                <div className={styles.tags}>
                    {ecoTags.map(tag => (
                        <span key={tag.id} className={styles.tag}>{tag.name}</span>
                    ))}
                </div>
            </div>
            <div className={styles.actions}>
                <button className={styles.button} onClick={() => onViewDetails?.(product.id)}>
                    View Details
                </button>
                <button className={`${styles.button} ${styles.altButton}`} onClick={() => onAddToCart?.(product)}>
                    Add to Cart
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
