// Acknowledge sheet for one safety flag (spec §6, F6). Used by visit detail and Today.
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Chip, SeverityBadge, TextField, ui } from '@/components/ui';
import { FLAG_ACTIONS } from '@/constants/clinical';
import { C } from '@/constants/theme';
import { useAcknowledgeFlag } from '@/hooks/api';
import { errorMessage } from '@/lib/api/api-error';
import type { FlagAction, FlagSeverity } from '@/lib/api/types';

export type AckFlag = { id: string; severity: FlagSeverity; message: string };

export function FlagAckModal({ flag, onClose }: { flag: AckFlag | null; onClose: () => void }) {
  return (
    <Modal visible={!!flag} transparent animationType="slide" onRequestClose={onClose}>
      {/* key resets the action/note when a different flag opens */}
      {flag ? <Sheet key={flag.id} flag={flag} onClose={onClose} /> : null}
    </Modal>
  );
}

function Sheet({ flag, onClose }: { flag: AckFlag; onClose: () => void }) {
  const ack = useAcknowledgeFlag();
  const [action, setAction] = useState<FlagAction | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!action) return;
    setError(null);
    try {
      await ack.mutateAsync({ id: flag.id, action, note: note.trim() || undefined });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={st.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={st.sheet}>
        <Text style={ui.h2} accessibilityRole="header">Acknowledge flag</Text>
        <SeverityBadge severity={flag.severity} />
        <Text style={ui.body}>{flag.message}</Text>
        <Text style={ui.bodyBold}>Action taken *</Text>
        <View style={ui.wrap} accessibilityRole="radiogroup">
          {FLAG_ACTIONS.map((a) => (
            <Chip key={a.value} label={a.label} selected={action === a.value} onPress={() => setAction(a.value)} />
          ))}
        </View>
        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline style={{ minHeight: 60 }} />
        {error ? <Banner tone="danger" text={error} /> : null}
        <View style={ui.row}>
          <Button title="Cancel" variant="secondary" onPress={onClose} style={st.fill} />
          <Button title="Acknowledge" onPress={submit} disabled={!action} loading={ack.isPending} style={st.fill} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 36, gap: 12 },
});
