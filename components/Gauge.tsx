'use client';

import { useMemo } from 'react';

type GaugeProps = {
  value: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function Gauge({ value }: GaugeProps) {
  const clamped = clamp(value, 0, 100);
  const { path, angle } = useMemo(() => {
    const radius = 110;
    const thickness = 20;
    const startAngle = -120;
    const endAngle = 120;
    const angle = startAngle + ((endAngle - startAngle) * clamped) / 100;
    const toRadians = (deg: number) => (deg * Math.PI) / 180;

    const largeArcFlag = angle - startAngle > 180 ? 1 : 0;
    const start = {
      x: 150 + radius * Math.cos(toRadians(startAngle)),
      y: 150 + radius * Math.sin(toRadians(startAngle))
    };
    const end = {
      x: 150 + radius * Math.cos(toRadians(angle)),
      y: 150 + radius * Math.sin(toRadians(angle))
    };

    const innerRadius = radius - thickness;
    const startInner = {
      x: 150 + innerRadius * Math.cos(toRadians(angle)),
      y: 150 + innerRadius * Math.sin(toRadians(angle))
    };
    const endInner = {
      x: 150 + innerRadius * Math.cos(toRadians(startAngle)),
      y: 150 + innerRadius * Math.sin(toRadians(startAngle))
    };

    const arcPath = [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
      'Z'
    ].join(' ');

    return { path: arcPath, angle };
  }, [clamped]);

  const gradientStops = [
    { offset: '0%', color: '#ef4444' },
    { offset: '50%', color: '#facc15' },
    { offset: '100%', color: '#22c55e' }
  ];

  return (
    <figure aria-label={`Composite sentiment score ${clamped}`} className="gauge" role="img">
      <svg width={300} height={200} viewBox="0 0 300 220">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            {gradientStops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        <path
          d="M 40 150 A 110 110 0 1 1 260 150"
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={20}
          strokeLinecap="round"
        />
        <path d={path} fill="url(#gaugeGradient)" opacity={0.95} />
        <g transform={`translate(150 150) rotate(${angle})`}>
          <line x1={0} y1={0} x2={0} y2={-100} stroke="#f8fafc" strokeWidth={4} strokeLinecap="round" />
          <circle cx={0} cy={0} r={6} fill="#f8fafc" />
        </g>
        <text
          x="50%"
          y="160"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="48"
          fontWeight={700}
        >
          {clamped}
        </text>
        <text x="50%" y="190" textAnchor="middle" fill="#94a3b8" fontSize="14">
          Composite sentiment
        </text>
      </svg>
    </figure>
  );
}
