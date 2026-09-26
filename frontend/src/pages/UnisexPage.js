import React from 'react';
import SegmentPage from './SegmentPage';

const UnisexPage = ({ onViewDetails, onAddToCart }) => {
    return (
        <SegmentPage
            segmentName="Unisex"
            defaultFilters={{ gender_category: 'Unisex' }}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
        />
    );
};

export default UnisexPage;
