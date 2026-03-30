'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

type ExtraktionsFält = {
  värde: string | number | null
  konfidens: number
}

type Anbud = {
  id: string
  filnamn: string
  extraktion_status: string
  extraherad_data: Record<string, ExtraktionsFält> | null
  konfidensvärden: Record<string, number> | null
  kund_typ: string | null
  rot_tillämpligt: boolean
  foreslaget_avtalsvillkor: string | null
}

type Props = {
  projektId: string
}

function KonfidensBadge({ konfidens }: { konfidens: number }) {
  if (konfidens >= 90) return <Badge className="bg-green-600">{konfidens}%</Badge>
  if (konfidens >= 60) return <Badge className="bg-orange-500">{konfidens}%</Badge>
  return <Badge variant="destructive">{konfidens}%</Badge>
}

export default function GranskningSida({ projektId }: Props) {
  const [anbud, setAnbud] = useState<Anbud[]>([])
  const [loading, setLoading] = useState(true)
  const [analysKomplett, setAnalysKomplett] = useState<boolean | null>(null)
  const [saknadeFält, setSaknadeFält] = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function hämta() {
      const { data: anbudData } = await supabase
        .from('anbud')
        .select('*')
        .eq('projekt_id', projektId)
        .order('skapad', { ascending: false })

      if (anbudData) setAnbud(anbudData as unknown as Anbud[])

      const { data: projekt } = await supabase
        .from('projekt')
        .select('analys_komplett, saknade_falt')
        .eq('id', projektId)
        .single()

      if (projekt) {
        setAnalysKomplett((projekt as Record<string, unknown>).analys_komplett as boolean | null)
        setSaknadeFält(((projekt as Record<string, unknown>).saknade_falt as string[]) ?? [])
      }

      setLoading(false)
    }
    hämta()
  }, [projektId])

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />

  const lägstaKonfidens = anbud
    .filter(a => a.konfidensvärden)
    .flatMap(a => Object.values(a.konfidensvärden!))
    .reduce((min, v) => Math.min(min, v), 100)

  const datakvalitet = anbud.length > 0
    ? Math.round(
        anbud.filter(a => a.konfidensvärden)
          .flatMap(a => Object.values(a.konfidensvärden!))
          .filter(v => v >= 70).length /
        Math.max(1, anbud.filter(a => a.konfidensvärden).flatMap(a => Object.values(a.konfidensvärden!)).length) * 100
      )
    : 0

  return (
    <div className="space-y-4">
      {analysKomplett === false && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="font-medium text-orange-700 dark:text-orange-300">
            ⚠️ Ofullständig analys – Go/No-Go kan inte fastställas med säkerhet
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {saknadeFält.map(f => (
              <Badge key={f} className="bg-orange-500">{f}</Badge>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <a href={`/manuell-analys?projektId=${projektId}`}>
              <Button variant="outline" size="sm">📝 Komplettera manuellt</Button>
            </a>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Datakvalitet
            <Progress value={datakvalitet} className="w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {datakvalitet}% av fälten har konfidens ≥ 70%
          </p>
        </CardContent>
      </Card>

      {anbud.map(a => (
        <Card key={a.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              {a.filnamn}
              <Badge variant={
                a.extraktion_status === 'extraherad' ? 'default' :
                a.extraktion_status === 'fel' ? 'destructive' : 'secondary'
              }>
                {a.extraktion_status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {a.extraherad_data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(a.extraherad_data).map(([fält, data]) => (
                  <div key={fält} className="flex items-start justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium capitalize">{fält.replace(/_/g, ' ')}</p>
                      <p className={`text-sm ${data.konfidens < 60 ? 'text-orange-600' : ''}`}>
                        {data.värde?.toString() ?? '—'}
                      </p>
                    </div>
                    <KonfidensBadge konfidens={data.konfidens} />
                  </div>
                ))}
              </div>
            )}

            {a.kund_typ && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <Badge variant="outline">Kundtyp: {a.kund_typ}</Badge>
                {a.rot_tillämpligt && <Badge variant="outline">ROT-avdrag</Badge>}
                {a.foreslaget_avtalsvillkor && (
                  <Badge variant="outline">{a.foreslaget_avtalsvillkor}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
