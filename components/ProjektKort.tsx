'use client'

import Link from 'next/link'
import type { PipelineStatus, Projekt } from '@/lib/types/projekt'
export type { Projekt }
import { bestämCta, hämtaAnbudslägeFrånProjekt } from '@/lib/projekt-status'
import { bedömningsVisning } from '@/lib/verdict'
import UtfallsKnappar from '@/components/UtfallsKnappar'
import { Trash, Calendar, Warning } from '@phosphor-icons/react'

type Props = {
  projekt: Projekt
  onRadera?: (id: string) => void
  onDeadlineChange?: (id: string, datum: string | null) => void
  onUtfallChange?: (id: string) => void
}

export function getPipelineKolumn(p: Projekt): string {
  return p.pipeline_status ?? 'inkorg'
}

const stripeFärgPerStatus: Record<PipelineStatus, string> = {
  inkorg: 'var(--light-amber)',
  under_arbete: 'var(--light-blue)',
  inskickat: 'var(--light-green)',
  tilldelning: 'var(--light-orange)',
}

function dagarSedanSkapad(skapad: string): string {
  const dagar = Math.floor((Date.now() - new Date(skapad).getTime()) / (1000 * 60 * 60 * 24))
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Igår'
  if (dagar < 7) return `${dagar}d sedan`
  if (dagar < 30) return `${Math.floor(dagar / 7)}v sedan`
  return `${Math.floor(dagar / 30)}mån sedan`
}

function deadlineFärg(deadline: string | null | undefined): string {
  if (!deadline) return 'var(--light-t4)'
  const dagar = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (dagar < 0) return 'var(--light-red)'
  if (dagar <= 3) return 'var(--light-orange)'
  if (dagar <= 7) return 'var(--light-amber)'
  return 'var(--light-t3)'
}

function dagarTillDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null
  const dagar = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (dagar < 0) return `${Math.abs(dagar)}d försenad`
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Imorgon'
  return `${dagar}d kvar`
}

function formatteraDatum(datum: string): string {
  const d = new Date(datum)
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export default function ProjektKort({ projekt, onRadera, onDeadlineChange, onUtfallChange }: Props) {
  const cta = bestämCta(projekt)
  const anbudsläge = hämtaAnbudslägeFrånProjekt(projekt)
  const visning = anbudsläge ? bedömningsVisning(anbudsläge) : null

  const visUtfallsKnappar =
    projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning'

  const stripe = stripeFärgPerStatus[projekt.pipeline_status ?? 'inkorg']

  return (
    <div
      style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderLeft: `4px solid ${stripe}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'grab',
        transition: 'box-shadow .12s ease, border-color .12s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/projekt/${projekt.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--light-t1)',
              textDecoration: 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {projekt.namn}
          </Link>
          {projekt.beskrivning && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--light-t4)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projekt.beskrivning}
            </div>
          )}
        </div>
        {onRadera && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (confirm('Radera projektet?')) onRadera(projekt.id)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--light-t4)',
            }}
            aria-label="Radera projekt"
          >
            <Trash size={14} weight="bold" />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {visning && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              padding: '3px 8px',
              borderRadius: 4,
              color: visning.färg,
              background: visning.bgFärg,
            }}
          >
            {visning.kort}
          </span>
        )}
        {projekt.analys_komplett === false && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              color: 'var(--light-orange)',
              background: 'var(--light-orange-bg)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Warning size={10} weight="bold" /> Komplettera
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--light-t4)', marginLeft: 'auto' }}>
          {dagarSedanSkapad(projekt.skapad)}
        </span>
      </div>

      {projekt.pipeline_status === 'inskickat' && projekt.skickat_datum ? (
        <div style={{ fontSize: 12, color: 'var(--light-t3)' }}>
          Skickat {formatteraDatum(projekt.skickat_datum)}
        </div>
      ) : projekt.pipeline_status === 'tilldelning' && projekt.tilldelning_datum ? (
        <div style={{ fontSize: 12, color: 'var(--light-t3)' }}>
          Beslut {formatteraDatum(projekt.tilldelning_datum)}
        </div>
      ) : projekt.deadline ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <Calendar size={12} weight="bold" color={deadlineFärg(projekt.deadline)} />
          <span style={{ color: deadlineFärg(projekt.deadline), fontWeight: 500 }}>
            {dagarTillDeadline(projekt.deadline)}
          </span>
        </div>
      ) : onDeadlineChange ? (
        <input
          type="date"
          value={projekt.deadline ?? ''}
          onChange={(e) => onDeadlineChange(projekt.id, e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            border: '1px solid var(--light-border)',
            borderRadius: 6,
            background: 'var(--light-bg)',
            color: 'var(--light-t3)',
          }}
        />
      ) : null}

      {visUtfallsKnappar ? (
        <UtfallsKnappar
          projekt={{
            id: projekt.id,
            tilldelning_status: (projekt.tilldelning_status ?? null) as 'vunnet' | 'förlorat' | 'vantar' | null,
          }}
          onChange={onUtfallChange ? () => onUtfallChange(projekt.id) : undefined}
          kompakt
        />
      ) : cta.typ !== 'ingen' ? (
        cta.disabled ? (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--light-t4)',
              padding: '8px 12px',
              textAlign: 'center',
              background: 'var(--light-cream)',
              borderRadius: 6,
            }}
          >
            {cta.label}
          </div>
        ) : (
          <Link
            href={cta.href ?? `/projekt/${projekt.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--light-amber)',
              padding: '8px 12px',
              textAlign: 'center',
              background: 'var(--light-amber-glow)',
              borderRadius: 6,
              border: '1px solid var(--light-amber-border)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {cta.label}
          </Link>
        )
      ) : null}
    </div>
  )
}
