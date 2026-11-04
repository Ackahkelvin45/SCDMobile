// Small dependency-free line chart (react-native-svg only) for lab trends with reference lines and event markers.
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { C, Fonts } from '@/constants/theme';
import { formatDate, fromIsoDate } from '@/lib/clinical';

type Point = { date: string; value: number };
type RefLine = { label: string; value: number };
type Event = { date: string; label: string; type?: string };

const PAD = { top: 12, right: 12, bottom: 22, left: 36 };
const REF_COLORS = ['#64748b', '#15803d', '#b45309', '#b91c1c'];
const EVENT_COLORS: Record<string, string> = { dose_change: '#7c3aed', baseline_change: '#0369a1', transfusion: '#b91c1c', flag: '#b45309' };

export function LineChart({
  points, referenceLines = [], events = [], height = 180, unit, title,
}: {
  points: Point[];
  referenceLines?: RefLine[];
  events?: Event[];
  height?: number;
  unit?: string;
  title?: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const summary = sorted.length
    ? `${title ?? 'Trend'}: ${sorted.length} values from ${formatDate(sorted[0].date)} to ${formatDate(sorted[sorted.length - 1].date)}, latest ${sorted[sorted.length - 1].value}${unit ? ` ${unit}` : ''}.`
    : `${title ?? 'Trend'}: no values yet.`;

  if (sorted.length === 0) {
    return <View style={[st.empty, { height }]}><Text style={st.emptyText}>No values recorded yet</Text></View>;
  }

  const values = [...sorted.map((p) => p.value), ...referenceLines.map((r) => r.value)];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;

  const t = (d: string) => fromIsoDate(d.slice(0, 10)).getTime();
  const t0 = t(sorted[0].date);
  const t1 = Math.max(t(sorted[sorted.length - 1].date), t0 + 1);
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + (sorted.length === 1 ? plotW / 2 : ((t(d) - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;
  const ticks = [min + (max - min) * 0.1, (min + max) / 2, max - (max - min) * 0.1];

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={summary}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((v) => (
            <React.Fragment key={v}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={C.line} strokeWidth={1} />
              <SvgText x={PAD.left - 6} y={y(v) + 4} fontSize={10} fill={C.faint} textAnchor="end">{fmt(v)}</SvgText>
            </React.Fragment>
          ))}
          {referenceLines.map((r, i) => (
            <Line key={r.label} x1={PAD.left} x2={width - PAD.right} y1={y(r.value)} y2={y(r.value)}
              stroke={REF_COLORS[i % REF_COLORS.length]} strokeWidth={1.5} strokeDasharray="5,4" />
          ))}
          {events.filter((e) => t(e.date) >= t0 && t(e.date) <= t1).map((e, i) => (
            <Line key={`${e.date}-${i}`} x1={x(e.date)} x2={x(e.date)} y1={PAD.top} y2={PAD.top + plotH}
              stroke={EVENT_COLORS[e.type ?? ''] ?? C.faint} strokeWidth={1} strokeDasharray="2,3" />
          ))}
          <Polyline points={sorted.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')} fill="none" stroke={C.primaryDark} strokeWidth={2.5} />
          {sorted.map((p) => <Circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={3.5} fill={C.surface} stroke={C.primaryDark} strokeWidth={2} />)}
          <SvgText x={PAD.left} y={height - 6} fontSize={10} fill={C.faint}>{formatDate(sorted[0].date)}</SvgText>
          {sorted.length > 1 ? (
            <SvgText x={width - PAD.right} y={height - 6} fontSize={10} fill={C.faint} textAnchor="end">
              {formatDate(sorted[sorted.length - 1].date)}
            </SvgText>
          ) : null}
        </Svg>
      ) : <View style={{ height }} />}
      {referenceLines.length || events.length ? (
        <View style={st.legend}>
          {referenceLines.map((r, i) => (
            <View key={r.label} style={st.legendItem}>
              <View style={[st.dash, { backgroundColor: REF_COLORS[i % REF_COLORS.length] }]} />
              <Text style={st.legendText}>{r.label} ({fmt(r.value)})</Text>
            </View>
          ))}
          {[...new Set(events.map((e) => e.type ?? ''))].filter(Boolean).map((type) => (
            <View key={type} style={st.legendItem}>
              <View style={[st.tick, { backgroundColor: EVENT_COLORS[type] ?? C.faint }]} />
              <Text style={st.legendText}>{type.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function fmt(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
}

const st = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, borderRadius: 10 },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: C.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dash: { width: 14, height: 2 },
  tick: { width: 2, height: 10 },
  legendText: { fontFamily: Fonts.body, fontSize: 11, color: C.muted, textTransform: 'capitalize' },
});
