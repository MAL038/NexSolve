# Webapp verbeteringen (technisch + functioneel)

Dit document bevat concrete verbetervoorstellen op basis van de huidige codebase.

## 1) Prioriteit: Stabiliteit & kwaliteit

### 1.1 Lint/quality pipeline herstellen
- Op dit moment is de lint script-config kapot (`next lint` werkt niet in deze setup), waardoor regressies minder snel worden gezien.
- Advies:
  - vervang de lint script door een werkende ESLint setup voor Next 16;
  - voeg CI checks toe: `typecheck`, `lint`, en eventueel `build`.

### 1.2 Duplicatie van routes/API's opruimen
- Er lijken functioneel overlappende endpoints en pagina-routes te bestaan voor **themas/themes**.
- Dit verhoogt risico op divergent gedrag en maintenance-kosten.
- Advies:
  - kies één namingconventie (`themas` óf `themes`);
  - maak redirect/migratiepad;
  - verwijder de dubbele implementatie.

### 1.3 Grote client-componenten opsplitsen
- Bepaalde pagina's zijn erg groot en combineren datafetching, business rules en UI in één bestand.
- Advies:
  - splits in hooks + presentational components;
  - verplaats API mapping/normalisatie naar helpers;
  - voeg view-model tests toe voor de complexe kalender/planning-logica.

## 2) Prioriteit: Performance

### 2.1 Slimmere data-fetching in navigatie
- Sidebar laadt modules client-side wanneer props ontbreken.
- Advies:
  - haal modules zo veel mogelijk server-side op (RSC) en hydrateer één bron;
  - voeg caching/revalidatie toe voor module-config;
  - voorkom dubbele fetches bij routewissels.

### 2.2 SW observability en update UX
- Service Worker registratie negeert fouten volledig.
- Advies:
  - log minimaal in non-prod naar console/telemetry;
  - toon "nieuwe versie beschikbaar" toast bij SW update;
  - meet cache hit-ratio (indien analytics aanwezig).

### 2.3 Bundle budget en code-splitting
- Vooral grote client-bestanden (kalender/team/project detail) zijn kandidaat voor verdere splitsing.
- Advies:
  - dynamic imports voor zware modals/panels;
  - route-level loading skeletons (deels al aanwezig) uitbreiden;
  - periodieke bundle analyse in CI.

## 3) Prioriteit: Product/UX features

### 3.1 Offline-first voor kernflows (PWA)
- Maak kernacties bruikbaar zonder directe verbinding:
  - concept-uren opslaan in queue;
  - intake-notities lokaal cachen;
  - sync-status per item zichtbaar maken.

### 3.2 Notificaties & reminders
- Push/in-app reminders voor:
  - overbelasting in planning (>8u);
  - openstaande intake taken;
  - team invites die bijna verlopen.

### 3.3 Betere zoekervaring
- Global search uitbreiden met:
  - recente zoekopdrachten;
  - keyboard shortcuts;
  - federated resultaten met type-filters.

### 3.4 Audit & beheer
- Admin activiteit uitbreiden met:
  - exporteerbare audit trails;
  - filtering op actor, module, objecttype;
  - reason-codes bij kritieke acties (rollen/rechten).

## 4) Praktische roadmap (6 weken)

### Week 1-2 (foundation)
1. Lint script repareren + CI quality gate.
2. Duplicatie `themas/themes` in kaart + gekozen eindstaat.
3. Basis observability voor SW en kritieke API errors.

### Week 3-4 (performance)
1. Sidebar/modules server-first maken + caching.
2. Kalender component opsplitsen (start met hooks).
3. Dynamic import voor zware modals.

### Week 5-6 (feature impact)
1. Offline queue voor urenregistratie.
2. Update-notificatie bij nieuwe PWA versie.
3. Search UX verbeteringen (recent + shortcuts).

---

Als je wilt, kan ik dit direct vertalen naar een concrete issuelijst (GitHub issues met acceptance criteria + effort-inschatting).


## Voortgang

- ✅ Admin UI links geconsolideerd naar `/admin/themas` met legacy redirect op `/admin/theemas`.
- ✅ `GET /api/admin/themas` nu ook superuser-guarded.
- ✅ API-consolidatie gestart: `/api/admin/themes/*` is nu alias naar canonieke `/api/admin/themas/*` handlers.
- ✅ Canonieke thema mutaties gebruiken nu RESTful `PATCH/DELETE /api/admin/themas/[id]`.
- ✅ Werkende lint-pipeline toegevoegd via `eslint` script + `eslint.config.mjs` (JS/MJS/CJS).
- ✅ CI quality-gate toegevoegd (`.github/workflows/quality.yml`) met typecheck, lint en build.
- ✅ Dubbele implementatie verder opgeruimd: legacy `app/(protected)/admin/theemas/ThemasClient.tsx` verwijderd.
- ✅ Start gemaakt met opsplitsing van grote kalender-client: datum/kleur helpers verplaatst naar `calendarUtils.ts`.
