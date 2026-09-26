import React from 'react';
import SegmentPage from './SegmentPage';

const KidsPage = ({ onViewDetails, onAddToCart }) => {
    return (
        <SegmentPage
            segmentName="Kids"
            defaultFilters={{ age_group: 'Kids' }}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
        />
    );
};

export default KidsPage;
