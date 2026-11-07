import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const PlayIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M4.5 2.8v10.4l8.2-5.2z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = (props: P) => (
  <svg {...base(props)}>
    <rect x="3.5" y="2.8" width="3.2" height="10.4" rx="0.8" fill="currentColor" stroke="none" />
    <rect x="9.3" y="2.8" width="3.2" height="10.4" rx="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const StepForwardIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M3 3v10l6-5z" fill="currentColor" stroke="none" />
    <path d="M12.5 3v10" />
  </svg>
);

export const StepBackIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M13 3v10L7 8z" fill="currentColor" stroke="none" />
    <path d="M3.5 3v10" />
  </svg>
);

export const ResetIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.7" />
    <path d="M2.6 2.5v3h3" />
  </svg>
);

export const ChevronRightIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
);

export const ChevronLeftIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M10 3.5 5.5 8 10 12.5" />
  </svg>
);

export const CheckIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="m3 8.5 3.2 3.2L13 4.8" />
  </svg>
);

export const XIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const LockIcon = (props: P) => (
  <svg {...base(props)}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" />
    <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
  </svg>
);

export const BookIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M2.5 3.2c2-1 4.5-1 5.5.5 1-1.5 3.5-1.5 5.5-.5v9.6c-2-1-4.5-1-5.5.5-1-1.5-3.5-1.5-5.5-.5z" />
    <path d="M8 3.7v9.6" />
  </svg>
);

export const TerminalIcon = (props: P) => (
  <svg {...base(props)}>
    <rect x="2" y="3" width="12" height="10" rx="1.4" />
    <path d="m4.5 6.5 2 2-2 2M8.5 10.5H11" />
  </svg>
);

export const CubeIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M8 1.8 14 5v6L8 14.2 2 11V5z" />
    <path d="M2 5l6 3 6-3M8 8v6.2" />
  </svg>
);

export const ChartIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M2.5 2.5v11h11" />
    <path d="M5 10.5V7.5M8 10.5V4.5M11 10.5V6.5" />
  </svg>
);

export const SunIcon = (props: P) => (
  <svg {...base(props)}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
  </svg>
);

export const MoonIcon = (props: P) => (
  <svg {...base(props)}>
    <path d="M13.2 9.7A5.4 5.4 0 0 1 6.3 2.8a5.4 5.4 0 1 0 6.9 6.9z" />
  </svg>
);

export const InfoIcon = (props: P) => (
  <svg {...base(props)}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.2v3.6M8 5v.2" />
  </svg>
);
