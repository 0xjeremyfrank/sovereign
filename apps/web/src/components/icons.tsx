const classNames = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

export const IconCrown = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames('w-4 h-4', className)}
    >
      <path d="M3 7l4 3 5-6 5 6 4-3-2 10H5L3 7z" fill="currentColor" />
    </svg>
  );
};

export const IconUndo = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 24 24" className={classNames('w-4 h-4', className)}>
      <path
        d="M12 5V1L7 6l5 5V7c3.86 0 7 3.14 7 7a7 7 0 01-7 7 7 7 0 01-6.93-6h2.02A5 5 0 0012 19a5 5 0 000-10z"
        fill="currentColor"
      />
    </svg>
  );
};

