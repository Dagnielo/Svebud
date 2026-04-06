'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Uppföljning = {
  id: string
  projekt_id: string
  state: string
  sista_anbudsdag: string | null
  nästa_åtgärd: string | null
  nästa_åtgärd_typ: string | null
  utfall: string | null
  projekt_namn?: string
}

const stateLabels: Record<string, string> = {
  'anbud_skickat': 'Anbud skickat',
  'påminnelse_1_schemalagd': 'Påminnelse 1 schemalagd',
  'påminnelse_1_skickad': 'Påminnelse 1 skickad',
  'påminnelse_2_schemalagd': 'Påminnelse 2 schemalagd',
  'påminnelse_2_skickad': 'Påminnelse 2 skickad',
  'svar_mottaget': 'Svar mottaget',
  'vunnet': 'Vunnet',
  'förlorat': 'Förlorat',
  'avbrutet': 'Avbrutet',
}

function StateBadge({ state }: { state: string }) {
  const variant =
    state === 'vunnet' ? 'default' :
    state === 'förlorat' || state === 'avbrutet' ? 'destructive' :
    'secondary'

  const className = state === 'vunnet' ? 'bg-green-600' : undefined

  return <Badge variant={variant} className={className}>{stateLabels[state] ?? state}</Badge>
}

export default function UppföljningsDashboard() {
  const [uppföljningar, setUppföljningar] = useState<Uppföljning[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function hämta() {
      const { data } = await supabase
        .from('uppföljning')
        .select('*')
        .order('skapad', { ascending: false })

      if (data) {
        // Hämta projektnamn
        const projektIds = [...new Set(data.map((u: Record<string, unknown>) => u.projekt_id as string))]
        const { data: projekt } = await supabase
          .from('projekt')
          .select('id, namn')
          .in('id', projektIds)

        const projektMap = new Map((projekt ?? []).map((p: Record<string, unknown>) => [p.id, p.namn as string]))

        setUppföljningar(
          data.map((u: Record<string, unknown>) => ({
            ...(u as unknown as Uppföljning),
            projekt_namn: projektMap.get(u.projekt_id as string) ?? 'Okänt projekt',
          }))
        )
      }

      setLoading(false)
    }
    hämta()
  }, [])

  const uppdateraUtfall = async (id: string, utfall: string) => {
    await supabase
      .from('uppföljning')
      .update({
        state: utfall === 'avbrutet' ? 'avbrutet' : utfall,
        utfall: utfall === 'avbrutet' ? 'inget_svar' : utfall,
      })
      .eq('id', id)

    setUppföljningar(prev =>
      prev.map(u => u.id === id ? { ...u, state: utfall, utfall } : u)
    )
  }

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />

  const aktiva = uppföljningar.filter(u => !['vunnet', 'förlorat', 'avbrutet'].includes(u.state))
  const avslutade = uppföljningar.filter(u => ['vunnet', 'förlorat', 'avbrutet'].includes(u.state))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Aktiva uppföljningar
            <Badge variant="outline">{aktiva.length} st</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aktiva.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga aktiva uppföljningar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Nästa åtgärd</TableHead>
                  <TableHead>Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aktiva.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.projekt_namn}</TableCell>
                    <TableCell><StateBadge state={u.state} /></TableCell>
                    <TableCell className="text-sm">
                      {u.sista_anbudsdag
                        ? new Date(u.sista_anbudsdag).toLocaleDateString('sv-SE')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.nästa_åtgärd
                        ? new Date(u.nästa_åtgärd).toLocaleDateString('sv-SE')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => uppdateraUtfall(u.id, 'vunnet')}>
                          Vunnet
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => uppdateraUtfall(u.id, 'förlorat')}>
                          Förlorat
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => uppdateraUtfall(u.id, 'avbrutet')}>
                          Avbryt
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {avslutade.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avslutade</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Utfall</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avslutade.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.projekt_namn}</TableCell>
                    <TableCell><StateBadge state={u.state} /></TableCell>
                    <TableCell className="text-sm">
                      {u.sista_anbudsdag
                        ? new Date(u.sista_anbudsdag).toLocaleDateString('sv-SE')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
