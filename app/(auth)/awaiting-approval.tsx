import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Screen, ui } from '@/components/ui';
import { C } from '@/constants/theme';

export default function AwaitingApprovalScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Screen contentStyle={{ paddingTop: insets.top + 48, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Ionicons name="hourglass-outline" size={48} color={C.primaryDark} />
        <Text style={[ui.h1, { textAlign: 'center' }]} accessibilityRole="header">Awaiting approval</Text>
      </View>
      <Card>
        <Text style={ui.body}>
          Your account request has been received and is pending approval by an administrator.
        </Text>
        <Text style={ui.body}>
          We check your licence number against the Medical and Dental Council register before activating the account.
          You can sign in once it has been approved.
        </Text>
      </Card>
      <Button title="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
    </Screen>
  );
}
