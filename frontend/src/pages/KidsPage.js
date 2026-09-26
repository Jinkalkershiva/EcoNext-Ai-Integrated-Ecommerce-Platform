import React from 'react';
import SegmentPage from './SegmentPage';

export const KidsPage = () => {
  return <SegmentPage segmentName="Kids" defaultFilters={{ age_group: 'Kids' }} />;
};

export default KidsPage;
