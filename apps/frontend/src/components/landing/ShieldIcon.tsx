export function ShieldIcon({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.1)}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M50 5L95 22V52C95 80 74 97 50 107C26 97 5 80 5 52V22Z"
        fill="#1E3A5F"
        stroke="#4FC3F7"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <rect x="17" y="51" rx="5" width="10" height="24" fill="#4FC3F7" />
      <rect x="31" y="43" rx="5" width="10" height="40" fill="#4FC3F7" />
      <rect x="45" y="37" rx="5" width="10" height="52" fill="#4FC3F7" />
      <rect x="59" y="43" rx="5" width="10" height="40" fill="#4FC3F7" />
      <rect x="73" y="51" rx="5" width="10" height="24" fill="#4FC3F7" />
    </svg>
  );
}
