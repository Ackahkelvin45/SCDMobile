import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const BG = '#e1f3ec31';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const GENOTYPE_OPTIONS = ['HbSS', 'HbSC', 'HbSβ⁺', 'HbSβ⁰', 'Not sure'];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - 1 - i));

type DOBStep = 'day' | 'month' | 'year';

//Date Picker Modal 
function DatePickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (dob: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState<DOBStep>('day');
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');

  const isDay = step === 'day';
  const isMonth = step === 'month';
  const options = isDay ? DAYS : isMonth ? MONTHS : YEARS;
  const title = isDay ? 'Select Day' : isMonth ? 'Select Month' : 'Select Year';
  const currentSelected = isDay ? day : isMonth ? month : '';
  const progress = isDay ? 1 : isMonth ? 2 : 3;

  const handlePick = (val: string) => {
    if (isDay) { setDay(val); setStep('month'); }
    else if (isMonth) { setMonth(val); setStep('year'); }
    else {
      onSelect(`${day} ${month.slice(0, 3)} ${val}`);
      handleClose();
    }
  };

  const handleBack = () => {
    if (step === 'month') setStep('day');
    else if (step === 'year') setStep('month');
  };

  const handleClose = () => {
    setStep('day'); setDay(''); setMonth('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pickerStyles.overlay} onPress={handleClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />

        {/* Step dots */}
        <View style={dobStyles.stepRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[dobStyles.stepDot, s <= progress && dobStyles.stepDotActive]} />
          ))}
        </View>

        {/* Title row with optional back */}
        <View style={dobStyles.headerRow}>
          {!isDay && (
            <TouchableOpacity onPress={handleBack} style={dobStyles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={PRIMARY} />
            </TouchableOpacity>
          )}
          <Text style={pickerStyles.title}>{title}</Text>
        </View>

        {/* Running preview */}
        {(day || month) && (
          <View style={dobStyles.preview}>
            <Text style={dobStyles.previewText}>
              {day}{month ? ` · ${month.slice(0, 3)}` : ''}
            </Text>
          </View>
        )}

        <FlatList
          data={options}
          keyExtractor={(item) => item}
          style={{ maxHeight: 300 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={pickerStyles.option}
              onPress={() => handlePick(item)}
              activeOpacity={0.7}
            >
              <Text style={[pickerStyles.optionText, currentSelected === item && pickerStyles.optionActive]}>
                {item}
              </Text>
              {currentSelected === item && (
                <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// Picker Modal 
function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pickerStyles.overlay} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>{title}</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={pickerStyles.option}
            onPress={() => { onSelect(opt); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.optionText, selected === opt && pickerStyles.optionActive]}>
              {opt}
            </Text>
            {selected === opt && (
              <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

//Section Header 
function SectionHeader({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={sectionStyles.row}>
      <View style={sectionStyles.iconBox}>
        <Ionicons name={icon} size={14} color={PRIMARY} />
      </View>
      <Text style={sectionStyles.label}>{label}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}

// Main Screen 
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [genotype, setGenotype] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activePicker, setActivePicker] = useState<'gender' | 'genotype' | 'dob' | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding')} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>Excited to have you on board!</Text>

          {/* ── Personal Information  */}
          <SectionHeader icon="person-outline" label="Personal Information" />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#94a3b8"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setActivePicker('dob')}
              activeOpacity={0.8}
            >
              <Text style={dateOfBirth ? styles.pickerValue : styles.pickerPlaceholder}>
                {dateOfBirth || 'DD · MMM · YYYY'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setActivePicker('gender')}
              activeOpacity={0.8}
            >
              <Text style={gender ? styles.pickerValue : styles.pickerPlaceholder}>
                {gender || 'Select gender'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* ── Medical Information */}
          <SectionHeader icon="medkit-outline" label="Medical Information" />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SCD Genotype</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setActivePicker('genotype')}
              activeOpacity={0.8}
            >
              <Text style={genotype ? styles.pickerValue : styles.pickerPlaceholder}>
                {genotype || 'Select genotype'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={15} color={PRIMARY} />
              <Text style={styles.infoText}>
                Your genotype helps us personalise care guidance for your specific condition.
              </Text>
            </View>
          </View>

          {/* ── Contact & Login   */}
          <SectionHeader icon="call-outline" label="Contact & Login" />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email or Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email or phone"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Create password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Confirm your password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7}>
                <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/(auth)/signup-success')}
          >
            <LinearGradient
              colors={[PRIMARY, PRIMARY_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <Text style={styles.primaryBtnText}>Create an account</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <TouchableOpacity
            style={styles.footerRow}
            activeOpacity={0.7}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={[styles.footerText, styles.footerLink]}>Log in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      <DatePickerModal
        visible={activePicker === 'dob'}
        onSelect={(dob) => { setDateOfBirth(dob); setActivePicker(null); }}
        onClose={() => setActivePicker(null)}
      />

      {/* Pickers */}
      <PickerModal
        visible={activePicker === 'gender'}
        title="Select Gender"
        options={GENDER_OPTIONS}
        selected={gender}
        onSelect={setGender}
        onClose={() => setActivePicker(null)}
      />
      <PickerModal
        visible={activePicker === 'genotype'}
        title="Select SCD Genotype"
        options={GENOTYPE_OPTIONS}
        selected={genotype}
        onSelect={setGenotype}
        onClose={() => setActivePicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#64748b',
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 54,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#0f172a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  inputRow: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  pickerTrigger: {
    width: '100%',
    height: 54,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  pickerValue: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#0f172a',
  },
  pickerPlaceholder: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#94a3b8',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: `${PRIMARY}12`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.body,
    color: '#334155',
    lineHeight: 18,
  },
  primaryBtn: {
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: '#fff',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: '#64748b',
  },
  footerLink: {
    fontFamily: Fonts.bodyBold,
    color: PRIMARY,
  },
});

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${PRIMARY}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    color: PRIMARY_DARK,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: `${PRIMARY}25`,
  },
});

const dobStyles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: PRIMARY,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  backBtn: {
    padding: 4,
  },
  preview: {
    backgroundColor: `${PRIMARY}15`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: PRIMARY_DARK,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.headingSemiBold,
    color: '#0f172a',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: '#334155',
  },
  optionActive: {
    fontFamily: Fonts.bodyBold,
    color: PRIMARY,
  },
});
