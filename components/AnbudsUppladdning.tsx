'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FolderOpen, ClipboardText, FloppyDisk, X, CheckCircle, Spinner, Warning, Pause, XCircle } from '@phosphor-icons/react'

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
  const [visaTextInput, setVisaTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [spararText, setSpararText] = useState(false)

  const tillåtnaExt = ['pdf', 'docx', 'doc', 'xlsx', 'xml', 'txt', 'csv', 'eml', 'msg', 'html', 'htm', 'png', 'jpg', 'jpeg', 'gif', 'webp']

  function filÄrTillåten(fil: File): boolean {
    const ext = fil.name.split('.').pop()?.toLowerCase()
    return tillåtnaExt.includes(ext ?? '')
  }

  const laddaUppFlerFiler = useCallback(async (fileList: File[]) => {
    const godkända = fileList.filter(f => filÄrTillåten(f) && f.size <= 20 * 1024 * 1024)
    const avvisade = fileList.filter(f => !filÄrTillåten(f) || f.size > 20 * 1024 * 1024)

    if (godkända.length === 0) {
      setStatus('fel')
      setFiler([{ namn: 'Inga giltiga filer', status: 'fel', meddelande: 'Filtyp ej stödd eller för stor' }])
      return
    }

    setStatus('laddar_upp')
    const filStatuser: FilStatus[] = [
      ...godkända.map(f => ({ namn: f.name, status: 'väntar' as const })),
      ...avvisade.map(f => ({ namn: f.name, status: 'fel' as const, meddelande: 'Ej stödd filtyp' })),
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
        const res = await fetch('/api/anbud/ladda-upp', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
          filStatuser[i] = { namn: fil.name, status: 'fel', meddelande: data.fel ?? 'Misslyckades' }
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

  async function sparaText() {
    if (!textInput.trim()) return
    setSpararText(true)

    const blob = new Blob([textInput], { type: 'text/plain' })
    const fil = new File([blob], `inklistrad_text_${Date.now()}.txt`, { type: 'text/plain' })

    await laddaUppFlerFiler([fil])
    setTextInput('')
    setVisaTextInput(false)
    setSpararText(false)
  }

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
    <Card style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
      <CardHeader>
        <CardTitle style={{ fontSize: 15, color: 'var(--light-t1)' }}>Ladda upp förfrågningsunderlag</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Drag & drop zon */}
        <div
          style={{
            border: '2px dashed',
            borderColor: dragActive ? 'var(--light-amber)' : 'var(--light-border)',
            background: dragActive ? 'var(--light-amber-glow)' : 'transparent',
            borderRadius: 8,
            padding: '24px',
            textAlign: 'center',
            transition: 'all 0.2s',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {status === 'idle' && !visaTextInput && (
            <>
              <p style={{ color: 'var(--light-t3)', marginBottom: 8, fontSize: 14 }}>
                Dra och släpp <strong style={{ color: 'var(--light-t1)' }}>alla dokument</strong> i förfrågningsunderlaget hit
              </p>
              <p style={{ fontSize: 12, color: 'var(--light-t4)', marginBottom: 16 }}>
                PDF · Word · Excel · Mail · Bilder · XML · Max 20 MB per fil
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('fu-fil-input')?.click()}
                  style={{ borderColor: 'var(--light-border)', color: 'var(--light-t2)', background: 'var(--light-bg)', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <FolderOpen size={16} weight="bold" />
                  Välj filer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setVisaTextInput(true)}
                  style={{ borderColor: 'var(--light-border)', color: 'var(--light-t2)', background: 'var(--light-bg)', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <ClipboardText size={16} weight="bold" />
                  Klistra in text / mail
                </Button>
              </div>
              <input
                id="fu-fil-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xml,.txt,.csv,.eml,.msg,.html,.htm,.png,.jpg,.jpeg,.gif,.webp"
                multiple
                onChange={handleFileInput}
              />
            </>
          )}

          {status === 'laddar_upp' && (
            <div className="space-y-3">
              <p style={{ fontSize: 14, color: 'var(--light-amber)', fontWeight: 600 }}>
                Laddar upp {filer.filter(f => f.status !== 'fel').length} filer...
              </p>
              <Progress value={progress} />
            </div>
          )}

          {(status === 'klar' || status === 'fel') && filer.length > 0 && !visaTextInput && (
            <div className="space-y-2">
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: status === 'klar' ? 'var(--light-green)' : 'var(--light-red)' }}>
                  {status === 'klar'
                    ? `${filer.filter(f => f.status === 'klar').length} filer uppladdade`
                    : 'Uppladdning misslyckades'}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setStatus('idle'); setFiler([]); setProgress(0) }}
                    style={{ borderColor: 'var(--light-border)', color: 'var(--light-t3)', background: 'var(--light-bg)', fontSize: 12 }}
                  >
                    Ladda upp fler
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setVisaTextInput(true) }}
                    style={{ borderColor: 'var(--light-border)', color: 'var(--light-t3)', background: 'var(--light-bg)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ClipboardText size={14} weight="bold" />
                    Klistra in text
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Text-input för mail/fritext */}
        {visaTextInput && (
          <div style={{ marginTop: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light-t1)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ClipboardText size={14} weight="bold" />
                Klistra in mailtext eller förfrågningstext
              </span>
              <button
                onClick={() => setVisaTextInput(false)}
                style={{ fontSize: 12, color: 'var(--light-t3)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <X size={12} weight="bold" />
                Stäng
              </button>
            </div>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={'Klistra in (Cmd+V) hela mailet eller texten här...\n\nExempel:\nFrån: upphandling@brf-solstrålen.se\nÄmne: Förfrågan om elinstallation\n\nHej,\nVi söker offerter för...'}
              style={{
                width: '100%',
                minHeight: 200,
                padding: 12,
                borderRadius: 8,
                background: 'var(--light-bg)',
                border: '1px solid var(--light-border)',
                color: 'var(--light-t1)',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={sparaText}
                disabled={spararText || !textInput.trim()}
                style={{ background: 'var(--light-amber)', color: 'var(--light-navy)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <FloppyDisk size={14} weight="bold" />
                {spararText ? 'Sparar...' : 'Spara som dokument'}
              </Button>
              <span style={{ fontSize: 11, color: 'var(--light-t4)', alignSelf: 'center' }}>
                {textInput.length > 0 ? `${textInput.length} tecken` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Fillista */}
        {filer.length > 0 && !visaTextInput && (
          <div style={{ marginTop: 12 }}>
            {filer.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{ padding: '6px 0', borderBottom: i < filer.length - 1 ? '1px solid var(--light-border)' : 'none' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {f.status === 'klar' ? <CheckCircle size={14} weight="bold" style={{ color: 'var(--light-green)' }} />
                    : f.status === 'laddar' ? <Spinner size={14} weight="bold" className="animate-spin" style={{ color: 'var(--light-amber)' }} />
                    : f.status === 'varning' ? <Warning size={14} weight="bold" style={{ color: 'var(--light-orange)' }} />
                    : f.status === 'väntar' ? <Pause size={14} weight="bold" style={{ color: 'var(--light-t3)' }} />
                    : <XCircle size={14} weight="bold" style={{ color: 'var(--light-red)' }} />}
                </span>
                <span style={{ fontSize: 12, color: 'var(--light-t2)', flex: 1 }} className="truncate">{f.namn}</span>
                {f.meddelande && (
                  <span style={{ fontSize: 10, color: f.status === 'varning' ? 'var(--light-orange)' : 'var(--light-red)' }}>
                    {f.meddelande.slice(0, 40)}
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: f.status === 'klar' ? 'var(--light-green-bg)' : f.status === 'fel' ? 'var(--light-red-bg)' : f.status === 'laddar' ? 'var(--light-amber-glow)' : 'var(--light-cream)',
                  color: f.status === 'klar' ? 'var(--light-green)' : f.status === 'fel' ? 'var(--light-red)' : f.status === 'laddar' ? 'var(--light-amber)' : 'var(--light-t3)',
                }}>
                  {f.status === 'klar' ? 'OK' : f.status === 'laddar' ? '...' : f.status === 'varning' ? 'Varning' : f.status === 'väntar' ? 'Väntar' : 'Fel'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
