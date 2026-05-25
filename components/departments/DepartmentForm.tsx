import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { CategoryPicker } from './CategoryPicker';
import type { CreateDepartmentRequest } from '@/types/department';

const departmentSchema = z.object({
  nameAr: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  categoryIds: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
  defaultValues?: Partial<CreateDepartmentRequest>;
  onSubmit: (data: CreateDepartmentRequest) => void;
  isSubmitting?: boolean;
  children: (handleSubmit: () => void) => React.ReactNode;
}

export function DepartmentForm({ defaultValues, onSubmit, children }: DepartmentFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      nameAr: defaultValues?.nameAr ?? '',
      nameEn: defaultValues?.nameEn ?? '',
      categoryIds: defaultValues?.categoryIds ?? [],
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      nameAr: values.nameAr,
      nameEn: values.nameEn,
      categoryIds: values.categoryIds,
    });
  });

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={[styles.label, isRTL && styles.textRtl]}>{t('departments.nameAr')}</Text>
        <Controller
          control={control}
          name="nameAr"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, !!errors.nameAr && styles.inputError, isRTL && styles.inputRtl]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              textAlign={isRTL ? 'right' : 'left'}
              maxLength={200}
            />
          )}
        />
        {errors.nameAr && (
          <Text style={styles.errorText}>{t('common.fillRequired')}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, isRTL && styles.textRtl]}>{t('departments.nameEn')}</Text>
        <Controller
          control={control}
          name="nameEn"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, !!errors.nameEn && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={200}
            />
          )}
        />
        {errors.nameEn && (
          <Text style={styles.errorText}>{t('common.fillRequired')}</Text>
        )}
      </View>

      <Controller
        control={control}
        name="categoryIds"
        render={({ field: { value, onChange } }) => (
          <CategoryPicker value={value ?? []} onChange={onChange} />
        )}
      />

      {children(submit)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputRtl: {
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  textRtl: {
    textAlign: 'right',
  },
});
