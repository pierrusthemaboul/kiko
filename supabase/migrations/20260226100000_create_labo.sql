-- Table labo : zone de travail du Dénicheur (culture pop, TV, cinéma, etc.)
-- Miroir de boumboum, dédiée à la pipeline denicheur_saison

create sequence if not exists "public"."labo_id_seq";

create table if not exists "public"."labo" (
  "id"               bigint not null default nextval('public.labo_id_seq'::regclass),
  "titre"            text not null,
  "year"             integer,
  "is_universal"     boolean default false,
  "notoriete"        integer,
  "description"      text,
  "type"             text,
  "region"           text,
  "status"           text default 'pending'::text,
  "image_prompt"     text,
  "created_at"       timestamp with time zone default now(),
  "processed_at"     timestamp with time zone,
  "error_log"        text,
  "validation_notes" jsonb
);

alter sequence "public"."labo_id_seq" owned by "public"."labo"."id";

create unique index labo_pkey on public.labo using btree (id);

alter table "public"."labo" add constraint "labo_pkey" primary key using index "labo_pkey";

grant delete, insert, references, select, trigger, truncate, update on table "public"."labo" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."labo" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."labo" to "service_role";
