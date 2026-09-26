import React from 'react';
import ProductGrid from '../components/products/ProductGrid';
import RecommendationWidget from '../components/personalization/RecommendationWidget';
import { apiService } from '../api';

const HomePage = () => {
    const [products, setProducts] = React.useState([]);

    React.useEffect(() => {
        const fetchProducts = async () => {
            const fetchedProducts = await apiService.getProducts();
            setProducts(fetchedProducts.products || []);
        };
        fetchProducts();
    }, []);

    return (
        <div>
            {/* Hero Section can be added here */}
            <RecommendationWidget />
            <h2 style={{ textAlign: 'center', fontSize: '2rem', margin: '32px 0' }}>All Products</h2>
            <ProductGrid products={products} />
        </div>
    );
};

export default HomePage;
