interface LogoProps {
  className?: string;
}

export function ChainfluenceLogo({ className = 'w-8 h-8' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
    >
      {/* C arc - upper segment */}
      <path d="M 68 16 A 32 32 0 0 0 18 32" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round"/>
      {/* C arc - lower segment */}
      <path d="M 18 68 A 32 32 0 0 0 68 84" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round"/>

      {/* Chain links on upper arc */}
      <ellipse cx="42" cy="14" rx="4" ry="3" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-30 42 14)"/>
      <ellipse cx="27" cy="20" rx="4" ry="3" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-55 27 20)"/>

      {/* Chain links on lower arc */}
      <ellipse cx="27" cy="80" rx="4" ry="3" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(55 27 80)"/>
      <ellipse cx="42" cy="86" rx="4" ry="3" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(30 42 86)"/>

      {/* Megaphone bell */}
      <ellipse cx="16" cy="50" rx="8" ry="11" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <ellipse cx="16" cy="50" rx="4" ry="5.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Megaphone handle */}
      <rect x="0" y="47" width="8" height="6" rx="2" fill="currentColor"/>

      {/* Lightning bolt */}
      <polygon points="58,6 34,46 48,46 38,94 72,44 54,44 66,6"/>
    </svg>
  );
}
