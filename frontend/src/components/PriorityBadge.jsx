import React from 'react';

export default function PriorityBadge({ level }) {
  const getBadgeClass = (lvl) => {
    if (lvl === 5) return 'lvl-5';
    if (lvl === 4) return 'lvl-4';
    if (lvl === 3) return 'lvl-3';
    return 'lvl-1';
  };

  const getLabel = (lvl) => {
    if (lvl === 5) return 'Lvl 5 Critical';
    if (lvl === 4) return 'Lvl 4 High';
    if (lvl === 3) return 'Lvl 3 Medium';
    return 'Lvl 1 Low';
  };

  return (
    <span className={`priority-badge ${getBadgeClass(level)}`}>
      {getLabel(level)}
    </span>
  );
}
