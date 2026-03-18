export interface AllianceRef {
  id: number;
  name: string;
  acronym: string;
  score: number;
  color: string;
}

export interface Nation {
  id: number;
  nation_name: string;
  leader_name: string;
  continent: string;
  war_policy: string;
  domestic_policy: string;
  color: string;
  num_cities: number;
  score: number;
  population: number;
  flag: string;
  soldiers: number;
  tanks: number;
  aircraft: number;
  ships: number;
  missiles: number;
  nukes: number;
  offensive_wars_count: number;
  defensive_wars_count: number;
  alliance_id: number;
  alliance_position: string;
  alliance: AllianceRef | null;
  discord: string;
}

export interface Alliance {
  id: number;
  name: string;
  acronym: string;
  score: number;
  color: string;
  flag: string;
}

export interface WarNation {
  id: number;
  nation_name: string;
  score: number;
  num_cities: number;
  war_policy: string;
  alliance: AllianceRef | null;
}

export interface War {
  id: number;
  date: string;
  reason: string;
  war_type: string;
  att_id: number;
  def_id: number;
  attacker: WarNation;
  defender: WarNation;
  att_points: number;
  def_points: number;
  att_peace: boolean;
  def_peace: boolean;
  winner_id: number;
  turns_left: number;
  att_resistance: number;
  def_resistance: number;
}

export interface TradePrice {
  date: string;
  coal: number;
  oil: number;
  uranium: number;
  iron: number;
  bauxite: number;
  lead: number;
  gasoline: number;
  munitions: number;
  steel: number;
  aluminum: number;
  food: number;
  credits: number;
}

export interface WarAttack {
  id: number;
  date: string;
  type: string;
  victor: number;
  success: number;
  att_id: number;
  def_id: number;
  city_infra_before: number;
  infra_destroyed: number;
  improvements_destroyed: number;
  money_looted: number;
  money_stolen: number;
  resistance_lost: number;
  att_gas_used: number;
  att_mun_used: number;
  def_gas_used: number;
  def_mun_used: number;
  att_soldiers_lost: number;
  def_soldiers_lost: number;
  att_tanks_lost: number;
  def_tanks_lost: number;
  att_aircraft_lost: number;
  def_aircraft_lost: number;
  att_ships_lost: number;
  def_ships_lost: number;
  att_missiles_lost: number;
  def_missiles_lost: number;
  att_nukes_lost: number;
  def_nukes_lost: number;
}

export interface NationDetail {
  id: number;
  nation_name: string;
  leader_name: string;
  continent: string;
  war_policy: string;
  domestic_policy: string;
  color: string;
  num_cities: number;
  score: number;
  population: number;
  flag: string;
  soldiers: number;
  tanks: number;
  aircraft: number;
  ships: number;
  missiles: number;
  nukes: number;
  offensive_wars_count: number;
  defensive_wars_count: number;
  alliance: AllianceRef | null;
  discord: string;
}

export interface WarDetail {
  id: number;
  date: string;
  reason: string;
  war_type: string;
  att_id: number;
  def_id: number;
  attacker: WarNation;
  defender: WarNation;
  att_points: number;
  def_points: number;
  att_peace: boolean;
  def_peace: boolean;
  winner_id: number;
  turns_left: number;
  att_resistance: number;
  def_resistance: number;
  attacks: WarAttack[];
}

export interface WarTab {
  id: string;
  label: string;
  allianceId?: number;
  wars: War[];
  loading: boolean;
}

export interface AllianceDetail {
  id: number;
  name: string;
  acronym: string;
  score: number;
  color: string;
  flag: string;
  date: string;
  average_score: number;
  rank: number;
  accept_members: boolean;
  forum_link: string;
  discord_link: string;
  wiki_link: string;
  nations: AllianceMember[];
  treaties: Treaty[];
}

export interface AllianceMember {
  id: number;
  nation_name: string;
  leader_name: string;
  score: number;
  num_cities: number;
  color: string;
  alliance_position: string;
  soldiers: number;
  tanks: number;
  aircraft: number;
  ships: number;
  offensive_wars_count: number;
  defensive_wars_count: number;
  discord: string;
  vacation_mode_turns: number;
}

export interface Treaty {
  id: number;
  date: string;
  treaty_type: string;
  treaty_url: string;
  turns_left: number;
  alliance1_id: number;
  alliance1: AllianceRef;
  alliance2_id: number;
  alliance2: AllianceRef;
  approved: boolean;
}

export interface CounterCandidate {
  member: AllianceMember;
  openSlots: number;
  militaryPower: number;
}

export interface NearRangeCandidate {
  member: AllianceMember;
  scoreDiff: number;
  direction: 'increase' | 'decrease';
}

export interface EnemyWithCounters {
  enemy: NationDetail;
  warIds: number[];
  counters: CounterCandidate[];
  nearRange: NearRangeCandidate[];
}

export interface GraphQLResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
}

// Audit types
export interface CityBuildings {
  id: number;
  barracks: number;
  factory: number;
  hangar: number;
  drydock: number;
}

export interface AuditNation {
  id: number;
  nation_name: string;
  leader_name: string;
  num_cities: number;
  score: number;
  alliance_position: string;
  soldiers: number;
  tanks: number;
  aircraft: number;
  ships: number;
  spies: number;
  central_intelligence_agency: boolean;
  discord: string;
  last_active: string;
  vacation_mode_turns: number;
  cities: CityBuildings[];
}

export interface MmrCheck {
  pass: boolean;
  cities: { id: number; barracks: number; factory: number; hangar: number; drydock: number; issues: string[] }[];
  totalDeficit: { barracks: number; factory: number; hangar: number; drydock: number };
}

export interface MmuCheck {
  pass: boolean;
  maxSoldiers: number;
  maxTanks: number;
  maxAircraft: number;
  maxShips: number;
  soldiers: number;
  tanks: number;
  aircraft: number;
  ships: number;
}

export interface SpyCheck {
  pass: boolean;
  current: number;
  required: number;
  hasCia: boolean;
}

export interface MemberAudit {
  nation: AuditNation;
  mmr: MmrCheck;
  mmu: MmuCheck;
  spies: SpyCheck;
  passAll: boolean;
  issueCount: number;
  lastActive: Date;
  onlineButNotMaxed: boolean;
}
