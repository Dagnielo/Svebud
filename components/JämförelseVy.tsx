'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type AnbudJämförelse = {
  anbud_id: string
  leverantör: string
  totalbelopp: number | null
  styrkor: string[]
  svagheter: string[]
  avvikelser: string[]
  poäng: number
}

type JämförelseData = {
  sammanfattning: string
  anbud: AnbudJämförelse[]
  rekommenderat_anbud_id: string | null
  kräver_granskning: boolean
  granskningsorsaker: string[]
}

type Props = {
  projektId: string
  data?: JämförelseData | null
  onKörJämförelse?: () => void
  laddar?: boolean
}

export default function JämförelseVy({ projektId, data, onKörJämförelse, laddar }: Props) {
  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">
            Ladda upp minst 2 anbud och kör extraktion innan jämförelse.
          </p>
          <Button onClick={onKörJämförelse} disabled={laddar}>
            {laddar ? 'Jämför...' : 'Kör jämförelse'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.kräver_granskning && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="font-medium text-orange-700 dark:text-orange-300">
            ⚠️ Jämförelsen kräver manuell granskning
          </p>
          <ul className="mt-2 text-sm text-orange-600 dark:text-orange-400 list-disc list-inside">
            {data.granskningsorsaker.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sammanfattning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{data.sammanfattning}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anbudsjämförelse</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverantör</TableHead>
                <TableHead>Belopp</TableHead>
                <TableHead>Poäng</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.anbud.map(a => (
                <TableRow key={a.anbud_id}>
                  <TableCell className="font-medium">{a.leverantör}</TableCell>
                  <TableCell>
                    {a.totalbelopp
                      ? `${a.totalbelopp.toLocaleString('sv-SE')} kr`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={a.poäng} className="w-16" />
                      <span className="text-sm">{a.poäng}/100</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.anbud_id === data.rekommenderat_anbud_id && (
                      <Badge className="bg-green-600">Rekommenderat</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.anbud.map(a => (
        <Card key={a.anbud_id}>
          <CardHeader>
            <CardTitle className="text-base">{a.leverantör}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.styrkor.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Styrkor</p>
                <ul className="text-sm list-disc list-inside">
                  {a.styrkor.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {a.svagheter.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Svagheter</p>
                <ul className="text-sm list-disc list-inside">
                  {a.svagheter.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {a.avvikelser.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">Avvikelser från FU</p>
                <ul className="text-sm list-disc list-inside">
                  {a.avvikelser.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
