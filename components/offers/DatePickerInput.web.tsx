import React from 'react';

interface Props {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export default function DatePickerInput({ value, onChange, minDate }: Props) {
  return (
    <input
      type="date"
      value={value ?? ''}
      min={minDate}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 50,
        width: '100%',
        border: '1px solid #E0E0E0',
        borderRadius: 8,
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 15,
        color: value ? '#333333' : '#9E9E9E',
        backgroundColor: '#FAFAFA',
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box' as const,
      }}
    />
  );
}
