import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogin } from "@/features/auth/hooks";
import { Fonts, PRIMARY, PRIMARY_DARK } from "../../constants/theme";

const BG = "#f0faf5";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const apiErrorMessage =
    loginMutation.error instanceof Error ? loginMutation.error.message : null;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setLocalError(null);
    await loginMutation.mutateAsync({
      email: email.trim(),
      password,
    });

    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.inner,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/onboarding")
            }
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your clinic visits and HU response.</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            <LinearGradient
              colors={[PRIMARY, PRIMARY_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.gradient,
                loginMutation.isPending && styles.gradientDisabled,
              ]}
            >
              <View style={styles.primaryBtnContent}>
                {loginMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : null}
                <Text
                  style={[
                    styles.primaryBtnText,
                    loginMutation.isPending && styles.primaryBtnTextWithSpinner,
                  ]}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {(localError || apiErrorMessage) && (
            <Text style={styles.errorText}>{localError ?? apiErrorMessage}</Text>
          )}

          {/* Footer */}
          <TouchableOpacity
            style={styles.footerRow}
            activeOpacity={0.7}
            onPress={() => router.replace("/(auth)/register")}
          >
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Text style={[styles.footerText, styles.footerLink]}>Sign up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontFamily: Fonts.headingBold,
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: "#64748b",
    marginBottom: 36,
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  fieldGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: "#0f172a",
  },
  forgotText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: PRIMARY,
  },
  input: {
    width: "100%",
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: "#0f172a",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  inputRow: {
    position: "relative",
  },
  inputWithIcon: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  primaryBtn: {
    height: 58,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
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
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  gradientDisabled: {
    opacity: 0.75,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: "#fff",
    letterSpacing: 0.3,
  },
  primaryBtnTextWithSpinner: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: "#dc2626",
    marginTop: -8,
    marginBottom: 16,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: "#64748b",
  },
  footerLink: {
    fontFamily: Fonts.bodyBold,
    color: PRIMARY,
  },
});
