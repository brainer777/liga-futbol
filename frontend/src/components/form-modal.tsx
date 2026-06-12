'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

interface FormModalProps {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initialValues?: Record<string, any>;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  submitText?: string;
}

export function FormModal({ open, title, fields, initialValues, onClose, onSubmit, submitText = 'Guardar' }: FormModalProps) {
  const [values, setValues] = React.useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const f of fields) {
      init[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? (f.type === 'checkbox' ? false : '');
    }
    return init;
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const init: Record<string, any> = {};
      for (const f of fields) init[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? (f.type === 'checkbox' ? false : '');
      setValues(init);
      setError(null);
    }
  }, [open, initialValues, fields]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                {f.type === 'textarea' ? (
                  <textarea
                    id={f.name}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={values[f.name] ?? ''}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                    required={f.required}
                    placeholder={f.placeholder}
                  />
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!values[f.name]}
                      onChange={(e) => setValues({ ...values, [f.name]: e.target.checked })}
                    />
                    {f.placeholder || 'Activo'}
                  </label>
                ) : f.type === 'select' ? (
                  <select
                    id={f.name}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={values[f.name] ?? ''}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                    required={f.required}
                  >
                    <option value="">Seleccione…</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={f.name}
                    type={f.type || 'text'}
                    value={values[f.name] ?? ''}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.name]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
                      })
                    }
                    required={f.required}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : submitText}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
