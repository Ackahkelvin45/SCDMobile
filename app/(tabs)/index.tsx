// Today tab: facility dashboard (counts, quick actions, recently seen) above the open safety flags (spec §8).
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AckFlag, FlagAckModal } from '@/components/FlagAckModal';
import { PatientRow } from '@/components/PatientRow';
import { Button, Card, ErrorState, Loading, Screen, SectionTitle, SeverityBadge, StatTile, ui } from '@/components/ui';
import { SEVERITY_STYLE } from '@/constants/clinical';
import { useMe, useOpenFlags, usePatients } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { FlagSeverity } from '@/lib/api/types';
import { formatDate, toIsoDate } from '@/lib/clinical';

const ORDER: FlagSeverity[] = ['critical', 'warning', 'info'];

function when(iso: string) {
  const d = new Date(iso);
  return `${formatDate(toIsoDate(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function TodayScreen() {
  const me = useMe();
  const flags = useOpenFlags();
  // ponytail: counts come from `count` on 1-row list queries; add a /dashboard/ endpoint if this gets slow.
  const all = usePatients({ limit: 1 });
  const noBaseline = usePatients({ baseline_missing: true, limit: 1 });
  const recent = usePatients({ ordering: '-last_visit_date', limit: 5 });
  const [ack, setAck] = useState<AckFlag | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([flags.refetch(), all.refetch(), noBaseline.refetch(), recent.refetch()]);
    setRefreshing(false);
  };

  const items = flags.data?.results ?? [];
  const critical = items.filter((f) => f.severity === 'critical').length;
  const seen = (recent.data?.results ?? []).filter((p) => p.last_visit_date);
  const count = (n: number | undefined) => (n === undefined ? '…' : String(n));
  const name = me.data?.full_name;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ gap: 2 }}>
        <Text style={ui.h1}>{greeting()}{name ? `, ${name}` : ''}</Text>
        {me.data?.facility ? <Text style={ui.muted}>{me.data.facility.name}</Text> : null}
      </View>

      <View style={ui.tiles}>
        <StatTile label="My patients" value={count(all.data?.count)} onPress={() => router.push('/(tabs)/patients')} />
        <StatTile label="Open flags" value={count(flags.data?.count)}
          sub={critical ? `${critical} critical` : undefined} tone={critical ? 'bad' : items.length ? 'warn' : undefined}
          onPress={items.length ? () => router.push({ pathname: '/(tabs)/patients', params: { filter: 'has_flags' } }) : undefined} />
        <StatTile label="No HU baseline" value={count(noBaseline.data?.count)} tone={noBaseline.data?.count ? 'warn' : undefined}
          sub={noBaseline.data?.count ? 'Set to track response' : undefined}
          onPress={noBaseline.data?.count ? () => router.push({ pathname: '/(tabs)/patients', params: { filter: 'no_baseline' } }) : undefined} />
      </View>

      <View style={ui.row}>
        <Button title="New visit" icon="add-circle-outline" style={{ flex: 1 }} onPress={() => router.push('/(tabs)/new-visit')} />
        <Button title="Add patient" icon="person-add-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/patients/new')} />
      </View>

      <SectionTitle title="Safety flags" />
      {flags.isLoading ? <Loading /> : flags.isError ? (
        <ErrorState message={errorMessage(flags.error)} onRetry={flags.refetch} />
      ) : items.length === 0 ? (
        <Card><Text style={ui.muted}>No open safety flags. You&apos;re all caught up.</Text></Card>
      ) : ORDER.map((sev) => {
        const group = items.filter((f) => f.severity === sev);
        if (!group.length) return null;
        return (
          <View key={sev} style={ui.gap}>
            <Text style={[ui.bodyBold, { color: SEVERITY_STYLE[sev].fg }]}>{SEVERITY_STYLE[sev].label} ({group.length})</Text>
            {group.map((f) => (
              <Card key={f.id}>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <SeverityBadge severity={f.severity} />
                  <Text style={ui.muted}>{when(f.created_at)}</Text>
                </View>
                <Text style={ui.body}>{f.message}</Text>
                <Pressable
                  onPress={() => router.push({ pathname: '/patients/[id]', params: { id: f.patient.id } })}
                  accessibilityRole="link"
                  accessibilityLabel={`Open patient ${f.patient.full_name}`}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={ui.bodyBold}>{f.patient.full_name}</Text>
                  <Text style={ui.muted}>Folder {f.patient.folder_number}</Text>
                </Pressable>
                <View style={ui.row}>
                  <Button title="Review" variant="secondary" style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/visits/[id]', params: { id: f.visit_id } })} />
                  <Button title="Acknowledge" style={{ flex: 1 }} onPress={() => setAck(f)} />
                </View>
              </Card>
            ))}
          </View>
        );
      })}

      <SectionTitle title="Recently seen" action={seen.length ? 'All patients' : undefined} onAction={() => router.push('/(tabs)/patients')} />
      {recent.isLoading ? <Loading /> : recent.isError ? (
        <ErrorState message={errorMessage(recent.error)} onRetry={recent.refetch} />
      ) : seen.length ? (
        <View style={{ gap: 8 }}>{seen.map((p) => <PatientRow key={p.id} p={p} />)}</View>
      ) : (
        <Card><Text style={ui.muted}>Patients appear here after their first visit is recorded.</Text></Card>
      )}

      <FlagAckModal flag={ack} onClose={() => setAck(null)} />
    </Screen>
  );
}
