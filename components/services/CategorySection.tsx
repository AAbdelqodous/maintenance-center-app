import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import ServiceCard from './ServiceCard';
import type { ServiceCategory, CenterServiceResponse } from '@/store/api/centerApi';

interface Props {
  category: ServiceCategory;
  services: CenterServiceResponse[];
  onEditService: (id: number) => void;
  onDeleteService: (id: number) => void;
}

export default function CategorySection({ category, services, onEditService, onDeleteService }: Props) {
  const { i18n } = useTranslation();
  const categoryName = i18n.language === 'ar' ? category.nameAr : category.nameEn;
  const isRTL = i18n.dir() === 'rtl';

  return (
    <View style={styles.container}>
      <Text style={[styles.header, isRTL && styles.headerRtl]}>{categoryName}</Text>
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          item={service}
          onEdit={() => onEditService(service.id)}
          onDelete={() => onDeleteService(service.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerRtl: {
    textAlign: 'right',
  },
});
