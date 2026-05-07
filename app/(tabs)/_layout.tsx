import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, PRIMARY_DARK, Fonts } from '../../constants/theme';
import { NavHeader } from '../../components/NavHeader';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Tab icon ────────────────────────────────────────────────────────────────

function TabIcon({
  name,
  focused,
  activeName,
}: {
  name: IoniconName;
  focused: boolean;
  activeName?: IoniconName;
}) {
  const icon = focused && activeName ? activeName : name;
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={icon} size={22} color={focused ? PRIMARY_DARK : '#94a3b8'} />
    </View>
  );
}

// ─── Page header (non-home tabs) ─────────────────────────────────────────────

function PageTabHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[pageHeader.wrap, { paddingTop: insets.top + 6 }]}>
      <Text style={pageHeader.title}>{title}</Text>
    </View>
  );
}

const pageHeader = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
});

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: PRIMARY_DARK,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          header: () => <NavHeader />,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" activeName="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log Data',
          header: () => <PageTabHeader title="Log Data" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="add-circle-outline" activeName="add-circle" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="predict"
        options={{
          title: 'Prediction',
          header: () => <PageTabHeader title="HU Response" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="analytics-outline" activeName="analytics" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          header: () => <PageTabHeader title="History" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="time-outline" activeName="time" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          header: () => <PageTabHeader title="Profile" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" activeName="person" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  label: {
    fontSize: 11,
    fontFamily: 'Mulish_600SemiBold',
    marginTop: 2,
  },
  item: {
    paddingTop: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconWrapActive: {
    backgroundColor: `${PRIMARY}18`,
  },
});
