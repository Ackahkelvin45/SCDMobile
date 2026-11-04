import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ui } from '@/components/ui';
import { GENOTYPES } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import type { PatientListItem } from '@/lib/api/types';
import { ageInYears, formatDate } from '@/lib/clinical';

const genotypeLabel = (g: string) => GENOTYPES.find((x) => x.value === g)?.label ?? g;

export function PatientRow({ p }: { p: PatientListItem }) {
  const flags = p.active_flag_count ?? 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/patients/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.full_name}, folder ${p.folder_number}${flags ? `, ${flags} active flags` : ''}`}
      style={({ pressed }) => [st.row, pressed && { opacity: 0.8 }]}
    >
      <View style={[st.fill, { gap: 3 }]}>
        <View style={ui.row}>
          <Text style={[ui.bodyBold, { flexShrink: 1 }]} numberOfLines={1}>{p.full_name}</Text>
          {p.baseline_missing ? <View style={st.tag}><Text style={st.tagText}>No baseline</Text></View> : null}
        </View>
        <Text style={ui.muted}>
          Folder {p.folder_number} · {ageInYears(p.date_of_birth)} y · {p.sex === 'female' ? 'F' : 'M'} · {genotypeLabel(p.genotype)}
        </Text>
        <Text style={ui.muted}>Last visit: {formatDate(p.last_visit_date)}</Text>
      </View>
      {flags > 0 ? (
        <View style={st.flag}>
          <Ionicons name="flag" size={12} color={C.danger} />
          <Text style={st.flagText}>{flags}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, padding: 14,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line,
  },
  tag: { backgroundColor: C.warnSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: C.warn },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.dangerSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  flagText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: C.danger },
});
