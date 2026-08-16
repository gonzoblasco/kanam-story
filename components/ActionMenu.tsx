'use client';

import * as React from 'react';

interface ActionMenuProps {
  trigger: React.ReactNode;
  triggerTitle: string;
  children: React.ReactNode;
}

export default function ActionMenu({ trigger, triggerTitle, children }: ActionMenuProps) {
  const detailsRef = React.useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const handleToggle = () => {
      if (details.open) {
        document.querySelectorAll('.action-menu[open]').forEach((el) => {
          if (el !== details) {
            (el as HTMLDetailsElement).open = false;
          }
        });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (details.open && !details.contains(e.target as Node)) {
        details.open = false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && details.open) {
        details.open = false;
      }
    };

    details.addEventListener('toggle', handleToggle);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      details.removeEventListener('toggle', handleToggle);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <details ref={detailsRef} className="action-menu">
      <summary
        className="icon-btn action-menu-trigger"
        title={triggerTitle}
        onClick={(e) => e.stopPropagation()}
        aria-haspopup="menu"
      >
        {trigger}
      </summary>
      <div className="action-menu-panel" role="menu" aria-label={triggerTitle}>
        {children}
      </div>
    </details>
  );
}
