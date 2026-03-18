import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Nation,
  Alliance,
  AllianceDetail,
  War,
  TradePrice,
  WarDetail,
  NationDetail,
  AuditNation,
  GraphQLResponse,
  PaginatedResponse,
} from '../models/pnw.models';

@Injectable({ providedIn: 'root' })
export class PnwApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}?api_key=${environment.apiKey}`;

  private warFields = `
    id
    date
    reason
    war_type
    att_id
    def_id
    attacker {
      id
      nation_name
      score
      num_cities
      war_policy
      alliance {
        id
        name
        acronym
        score
        color
      }
    }
    defender {
      id
      nation_name
      score
      num_cities
      war_policy
      alliance {
        id
        name
        acronym
        score
        color
      }
    }
    att_points
    def_points
    att_peace
    def_peace
    winner_id
    turns_left
    att_resistance
    def_resistance
  `;

  private query<T>(query: string): Observable<T> {
    return this.http
      .post<GraphQLResponse<T>>(this.apiUrl, { query })
      .pipe(map((response) => response.data));
  }

  getMyNation(): Observable<Nation> {
    const q = `{
      me {
        nation {
          id
          nation_name
          leader_name
          continent
          war_policy
          domestic_policy
          color
          num_cities
          score
          population
          flag
          soldiers
          tanks
          aircraft
          ships
          missiles
          nukes
          offensive_wars_count
          defensive_wars_count
          alliance_id
          alliance_position
          discord
          alliance {
            id
            name
            acronym
            score
            color
          }
        }
      }
    }`;
    return this.query<{ me: { nation: Nation } }>(q).pipe(
      map((data) => data.me.nation)
    );
  }

  getActiveWars(): Observable<War[]> {
    const q = `{
      wars(active: true, first: 50, orderBy: { column: ID, order: DESC }) {
        data {
          ${this.warFields}
        }
      }
    }`;
    return this.query<{ wars: PaginatedResponse<War> }>(q).pipe(
      map((data) => data.wars.data)
    );
  }

  getWarsByAlliance(allianceId: number): Observable<War[]> {
    const q = `{
      wars(active: true, alliance_id: ${allianceId}, first: 50, orderBy: { column: ID, order: DESC }) {
        data {
          ${this.warFields}
        }
      }
    }`;
    return this.query<{ wars: PaginatedResponse<War> }>(q).pipe(
      map((data) => data.wars.data)
    );
  }

  getTopAlliances(count: number = 5): Observable<Alliance[]> {
    const q = `{
      alliances(first: ${count}, orderBy: { column: SCORE, order: DESC }) {
        data {
          id
          name
          acronym
          score
          color
          flag
        }
      }
    }`;
    return this.query<{ alliances: PaginatedResponse<Alliance> }>(q).pipe(
      map((data) => data.alliances.data)
    );
  }

  getAlliance(allianceId: number): Observable<Alliance> {
    const q = `{
      alliances(id: ${allianceId}, first: 1) {
        data {
          id
          name
          acronym
          score
          color
          flag
        }
      }
    }`;
    return this.query<{ alliances: PaginatedResponse<Alliance> }>(q).pipe(
      map((data) => data.alliances.data[0])
    );
  }

  getTradePrices(): Observable<TradePrice> {
    const q = `{
      tradeprices(first: 1) {
        data {
          date
          coal
          oil
          uranium
          iron
          bauxite
          lead
          gasoline
          munitions
          steel
          aluminum
          food
          credits
        }
      }
    }`;
    return this.query<{ tradeprices: PaginatedResponse<TradePrice> }>(q).pipe(
      map((data) => data.tradeprices.data[0])
    );
  }

  getWarDetail(warId: number): Observable<WarDetail> {
    const q = `{
      wars(id: ${warId}, first: 1) {
        data {
          ${this.warFields}
          attacks {
            id
            date
            type
            victor
            success
            att_id
            def_id
            city_infra_before
            infra_destroyed
            improvements_destroyed
            money_looted
            money_stolen
            resistance_lost
            att_gas_used
            att_mun_used
            def_gas_used
            def_mun_used
            att_soldiers_lost
            def_soldiers_lost
            att_tanks_lost
            def_tanks_lost
            att_aircraft_lost
            def_aircraft_lost
            att_ships_lost
            def_ships_lost
            att_missiles_lost
            def_missiles_lost
            att_nukes_lost
            def_nukes_lost
          }
        }
      }
    }`;
    return this.query<{ wars: PaginatedResponse<WarDetail> }>(q).pipe(
      map((data) => data.wars.data[0])
    );
  }

  getNation(nationId: number): Observable<NationDetail> {
    const q = `{
      nations(id: ${nationId}, first: 1) {
        data {
          id
          nation_name
          leader_name
          continent
          war_policy
          domestic_policy
          color
          num_cities
          score
          population
          flag
          soldiers
          tanks
          aircraft
          ships
          missiles
          nukes
          offensive_wars_count
          defensive_wars_count
          discord
          alliance {
            id
            name
            acronym
            score
            color
          }
        }
      }
    }`;
    return this.query<{ nations: PaginatedResponse<NationDetail> }>(q).pipe(
      map((data) => data.nations.data[0])
    );
  }

  getAllianceDetail(allianceId: number): Observable<AllianceDetail> {
    const q = `{
      alliances(id: ${allianceId}, first: 1) {
        data {
          id
          name
          acronym
          score
          color
          flag
          date
          average_score
          rank
          accept_members
          forum_link
          discord_link
          wiki_link
          nations {
            id
            nation_name
            leader_name
            score
            num_cities
            color
            alliance_position
            soldiers
            tanks
            aircraft
            ships
            offensive_wars_count
            defensive_wars_count
            discord
            vacation_mode_turns
          }
          treaties {
            id
            date
            treaty_type
            treaty_url
            turns_left
            alliance1_id
            alliance1 { id name acronym score color }
            alliance2_id
            alliance2 { id name acronym score color }
            approved
          }
        }
      }
    }`;
    return this.query<{ alliances: PaginatedResponse<AllianceDetail> }>(q).pipe(
      map((data) => data.alliances.data[0])
    );
  }

  getNationsByIds(ids: number[]): Observable<NationDetail[]> {
    if (ids.length === 0) return new Observable(s => { s.next([]); s.complete(); });
    const q = `{
      nations(id: [${ids.join(',')}], first: ${ids.length}) {
        data {
          id
          nation_name
          leader_name
          continent
          war_policy
          domestic_policy
          color
          num_cities
          score
          population
          flag
          soldiers
          tanks
          aircraft
          ships
          missiles
          nukes
          offensive_wars_count
          defensive_wars_count
          discord
          alliance {
            id
            name
            acronym
            score
            color
          }
        }
      }
    }`;
    return this.query<{ nations: PaginatedResponse<NationDetail> }>(q).pipe(
      map((data) => data.nations.data)
    );
  }

  getAllianceWarHistory(allianceId: number): Observable<War[]> {
    const q = `{
      wars(alliance_id: ${allianceId}, active: false, first: 50, orderBy: { column: ID, order: DESC }) {
        data {
          ${this.warFields}
        }
      }
    }`;
    return this.query<{ wars: PaginatedResponse<War> }>(q).pipe(
      map((data) => data.wars.data)
    );
  }

  getAuditNations(allianceId: number): Observable<AuditNation[]> {
    const q = `{
      nations(alliance_id: ${allianceId}, first: 500) {
        data {
          id
          nation_name
          leader_name
          num_cities
          score
          alliance_position
          soldiers
          tanks
          aircraft
          ships
          spies
          central_intelligence_agency
          discord
          last_active
          vacation_mode_turns
          cities {
            id
            barracks
            factory
            hangar
            drydock
          }
        }
      }
    }`;
    return this.query<{ nations: PaginatedResponse<AuditNation> }>(q).pipe(
      map((data) => data.nations.data.filter((n) => n.alliance_position !== 'APPLICANT'))
    );
  }
}
