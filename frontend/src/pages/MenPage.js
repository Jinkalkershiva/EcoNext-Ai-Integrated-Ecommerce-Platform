import React from 'react';
import SegmentPage from './SegmentPage';

const MenPage = ({ onViewDetails, onAddToCart }) => {
    return (
        <SegmentPage
            segmentName="Men"
            defaultFilters={{ gender_category: 'Men' }}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
        />
    );
};

export default MenPage;
