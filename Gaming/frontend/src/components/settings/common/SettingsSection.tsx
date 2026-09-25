import React from 'react';

const getStringsFromChildren = (node: React.ReactNode): string => {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getStringsFromChildren).join(' ');
  }
  if (React.isValidElement(node)) {
    const props = node.props as any;
    let text = '';
    if (props) {
      if (props.children) {
        text += getStringsFromChildren(props.children) + ' ';
      }
      if (props.label) {
        text += getStringsFromChildren(props.label) + ' ';
      }
      if (props.description) {
        text += getStringsFromChildren(props.description) + ' ';
      }
      if (props.title) {
        text += getStringsFromChildren(props.title) + ' ';
      }
    }
    return text;
  }
  return '';
};

export const SettingsSection: React.FC<{
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  searchQuery?: string;
  searchTerms?: string;
  className?: string;
}> = ({ title, icon: Icon, children, searchQuery = '', searchTerms = '', className = '' }) => {
  let hasVisibleChildren = false;

  const filteredChildren = React.Children.map(children, child => {
    if (child === null || child === undefined || child === false || child === true) {
      return null;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (React.isValidElement(child)) {
        const childText = getStringsFromChildren(child);
        if (childText.toLowerCase().includes(q)) {
          hasVisibleChildren = true;
          return child;
        }
      } else if (typeof child === 'string' || typeof child === 'number') {
        if (String(child).toLowerCase().includes(q)) {
          hasVisibleChildren = true;
          return child;
        }
      }
      return null;
    }
    hasVisibleChildren = true;
    return child;
  });

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matchesTitle = title.toLowerCase().includes(q);
    const matchesTerms = searchTerms.toLowerCase().includes(q);

    if (!matchesTitle && !matchesTerms && !hasVisibleChildren) {
      return null;
    }

    // If the section title or search terms match, show all children. Otherwise, show only matching children.
    children = (matchesTitle || matchesTerms) ? children : filteredChildren;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/25 text-neon-green shadow-[0_0_12px_rgba(118,185,0,0.15)] shrink-0">
            <Icon className="w-4 h-4 text-neon-green" />
          </div>
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h3 className="text-xs font-black text-neon-green uppercase tracking-[0.2em] whitespace-nowrap">{title}</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-neon-green/30 via-white/5 to-transparent" />
        </div>
      </div>
      <div className="bg-[#0c0c10]/60 border border-white/15 rounded-3xl p-8 space-y-8 backdrop-blur-md shadow-[0_0_20px_rgba(118,185,0,0.05)]">
        {children}
      </div>
    </div>
  );
};
