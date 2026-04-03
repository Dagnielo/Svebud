'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type UppladdningsStatus = 'idle' | 'laddar_upp' | 'klar' | 'fel'

type FilStatus = {
  namn: string
  status: 'väntar' | 'laddar' | 'klar' | 'fel' | 'varning'
  meddelande?: string
}

type Props = {
  projektId: string
  onUppladdat?: (anbudId: string) => void
}

export default function AnbudsUppladdning({ projektId, onUppladdat }: Props) {
  const [status, setStatus] = useState<UppladdningsStatus>('idle')
  const [filer, setFiler] = useState<FilStatus[]>([])
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const tillåtnaTyper = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/xml',
    'application/xml',
  ]

  const tillåtnaExt = ['pdf', 'docx', 'doc', 'xlsx', 'xml']

  function filÄrTillåten(fil: File): boolean {
    if (tillåtnaTyper.includes(fil.type)) return true
    const ext = fil.name.split('.').pop()?.toLowerCase()
    return tillåtnaExt.includes(ext ?? '')
  }

  const laddaUppFlerFiler = useCallback(async (fileList: File[]) => {
    const godkända = fileList.filter(f => filÄrTillåten(f) && f.size <= 20 * 1024 * 1024)
    const avvisade = fileList.filter(f => !filÄrTillåten(f) || f.size > 20 * 1024 * 1024)

    if (godkända.length === 0) {
      setStatus('fel')
      setFiler([{ namn: 'Inga giltiga filer', status: 'fel', meddelande: 'Använd PDF, DOCX, XLSX eller XML. Max 20 MB per fil.' }])
      return
    }

    setStatus('laddar_upp')
    const filStatuser: FilStatus[] = [
      ...godkända.map(f => ({ namn: f.name, status: 'väntar' as const })),
      ...avvisade.map(f => ({ namn: f.name, status: 'fel' as const, meddelande: 'Filtyp ej stödd eller för stor' })),
    ]
    setFiler([...filStatuser])

    let klara = 0
    let sistaAnbudId = ''

    for (let i = 0; i < godkända.length; i++) {
      const fil = godkända[i]
      filStatuser[i] = { ...filStatuser[i], status: 'laddar' }
      setFiler([...filStatuser])
      setProgress(Math.round(((i) / godkända.length) * 100))

      const formData = new FormData()
      formData.append('fil', fil)
      formData.append('projektId', projektId)

      try {
        const res = await fetch('/api/anbud/ladda-upp', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          filStatuser[i] = { namn: fil.name, status: 'fel', meddelande: data.fel ?? 'Uppladdning misslyckades' }
        } else if (data.varning) {
          filStatuser[i] = { namn: fil.name, status: 'varning', meddelande: data.varning }
          sistaAnbudId = data.anbudId
          klara++
        } else {
          filStatuser[i] = { namn: fil.name, status: 'klar' }
          sistaAnbudId = data.anbudId
          klara++
        }
      } catch {
        filStatuser[i] = { namn: fil.name, status: 'fel', meddelande: 'Nätverksfel' }
      }

      setFiler([...filStatuser])
    }

    setProgress(100)
    setStatus(klara > 0 ? 'klar' : 'fel')
    if (sistaAnbudId) onUppladdat?.(sistaAnbudId)
  }, [projektId, onUppladdat])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) laddaUppFlerFiler(files)
  }, [laddaUppFlerFiler])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) laddaUppFlerFiler(files)
    e.target.value = ''
  }, [laddaUppFlerFiler])

  return (
    <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
      <CardHeader>
        <CardTitle style={{ fontSize: 15 }}>Ladda upp förfrågningsunderlag</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-[#F5C400]' : ''
          }`}
          style={{ borderColor: dragActive ? 'var(--yellow)' : 'var(--navy-border)', background: dragActive ? 'var(--yellow-glow)' : 'transparent' }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {status === 'idle' && (
            <>
              <p style={{ color: 'var(--muted-custom)', marginBottom: 8, fontSize: 14 }}>
                Dra och släpp <strong style={{ color: 'var(--white)' }}>alla dokument</strong> i förfrågningsunderlaget hit
              </p>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 12 }}>
                PDF, DOCX, XLSX, XML · Max 20 MB per fil · Flera filer samtidigt
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById('fu-fil-input')?.click()}
                style={{ borderColor: 'var(--navy-border)', color: 'var(--soft)' }}
              >
                Välj filer
              </Button>
              <input
                id="fu-fil-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xml"
                multiple
                onChange={handleFileInput}
              />
            </>
          )}

          {status === 'laddar_upp' && (
            <div className="space-y-3">
              <p style={{ fontSize: 14, color: 'var(--yellow)', fontWeight: 600 }}>
                Laddar upp {filer.filter(f => f.status !== 'fel').length} filer...
              </p>
              <Progress value={progress} />
            </div>
          )}

          {(status === 'klar' || status === 'fel') && filer.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: status === 'klar' ? 'var(--green)' : 'var(--red)' }}>
                  {status === 'klar'
                    ? `${filer.filter(f => f.status === 'klar').length} filer uppladdade`
                    : 'Uppladdning misslyckades'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStatus('idle'); setFiler([]); setProgress(0) }}
                  style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)', fontSize: 12 }}
                >
                  Ladda upp fler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Fillista */}
        {filer.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {filer.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{ padding: '6px 0', borderBottom: i < filer.length - 1 ? '1px solid var(--navy-border)' : 'none' }}
              >
                <span style={{ fontSize: 12 }}>
                  {f.status === 'klar' ? '✅' : f.status === 'laddar' ? '⏳' : f.status === 'varning' ? '⚠️' : f.status === 'väntar' ? '⏸️' : '❌'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--soft)', flex: 1 }} className="truncate">{f.namn}</span>
                {f.meddelande && (
                  <span style={{ fontSize: 10, color: f.status === 'varning' ? 'var(--orange)' : 'var(--red)' }}>
                    {f.meddelande.slice(0, 40)}
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: f.status === 'klar' ? 'var(--green-bg)' : f.status === 'fel' ? 'var(--red-bg)' : f.status === 'laddar' ? 'var(--yellow-glow)' : 'var(--navy-light)',
                  color: f.status === 'klar' ? 'var(--green)' : f.status === 'fel' ? 'var(--red)' : f.status === 'laddar' ? 'var(--yellow)' : 'var(--muted-custom)',
                }}>
                  {f.status === 'klar' ? 'OK' : f.status === 'laddar' ? '...' : f.status === 'varning' ? '⚠' : f.status === 'väntar' ? 'Väntar' : 'Fel'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
