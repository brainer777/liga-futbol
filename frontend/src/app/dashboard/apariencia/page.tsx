'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Upload, Check } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useLigaStore } from '@/store/liga.store';
import { useBranding, fileUrl, hexToHslTriple, hslTripleToHex } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AparienciaPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const activeSlug = useLigaStore((s) => s.activeSlug);
  const { data: branding } = useBranding(activeSlug ?? undefined);

  const isSuperadmin = !!user?.roles.some((r) => r.nombre === 'Superadministrador');

  const [nombre, setNombre] = React.useState('');
  const [colorHex, setColorHex] = React.useState('#16a34a');
  const [ok, setOk] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Sincroniza el formulario con los valores actuales cuando llegan del backend.
  React.useEffect(() => {
    if (!branding) return;
    setNombre(branding.nombreLiga);
    setColorHex(hslTripleToHex(branding.colorPrimario));
  }, [branding]);

  const flash = (msg: string) => {
    setOk(msg);
    setError(null);
    window.setTimeout(() => setOk(null), 2500);
  };
  const onError = (e: unknown) => {
    setError(getApiErrorMessage(e));
    setOk(null);
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ['branding'] });

  const saveIdentidad = useMutation({
    mutationFn: () =>
      api
        .patch('/configuracion', { nombreLiga: nombre, colorPrimario: hexToHslTriple(colorHex) })
        .then((r) => r.data),
    onSuccess: () => {
      refresh();
      flash('Identidad guardada');
    },
    onError,
  });

  // Helper que arma el mutationFn (NO es un hook): sube el archivo al endpoint.
  const uploadFn = (endpoint: 'logo' | 'favicon') => (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post(`/configuracion/${endpoint}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  };

  const logoMut = useMutation({
    mutationFn: uploadFn('logo'),
    onSuccess: () => {
      refresh();
      flash('Logo actualizado');
    },
    onError,
  });

  const faviconMut = useMutation({
    mutationFn: uploadFn('favicon'),
    onSuccess: () => {
      refresh();
      flash('Favicon actualizado');
    },
    onError,
  });

  if (!isSuperadmin) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Solo un Superadministrador puede editar la apariencia.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Palette className="h-6 w-6" /> Apariencia
        </h1>
        <p className="text-sm text-muted-foreground">
          Personalizá el logo, el nombre y el color de la liga. Se aplica al panel, al portal público y a los reportes.
        </p>
      </div>

      {ok && (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          <Check className="h-4 w-4" /> {ok}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Identidad: nombre + color */}
      <Card>
        <CardHeader>
          <CardTitle>Identidad</CardTitle>
          <CardDescription>Nombre visible y color principal del tema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la liga</Label>
            <Input id="nombre" value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color principal</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded border bg-transparent p-1"
              />
              <span className="text-sm text-muted-foreground">{colorHex}</span>
              <Button type="button" size="sm" style={{ backgroundColor: colorHex }} className="text-white pointer-events-none">
                Vista previa
              </Button>
            </div>
          </div>
          <Button onClick={() => saveIdentidad.mutate()} disabled={saveIdentidad.isPending}>
            {saveIdentidad.isPending ? 'Guardando…' : 'Guardar identidad'}
          </Button>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Reemplaza el ⚽ en el panel, el login y el portal. PNG/JPG/WEBP.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted/30">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(branding.logoUrl)!} alt="logo" className="max-h-16 max-w-16 object-contain" />
            ) : (
              <span className="text-3xl">⚽</span>
            )}
          </div>
          <ImageUpload
            label={logoMut.isPending ? 'Subiendo…' : 'Subir logo'}
            disabled={logoMut.isPending}
            onPick={(f) => logoMut.mutate(f)}
          />
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>Ícono de la pestaña del navegador. Idealmente cuadrado (PNG).</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/30">
            {branding?.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(branding.faviconUrl)!} alt="favicon" className="max-h-8 max-w-8 object-contain" />
            ) : (
              <span className="text-xl">⚽</span>
            )}
          </div>
          <ImageUpload
            label={faviconMut.isPending ? 'Subiendo…' : 'Subir favicon'}
            disabled={faviconMut.isPending}
            onPick={(f) => faviconMut.mutate(f)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ImageUpload({
  label,
  disabled,
  onPick,
}: {
  label: string;
  disabled?: boolean;
  onPick: (file: File) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
      <Button type="button" variant="outline" disabled={disabled} onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" /> {label}
      </Button>
    </div>
  );
}
