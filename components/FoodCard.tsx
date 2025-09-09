import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  title: string;
  calories?: number;
  color?: string; // background accent
  emoji?: string;
};

export const FoodCard: React.FC<Props> = ({ title, calories, color = '#F9FAFB', emoji = '🥗' }) => {
  return (
    <View style={[styles.card, { backgroundColor: color }]}
    >
      <View style={styles.badge}><Text style={styles.badgeText}>{emoji}</Text></View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {!!calories && <Text style={styles.meta}>{calories} kcal</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 180,
    height: 200,
    borderRadius: 20,
    padding: 20,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  badgeText: {
    fontSize: 16,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  meta: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 12,
  },
});

export default FoodCard;
