'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

type KalkylMoment = {
  beskrivning: string
  timmar: number
  timpris: number
  materialkostnad: number
  belopp: number
}

type Kalkyl = {
  moment: KalkylMoment[]
  totalt_arbete: number
  totalt_material: number
  totalbelopp: number
  moms: number
  totalt_inkl_moms: number
  rot_avdrag?: number
  gron_teknik_avdrag?: number
  kund_betalar?: number
}

type CertifikatKontroll = {
  krav: string
  uppfyllt: boolean
  obligatoriskt: boolean
}

type RekommendationsData = {
  beslut: 'GO' | 'NO-GO' | 'PRELIMINÄRT'
  badge_färg: 'grön' | 'röd' | 'gul'
  rubrik: string
  sammanfattning: string
  kalkyl: Kalkyl
  anbudsdokument: string
  certifikat_uppfyllda: CertifikatKontroll[]
  kräver_granskning: boolean
  granskningsorsaker: string[]
}

type Props = {
  data?: RekommendationsData | null
  onGenerera?: () => void
  onExportera?: () => void
  laddar?: boolean
}

function GoNoGoBadge({ beslut, badge_färg }: { beslut: string; badge_färg: string }) {
  const colorClass =
    badge_färg === 'grön' ? 'bg-green-600' :
    badge_färg === 'röd' ? 'bg-red-600' :
    'bg-orange-500'

  return <Badge className={`${colorClass} text-lg px-4 py-1`}>{beslut}</Badge>
}

export default function RekommendationsVy({ data, onGenerera, onExportera, laddar }: Props) {
  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">
            Kör jämförelse först, sedan kan du generera rekommendation och anbudsdokument.
          </p>
          <Button onClick={onGenerera} disabled={laddar}>
            {laddar ? 'Genererar...' : 'Generera rekommendation'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Go/No-Go */}
      <Card className={
        data.badge_färg === 'grön' ? 'border-green-500' :
        data.badge_färg === 'röd' ? 'border-red-500' :
        'border-orange-500'
      }>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {data.rubrik}
            <GoNoGoBadge beslut={data.beslut} badge_färg={data.badge_färg} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{data.sammanfattning}</p>
          {data.beslut === 'PRELIMINÄRT' && (
            <p className="text-sm text-orange-600 dark:text-orange-400 italic mt-2">
              ⚠ Beslutet baseras på ofullständig data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Certifikat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certifikat & behörigheter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.certifikat_uppfyllda.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{c.krav} {c.obligatoriskt && <span className="text-red-500">*</span>}</span>
                <span>{c.uppfyllt ? '✓' : data.beslut === 'PRELIMINÄRT' ? '❓ Oklart' : '✗'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kalkyl */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kalkyl</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Moment</TableHead>
                <TableHead className="text-right">Timmar</TableHead>
                <TableHead className="text-right">Material</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.kalkyl.moment.map((m, i) => (
                <TableRow key={i}>
                  <TableCell>{m.beskrivning}</TableCell>
                  <TableCell className="text-right">{m.timmar}</TableCell>
                  <TableCell className="text-right">{m.materialkostnad.toLocaleString('sv-SE')} kr</TableCell>
                  <TableCell className="text-right">{m.belopp.toLocaleString('sv-SE')} kr</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between font-medium">
              <span>Totalt exkl. moms</span>
              <span>{data.kalkyl.totalbelopp.toLocaleString('sv-SE')} kr</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Moms (25%)</span>
              <span>{data.kalkyl.moms.toLocaleString('sv-SE')} kr</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Totalt inkl. moms</span>
              <span>{data.kalkyl.totalt_inkl_moms.toLocaleString('sv-SE')} kr</span>
            </div>
            {data.kalkyl.rot_avdrag && (
              <div className="flex justify-between text-green-600">
                <span>ROT-avdrag</span>
                <span>-{data.kalkyl.rot_avdrag.toLocaleString('sv-SE')} kr</span>
              </div>
            )}
            {data.kalkyl.gron_teknik_avdrag && (
              <div className="flex justify-between text-green-600">
                <span>Grön Teknik-avdrag</span>
                <span>-{data.kalkyl.gron_teknik_avdrag.toLocaleString('sv-SE')} kr</span>
              </div>
            )}
            {data.kalkyl.kund_betalar && (
              <div className="flex justify-between font-bold text-primary">
                <span>Kunden betalar</span>
                <span>{data.kalkyl.kund_betalar.toLocaleString('sv-SE')} kr</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Granskning */}
      {data.kräver_granskning && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="font-medium text-orange-700 dark:text-orange-300">
            ⚠️ Kräver granskning
          </p>
          <ul className="mt-2 text-sm list-disc list-inside">
            {data.granskningsorsaker.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      {/* Exportera */}
      <div className="flex gap-3">
        <Button onClick={onExportera}>Exportera anbudsdokument</Button>
        <Button variant="outline" onClick={onGenerera}>Generera om</Button>
      </div>
    </div>
  )
}
