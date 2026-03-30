'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

type UppladdningsStatus = 'idle' | 'laddar_upp' | 'klar' | 'fel'

type Props = {
  projektId: string
  onUppladdat?: (anbudId: string) => void
}

export default function AnbudsUppladdning({ projektId, onUppladdat }: Props) {
  const [status, setStatus] = useState<UppladdningsStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [felmeddelande, setFelmeddelande] = useState<string | null>(null)
  const [varning, setVarning] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const tillåtnaTyper = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  const laddaUpp = useCallback(async (fil: File) => {
    setStatus('laddar_upp')
    setFelmeddelande(null)
    setVarning(null)
    setProgress(10)

    if (!tillåtnaTyper.includes(fil.type)) {
      setStatus('fel')
      setFelmeddelande('Filtypen stöds inte. Använd PDF, DOCX eller XLSX.')
      return
    }

    if (fil.size > 20 * 1024 * 1024) {
      setStatus('fel')
      setFelmeddelande('Filen är för stor. Max 20 MB.')
      return
    }

    setProgress(30)

    const formData = new FormData()
    formData.append('fil', fil)
    formData.append('projektId', projektId)

    try {
      const res = await fetch('/api/anbud/ladda-upp', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      const data = await res.json()

      if (!res.ok) {
        setStatus('fel')
        setFelmeddelande(data.fel ?? 'Uppladdning misslyckades')
        return
      }

      if (data.varning) {
        setVarning(data.varning)
      }

      setProgress(100)
      setStatus('klar')
      onUppladdat?.(data.anbudId)
    } catch {
      setStatus('fel')
      setFelmeddelande('Nätverksfel. Försök igen.')
    }
  }, [projektId, onUppladdat])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const fil = e.dataTransfer.files[0]
    if (fil) laddaUpp(fil)
  }, [laddaUpp])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fil = e.target.files?.[0]
    if (fil) laddaUpp(fil)
  }, [laddaUpp])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ladda upp dokument</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {status === 'idle' && (
            <>
              <p className="text-muted-foreground mb-4">
                Dra och släpp förfrågningsunderlag eller anbud här
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, DOCX eller XLSX · Max 20 MB
              </p>
              <Button variant="outline" onClick={() => document.getElementById('fil-input')?.click()}>
                Välj fil
              </Button>
              <input
                id="fil-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx"
                onChange={handleFileInput}
              />
            </>
          )}

          {status === 'laddar_upp' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Laddar upp och analyserar...</p>
              <Progress value={progress} />
            </div>
          )}

          {status === 'klar' && (
            <div className="space-y-3">
              <Badge variant="default" className="bg-green-600">Uppladdad</Badge>
              {varning && (
                <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded text-sm text-orange-700 dark:text-orange-300">
                  ⚠️ {varning}
                  <div className="mt-2">
                    <a href={`/manuell-analys?projektId=${projektId}`} className="underline">
                      Fyll i uppgifterna manuellt →
                    </a>
                  </div>
                </div>
              )}
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Ladda upp ytterligare
              </Button>
            </div>
          )}

          {status === 'fel' && (
            <div className="space-y-3">
              <Badge variant="destructive">Fel</Badge>
              <p className="text-sm text-destructive">{felmeddelande}</p>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Försök igen
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
