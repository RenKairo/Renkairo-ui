import React from 'react';

interface ToriiIconProps {
  className?: string;
  size?: number | string;
  color?: string;
  glow?: boolean;
}

export const ToriiIcon: React.FC<ToriiIconProps> = ({
  className = 'w-4 h-4',
  size,
  color = 'var(--accent-coral)',
  glow = false,
}) => {
  const style: React.CSSProperties = {
    ...(size ? { width: size, height: size } : {}),
    ...(glow ? { filter: `drop-shadow(0 0 8px var(--glow-coral))` } : {}),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={`shrink-0 ${className}`}
      style={style}
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
        <path
          d="M 88.193 15.55 L 90 5.021 c -11.474 4.426 -27.392 7.172 -45 7.172 S 11.474 9.446 0 5.021 l 1.807 10.53 c 3.201 1.14 6.721 2.151 10.487 3.021 l -0.339 10.547 H 5.278 v 10.759 h 6.332 l -1.448 45.103 h 10.765 l 1.448 -45.103 h 44.78 l 1.448 45.103 h 10.766 l -1.448 -45.103 h 6.803 V 29.118 h -7.148 l -0.335 -10.438 C 81.183 17.786 84.86 16.738 88.193 15.55 z M 39.621 29.118 H 22.72 l 0.275 -8.574 c 5.249 0.744 10.824 1.23 16.626 1.417 L 39.621 29.118 L 39.621 29.118 z M 66.809 29.118 h -16.43 h 0 V 21.96 c 5.629 -0.181 11.045 -0.643 16.157 -1.349 L 66.809 29.118 z"
          fill={color}
        />
      </g>
    </svg>
  );
};

export default ToriiIcon;
