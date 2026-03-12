export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type AttackType =
  | 'AIRSTRIKE'
  | 'MISSILE'
  | 'DRONE'
  | 'GROUND_ASSAULT'
  | 'NAVAL'
  | 'CYBER'
  | 'ARTILLERY'
  | 'SPECIAL_OPS'
  | 'IED'
  | 'VBIED'
  | 'SUICIDE_BOMBING'
  | 'SNIPER'
  | 'RPG'
  | 'SECTARIAN'
  | 'INSURGENT'

export type IncidentStatus = 'ACTIVE' | 'DEVELOPING' | 'RESOLVED' | 'UNVERIFIED'

export interface Incident {
  id: string
  timestamp: Date
  location: {
    name: string
    lat: number
    lng: number
    region: string
  }
  attackType: AttackType
  threatLevel: ThreatLevel
  status: IncidentStatus
  casualties: {
    confirmed: number
    estimated: number
    civilian: number
  }
  description: string
  source: string
  verified: boolean
  details?: string
}

export const ATTACK_TYPE_CONFIG: Record<AttackType, { label: string; icon: string; color: string }> = {
  AIRSTRIKE: { label: 'Airstrike', icon: 'Plane', color: '#ef4444' },
  MISSILE: { label: 'Missile Strike', icon: 'Rocket', color: '#f97316' },
  DRONE: { label: 'Drone Attack', icon: 'Radio', color: '#eab308' },
  GROUND_ASSAULT: { label: 'Ground Assault', icon: 'Users', color: '#22c55e' },
  NAVAL: { label: 'Naval Operation', icon: 'Anchor', color: '#3b82f6' },
  CYBER: { label: 'Cyber Attack', icon: 'Wifi', color: '#a855f7' },
  ARTILLERY: { label: 'Artillery', icon: 'Target', color: '#ec4899' },
  SPECIAL_OPS: { label: 'Special Operations', icon: 'Shield', color: '#14b8a6' },
  IED: { label: 'IED', icon: 'Bomb', color: '#dc2626' },
  VBIED: { label: 'Car Bomb (VBIED)', icon: 'Car', color: '#b91c1c' },
  SUICIDE_BOMBING: { label: 'Suicide Bombing', icon: 'AlertTriangle', color: '#991b1b' },
  SNIPER: { label: 'Sniper', icon: 'Crosshair', color: '#65a30d' },
  RPG: { label: 'RPG Attack', icon: 'Zap', color: '#d97706' },
  SECTARIAN: { label: 'Sectarian Violence', icon: 'Users', color: '#7c3aed' },
  INSURGENT: { label: 'Insurgent Attack', icon: 'Swords', color: '#c2410c' },
}

export const THREAT_LEVEL_CONFIG: Record<ThreatLevel, { label: string; color: string; bgColor: string }> = {
  CRITICAL: { label: 'CRITICAL', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
  HIGH: { label: 'HIGH', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.2)' },
  MEDIUM: { label: 'MEDIUM', color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.2)' },
  LOW: { label: 'LOW', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
}

export const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#ef4444' },
  DEVELOPING: { label: 'Developing', color: '#f97316' },
  RESOLVED: { label: 'Resolved', color: '#22c55e' },
  UNVERIFIED: { label: 'Unverified', color: '#6b7280' },
}
