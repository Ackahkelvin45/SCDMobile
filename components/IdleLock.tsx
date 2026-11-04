// Spec US1.4: lock after 5 minutes without interaction, even with the app open (shared clinic phones).
// Unlock with biometrics or the device PIN; if the device has neither, the only way back in is signing in again.
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { C, Fonts } from '@/constants/theme';

const IDLE_MS = 5 * 60 * 1000;

export function IdleLock({ active, onSignOut, children }: { active: boolean; onSignOut: () => void; children: React.ReactNode }) {
  const lastTouch = useRef(Date.now());
  const [locked, setLocked] = useState(false);
  const [canUnlock, setCanUnlock] = useState(true);

  const checkIdle = useCallback(() => {
    if (active && Date.now() - lastTouch.current > IDLE_MS) setLocked(true);
  }, [active]);

  useEffect(() => {
    if (!active) { setLocked(false); return; }
    lastTouch.current = Date.now();
    const timer = setInterval(checkIdle, 15_000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') checkIdle(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [active, checkIdle]);

  useEffect(() => {
    LocalAuthentication.getEnrolledLevelAsync()
      .then((level) => setCanUnlock(level !== LocalAuthentication.SecurityLevel.NONE))
      .catch(() => setCanUnlock(false));
  }, []);

  const unlock = async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock SickleCare' });
    if (res.success) {
      lastTouch.current = Date.now();
      setLocked(false);
    }
  };

  return (
    <View style={{ flex: 1 }} onTouchStart={() => { lastTouch.current = Date.now(); }}>
      {children}
      <Modal visible={locked} animationType="fade" onRequestClose={() => {}}>
        <View style={st.wrap}>
          <Text style={st.title}>SickleCare is locked</Text>
          <Text style={st.body}>Locked after 5 minutes without activity to protect patient data.</Text>
          {canUnlock ? <Button title="Unlock" icon="lock-open-outline" onPress={unlock} style={st.btn} /> : (
            <Text style={st.body}>This phone has no screen lock or biometrics set up, so you need to sign in again.</Text>
          )}
          <Button title="Sign out" variant="secondary" onPress={() => { setLocked(false); onSignOut(); }} style={st.btn} />
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  title: { fontFamily: Fonts.headingBold, fontSize: 22, color: C.text },
  body: { fontFamily: Fonts.body, fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 21 },
  btn: { alignSelf: 'stretch' },
});
