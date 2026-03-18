import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PnwApiService } from '../../services/pnw-api.service';
import {
  AllianceDetail,
  AllianceMember,
  Treaty,
  War,
  EnemyWithCounters,
  NearRangeCandidate,
  MemberAudit,
  AuditNation,
  MmrCheck,
  MmuCheck,
  SpyCheck,
  WarDetail,
  NationDetail,
  WarAttack,
} from '../../models/pnw.models';

interface WarInfoData {
  war: WarDetail;
  attNation: NationDetail | null;
  defNation: NationDetail | null;
  timeline: WarAttack[];
  suggestions: { action: string; reason: string; priority: 'high' | 'medium' | 'low' }[];
}

type TabId = 'overview' | 'wars' | 'history' | 'members' | 'treaties' | 'audit';

@Component({
  selector: 'app-alliance-dashboard',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './alliance-dashboard.html',
  styleUrl: './alliance-dashboard.scss',
})
export class AllianceDashboardComponent implements OnInit, OnDestroy {
  private api = inject(PnwApiService);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  alliance = signal<AllianceDetail | null>(null);
  activeWars = signal<War[]>([]);
  warHistory = signal<War[]>([]);
  loading = signal(true);
  warsLoading = signal(true);
  historyLoading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<TabId>('overview');
  historyLoaded = signal(false);
  auditLoading = signal(false);
  auditLoaded = signal(false);
  auditResults = signal<MemberAudit[]>([]);
  auditFilter = signal<'all' | 'fail' | 'mmr' | 'mmu' | 'spies'>('fail');
  vacationMembers = signal<AuditNation[]>([]);
  warCounterMap = signal<Map<number, { loading: boolean; data: EnemyWithCounters | null }>>(new Map());
  warInfoMap = signal<Map<number, { loading: boolean; data: WarInfoData | null }>>(new Map());
  nextTurnTimer = signal('');
  militaryResetTimer = signal('');

  members = computed<AllianceMember[]>(() => {
    const a = this.alliance();
    if (!a?.nations) return [];
    return [...a.nations]
      .filter((n) => n.alliance_position !== 'APPLICANT')
      .sort((x, y) => y.score - x.score);
  });

  treaties = computed<Treaty[]>(() => {
    return this.alliance()?.treaties ?? [];
  });

  totalMilitary = computed(() => {
    const m = this.members();
    return {
      soldiers: m.reduce((s, n) => s + n.soldiers, 0),
      tanks: m.reduce((s, n) => s + n.tanks, 0),
      aircraft: m.reduce((s, n) => s + n.aircraft, 0),
      ships: m.reduce((s, n) => s + n.ships, 0),
    };
  });

  totalScore = computed(() => this.alliance()?.score ?? 0);
  avgScore = computed(() => this.alliance()?.average_score ?? 0);
  memberCount = computed(() => this.members().length);

  activeWarCount = computed(() => this.activeWars().length);

  warStats = computed(() => {
    const wars = this.warHistory();
    const a = this.alliance();
    if (!a) return { wins: 0, losses: 0, total: wars.length };
    let wins = 0;
    let losses = 0;
    for (const w of wars) {
      if (w.winner_id === 0) continue;
      const isAttacker = w.attacker.alliance?.id === a.id;
      const isDefender = w.defender.alliance?.id === a.id;
      if (
        (isAttacker && w.winner_id === w.att_id) ||
        (isDefender && w.winner_id === w.def_id)
      ) {
        wins++;
      } else {
        losses++;
      }
    }
    return { wins, losses, total: wars.length };
  });

  ngOnInit() {
    this.updateTimers();
    this.timerInterval = setInterval(() => this.updateTimers(), 1000);
    this.loadData();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private updateTimers() {
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const utcS = now.getUTCSeconds();

    // Next turn: every 2 hours from 00:00 UTC
    const nextTurnHour = Math.ceil((utcH + 1) / 2) * 2;
    const turnSecsLeft = (nextTurnHour - utcH - 1) * 3600 + (59 - utcM) * 60 + (60 - utcS);
    this.nextTurnTimer.set(this.formatCountdown(turnSecsLeft));

    // Military reset: 00:00 UTC
    const resetSecsLeft = (23 - utcH) * 3600 + (59 - utcM) * 60 + (60 - utcS);
    this.militaryResetTimer.set(this.formatCountdown(resetSecsLeft));
  }

  private formatCountdown(totalSecs: number): string {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);

    this.api.getMyNation().subscribe({
      next: (nation) => {
        if (!nation.alliance_id) {
          this.error.set('You are not in an alliance');
          this.loading.set(false);
          return;
        }

        forkJoin({
          detail: this.api.getAllianceDetail(nation.alliance_id),
          wars: this.api.getWarsByAlliance(nation.alliance_id),
        }).subscribe({
          next: ({ detail, wars }) => {
            console.log('[Alliance Dashboard] alliance_id:', nation.alliance_id);
            console.log('[Alliance Dashboard] active wars returned:', wars.length, wars.map(w => w.id));
            this.alliance.set(detail);
            this.activeWars.set(wars);
            this.loading.set(false);
            this.warsLoading.set(false);
          },
          error: () => {
            this.error.set('Failed to load alliance data');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Failed to load nation data');
        this.loading.set(false);
      },
    });
  }

  selectTab(tab: TabId) {
    this.activeTab.set(tab);
    if (tab === 'history' && !this.historyLoaded()) {
      this.loadWarHistory();
    }
    if (tab === 'audit' && !this.auditLoaded()) {
      this.loadAudit();
    }
  }

  private loadWarHistory() {
    const a = this.alliance();
    if (!a) return;
    this.historyLoading.set(true);
    this.api.getAllianceWarHistory(a.id).subscribe({
      next: (wars) => {
        this.warHistory.set(wars);
        this.historyLoading.set(false);
        this.historyLoaded.set(true);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  getWarOutcome(war: War): string {
    const a = this.alliance();
    if (!a) return '';
    if (war.winner_id === 0) return 'ongoing';
    const isAttacker =
      war.attacker.alliance?.id === a.id;
    const isDefender =
      war.defender.alliance?.id === a.id;
    if (
      (isAttacker && war.winner_id === war.att_id) ||
      (isDefender && war.winner_id === war.def_id)
    )
      return 'win';
    return 'loss';
  }

  getWarSide(war: War): 'attacker' | 'defender' {
    const a = this.alliance();
    if (a && war.attacker.alliance?.id === a.id) return 'attacker';
    return 'defender';
  }

  getPositionLabel(pos: string): string {
    const map: Record<string, string> = {
      LEADER: '👑 Leader',
      HEIR: '🏅 Heir',
      OFFICER: '⭐ Officer',
      MEMBER: 'Member',
      APPLICANT: '📋 Applicant',
      NOALLIANCE: '—',
    };
    return map[pos] ?? pos;
  }

  getTreatyIcon(type: string): string {
    const map: Record<string, string> = {
      MDP: '🛡️',
      MDoAP: '⚔️',
      ODP: '🤝',
      ODoAP: '🗡️',
      Protectorate: '🏰',
      NAP: '🕊️',
      PIAT: '📜',
      NPT: '📃',
      Extension: '🔗',
    };
    return map[type] ?? '📋';
  }

  getPartnerAlliance(treaty: Treaty): { id: number; name: string } {
    const a = this.alliance();
    if (!a) return { id: 0, name: '' };
    if (treaty.alliance1_id === a.id) {
      return { id: treaty.alliance2.id, name: treaty.alliance2.name };
    }
    return { id: treaty.alliance1.id, name: treaty.alliance1.name };
  }

  toggleWarCounter(war: War) {
    const current = this.warCounterMap();
    if (current.has(war.id)) {
      // Toggle off
      const next = new Map(current);
      next.delete(war.id);
      this.warCounterMap.set(next);
      return;
    }

    const a = this.alliance();
    if (!a) return;

    const isAttacker = war.attacker.alliance?.id === a.id;
    const enemyId = isAttacker ? war.def_id : war.att_id;
    const ourMemberId = isAttacker ? war.att_id : war.def_id;

    // Set loading
    const next = new Map(current);
    next.set(war.id, { loading: true, data: null });
    this.warCounterMap.set(next);

    this.api.getNationsByIds([enemyId]).subscribe({
      next: (enemies) => {
        const enemy = enemies[0];
        if (!enemy) {
          const m = new Map(this.warCounterMap());
          m.set(war.id, { loading: false, data: null });
          this.warCounterMap.set(m);
          return;
        }

        const members = this.members();
        const candidates = members
          .filter((m) => {
            if (m.id === ourMemberId) return false;
            if (m.vacation_mode_turns > 0) return false;
            const openSlots = 5 - m.offensive_wars_count;
            if (openSlots <= 0) return false;
            const minScore = m.score * 0.75;
            const maxScore = m.score * 1.75;
            return enemy.score >= minScore && enemy.score <= maxScore;
          })
          .map((m) => ({
            member: m,
            openSlots: 5 - m.offensive_wars_count,
            militaryPower: this.calcMilitaryPower(m),
          }))
          .sort((a, b) => b.militaryPower - a.militaryPower)
          .slice(0, 5);

        // Find near-range candidates if fewer than 5 counters
        const nearRange = this.findNearRangeCandidates(enemy, members, candidates, ourMemberId);

        const entry: EnemyWithCounters = {
          enemy,
          warIds: [war.id],
          counters: candidates,
          nearRange,
        };

        const m2 = new Map(this.warCounterMap());
        m2.set(war.id, { loading: false, data: entry });
        this.warCounterMap.set(m2);
      },
      error: () => {
        const m = new Map(this.warCounterMap());
        m.set(war.id, { loading: false, data: null });
        this.warCounterMap.set(m);
      },
    });
  }

  getWarCounter(warId: number) {
    return this.warCounterMap().get(warId) ?? null;
  }

  toggleWarInfo(war: War) {
    const current = this.warInfoMap();
    if (current.has(war.id)) {
      const next = new Map(current);
      next.delete(war.id);
      this.warInfoMap.set(next);
      return;
    }

    const next = new Map(current);
    next.set(war.id, { loading: true, data: null });
    this.warInfoMap.set(next);

    this.api.getWarDetail(war.id).subscribe({
      next: (warDetail) => {
        forkJoin({
          att: this.api.getNation(warDetail.att_id),
          def: this.api.getNation(warDetail.def_id),
        }).subscribe({
          next: ({ att, def }) => {
            const a = this.alliance();
            const isAttacker = a ? war.attacker.alliance?.id === a.id : false;
            const me = isAttacker ? att : def;
            const enemy = isAttacker ? def : att;
            const timeline = [...warDetail.attacks].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const suggestions = me && enemy
              ? this.buildWarSuggestions(warDetail, me, enemy, isAttacker ? 'attacker' : 'defender')
              : [];
            const m = new Map(this.warInfoMap());
            m.set(war.id, { loading: false, data: { war: warDetail, attNation: att, defNation: def, timeline, suggestions } });
            this.warInfoMap.set(m);
          },
          error: () => {
            const m = new Map(this.warInfoMap());
            m.set(war.id, { loading: false, data: { war: warDetail, attNation: null, defNation: null, timeline: [...warDetail.attacks], suggestions: [] } });
            this.warInfoMap.set(m);
          },
        });
      },
      error: () => {
        const m = new Map(this.warInfoMap());
        m.set(war.id, { loading: false, data: null });
        this.warInfoMap.set(m);
      },
    });
  }

  getWarInfo(warId: number) {
    return this.warInfoMap().get(warId) ?? null;
  }

  isAttackerAction(attack: WarAttack, war: WarDetail): boolean {
    return attack.att_id === war.att_id;
  }

  getAttackIcon(type: string): string {
    const icons: Record<string, string> = {
      GROUND: '\u{1FA96}', AIRVINFRA: '\u2708\uFE0F', AIRVSOLDIERS: '\u2708\uFE0F',
      AIRVTANKS: '\u2708\uFE0F', AIRVMONEY: '\u2708\uFE0F', AIRVSHIPS: '\u2708\uFE0F',
      AIRVAIR: '\u2708\uFE0F', NAVAL: '\u{1F6A2}', MISSILE: '\u{1F680}',
      NUKE: '\u2622\uFE0F', PEACE: '\u{1F54A}\uFE0F', VICTORY: '\u{1F3C6}',
      ALLIANCELOOT: '\u{1F4B0}', FORTIFY: '\u{1F3F0}',
    };
    return icons[type] ?? '\u2694\uFE0F';
  }

  getAttackLabel(type: string): string {
    const labels: Record<string, string> = {
      GROUND: 'Ground', AIRVINFRA: 'Air (Infra)', AIRVSOLDIERS: 'Air (Soldiers)',
      AIRVTANKS: 'Air (Tanks)', AIRVMONEY: 'Air (Money)', AIRVSHIPS: 'Air (Ships)',
      AIRVAIR: 'Air (Aircraft)', NAVAL: 'Naval', MISSILE: 'Missile',
      NUKE: 'Nuke', PEACE: 'Peace', VICTORY: 'Victory',
      ALLIANCELOOT: 'Loot', FORTIFY: 'Fortify',
    };
    return labels[type] ?? type;
  }

  getSuccessLabel(success: number): string {
    switch (success) {
      case 3: return 'Immense Triumph';
      case 2: return 'Moderate Success';
      case 1: return 'Pyrrhic Victory';
      case 0: return 'Utter Failure';
      default: return 'Unknown';
    }
  }

  getSuccessClass(success: number): string {
    switch (success) {
      case 3: return 'triumph';
      case 2: return 'success';
      case 1: return 'pyrrhic';
      case 0: return 'failure';
      default: return '';
    }
  }

  private buildWarSuggestions(
    war: WarDetail, me: NationDetail, enemy: NationDetail, role: 'attacker' | 'defender'
  ): { action: string; reason: string; priority: 'high' | 'medium' | 'low' }[] {
    const suggestions: { action: string; reason: string; priority: 'high' | 'medium' | 'low' }[] = [];
    const myRes = role === 'attacker' ? war.att_resistance : war.def_resistance;
    const enemyRes = role === 'attacker' ? war.def_resistance : war.att_resistance;

    if (me.aircraft > enemy.aircraft * 1.5) {
      suggestions.push({ action: 'Airstrike enemy infrastructure', reason: `Air superiority (${me.aircraft} vs ${enemy.aircraft}). Max damage with airstrikes.`, priority: 'high' });
    } else if (me.aircraft < enemy.aircraft * 0.5) {
      suggestions.push({ action: 'Rebuild aircraft first', reason: `Enemy has air superiority (${enemy.aircraft} vs ${me.aircraft}). Avoid air until rebuilt.`, priority: 'high' });
    }

    if (me.soldiers > 0 && me.tanks > 0) {
      const myG = me.soldiers * 1.75 + me.tanks * 40;
      const eG = enemy.soldiers * 1.75 + enemy.tanks * 40;
      if (myG > eG * 1.3) {
        suggestions.push({ action: 'Launch ground attacks', reason: 'Ground forces outmatch enemy significantly.', priority: 'high' });
      }
    }

    if (me.ships > enemy.ships && enemy.ships > 0) {
      suggestions.push({ action: 'Naval blockade', reason: `${me.ships} ships vs ${enemy.ships}. Establish blockade to cut income.`, priority: 'medium' });
    }
    if (me.nukes > 0) {
      suggestions.push({ action: 'Nuclear strike', reason: `${me.nukes} nuke(s) available. Devastating but causes radiation.`, priority: enemyRes > 50 ? 'medium' : 'low' });
    }
    if (me.missiles > 0) {
      suggestions.push({ action: 'Missile strikes', reason: `${me.missiles} missile(s). Bypasses military, hits infra directly.`, priority: 'medium' });
    }
    if (enemyRes <= 25 && enemyRes > 0) {
      suggestions.push({ action: 'Push to finish', reason: `Enemy at ${enemyRes} resistance. A few more attacks ends the war.`, priority: 'high' });
    }
    if (myRes <= 20) {
      suggestions.push({ action: 'Consider peace', reason: `Your resistance critically low (${myRes}). May lose more by continuing.`, priority: 'high' });
    }
    if (role === 'attacker' && war.def_peace && !war.att_peace) {
      suggestions.push({ action: 'Defender offered peace', reason: 'Accept if objectives met, or press advantage.', priority: 'medium' });
    } else if (role === 'defender' && war.att_peace && !war.def_peace) {
      suggestions.push({ action: 'Attacker offered peace', reason: 'Consider accepting if low on resources.', priority: 'medium' });
    }
    if (role === 'defender' && myRes > 50 && me.soldiers > 0) {
      suggestions.push({ action: 'Fortify', reason: 'Increases resistance, makes it harder for attacker to win.', priority: 'low' });
    }
    if (suggestions.length === 0) {
      suggestions.push({ action: 'Continue current strategy', reason: 'No clear advantage detected. Maintain pressure.', priority: 'medium' });
    }
    return suggestions;
  }

  calcMilitaryPower(n: { soldiers: number; tanks: number; aircraft: number; ships: number }): number {
    // Weighted military power score
    return n.soldiers + n.tanks * 40 + n.aircraft * 500 + n.ships * 1000;
  }

  private findNearRangeCandidates(
    enemy: { id: number; score: number },
    members: AllianceMember[],
    existingCounters: { member: AllianceMember }[],
    excludeMemberId?: number,
  ): NearRangeCandidate[] {
    if (existingCounters.length >= 5) return [];

    const slotsToFill = 5 - existingCounters.length;
    const counterIds = new Set(existingCounters.map((c) => c.member.id));

    // Attack range: attacker score * 0.75 <= target score <= attacker score * 1.75
    // So to attack enemy: member needs enemy.score >= member.score * 0.75 AND enemy.score <= member.score * 1.75
    // => member.score >= enemy.score / 1.75 AND member.score <= enemy.score / 0.75
    const minRequired = enemy.score / 1.75;
    const maxRequired = enemy.score / 0.75;

    return members
      .filter((m) => !counterIds.has(m.id) && m.id !== excludeMemberId && (5 - m.offensive_wars_count) > 0 && m.vacation_mode_turns === 0)
      .filter((m) => m.score < minRequired || m.score > maxRequired)
      .map((m) => {
        const direction: 'increase' | 'decrease' = m.score < minRequired ? 'increase' : 'decrease';
        const scoreDiff = direction === 'increase' ? minRequired - m.score : m.score - maxRequired;
        return { member: m, scoreDiff, direction };
      })
      .sort((a, b) => a.scoreDiff - b.scoreDiff)
      .slice(0, slotsToFill);
  }

  getMilAdvantage(memberPower: number, enemyPower: number): { label: string; cls: string } {
    if (enemyPower === 0) return { label: 'Dominant', cls: 'advantage' };
    const ratio = memberPower / enemyPower;
    if (ratio >= 1.5) return { label: 'Strong advantage', cls: 'advantage' };
    if (ratio >= 1.0) return { label: 'Advantage', cls: 'slight-advantage' };
    if (ratio >= 0.7) return { label: 'Slight disadvantage', cls: 'slight-disadvantage' };
    return { label: 'Disadvantage', cls: 'disadvantage' };
  }

  // --- Audit ---
  // Required MMR per city
  private readonly REQ_BARRACKS = 5;
  private readonly REQ_FACTORY = 5;
  private readonly REQ_HANGAR = 5;
  private readonly REQ_DRYDOCK = 3;

  // Unit capacity per building
  private readonly SOLDIERS_PER_BARRACKS = 3000;
  private readonly TANKS_PER_FACTORY = 250;
  private readonly AIRCRAFT_PER_HANGAR = 15;
  private readonly SHIPS_PER_DRYDOCK = 5;
  private readonly INACTIVE_HOURS = 48;

  inactiveMembers = computed(() => {
    const results = this.auditResults();
    const cutoff = Date.now() - this.INACTIVE_HOURS * 60 * 60 * 1000;
    return results.filter((r) => r.lastActive.getTime() < cutoff);
  });

  vacationEndingSoon = computed(() => {
    const vm = this.vacationMembers();
    // 36 turns = 72 hours (3 days), each turn = 2 hours
    return vm
      .filter((n) => n.vacation_mode_turns > 0 && n.vacation_mode_turns <= 36)
      .sort((a, b) => a.vacation_mode_turns - b.vacation_mode_turns);
  });

  filteredAudit = computed(() => {
    const results = this.auditResults();
    const filter = this.auditFilter();
    if (filter === 'fail') return results.filter((r) => !r.passAll);
    if (filter === 'mmr') return results.filter((r) => !r.mmr.pass);
    if (filter === 'mmu') return results.filter((r) => !r.mmu.pass);
    if (filter === 'spies') return results.filter((r) => !r.spies.pass);
    return results;
  });

  auditSummary = computed(() => {
    const results = this.auditResults();
    const total = results.length;
    const passAll = results.filter((r) => r.passAll).length;
    const failMmr = results.filter((r) => !r.mmr.pass).length;
    const failMmu = results.filter((r) => !r.mmu.pass).length;
    const failSpies = results.filter((r) => !r.spies.pass).length;
    return { total, passAll, failAll: total - passAll, failMmr, failMmu, failSpies };
  });

  private loadAudit() {
    const a = this.alliance();
    if (!a) return;
    this.auditLoading.set(true);
    this.api.getAuditNations(a.id).subscribe({
      next: (nations) => {
        const active = nations.filter((n) => n.vacation_mode_turns === 0);
        const vacation = nations.filter((n) => n.vacation_mode_turns > 0);
        this.vacationMembers.set(vacation);
        const results = active
          .map((n) => this.auditMember(n))
          .sort((a, b) => {
            const da = (a.nation.discord || '').toLowerCase();
            const db = (b.nation.discord || '').toLowerCase();
            if (!da && !db) return a.nation.nation_name.localeCompare(b.nation.nation_name);
            if (!da) return 1;
            if (!db) return -1;
            return da.localeCompare(db);
          });
        this.auditResults.set(results);
        this.auditLoading.set(false);
        this.auditLoaded.set(true);
      },
      error: () => {
        this.auditLoading.set(false);
      },
    });
  }

  private auditMember(n: AuditNation): MemberAudit {
    const mmr = this.checkMmr(n);
    const mmu = this.checkMmu(n);
    const spies = this.checkSpies(n);
    const issues = [!mmr.pass, !mmu.pass, !spies.pass].filter(Boolean).length;
    const lastActive = new Date(n.last_active);
    const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
    const onlineButNotMaxed = hoursSinceActive < 24 && !mmu.pass;
    return { nation: n, mmr, mmu, spies, passAll: issues === 0, issueCount: issues, lastActive, onlineButNotMaxed };
  }

  private checkMmr(n: AuditNation): MmrCheck {
    const totalDeficit = { barracks: 0, factory: 0, hangar: 0, drydock: 0 };
    const cities = n.cities.map((c) => {
      const issues: string[] = [];
      const bDef = this.REQ_BARRACKS - c.barracks;
      const fDef = this.REQ_FACTORY - c.factory;
      const hDef = this.REQ_HANGAR - c.hangar;
      const dDef = this.REQ_DRYDOCK - c.drydock;
      if (bDef > 0) { issues.push(`Barracks: ${c.barracks}/${this.REQ_BARRACKS}`); totalDeficit.barracks += bDef; }
      if (fDef > 0) { issues.push(`Factories: ${c.factory}/${this.REQ_FACTORY}`); totalDeficit.factory += fDef; }
      if (hDef > 0) { issues.push(`Hangars: ${c.hangar}/${this.REQ_HANGAR}`); totalDeficit.hangar += hDef; }
      if (dDef > 0) { issues.push(`Drydocks: ${c.drydock}/${this.REQ_DRYDOCK}`); totalDeficit.drydock += dDef; }
      return { ...c, issues };
    });
    const pass = cities.every((c) => c.issues.length === 0);
    return { pass, cities, totalDeficit };
  }

  private checkMmu(n: AuditNation): MmuCheck {
    // Calculate max from actual buildings across all cities
    let maxSoldiers = 0, maxTanks = 0, maxAircraft = 0, maxShips = 0;
    for (const c of n.cities) {
      maxSoldiers += c.barracks * this.SOLDIERS_PER_BARRACKS;
      maxTanks += c.factory * this.TANKS_PER_FACTORY;
      maxAircraft += c.hangar * this.AIRCRAFT_PER_HANGAR;
      maxShips += c.drydock * this.SHIPS_PER_DRYDOCK;
    }
    const pass = n.soldiers >= maxSoldiers && n.tanks >= maxTanks &&
                 n.aircraft >= maxAircraft && n.ships >= maxShips;
    return {
      pass, maxSoldiers, maxTanks, maxAircraft, maxShips,
      soldiers: n.soldiers, tanks: n.tanks, aircraft: n.aircraft, ships: n.ships,
    };
  }

  private checkSpies(n: AuditNation): SpyCheck {
    const required = n.central_intelligence_agency ? 60 : 50;
    return { pass: n.spies >= required, current: n.spies, required, hasCia: n.central_intelligence_agency };
  }

  setAuditFilter(filter: 'all' | 'fail' | 'mmr' | 'mmu' | 'spies') {
    this.auditFilter.set(filter);
  }

  countFailCities(mmr: MmrCheck): number {
    return mmr.cities.filter((c) => c.issues.length > 0).length;
  }

  formatVacationTime(turns: number): string {
    const hours = turns * 2;
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
  }

  formatInactiveDuration(lastActive: Date): string {
    const ms = Date.now() - lastActive.getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem}h ago` : `${days}d ago`;
  }

  generateAuditMessage(a: MemberAudit): string {
    const lines: string[] = [];
    lines.push(`🔍 **Audit Report — ${a.nation.nation_name}** (${a.nation.num_cities} cities)`);
    lines.push(`🕐 Active: ${this.formatInactiveDuration(a.lastActive)}`);
    lines.push('');

    // MMR
    if (a.mmr.pass) {
      lines.push('✅ **MMR (Buildings 5/5/5/3)** — All good!');
    } else {
      lines.push('❌ **MMR (Buildings 5/5/5/3)** — Needs work:');
      const d = a.mmr.totalDeficit;
      if (d.barracks > 0) lines.push(`   • Build ${d.barracks} more barracks`);
      if (d.factory > 0) lines.push(`   • Build ${d.factory} more factories`);
      if (d.hangar > 0) lines.push(`   • Build ${d.hangar} more hangars`);
      if (d.drydock > 0) lines.push(`   • Build ${d.drydock} more drydocks`);
      lines.push(`   → ${this.countFailCities(a.mmr)} of ${a.nation.num_cities} cities non-compliant`);
    }
    lines.push('');

    // MMU
    if (a.mmu.pass) {
      lines.push('✅ **MMU (Max Units)** — All maxed!');
    } else {
      lines.push('❌ **MMU (Max Units)** — Buy more:');
      const m = a.mmu;
      if (m.soldiers < m.maxSoldiers) lines.push(`   • Soldiers: ${m.soldiers.toLocaleString()} / ${m.maxSoldiers.toLocaleString()} — need ${(m.maxSoldiers - m.soldiers).toLocaleString()}`);
      if (m.tanks < m.maxTanks) lines.push(`   • Tanks: ${m.tanks.toLocaleString()} / ${m.maxTanks.toLocaleString()} — need ${(m.maxTanks - m.tanks).toLocaleString()}`);
      if (m.aircraft < m.maxAircraft) lines.push(`   • Aircraft: ${m.aircraft.toLocaleString()} / ${m.maxAircraft.toLocaleString()} — need ${(m.maxAircraft - m.aircraft).toLocaleString()}`);
      if (m.ships < m.maxShips) lines.push(`   • Ships: ${m.ships.toLocaleString()} / ${m.maxShips.toLocaleString()} — need ${(m.maxShips - m.ships).toLocaleString()}`);
    }
    lines.push('');

    // Spies
    if (a.spies.pass) {
      lines.push(`✅ **Spies** — ${a.spies.current}/${a.spies.required} — All good!`);
    } else {
      lines.push(`❌ **Spies** — ${a.spies.current}/${a.spies.required} — buy ${a.spies.required - a.spies.current} more`);
      if (!a.spies.hasCia) lines.push('   ⚠️ No Intelligence Agency project (max capped at 50) — Please contact the Minister of Finance in your econ ticket to get this resolved.');
    }

    if (a.passAll) {
      lines.push('');
      lines.push('🎉 **All checks passed! Thank you for your war prep — you\'re ready for action!** 💪');
    } else {
      lines.push('');
      lines.push('💰 If you need any resources to complete your war prep, please contact the Minister of Finance in your econ ticket.');
    }

    return lines.join('\n');
  }

  copyAuditMessage(a: MemberAudit) {
    const msg = this.generateAuditMessage(a);
    navigator.clipboard.writeText(msg);
  }
}
