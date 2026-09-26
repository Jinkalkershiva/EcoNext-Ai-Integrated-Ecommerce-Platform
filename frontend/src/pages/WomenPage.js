import React from 'react';
import SegmentPage from './SegmentPage';

const WomenPage = ({ onViewDetails, onAddToCart }) => {
    return (
        <SegmentPage
            segmentName="Women"
            defaultFilters={{ gender_category: 'Women' }}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
        />
    );
};

export default WomenPage;
