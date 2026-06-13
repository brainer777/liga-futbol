'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, ImageIcon } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { fileUrl } from '@/lib/branding';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select' | 'multiselect' | 'logo';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  /** Texto de ayuda mostrado bajo el campo */
  hint?: string;
}

/**
 * Campo de subida de logo/escudo. Sube el archivo a /uploads?subfolder=logos
 * y guarda la URL pública relativa en el valor del campo.
 */
function LogoField({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads?subfolder=logos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.url);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const preview = fileUrl(value);

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="logo" className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading}
            onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {uploading ? 'Subiendo…' : preview ? 'Cambiar' : 'Subir logo'}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" disabled={uploading}
              onClick={() => onChange('')}>
              Quitar
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function emptyValue(type?: FieldDef['type']) {
  if (type === 'checkbox') return false;
  if (type === 'multiselect') return [];
  return '';
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
      init[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? emptyValue(f.type);
    }
    return init;
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const init: Record<string, any> = {};
      for (const f of fields) init[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? emptyValue(f.type);
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
                ) : f.type === 'multiselect' ? (
                  <div className="flex flex-wrap gap-2">
                    {f.options?.length ? (
                      f.options.map((o) => {
                        const arr: string[] = Array.isArray(values[f.name]) ? values[f.name] : [];
                        const checked = arr.includes(o.value);
                        return (
                          <label
                            key={o.value}
                            className={
                              'flex items-center gap-2 text-sm border rounded-md px-2.5 py-1 cursor-pointer select-none ' +
                              (checked ? 'border-primary bg-primary/10' : 'border-input')
                            }
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...arr, o.value]
                                  : arr.filter((v) => v !== o.value);
                                setValues({ ...values, [f.name]: next });
                              }}
                            />
                            {o.label}
                          </label>
                        );
                      })
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin opciones disponibles.</span>
                    )}
                  </div>
                ) : f.type === 'logo' ? (
                  <LogoField
                    value={values[f.name] ?? ''}
                    onChange={(url) => setValues({ ...values, [f.name]: url })}
                  />
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
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
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
