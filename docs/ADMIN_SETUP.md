# Admin Panel — Opzetinstructies

## Stap 1: Voer migration 007 uit

Open de Supabase SQL Editor en voer het bestand `supabase/migrations/007_admin_panel.sql` uit.

Dit doet het volgende:
- Voegt `is_active` kolom toe aan `profiles`
- Maakt `platform_settings` tabel aan (1 rij, bevat bedrijfsinstellingen)
- Maakt `custom_roles` tabel aan met standaardrollen
- Voegt RLS-policies toe voor superuser-toegang

## Stap 2: Wijs de eerste superuser aan

Voer dit SQL-commando uit in de Supabase SQL Editor
(vervang het e-mailadres door dat van de gewenste superuser):

```sql
UPDATE public.profiles
SET role = 'superuser'
WHERE email = 'jouw@emailadres.nl';
```

## Stap 3: Inloggen als superuser

Na de rol-wijziging zie je in de sidebar een **"Beheerpaneel"** knop onderaan,
net boven het gebruikersprofiel. Klik hierop om het admin-panel te openen.

## Admin-panel functies

| Pagina              | Route                    | Functie                                       |
|---------------------|--------------------------|-----------------------------------------------|
| Overzicht           | `/admin`                 | Dashboard met statistieken                    |
| Gebruikers          | `/admin/gebruikers`      | Rollen, blokkeren, verwijderen, reset-mail    |
| Thema's & submodules| `/admin/theemas`         | CRUD voor themas en subprocessen              |
| Projectrollen       | `/admin/rollen`          | Aangepaste rollen voor projectteams           |
| Instellingen        | `/admin/instellingen`    | Bedrijfsnaam, logo, kleuren, statussen        |

## Veiligheid

- Alle `/admin` routes zijn beveiligd met een server-side guard (`requireSuperuser()`)
- Alle API routes onder `/api/admin/*` controleren de superuser-rol
- Een superuser kan zijn/haar eigen rol niet verwijderen
- Een superuser kan zijn/haar eigen account niet verwijderen
