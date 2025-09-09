import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export const Tag: React.FC<Props> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.tag, selected && styles.tagSelected]}>
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  tagSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  text: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  textSelected: {
    color: '#16A34A',
  },
});

export default Tag;
