import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';

type IconItem = {
  key: string;
  label: string;
  file: string;
  source: number;
};

const data: IconItem[] = [
  {
    key: 'icon',
    label: 'App Icon (icon.png) 1024x1024 recommended',
    file: 'assets/images/icon.png',
    source: require('../assets/images/icon.png'),
  },
  {
    key: 'adaptive-icon',
    label: 'Adaptive Icon (adaptive-icon.png) – Android',
    file: 'assets/images/adaptive-icon.png',
    source: require('../assets/images/adaptive-icon.png'),
  },
  {
    key: 'splash-icon',
    label: 'Splash Icon (splash-icon.png)',
    file: 'assets/images/splash-icon.png',
    source: require('../assets/images/splash-icon.png'),
  },
  {
    key: 'favicon',
    label: 'Favicon (favicon.png) – Web only',
    file: 'assets/images/favicon.png',
    source: require('../assets/images/favicon.png'),
  },
];

export default function IconChoicesScreen() {
  const onPick = useCallback((item: IconItem) => {
    try {
      console.log('[IconChoices] selected', item);
      Alert.alert('Selected', `${item.label}\n${item.file}`);
    } catch (e) {
      console.log('[IconChoices] select error', e);
      Alert.alert('Error', 'Could not handle selection.');
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: IconItem }) => {
    return (
      <Pressable style={styles.card} onPress={() => onPick(item)} testID={`icon-card-${item.key}`}>
        <View style={styles.iconWrap}>
          <Image
            source={item.source}
            style={styles.icon}
            contentFit="cover"
            transition={150}
            testID={`icon-image-${item.key}`}
          />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{item.label}</Text>
          <Text style={styles.sub} selectable>{item.file}</Text>
        </View>
      </Pressable>
    );
  }, [onPick]);

  const keyExtractor = useCallback((item: IconItem) => item.key, []);

  const header = useMemo(() => (
    <View style={styles.header} testID="icon-choices-header">
      <Text style={styles.h1}>Choose your app icon</Text>
      <Text style={styles.h2}>Tap an image to confirm which one to use in app.json</Text>
    </View>
  ), []);

  return (
    <View style={styles.container} testID="icon-choices-screen">
      <Stack.Screen options={{ title: 'Icon Choices' }} />
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.footer} testID="icon-choices-footer">
        <Text style={styles.footerText}>After you pick, I will wire it in app.json on request.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { padding: 16, paddingBottom: 32 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  h1: { fontSize: 20, fontWeight: '700' as const, color: '#111' },
  h2: { fontSize: 14, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  iconWrap: { width: 96, height: 96, borderRadius: 20, overflow: 'hidden', alignSelf: 'flex-start' },
  icon: { width: '100%', height: '100%' },
  meta: { marginTop: 12 },
  title: { fontSize: 16, fontWeight: '600' as const, color: '#111' },
  sub: { fontSize: 12, color: '#555', marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  footerText: { fontSize: 12, color: '#666' },
});
