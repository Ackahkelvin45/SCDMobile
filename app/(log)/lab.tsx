import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '../../constants/theme';

const BACKGROUND  = '#f8faf9'; 
const CARD_BG     = '#ffffff'; 
const MUTED       = '#64748b';
const DARK        = '#0f172a';

interface LabInputProps {
  label: string;
  placeholder: string;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  fullWidth?: boolean;
}

function LabInput({ label, placeholder, unit, icon, value, onChangeText, fullWidth = false }: LabInputProps) {
  return (
    <View style={fullWidth ? { width: '100%', marginBottom: 20 } : { flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType={icon ? 'default' : 'numeric'}
        />
        {unit && <Text style={styles.inputUnit}>{unit}</Text>}
        {icon && <Ionicons name={icon} size={20} color={DARK} style={styles.inputIcon} />}
      </View>
    </View>
  );
}

export default function LabDataScreen() {
  const insets = useSafeAreaInsets();
  
  const [date,           setDate]           = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hb, setHb] = useState('');
  const [hct, setHct] = useState('');
  const [wbc, setWbc] = useState('');
  const [neutrophils, setNeutrophils] = useState('');
  const [rbc, setRbc] = useState('');
  const [platelets, setPlatelets] = useState('');
  const [mcv, setMcv] = useState('');

  const handleSave = () => {
    // TODO: persist lab results
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <Text style={styles.pageTitle}>Add Lab Results</Text>
        <Text style={styles.pageSubtitle}>
          Enter your latest clinical data to update your predictive insights.
        </Text>

        {/* -- Form Card -- */}
        <View style={styles.card}>
          <View style={{ width: '100%', marginBottom: 20 }}>
            <Text style={styles.fieldLabel}>Date of Draw</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>
                {[
                  String(date.getMonth() + 1).padStart(2, '0'),
                  String(date.getDate()).padStart(2, '0'),
                  date.getFullYear(),
                ].join('/')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={DARK} />
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <Modal transparent animationType="slide" visible={showDatePicker}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.modalDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={(_, d) => { if (d) setDate(d); }}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) setDate(d);
                  }}
                />
              )
            )}
          </View>

          <View style={styles.row}>
            <LabInput
              label="Hemoglobin (Hb)"
              placeholder="0.0"
              unit="g/dL"
              value={hb}
              onChangeText={setHb}
            />
            <LabInput
              label="Hematocrit (HCT)"
              placeholder="0.0"
              unit="%"
              value={hct}
              onChangeText={setHct}
            />
          </View>

          <View style={styles.row}>
            <LabInput
              label="WBC Count"
              placeholder="0.0"
              unit="10^9/L"
              value={wbc}
              onChangeText={setWbc}
            />
            <LabInput
              label="Abs. Neutrophils"
              placeholder="0"
              unit="/mcL"
              value={neutrophils}
              onChangeText={setNeutrophils}
            />
          </View>

          <View style={styles.row}>
            <LabInput
              label="RBC Count"
              placeholder="0.00"
              unit="10^12/L"
              value={rbc}
              onChangeText={setRbc}
            />
            <LabInput
              label="Platelets"
              placeholder="0"
              unit="10^9/L"
              value={platelets}
              onChangeText={setPlatelets}
            />
          </View>

          <LabInput
            label="Mean Corpuscular Vol (MCV)"
            placeholder="0.0"
            unit="fL"
            value={mcv}
            onChangeText={setMcv}
            fullWidth
          />

          {/* Inline Save inside card */}
          <View style={{ marginTop: 10 }}>
             <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryBtn}
                onPress={handleSave}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Save Results</Text>
              </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },

  // Headings
  pageTitle: {
    color: DARK,
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: MUTED,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
    paddingRight: 10,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Form Fields
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#334155',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6eaed',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: DARK,
    fontFamily: Fonts.body,
    fontSize: 16,
    paddingVertical: 14,
  },
  inputUnit: {
    color: '#475569',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    marginLeft: 8,
  },
  inputIcon: {
    marginLeft: 8,
  },

  // Date picker
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6eaed',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  datePickerText: {
    color: DARK,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
  },
  modalTitle: {
    color: DARK,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },
  modalDone: {
    color: '#059669',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },

  // Primary Button
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#059669', // exact dark green
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
  },
});
