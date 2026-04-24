export function LogoIcon({ size = 28, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * (100 / 80)} viewBox="0 0 80 100" fill="none" style={{ display: "block" }}>
      <path
        d="M40.77 48.33C38.28 52.84 38.28 57.68 38.28 62.36V79.48H34.87V63.05c0-.74 0-1.43.05-2.18.05-3.99.16-8.08-1.92-11.96L19.72 23.76H0v75.71h13.82V42.16l6.96 13.24c1.22 2.34 1.86 4.94 1.86 7.6v.16c.05 1.22 1.75 29.45 2.18 33.17l.27 2.34 23.44.21.22-2.44c.47-5.27 1.96-32.22 2.02-33.39v-.16c0-2.77.69-5.48 2.02-7.92l8.24-14.89v59.33h13.82V23.82H54.28L40.77 48.33Z"
        fill={color}
      />
      <circle cx="36.95" cy="19.83" r="6.6" fill={color} />
      <circle cx="50.19" cy="6.59" r="6.6" fill={color} />
      <circle cx="23.71" cy="6.59" r="6.6" fill={color} />
    </svg>
  );
}
