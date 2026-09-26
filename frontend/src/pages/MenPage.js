import React from 'react';
import SegmentPage from './SegmentPage';

export const MenPage = () => {
  return <SegmentPage segmentName="Men" defaultFilters={{ gender_category: 'Men' }} />;
};

export default MenPage;
