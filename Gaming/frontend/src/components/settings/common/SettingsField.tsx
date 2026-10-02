import React from 'react';

export const SettingsField: React.FC<{
  label: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  childWidth?: string;
}> = ({ label, description, children, childWidth }) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12 min-w-0">
    <div className="flex-1 min-w-0">
      {typeof label === 'string' ? (
        <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">{label}</p>
      ) : (
        <div className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">{label}</div>
      )}
      {description && <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">{description}</p>}
    </div>
    <div className={`${childWidth || "w-full lg:w-[22rem] xl:w-96"} max-w-full shrink-0 min-w-0`}>
      {children}
    </div>
  </div>
);
