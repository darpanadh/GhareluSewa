import React, { useState } from 'react';
import { BarChart2, TrendingUp, Info } from 'lucide-react';

export default function InteractiveChart({
  data = [],
  title = '',
  subtitle = '',
  valuePrefix = 'Rs. ',
  metricKey = 'value', // 'value' | 'bookings'
  height = 180,
  defaultChartType = 'bar', // 'bar' | 'line'
  showControls = true,
  className = '',
}) {
  const [chartType, setChartType] = useState(defaultChartType);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Normalize data points
  const items = (data && data.length > 0) ? data : [
    { day: 'Mon', label: 'Mon', value: 0, bookings: 0 },
    { day: 'Tue', label: 'Tue', value: 0, bookings: 0 },
    { day: 'Wed', label: 'Wed', value: 0, bookings: 0 },
    { day: 'Thu', label: 'Thu', value: 0, bookings: 0 },
    { day: 'Fri', label: 'Fri', value: 0, bookings: 0 },
    { day: 'Sat', label: 'Sat', value: 0, bookings: 0 },
    { day: 'Sun', label: 'Sun', value: 0, bookings: 0 },
  ];

  const values = items.map(d => Number(d[metricKey] ?? d.value ?? 0));
  const rawMax = Math.max(...values, 0);
  // Ensure non-zero max for scale calculation
  const maxVal = rawMax === 0 ? 100 : Math.ceil(rawMax * 1.15);

  const W = 500;
  const H = height;
  const PAD = { t: 20, b: 35, l: 45, r: 15 };

  const usableWidth = W - PAD.l - PAD.r;
  const usableHeight = H - PAD.t - PAD.b;

  // Grid steps
  const steps = [0.25, 0.5, 0.75, 1];

  // Bar calculations
  const barWidth = (usableWidth / items.length) * 0.55;
  const stepGap = usableWidth / items.length;

  // Line calculations
  const points = items.map((d, i) => {
    const val = Number(d[metricKey] ?? d.value ?? 0);
    const x = PAD.l + i * stepGap + stepGap / 2;
    const y = H - PAD.b - (val / maxVal) * usableHeight;
    return { x, y, val, d, i };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPolygonStr = `${points[0]?.x ?? PAD.l},${H - PAD.b} ${polylineStr} ${points[points.length - 1]?.x ?? (W - PAD.r)},${H - PAD.b}`;

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  const hoveredItem = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative ${className}`}>
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          {title && <h3 className="font-bold text-gray-900 text-sm">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        {showControls && (
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-fit self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-[#07535f] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Bar Graph
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartType === 'line'
                  ? 'bg-white text-[#07535f] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Line Graph
            </button>
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible select-none">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07535f" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#07535f" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="1" />
              <stop offset="100%" stopColor="#07535f" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07535f" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#07535f" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-Axis labels */}
          {steps.map(f => {
            const y = PAD.t + (1 - f) * usableHeight;
            const labelVal = Math.round(maxVal * f);
            return (
              <g key={f}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={y}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD.l - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fontWeight="600"
                  fill="#94a3b8"
                >
                  {formatNumber(labelVal)}
                </text>
              </g>
            );
          })}

          {/* ── BAR CHART MODE ────────────────────────────────────────── */}
          {chartType === 'bar' && (
            <g>
              {points.map((p, i) => {
                const bH = (p.val / maxVal) * usableHeight;
                const x = PAD.l + i * stepGap + (stepGap - barWidth) / 2;
                const y = H - PAD.b - bH;
                const isHovered = hoveredIdx === i;

                return (
                  <g
                    key={i}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(bH, 3)}
                      rx="5"
                      fill={isHovered ? 'url(#barHoverGradient)' : 'url(#barGradient)'}
                      className="transition-all duration-200"
                    />
                    {/* X-axis label */}
                    <text
                      x={x + barWidth / 2}
                      y={H - PAD.b + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={isHovered ? '700' : '600'}
                      fill={isHovered ? '#07535f' : '#64748b'}
                    >
                      {p.d.day || p.d.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ── LINE GRAPH MODE ───────────────────────────────────────── */}
          {chartType === 'line' && (
            <g>
              {/* Area Under Line */}
              <polygon points={areaPolygonStr} fill="url(#lineAreaGradient)" />

              {/* Line Polyline */}
              <polyline
                points={polylineStr}
                fill="none"
                stroke="#07535f"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Dots & X Labels */}
              {points.map((p, i) => {
                const isHovered = hoveredIdx === i;
                return (
                  <g
                    key={i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {isHovered && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="8"
                        fill="#07535f"
                        opacity="0.2"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? '5' : '3.5'}
                      fill={isHovered ? '#0d9488' : '#07535f'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    <text
                      x={p.x}
                      y={H - PAD.b + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={isHovered ? '700' : '600'}
                      fill={isHovered ? '#07535f' : '#64748b'}
                    >
                      {p.d.day || p.d.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoveredItem && (
          <div
            className="absolute z-10 bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-100 flex flex-col items-center border border-gray-700"
            style={{
              left: `${(hoveredItem.x / W) * 100}%`,
              top: `${(hoveredItem.y / H) * 100 - 8}%`,
            }}
          >
            <span className="text-[10px] text-gray-400 font-semibold">{hoveredItem.d.day || hoveredItem.d.label}</span>
            <span className="font-bold text-emerald-400 text-xs">
              {valuePrefix}{hoveredItem.val.toLocaleString()}
            </span>
            {hoveredItem.d.jobs !== undefined && (
              <span className="text-[9px] text-gray-300">({hoveredItem.d.jobs} jobs)</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center gap-1 font-medium">
          <Info className="w-3 h-3 text-[#07535f]" /> Real-time database metrics
        </span>
        <span className="font-bold text-gray-700">
          Total: {valuePrefix}{values.reduce((a, b) => a + b, 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
