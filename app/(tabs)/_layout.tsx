import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, Fonts } from '@/constants/theme';
import { useOpenFlags } from '@/hooks/api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.header, { paddingTop: insets.top + 8 }]}>
      <Text style={st.headerTitle} accessibilityRole="header">{title}</Text>
    </View>
  );
}

const icon = (name: IconName, active: IconName) =>
  function TabIcon({ focused, color }: { focused: boolean; color: string }) {
    return <Ionicons name={focused ? active : name} size={24} color={color} />;
  };

export default function TabLayout() {
  const openFlags = useOpenFlags().data?.count ?? 0;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primaryDark,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontFamily: Fonts.bodySemiBold, fontSize: 11 },
        tabBarStyle: st.tabBar,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          header: () => <TabHeader title="Today" />,
          tabBarIcon: icon('today-outline', 'today'),
          tabBarBadge: openFlags > 0 ? openFlags : undefined,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{ title: 'Patients', header: () => <TabHeader title="Patients" />, tabBarIcon: icon('people-outline', 'people') }}
      />
      <Tabs.Screen
        name="new-visit"
        options={{ title: 'New Visit', header: () => <TabHeader title="New visit" />, tabBarIcon: icon('add-circle-outline', 'add-circle') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', header: () => <TabHeader title="Account" />, tabBarIcon: icon('person-circle-outline', 'person-circle') }}
      />
    </Tabs>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  headerTitle: { fontFamily: Fonts.headingBold, fontSize: 24, color: C.text },
  tabBar: {
    backgroundColor: C.surface,
    borderTopColor: C.line,
    ...Platform.select({ android: { height: 64, paddingBottom: 8, paddingTop: 6 } }),
  },
});
