/**
 * PER déjà ouvert (SPEC §4.4.5) et versements réguliers limités au plafond déductible (SPEC §4.4.6).
 * Attendus calculés à la main ; rendement net nul (fonds euros 0,6 % − frais 0,6 %), TMI 30 % puis 11 %, sans
 * contexte fiscal (impôt à la TMI).
 */
import { describe, expect, it } from 'vitest'
import { simulate } from './helpers'

const flat = { euroShare: 100, euroRate: 0.6, euroFee: 0.6, tmiNow: 30, tmiRetirement: 11 }
const pfuAndSocial = 0.128 + 0.186
const codes = (r: { warnings: { code: string }[] }) => r.warnings.map((w) => w.code)
const extra = (r: { extraLines?: { key: string; amount: number }[] }, key: string) => r.extraLines?.find((l) => l.key === key)?.amount ?? 0

describe('PER déjà ouvert', () => {
  const base = { ...flat, currentAge: 63, retirementAge: 64, perExisting: true, perExistingValue: 30000 }

  it('valeur existante hors plafond et sans économie d\'impôt ; sortie selon sa composition', () => {
    const r = simulate('per', { ...base, perExistingDeducted: 20000, perExistingFree: 5000 })
    expect(r.summary.taxSavings).toBe(0)
    expect(codes(r)).not.toContain('perCeilingExceeded')
    expect(r.summary.totalDeposited).toBeCloseTo(30000, 6)
    // 20 000 € déduits à 11 % + 5 000 € de gains au PFU ; 5 000 € non déduits exonérés
    const tax = 20000 * 0.11 + 5000 * pfuAndSocial
    expect(r.summary.finalNet).toBeCloseTo(30000 - tax, 6)
  })

  it('composition non saisie : toute la valeur supposée déduite, avec un avertissement', () => {
    const r = simulate('per', { ...base })
    expect(codes(r)).toContain('perExistingCompositionUnknown')
    expect(r.summary.finalNet).toBeCloseTo(30000 - 30000 * 0.11, 6)
  })

  it('PER en perte : parts réduites au prorata, gains nuls, avertissement', () => {
    const r = simulate('per', { ...base, perExistingValue: 20000, perExistingDeducted: 20000, perExistingFree: 5000 })
    expect(codes(r)).toContain('perExistingLoss')
    // 20 000 × 20 000 / 25 000 = 16 000 € déduits
    expect(r.summary.finalNet).toBeCloseTo(20000 - 16000 * 0.11, 6)
  })

  it('case non cochée : les montants saisis sont ignorés', () => {
    const r = simulate('per', { ...base, perExisting: false, perExistingDeducted: 20000 })
    expect(r.summary.totalDeposited).toBe(0)
    expect(r.summary.finalGross).toBe(0)
  })

  it('valeur existante et versement initial ensemble : seul le versement initial est déduit', () => {
    const r = simulate('per', { ...base, perExistingDeducted: 30000, perExistingFree: 0.0001, initialCapital: 4710 })
    expect(r.summary.taxSavings).toBeCloseTo(4710 * 0.3, 6)
    expect(codes(r)).not.toContain('perCeilingExceeded')
    expect(r.summary.totalDeposited).toBeCloseTo(34710, 6)
  })

  it('la composition ne dépend pas de la case « versements déduits », qui ne vise que les nouveaux versements', () => {
    const r = simulate('per', { ...base, deducted: false, perExistingDeducted: 20000, perExistingFree: 5000 })
    expect(r.summary.finalNet).toBeCloseTo(30000 - (20000 * 0.11 + 5000 * pfuAndSocial), 6)
  })

  it('rente : fiscalité selon la composition (versements non déduits : rente à titre onéreux)', () => {
    const r = simulate('per', {
      ...base, perExistingDeducted: 0, perExistingFree: 30000, exitMode: 'annuity', annuityMethod: 'table', tableGuaranteed: true, arrearsFee: 2,
    })
    const gross = (30000 / 31.7745) * 0.98
    // 64 ans : 40 % imposables, à 11 % et aux prélèvements sociaux de 18,6 %
    expect(r.annuity!.netYearly).toBeCloseTo(gross - gross * 0.4 * (0.11 + 0.186), 6)
  })

  it('déblocage anticipé : versements déduits, non déduits et gains sortent au prorata', () => {
    const r = simulate('per', {
      ...base, perExistingDeducted: 20000, perExistingFree: 5000,
      movements: [{ id: 1, date: '2026-04', amount: 15000, kind: 'earlyRelease' }],
    })
    // moitié du contrat : 10 000 € déduits à 30 %, 2 500 € de gains au PFU
    expect(r.years[0].taxes).toBeCloseTo(10000 * 0.3 + 2500 * pfuAndSocial, 6)
  })
})

describe('Ne pas dépasser le plafond déductible', () => {
  // Plafond : plancher de 4 710 € (aucun revenu saisi).
  const cap = { ...flat, start: '2026-11', currentAge: 40, retirementAge: 42, capToCeiling: true }

  it('versement initial au plafond en novembre : mensualités suspendues jusqu\'en janvier', () => {
    const r = simulate('per', { ...cap, initialCapital: 4710, periodicAmount: 300 })
    expect(r.years[0].deposits).toBeCloseTo(4710, 6)
    expect(r.years[1].deposits).toBeCloseTo(12 * 300, 6)
    expect(r.years[2].deposits).toBeCloseTo(10 * 300, 6)
    expect(extra(r, 'regularSkipped')).toBeCloseTo(600, 6)
    expect(codes(r)).not.toContain('perCeilingExceeded')
  })

  it('mois où le plafond est atteint : versement réduit au montant restant', () => {
    const r = simulate('per', { ...cap, initialCapital: 4000, periodicAmount: 1000 })
    // 2026 : 710 € en novembre, rien en décembre ; 2027 : 4 710 € (quatre mois pleins, puis 710 €)
    expect(r.years[0].deposits).toBeCloseTo(4710, 6)
    expect(r.years[1].deposits).toBeCloseTo(4710, 6)
    expect(extra(r, 'regularSkipped')).toBeCloseTo(290 + 1000 + (12000 - 4710) + (10000 - 4710), 6)
  })

  it('plafonds reportés et plafond du conjoint pris en compte', () => {
    const withCarry = simulate('per', { ...cap, initialCapital: 4710, periodicAmount: 1000, carryN1: 1500 })
    expect(withCarry.years[0].deposits).toBeCloseTo(4710 + 1500, 6)
    const withSpouse = simulate('per', { ...cap, initialCapital: 4710, periodicAmount: 1000, spouseCeiling: 2000 })
    expect(withSpouse.years[0].deposits).toBeCloseTo(4710 + 2000, 6)
  })

  it('arrêt des versements réguliers à 70 ans', () => {
    const r = simulate('per', { ...flat, start: '2026-01', currentAge: 69, retirementAge: 71, capToCeiling: true, periodicAmount: 100 })
    expect(r.summary.totalDeposited).toBeCloseTo(1200, 6)
    expect(codes(r)).not.toContain('perAgeLimit')
  })

  it('versements ponctuels non limités (le dépassement garde son avertissement)', () => {
    const r = simulate('per', {
      ...flat, start: '2026-01', currentAge: 40, retirementAge: 41, capToCeiling: true, initialCapital: 4710, periodicAmount: 100,
      movements: [{ id: 1, date: '2026-03', amount: 1000, kind: 'deposit' }],
    })
    expect(r.years[0].deposits).toBeCloseTo(5710, 6)
    expect(codes(r)).toContain('perCeilingExceeded')
  })

  it('plafond jamais atteint : résultats identiques à la case non cochée', () => {
    const p = { ...flat, start: '2026-01', currentAge: 40, retirementAge: 45, periodicAmount: 200, initialCapital: 1000, euroRate: 3.2 }
    const on = simulate('per', { ...p, capToCeiling: true })
    const off = simulate('per', { ...p, capToCeiling: false })
    expect(on.summary).toEqual(off.summary)
    expect(on.years).toEqual(off.years)
  })

  it('sans versements déduits, la case est sans effet', () => {
    const p = { ...cap, deducted: false, initialCapital: 4710, periodicAmount: 300 }
    expect(simulate('per', { ...p, capToCeiling: true }).summary).toEqual(simulate('per', { ...p, capToCeiling: false }).summary)
  })
})
