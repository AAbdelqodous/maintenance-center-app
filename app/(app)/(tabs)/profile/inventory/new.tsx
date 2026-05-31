import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { PartForm } from '@/components/inventory/PartForm';
import { useCreatePartMutation } from '@/store/api/inventoryApi';
import type { CreatePartRequest } from '@/types/inventory';

// Spec 025 — create a catalog item.
export default function NewPartScreen() {
  const router = useRouter();
  const [createPart, { isLoading }] = useCreatePartMutation();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (body: CreatePartRequest) => {
    setError(null);
    try {
      await createPart(body).unwrap();
      router.back();
    } catch (e: any) {
      setError(e?.data?.businessErrorDescription ?? 'Error');
    }
  };

  return <PartForm submitting={isLoading} error={error} onSubmit={onSubmit} />;
}
