import React from 'react';
import SegmentPage from './SegmentPage';

const TeensPage = ({ onViewDetails, onAddToCart }) => {
    return (
        <SegmentPage
            segmentName="Teens"
            defaultFilters={{ age_group: 'Teens' }}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
        />
    );
};

export default TeensPage;
