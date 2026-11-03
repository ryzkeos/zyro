import React from 'react';

export const ZyroLogo: React.FC<{ size?: number }> = ({ size = 100 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
    <path
      d="M 57.444,0.124 L 56.328,0.496 L 42.060,12.903 L 1.861,46.774 L 0.000,48.759 L 1.365,50.000 L 16.749,58.933 L 28.288,66.253 L 32.010,67.990 L 24.194,49.876 L 40.323,36.725 L 41.687,35.980 L 42.060,36.352 L 42.556,48.139 L 42.680,99.876 L 46.154,97.395 L 61.538,83.871 L 67.990,78.784 L 85.856,63.151 L 100.000,51.365 L 99.752,50.620 L 68.362,31.886 L 67.990,32.382 L 75.806,50.124 L 59.553,63.027 L 58.437,63.648 L 58.065,63.275 L 57.444,51.861 Z"
      fill="currentColor"
      fillOpacity={0}
      stroke="none"
      style={{ color: 'var(--color-silver)' }}
    >
      <animate attributeName="fill-opacity" from="0" to="1" begin="1.8s" dur="0.9s" fill="freeze" />
      <animate
        attributeName="fill-opacity"
        values="1;0.9;1"
        keyTimes="0;0.5;1"
        keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
        calcMode="spline"
        begin="2.7s"
        dur="3.2s"
        repeatCount="indefinite"
      />
    </path>
    <path
      className="logo-stroke"
      d="M 57.444,0.124 L 56.328,0.496 L 42.060,12.903 L 1.861,46.774 L 0.000,48.759 L 1.365,50.000 L 16.749,58.933 L 28.288,66.253 L 32.010,67.990 L 24.194,49.876 L 40.323,36.725 L 41.687,35.980 L 42.060,36.352 L 42.556,48.139 L 42.680,99.876 L 46.154,97.395 L 61.538,83.871 L 67.990,78.784 L 85.856,63.151 L 100.000,51.365 L 99.752,50.620 L 68.362,31.886 L 67.990,32.382 L 75.806,50.124 L 59.553,63.027 L 58.437,63.648 L 58.065,63.275 L 57.444,51.861 Z"
      strokeDasharray="500"
      strokeDashoffset="500"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="500;0"
        keyTimes="0;1"
        keySplines="0.4 0 0.2 1"
        calcMode="spline"
        dur="1.8s"
        fill="freeze"
      />
    </path>
  </svg>
);