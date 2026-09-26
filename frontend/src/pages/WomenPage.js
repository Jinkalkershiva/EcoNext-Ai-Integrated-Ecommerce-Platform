import React from 'react';
import SegmentPage from './SegmentPage';

export const WomenPage = () => {
  return <SegmentPage segmentName="Women" defaultFilters={{ gender_category: 'Women' }} />;
};

export default WomenPage;
