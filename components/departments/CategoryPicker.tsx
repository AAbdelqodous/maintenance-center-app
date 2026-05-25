import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetCategoriesQuery } from '@/store/api/centerApi';

interface CategoryPickerProps {
  value: number[];
  onChange: (ids: number[]) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { t, i18n } = useTranslation();
  const { data: categories = [] } = useGetCategoriesQuery();
  const isRTL = i18n.dir() === 'rtl';

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isRTL && styles.textRtl]}>{t('departments.categories')}</Text>
      <Text style={[styles.hint, isRTL && styles.textRtl]}>{t('departments.categoriesHint')}</Text>
      <View style={styles.chips}>
        {categories.map((cat) => {
          const name = i18n.language === 'ar' ? cat.nameAr : cat.nameEn;
          const selected = value.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggle(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  textRtl: {
    textAlign: 'right',
  },
});
