import React from 'react';
import SegmentPage from './SegmentPage';

export const UnisexPage = () => {
  return <SegmentPage segmentName="Unisex" defaultFilters={{ gender_category: 'Unisex' }} />;
};

export default UnisexPage;
