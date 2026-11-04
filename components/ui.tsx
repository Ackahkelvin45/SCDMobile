// Shared building blocks for every clinician screen. Keep screens composed from these so they look and behave alike.
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SEVERITY_STYLE } from '@/constants/clinical';
import { C, Fonts } from '@/constants/theme';
import { formatDate, fromIsoDate, toIsoDate } from '@/lib/clinical';
import type { FlagSeverity } from '@/lib/api/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Layout ──────────────────────────────────────────────────────────────────
export function Screen({
  children, refreshing, onRefresh, footer, contentStyle,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.fill}
        contentContainerStyle={[s.screen, { paddingBottom: (footer ? 16 : insets.bottom + 32) }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer ? <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={s.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function KeyValue({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[s.kvValue, strong && { fontFamily: Fonts.bodyBold }]}>{value}</Text>
      ) : value}
    </View>
  );
}

// ─── Actions ─────────────────────────────────────────────────────────────────
export function Button({
  title, onPress, variant = 'primary', loading, disabled, icon, style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const v = BUTTON[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [s.btn, { backgroundColor: v.bg, borderColor: v.border }, off && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
          <Text style={[s.btnText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const BUTTON = {
  primary: { bg: C.primaryDark, fg: '#fff', border: C.primaryDark },
  secondary: { bg: C.surface, fg: C.text, border: C.line },
  danger: { bg: C.danger, fg: '#fff', border: C.danger },
  ghost: { bg: 'transparent', fg: C.primaryDark, border: 'transparent' },
};

// ─── Inputs ──────────────────────────────────────────────────────────────────
export function TextField({
  label, error, hint, unit, style, ...props
}: TextInputProps & { label: string; error?: string; hint?: string; unit?: string }) {
  return (
    <View style={[s.field, style as ViewStyle]}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, error ? { borderColor: C.danger } : null]}>
        <TextInput
          placeholderTextColor={C.faint}
          style={s.input}
          accessibilityLabel={label}
          {...props}
        />
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  label, options, value, onChange, error,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.segment} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[s.segmentItem, on && s.segmentOn]}
            >
              <Text style={[s.segmentText, on && s.segmentTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[s.chip, selected && s.chipOn]}
    >
      {selected ? <Ionicons name="checkmark" size={14} color={C.primaryDark} /> : null}
      <Text style={[s.chipText, selected && { color: C.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={s.checkRow}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? C.primaryDark : C.muted} />
      <View style={s.fill}>
        <Text style={s.checkLabel}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/** ISO date field. Pass `value=null` for empty; `maximumDate` defaults to today (clinical dates can't be in the future). */
export function DateField({
  label, value, onChange, error, maximumDate = new Date(), minimumDate, optional,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  error?: string;
  maximumDate?: Date | null;
  minimumDate?: Date;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${formatDate(value)}`}
        style={[s.inputWrap, error ? { borderColor: C.danger } : null]}>
        <Text style={[s.input, { paddingVertical: 14 }, !value && { color: C.faint }]}>{value ? formatDate(value) : 'Select date'}</Text>
        <Ionicons name="calendar-outline" size={18} color={C.muted} style={{ marginRight: 12 }} />
      </Pressable>
      {optional && value ? (
        <Pressable onPress={() => onChange(null)} hitSlop={8}><Text style={s.hint}>Clear date</Text></Pressable>
      ) : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {open ? (
        <DateTimePicker
          value={value ? fromIsoDate(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maximumDate ?? undefined}
          minimumDate={minimumDate}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(toIsoDate(d));
          }}
        />
      ) : null}
    </View>
  );
}

/** Dropdown field that opens a scrollable bottom sheet. Shows a search box once there are more than 8 options. */
export function SelectField<T extends string>({
  label, placeholder = 'Select', options, value, onChange, error, hint, sheetTitle,
}: {
  label: string;
  placeholder?: string;
  options: { value: T; label: string; sublabel?: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  error?: string;
  hint?: string;
  sheetTitle?: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q)) : options;
  const close = () => { setOpen(false); setQuery(''); };
  const searchable = options.length > 8;

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? 'not selected'}`}
        accessibilityHint="Opens a list to choose from" style={[s.inputWrap, error ? { borderColor: C.danger } : null]}>
        <Text style={[s.input, { paddingVertical: 14 }, !selected && { color: C.faint }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.muted} style={{ marginRight: 12 }} />
      </Pressable>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
        <Pressable style={s.sheetBackdrop} onPress={close} accessibilityLabel="Close list" />
        {/* Searchable sheets are pinned near the top: Android doesn't lift a translucent modal above the keyboard,
            so a bottom-anchored sheet ends up hidden behind it while typing. */}
        <View style={[s.sheet, searchable && [StyleSheet.absoluteFill, { top: insets.top + 48, maxHeight: undefined }], { paddingBottom: insets.bottom + 8 }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.modalTitle}>{sheetTitle ?? label}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={C.muted} />
            </Pressable>
          </View>
          {searchable ? (
            <View style={[s.inputWrap, { marginHorizontal: 16, marginBottom: 8 }]}>
              <Ionicons name="search" size={18} color={C.muted} style={{ marginLeft: 12 }} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={C.faint}
                style={s.input} autoCorrect={false} accessibilityLabel={`Search ${label}`} />
            </View>
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={[s.hint, { padding: 16, textAlign: 'center' }]}>No matches</Text>}
            renderItem={({ item }) => {
              const on = item.value === value;
              return (
                <Pressable onPress={() => { onChange(item.value); close(); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={({ pressed }) => [s.option, pressed && { backgroundColor: C.bg }]}>
                  <View style={s.fill}>
                    <Text style={[s.optionText, on && { color: C.primaryDark }]}>{item.label}</Text>
                    {item.sublabel ? <Text style={s.hint}>{item.sublabel}</Text> : null}
                  </View>
                  {on ? <Ionicons name="checkmark-circle" size={22} color={C.primaryDark} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Stat tile ───────────────────────────────────────────────────────────────
/** Big-number tile; lay several out inside a `ui.tiles` row. Tappable when onPress is given. */
export function StatTile({ label, value, unit, sub, tone, onPress }: {
  label: string; value: string; unit?: string; sub?: string; tone?: 'good' | 'warn' | 'bad'; onPress?: () => void;
}) {
  const color = tone === 'good' ? C.primaryDark : tone === 'warn' ? C.warn : tone === 'bad' ? C.danger : C.text;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}${sub ? `, ${sub}` : ''}`}
      style={({ pressed }) => [s.tile, pressed && { opacity: 0.8 }]}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={[s.tileValue, { color }]}>{value}{unit ? <Text style={s.tileUnit}> {unit}</Text> : null}</Text>
      {sub ? <Text style={s.tileSub}>{sub}</Text> : null}
    </Pressable>
  );
}

// ─── Status ──────────────────────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: FlagSeverity }) {
  const st = SEVERITY_STYLE[severity];
  return (
    <View style={[s.badge, { backgroundColor: st.bg }]}>
      <Text style={[s.badgeText, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

export function Banner({ tone = 'info', title, text, icon }: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: string; text: string; icon?: IconName }) {
  const t = BANNER[tone];
  return (
    <View style={[s.banner, { backgroundColor: t.bg }]} accessibilityRole="text">
      <Ionicons name={icon ?? t.icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={s.fill}>
        {title ? <Text style={[s.bannerTitle, { color: t.fg }]}>{title}</Text> : null}
        <Text style={[s.bannerText, { color: t.fg }]}>{text}</Text>
      </View>
    </View>
  );
}

const BANNER: Record<string, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: C.infoSoft, fg: C.info, icon: 'information-circle' },
  warn: { bg: C.warnSoft, fg: C.warn, icon: 'alert-circle' },
  danger: { bg: C.dangerSoft, fg: C.danger, icon: 'warning' },
  success: { bg: C.primarySoft, fg: C.primaryDark, icon: 'checkmark-circle' },
};

export function EmptyState({ icon = 'document-text-outline', title, body, action, onAction }: {
  icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={36} color={C.faint} />
      <Text style={s.emptyTitle}>{title}</Text>
      {body ? <Text style={s.emptyBody}>{body}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: 12, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.empty}>
      <Ionicons name="cloud-offline-outline" size={36} color={C.danger} />
      <Text style={s.emptyTitle}>Couldn&apos;t load this</Text>
      <Text style={s.emptyBody}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: 12 }} /> : null}
    </View>
  );
}

export function Loading() {
  return <View style={s.loading}><ActivityIndicator color={C.primary} size="large" /></View>;
}

// ─── Modal that asks for a short text (edit reason, override reason, note) ───
export function TextPromptModal({
  visible, title, message, placeholder, confirmLabel = 'Confirm', required = true, loading, onCancel, onSubmit, children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  required?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  children?: React.ReactNode;
}) {
  const [text, setText] = useState('');
  const blocked = required && !text.trim();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{title}</Text>
          {message ? <Text style={s.modalMsg}>{message}</Text> : null}
          {children}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={C.faint}
            style={[s.inputWrap, s.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            multiline
            accessibilityLabel={title}
          />
          <View style={s.modalActions}>
            <Button title="Cancel" variant="secondary" onPress={() => { setText(''); onCancel(); }} style={s.fill} />
            <Button title={confirmLabel} onPress={() => { onSubmit(text.trim()); setText(''); }} disabled={blocked} loading={loading} style={s.fill} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  muted: { fontFamily: Fonts.body, fontSize: 13, color: C.muted },
  body: { fontFamily: Fonts.body, fontSize: 15, color: C.text, lineHeight: 21 },
  bodyBold: { fontFamily: Fonts.bodyBold, fontSize: 15, color: C.text },
  h1: { fontFamily: Fonts.headingBold, fontSize: 22, color: C.text },
  h2: { fontFamily: Fonts.headingBold, fontSize: 17, color: C.text },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  gap: { gap: 12 },
});

const s = StyleSheet.create({
  fill: { flex: 1 },
  screen: { padding: 16, gap: 16, backgroundColor: C.bg, flexGrow: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, gap: 8 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.line, gap: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontFamily: Fonts.headingBold, fontSize: 16, color: C.text },
  sectionAction: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: C.primaryDark },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 2 },
  kvLabel: { fontFamily: Fonts.body, fontSize: 14, color: C.muted, flexShrink: 1 },
  kvValue: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: C.text, textAlign: 'right', flexShrink: 1 },
  btn: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontFamily: Fonts.bodyBold, fontSize: 15 },
  field: { gap: 6 },
  label: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.text },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, minHeight: 48 },
  input: { flex: 1, paddingHorizontal: 12, fontFamily: Fonts.body, fontSize: 16, color: C.text },
  unit: { paddingHorizontal: 12, fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.muted },
  error: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: C.danger },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: C.muted },
  segment: { flexDirection: 'row', backgroundColor: '#eef2f1', borderRadius: 10, padding: 3, gap: 3 },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 4 },
  segmentOn: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  segmentText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.muted },
  segmentTextOn: { color: C.text },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  chipOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.text },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  checkLabel: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: C.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  banner: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10 },
  bannerTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, marginBottom: 2 },
  bannerText: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 6 },
  emptyTitle: { fontFamily: Fonts.headingBold, fontSize: 16, color: C.text, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.body, fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, backgroundColor: C.bg },
  tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, gap: 2 },
  tileLabel: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: C.muted },
  tileValue: { fontFamily: Fonts.headingBold, fontSize: 26 },
  tileUnit: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: C.muted },
  tileSub: { fontFamily: Fonts.body, fontSize: 12, color: C.muted },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { maxHeight: '75%', backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  optionText: { fontFamily: Fonts.bodySemiBold, fontSize: 16, color: C.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: C.surface, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontFamily: Fonts.headingBold, fontSize: 18, color: C.text },
  modalMsg: { fontFamily: Fonts.body, fontSize: 14, color: C.muted, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
});
