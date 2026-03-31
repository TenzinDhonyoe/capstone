import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColor } from '@/hooks/use-theme-color';
import { RecordingCard } from '@/components/recording-card';
import { BrandColors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { mockRecordings, type Recording } from '@/data/mock-recordings';

type Filter = 'all' | 'normal' | 'warning' | 'critical';

const filterOptions: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'normal', label: 'Normal' },
  { key: 'warning', label: 'Warnings' },
  { key: 'critical', label: 'Critical' },
];

export default function HistoryListScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const router = useRouter();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');

  const filteredRecordings = useMemo(() => {
    if (activeFilter === 'all') return mockRecordings;
    if (activeFilter === 'normal')
      return mockRecordings.filter(
        (r) => r.status === 'optimal' || r.status === 'normal'
      );
    return mockRecordings.filter((r) => r.status === activeFilter);
  }, [activeFilter]);

  const renderItem = ({ item }: { item: Recording }) => (
    <RecordingCard
      date={item.date}
      time={item.time}
      bpm={item.bpm}
      duration={item.duration}
      condition={item.condition}
      status={item.status}
      onPress={() => router.push(`/(tabs)/history/${item.id}`)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={secondaryText} />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        No Recordings Found
      </Text>
      <Text style={[styles.emptyMessage, { color: secondaryText }]}>
        {activeFilter === 'all'
          ? 'Start your first recording to see it here.'
          : `No ${activeFilter} recordings found.`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Recordings</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                isActive
                  ? styles.filterChipActive
                  : { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
              onPress={() => setActiveFilter(option.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive
                    ? styles.filterChipTextActive
                    : { color: secondaryText },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredRecordings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: BrandColors.orange,
    borderColor: BrandColors.orange,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  emptyMessage: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
