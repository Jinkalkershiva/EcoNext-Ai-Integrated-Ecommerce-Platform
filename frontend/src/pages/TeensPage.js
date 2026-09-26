import React from 'react';
import SegmentPage from './SegmentPage';

export const TeensPage = () => {
  return <SegmentPage segmentName="Teens" defaultFilters={{ age_group: 'Teens' }} />;
};

export default TeensPage;
