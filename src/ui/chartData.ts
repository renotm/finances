/**
 * Séries du graphique d'évolution, tirées directement des points du moteur (aucun recalcul) :
 * permet de vérifier par des tests que le graphique affiche exactement les valeurs simulées.
 */
import type { SlotResult } from '../engine/run'
import type { Point } from '../engine/types'

export interface XY {
  x: number
  y: number
  point: Point
}

export interface Series {
  /** Index de la colonne (0 à 2). */
  slot: number
  kind: 'main' | 'low' | 'high'
  data: XY[]
}

export function toXY(points: Point[], view: 'gross' | 'net'): XY[] {
  return points.map((p) => ({ x: p.t, y: view === 'net' ? p.net : p.gross, point: p }))
}

/** Séries par colonne : fourchette basse et haute éventuelles, puis courbe principale. */
export function chartSeries(runs: SlotResult[], view: 'gross' | 'net'): Series[] {
  return runs.flatMap((run, slot) => {
    const out: Series[] = []
    if (run.band) {
      out.push({ slot, kind: 'low', data: toXY(run.band.low, view) })
      out.push({ slot, kind: 'high', data: toXY(run.band.high, view) })
    }
    out.push({ slot, kind: 'main', data: toXY(run.result.points, view) })
    return out
  })
}
