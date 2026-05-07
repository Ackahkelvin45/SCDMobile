import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, PRIMARY, PRIMARY_DARK } from '../../constants/theme';
import { Skeleton } from '@/components/Skeleton';
import { useVisitList, useVisitTrends } from '@/features/visits/hooks';
import type { TrendDay, VisitListItem, VisitStatus } from '@/features/visits/api';

const BACKGROUND    = '#f8faf9';
const CARD_BG       = '#ffffff';
const MUTED         = '#64748b';
const DARK          = '#0f172a';
const GREEN_TEXT    = '#166534';
const SPARKBAR      = '#6b9c83';
const SPARKBAR_EMPTY = '#e2e8f0';

const SPARKLINE_H = 48;
const PAGE_SIZE   = 20;

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VisitStatus, {
  statusBg: string;
  statusColor: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
}> = {
  ELEVATED: { statusBg: '#FEE2E2', statusColor: '#DC2626', iconName: 'warning'           },
  MONITOR:  { statusBg: '#FEF9C3', statusColor: '#CA8A04', iconName: 'information-circle' },
  STABLE:   { statusBg: '#DCFCE7', statusColor: '#16A34A', iconName: 'checkmark-circle'  },
};

function formatVisitDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function painBarHeights(days: TrendDay[]): number[] {
  return days.map((d) =>
    d.has_visit && d.pain_episodes != null
      ? Math.max(6, (d.pain_episodes / 10) * SPARKLINE_H)
      : 4
  );
}

function hgbBarHeights(days: TrendDay[]): number[] {
  const MIN = 6, MAX = 15;
  return days.map((d) =>
    d.has_visit && d.hgb != null
      ? Math.max(6, ((d.hgb - MIN) / (MAX - MIN)) * SPARKLINE_H)
      : 4
  );
}

function latestHgbLabel(days: TrendDay[]): string {
  const last = [...days].reverse().find((d) => d.has_visit && d.hgb != null);
  return last?.hgb != null ? `${last.hgb} g/dL` : 'NO DATA';
}

function cellVal(v: string | number | null | undefined): string {
  return v !== null && v !== undefined ? String(v) : '—';
}

// ─── Table ────────────────────────────────────────────────────────────────────

const TABLE_COLS: { key: keyof VisitListItem | 'date'; label: string; minW: number }[] = [
  { key: 'date',           label: 'Date',       minW: 88  },
  { key: 'hgb',            label: 'Hb\n(g/dL)', minW: 58  },
  { key: 'wbc',            label: 'WBC\n(k/μL)',minW: 58  },
  { key: 'pain_episodes',  label: 'Pain',       minW: 48  },
  { key: 'predicted_class',label: 'Prediction', minW: 100 },
  { key: 'status',         label: 'Status',     minW: 82  },
];

function TableHeader() {
  return (
    <View style={t.headerRow}>
      {TABLE_COLS.map((col) => (
        <Text key={col.key} style={[t.headerCell, { minWidth: col.minW }]}>
          {col.label}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ visit, onPress }: { visit: VisitListItem; onPress: () => void }) {
  const cfg = STATUS_CONFIG[visit.status] ?? STATUS_CONFIG.MONITOR;

  function cellForKey(key: string): React.ReactNode {
    switch (key) {
      case 'date':
        return (
          <Text style={[t.cell, { minWidth: 88 }]}>
            {formatDateShort(visit.visit_date)}
          </Text>
        );
      case 'status':
        return (
          <View style={[t.statusChip, { backgroundColor: cfg.statusBg, minWidth: 82 }]}>
            <Text style={[t.statusChipText, { color: cfg.statusColor }]}>{visit.status}</Text>
          </View>
        );
      case 'predicted_class':
        return (
          <Text style={[t.cell, { minWidth: 100 }]}>
            {visit.predicted_class === 'responder'
              ? 'Responder'
              : visit.predicted_class === 'non_responder'
              ? 'Non-resp.'
              : '—'}
          </Text>
        );
      case 'hgb':
        return <Text style={[t.cell, t.numericCell, { minWidth: 58 }]}>{cellVal(visit.hgb)}</Text>;
      case 'wbc':
        return <Text style={[t.cell, t.numericCell, { minWidth: 58 }]}>{cellVal(visit.wbc)}</Text>;
      case 'pain_episodes':
        return <Text style={[t.cell, t.numericCell, { minWidth: 48 }]}>{cellVal(visit.pain_episodes)}</Text>;
      default:
        return null;
    }
  }

  return (
    <TouchableOpacity style={t.dataRow} onPress={onPress} activeOpacity={0.7}>
      {TABLE_COLS.map((col) => (
        <React.Fragment key={col.key}>
          {cellForKey(col.key as string)}
        </React.Fragment>
      ))}
    </TouchableOpacity>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'table';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [limit, setLimit]       = useState(PAGE_SIZE);
  const [mode, setMode]         = useState<ViewMode>('list');
  const [refreshing, setRefreshing] = useState(false);

  const { data: listData, isLoading: listLoading, refetch: refetchList } = useVisitList({ limit });
  const { data: trendsData, refetch: refetchTrends }                      = useVisitTrends(7);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchList(), refetchTrends()]);
    setRefreshing(false);
  }, [refetchList, refetchTrends]);

  const visits    = listData?.results ?? [];
  const total     = listData?.count   ?? 0;
  const trendDays = trendsData?.days  ?? [];

  const painHeights = painBarHeights(trendDays);
  const hgbHeights  = hgbBarHeights(trendDays);

  function openDetail(visitId: string) {
    router.push({ pathname: '/(log)/visit-detail', params: { visitId } });
  }

  function loadMore() {
    setLimit((l) => l + PAGE_SIZE);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.headerArea}>
          <Text style={styles.pageTitle}>My History</Text>
          <Text style={styles.pageSubtitle}>
            A chronological view of your wellness patterns and AI insights.
          </Text>
        </View>

        {/* ── Trend Cards ── */}
        <View style={styles.trendsRow}>
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>Pain Trend</Text>
              <Ionicons name="trending-up" size={18} color={PRIMARY_DARK} />
            </View>
            <View style={styles.sparkline}>
              {trendDays.length > 0
                ? painHeights.map((h, i) => (
                    <View
                      key={i}
                      style={[styles.sparkBar, { height: h, backgroundColor: trendDays[i].has_visit ? SPARKBAR : SPARKBAR_EMPTY }]}
                    />
                  ))
                : [15, 30, 20, 60, 25, 10, 80].map((h, i) => (
                    <View key={i} style={[styles.sparkBar, { height: h, backgroundColor: SPARKBAR_EMPTY }]} />
                  ))}
            </View>
            <Text style={styles.trendLabel}>PAST 7 DAYS</Text>
          </View>

          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>Hb Trend</Text>
              <Ionicons name="water" size={18} color={PRIMARY_DARK} />
            </View>
            <View style={styles.sparkline}>
              {trendDays.length > 0
                ? hgbHeights.map((h, i) => (
                    <View
                      key={i}
                      style={[styles.sparkBar, { height: h, backgroundColor: trendDays[i].has_visit ? SPARKBAR : SPARKBAR_EMPTY }]}
                    />
                  ))
                : [25, 23, 26, 25, 23, 35, 25].map((h, i) => (
                    <View key={i} style={[styles.sparkBar, { height: h, backgroundColor: SPARKBAR_EMPTY }]} />
                  ))}
            </View>
            <Text style={styles.trendLabel}>{latestHgbLabel(trendDays)}</Text>
          </View>
        </View>

        {/* ── View toggle ── */}
        <View style={styles.toggleRow}>
          <Text style={styles.sectionTitle}>Lab Logs</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'list' && styles.toggleBtnActive]}
              onPress={() => setMode('list')}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={16} color={mode === 'list' ? '#fff' : MUTED} />
              <Text style={[styles.toggleBtnText, mode === 'list' && styles.toggleBtnTextActive]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'table' && styles.toggleBtnActive]}
              onPress={() => setMode('table')}
              activeOpacity={0.7}
            >
              <Ionicons name="grid-outline" size={16} color={mode === 'table' ? '#fff' : MUTED} />
              <Text style={[styles.toggleBtnText, mode === 'table' && styles.toggleBtnTextActive]}>Table</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content ── */}
        {listLoading && visits.length === 0 ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.logCard, { gap: 10 }]}>
                <Skeleton height={11} width="35%" radius={6} />
                <Skeleton height={15} width="55%" radius={6} />
                <Skeleton height={11} width="75%" radius={6} />
              </View>
            ))}
          </View>
        ) : visits.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color={MUTED} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No visits logged yet</Text>
            <Text style={styles.emptySubtitle}>Log your first visit to unlock predictions.</Text>
          </View>

        ) : mode === 'list' ? (
          /* ── List View ── */
          <View style={styles.logsContainer}>
            {visits.map((visit: VisitListItem) => {
              const cfg     = STATUS_CONFIG[visit.status] ?? STATUS_CONFIG.MONITOR;
              const dateStr = formatVisitDate(visit.visit_date);
              return (
                <TouchableOpacity
                  key={visit.id}
                  activeOpacity={0.7}
                  style={styles.logCard}
                  onPress={() => openDetail(visit.id)}
                >
                  <View style={styles.logLeft}>
                    <Text style={styles.logTime}>{dateStr}</Text>
                    <Text style={styles.logTitle}>Visit Log</Text>
                    {visit.hgb != null && (
                      <Text style={styles.logMeta}>
                        Hb {visit.hgb} g/dL · Pain {visit.pain_episodes}
                        {visit.wbc != null ? ` · WBC ${visit.wbc}` : ''}
                      </Text>
                    )}
                    {visit.predicted_class && (
                      <View style={[
                        styles.predChip,
                        { backgroundColor: visit.predicted_class === 'responder' ? '#DCFCE7' : '#FEE2E2' },
                      ]}>
                        <Text style={[
                          styles.predChipText,
                          { color: visit.predicted_class === 'responder' ? '#16A34A' : '#DC2626' },
                        ]}>
                          {visit.predicted_class === 'responder' ? 'Likely Responder' : 'Low Likelihood'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.logRight}>
                    <View style={[styles.statusPill, { backgroundColor: cfg.statusBg }]}>
                      <Ionicons name={cfg.iconName} size={14} color={cfg.statusColor} />
                      <Text style={[styles.statusText, { color: cfg.statusColor }]}>{visit.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#cbd5e1" style={{ marginTop: 8 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

        ) : (
          /* ── Table View ── */
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <TableHeader />
                {visits.map((visit: VisitListItem) => (
                  <TableRow
                    key={visit.id}
                    visit={visit}
                    onPress={() => openDetail(visit.id)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {total > limit && (
          <TouchableOpacity activeOpacity={0.7} style={styles.loadMoreBtn} onPress={loadMore}>
            {listLoading
              ? <Skeleton height={16} width={120} radius={6} />
              : <Text style={styles.loadMoreText}>Load Older Logs</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ─── list styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { backgroundColor: BACKGROUND, flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 12 },

  headerArea:   { marginBottom: 24 },
  pageTitle:    { color: DARK, fontFamily: Fonts.headingBold, fontSize: 28, letterSpacing: -0.5, marginBottom: 8 },
  pageSubtitle: { color: MUTED, fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, paddingRight: 40 },

  trendsRow: { flexDirection: 'row', gap: 16, marginBottom: 28 },
  trendCard: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  trendTitle:  { color: DARK, fontFamily: Fonts.bodySemiBold, fontSize: 13 },
  sparkline:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: SPARKLINE_H, marginBottom: 10, paddingHorizontal: 4 },
  sparkBar:    { width: 6, borderRadius: 3 },
  trendLabel:  { color: MUTED, fontFamily: Fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },

  // Toggle
  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { color: DARK, fontFamily: Fonts.headingBold, fontSize: 18 },
  toggleGroup:  { flexDirection: 'row', backgroundColor: '#F4F4F5', borderRadius: 10, padding: 3, gap: 2 },
  toggleBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnActive:     { backgroundColor: PRIMARY_DARK },
  toggleBtnText:       { color: MUTED, fontFamily: Fonts.bodySemiBold, fontSize: 13 },
  toggleBtnTextActive: { color: '#fff' },

  loadingBox:    { alignItems: 'center', paddingVertical: 32 },
  emptyBox:      { alignItems: 'center', paddingVertical: 40 },
  emptyTitle:    { color: DARK, fontFamily: Fonts.bodySemiBold, fontSize: 16, marginBottom: 6 },
  emptySubtitle: { color: MUTED, fontFamily: Fonts.body, fontSize: 13, textAlign: 'center' },

  // List view
  logsContainer: { gap: 12, marginBottom: 24 },
  logCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  logLeft:  { flex: 1, paddingRight: 12 },
  logRight: { alignItems: 'flex-end' },
  logTime:  { color: MUTED, fontFamily: Fonts.body, fontSize: 11, marginBottom: 4 },
  logTitle: { color: DARK, fontFamily: Fonts.bodyBold, fontSize: 15, marginBottom: 3 },
  logMeta:  { color: MUTED, fontFamily: Fonts.body, fontSize: 12, marginBottom: 6 },

  predChip:     { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  predChipText: { fontFamily: Fonts.bodySemiBold, fontSize: 11 },

  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  statusText: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 0.4 },

  // Table view
  tableCard: {
    backgroundColor: CARD_BG, borderRadius: 16, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  loadMoreBtn:  { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { color: GREEN_TEXT, fontFamily: Fonts.bodyBold, fontSize: 14 },
});

// ─── table styles ─────────────────────────────────────────────────────────────
const t = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  headerCell: {
    color: MUTED,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    gap: 12,
  },
  cell: {
    color: '#334155',
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  numericCell: {
    color: DARK,
    fontFamily: Fonts.bodyBold,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statusChipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
