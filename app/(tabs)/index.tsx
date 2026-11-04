// Today tab, MVP: unacknowledged safety flags only (spec §8).
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AckFlag, FlagAckModal } from '@/components/FlagAckModal';
import { Button, Card, EmptyState, ErrorState, Loading, Screen, SectionTitle, SeverityBadge, ui } from '@/components/ui';
import { SEVERITY_STYLE } from '@/constants/clinical';
import { useOpenFlags } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { FlagSeverity } from '@/lib/api/types';
import { formatDate, toIsoDate } from '@/lib/clinical';

const ORDER: FlagSeverity[] = ['critical', 'warning', 'info'];

function when(iso: string) {
  const d = new Date(iso);
  return `${formatDate(toIsoDate(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TodayScreen() {
  const flags = useOpenFlags();
  const [ack, setAck] = useState<AckFlag | null>(null);

  if (flags.isLoading) return <Loading />;
  if (flags.isError) return <ErrorState message={errorMessage(flags.error)} onRetry={flags.refetch} />;
  const items = flags.data?.results ?? [];

  return (
    <Screen refreshing={flags.isRefetching} onRefresh={flags.refetch}>
      {items.length === 0 ? (
        <EmptyState icon="checkmark-done-circle-outline" title="No open safety flags — you're all caught up" />
      ) : ORDER.map((sev) => {
        const group = items.filter((f) => f.severity === sev);
        if (!group.length) return null;
        return (
          <View key={sev} style={ui.gap}>
            <SectionTitle title={`${SEVERITY_STYLE[sev].label} (${group.length})`} />
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
      <FlagAckModal flag={ack} onClose={() => setAck(null)} />
    </Screen>
  );
}
