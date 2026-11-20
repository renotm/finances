import { config } from '../config/defaults'
import { parseYM } from '../engine/core/dates'
import { str } from '../engine/core/params'
import { PROFILE_TMI } from '../engine/core/tmi'
import type { ParamPatch, SimParams } from '../engine/types'
import { ageAt, personTaxContext, personTmiSchedule, type Person } from './person'

/**
 * Paramètres d'une colonne tirés d'une personne (SPEC §5.5, tableau de correspondance).
 * Les champs non renseignés du profil ne remplacent rien.
 */
export function profilePatch(person: Person, productId: string, params: SimParams): ParamPatch {
  const patch: ParamPatch = {}
  const start = str(params, 'start')
  const startYear = parseYM(start).year
  const ctx = personTaxContext(person)

  // TMI : calendrier calculé (« Selon le profil ») s'il varie, taux fixe sinon. Elle reste affichée et sert de
  // repli ; avec un contexte fiscal complet, l'impôt est calculé au barème (SPEC §4.7).
  const tmiPatch = (key: string) => {
    if (person.tmiManual) {
      patch[key] = person.tmiValue
      patch.tmiSchedule = []
      return
    }
    const steps = personTmiSchedule(person, startYear)
    if (!steps) return
    if (steps.length > 1) {
      patch[key] = PROFILE_TMI
      patch.tmiSchedule = steps
    } else {
      patch[key] = steps[0].tmi
      patch.tmiSchedule = []
    }
  }

  if (productId === 'per') {
    patch.currentAge = Math.round(ageAt(person.birth, start) * 100) / 100
    if (person.retirementAge !== null) patch.retirementAge = person.retirementAge
    tmiPatch('tmiNow')
    if (person.tmiRetirement !== null) patch.tmiRetirement = person.tmiRetirement
    if (person.professionalIncome !== null) patch.income = person.professionalIncome
    if (person.ceilingYear !== null) {
      patch.ceilingManual = true
      patch.ceilingOverride = person.ceilingYear
    }
    if (person.carryN1 !== null) patch.carryN1 = person.carryN1
    if (person.carryN2 !== null) patch.carryN2 = person.carryN2
    if (person.carryN3 !== null) patch.carryN3 = person.carryN3
    if (person.spouseCeiling !== null) patch.spouseCeiling = person.spouseCeiling
    if (person.sex !== 'unspecified') patch.endAge = config.endAgeBySex[person.sex]
    patch.taxContext = ctx
  }

  if (productId === 'livretBancaire') {
    tmiPatch('tmi')
    patch.taxContext = ctx
  }

  if (productId === 'assuranceVie') patch.household = person.situation === 'married' ? 'couple' : 'single'

  return patch
}
