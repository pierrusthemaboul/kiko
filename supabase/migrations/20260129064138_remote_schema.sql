


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."clean_string"("input_string" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Convertir en minuscules
    input_string := LOWER(input_string);
    
    -- Remplacer les caractères accentués
    input_string := translate(input_string,
        'àáâãäåèéêëìíîïòóôõöùúûüýÿ',
        'aaaaaaeeeeiiiiooooouuuuyy');
    
    -- Remplacer les caractères spéciaux par des underscores
    input_string := regexp_replace(input_string, '[^a-z0-9]+', '_', 'g');
    
    -- Supprimer les underscores au début et à la fin
    input_string := trim(both '_' from input_string);
    
    RETURN input_string;
END;
$$;


ALTER FUNCTION "public"."clean_string"("input_string" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fr_month"("month" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (ARRAY[
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ])[month];
END;
$$;


ALTER FUNCTION "public"."fr_month"("month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fr_month"("month" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN CASE month
    WHEN 'January' THEN 'janvier'
    WHEN 'February' THEN 'février'
    WHEN 'March' THEN 'mars'
    WHEN 'April' THEN 'avril'
    WHEN 'May' THEN 'mai'
    WHEN 'June' THEN 'juin'
    WHEN 'July' THEN 'juillet'
    WHEN 'August' THEN 'août'
    WHEN 'September' THEN 'septembre'
    WHEN 'October' THEN 'octobre'
    WHEN 'November' THEN 'novembre'
    WHEN 'December' THEN 'décembre'
    ELSE month
  END;
END;
$$;


ALTER FUNCTION "public"."fr_month"("month" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fr_to_en"("input_text" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(
                                regexp_replace(
                                    regexp_replace(
                                        regexp_replace(
                                            lower(input_text),
                                            'é|è|ê|ë', 'e', 'g'),
                                        'à|â|ä', 'a', 'g'),
                                    'ù|û|ü', 'u', 'g'),
                                'ô|ö', 'o', 'g'),
                            'î|ï', 'i', 'g'),
                        'ç', 'c', 'g'),
                    'œ', 'oe', 'g'),
                'æ', 'ae', 'g'),
            ' de | du | des | le | la | les | l''', ' ', 'g'),
        '[ -]+', '', 'g');
END;
$$;


ALTER FUNCTION "public"."fr_to_en"("input_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_filename"("date_event" "date", "titre" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN TO_CHAR(date_event, 'YYYY-MM-DD') || '_' || LOWER(REGEXP_REPLACE(titre, '[^a-zA-Z0-9]+', '_', 'g')) || '.webp';
END;
$$;


ALTER FUNCTION "public"."generate_filename"("date_event" "date", "titre" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_time_top"("limit_n" integer) RETURNS TABLE("user_id" "uuid", "score" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select distinct on (user_id) user_id, score, created_at
  from public.game_scores
  order by user_id, score desc, created_at desc
  limit limit_n;
$$;


ALTER FUNCTION "public"."get_all_time_top"("limit_n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_top"("limit_n" integer) RETURNS TABLE("user_id" "uuid", "score" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select distinct on (user_id) user_id, score, created_at
  from public.game_scores
  where created_at >= date_trunc('day', now())
  order by user_id, score desc, created_at desc
  limit limit_n;
$$;


ALTER FUNCTION "public"."get_daily_top"("limit_n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_top"("limit_n" integer) RETURNS TABLE("user_id" "uuid", "score" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select distinct on (user_id) user_id, score, created_at
  from public.game_scores
  where created_at >= date_trunc('month', now())
  order by user_id, score desc, created_at desc
  limit limit_n;
$$;


ALTER FUNCTION "public"."get_monthly_top"("limit_n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_event_usage"("p_event_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  update public.evenements
  set frequency_score = coalesce(frequency_score, 0) + 1,
      last_used = now()
  where id = p_event_id;
$$;


ALTER FUNCTION "public"."increment_event_usage"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_expired_quests"() RETURNS TABLE("deleted_count" integer, "created_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Supprimer toutes les quêtes dont la date de reset est dépassée
  DELETE FROM quest_progress
  WHERE reset_at < v_now;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Réinitialiser les quêtes pour tous les utilisateurs actifs
  -- On considère "actifs" = ayant joué dans les 7 derniers jours
  WITH active_users AS (
    SELECT DISTINCT user_id
    FROM profiles
    WHERE last_play_date >= (CURRENT_DATE - INTERVAL '7 days')
  ),
  active_quests AS (
    SELECT quest_key, quest_type
    FROM daily_quests
    WHERE is_active = true
  ),
  new_progress AS (
    SELECT
      au.user_id,
      aq.quest_key,
      0 as current_value,
      false as completed,
      CASE aq.quest_type
        -- Daily: reset demain à minuit
        WHEN 'daily' THEN
          (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        -- Weekly: reset lundi prochain à minuit
        WHEN 'weekly' THEN
          (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
        -- Monthly: reset le 1er du mois prochain à minuit
        WHEN 'monthly' THEN
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp with time zone
      END as reset_at
    FROM active_users au
    CROSS JOIN active_quests aq
  )
  INSERT INTO quest_progress (user_id, quest_key, current_value, completed, reset_at)
  SELECT user_id, quest_key, current_value, completed, reset_at
  FROM new_progress
  ON CONFLICT (user_id, quest_key) DO NOTHING;

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_created_count;
END;
$$;


ALTER FUNCTION "public"."reset_expired_quests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."translate_keywords"("keywords" "text"[]) RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    translated TEXT[];
BEGIN
    SELECT array_agg(fr_to_en(keyword))
    INTO translated
    FROM unnest(keywords) AS keyword;
    RETURN translated;
END;
$$;


ALTER FUNCTION "public"."translate_keywords"("keywords" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_high_score_precision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Mettre à jour le high score seulement si le nouveau score est meilleur
  UPDATE public.profiles
  SET high_score_precision = GREATEST(COALESCE(high_score_precision, 0), NEW.score)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_high_score_precision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_illustration_urls"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    file record;
    full_url text;
    truncated_url text;
BEGIN
    FOR file IN (
        SELECT unnest(ARRAY[
            'interior_of_the_first_carrefour_hypermarket_in_1971_customers_with_shopping_carts_abun_6590b56a.webp',
            '17th_century_negotiation_room_with_french_and_spanish_diplomats_signing_the_treaty_fle_8389c9ae.webp',
            'the_france_ocean_liner_departing_from_the_port_of_le_havre_for_i.webp',
            'simone_veil_at_the_national_assembly_defending_the_law_on_abort.webp',
            'napoleon_bonaparte_entering_the_council_of_five_hundred_at_sain.webp',
            'streets_of_paris_in_1832_doctors_in_protective_suits_sick_people_i.webp',
            'louis_xiv_and_his_court_arriving_at_the_palace_of_versailles_french.webp',
            'place_de_la_concorde_in_paris_crowd_celebrating_waving_tricolor_.webp',
            'richelieu_presiding_over_the_first_meeting_of_the_french_academy.webp',
            'scene_of_the_fire_at_bazar_de_la_charite_with_firefighters_and_civ.webp',
            'francois_i_in_a_renaissance_library_surrounded_by_scholars_and_b.webp',
            'ornate_room_in_the_tuileries_palace_napoleon_and_representatives.webp',
            'first_goncourt_prize_award_ceremony_in_a_parisian_literary_salon.webp',
            'crowd_celebrating_the_victory_of_the_popular_front_red_flags_and.webp',
            'a_19th_century_museum_room_with_archaeologists_in_period_clothin.webp',
            'cyclists_at_the_start_of_the_race_in_paris_1903_period_bicycles_an.webp',
            'first_steam_locomotive_leaving_saint_lazare_station_amazed_crowd.webp',
            '17th_century_theater_stage_with_actors_in_period_costumes_perfor.webp',
            'actors_from_moliere_s_troupe_in_front_of_the_theatre_de_l_hotel.webp',
            'francois_i_and_pope_leo_x_signing_the_concordat_in_a_richly_dec.webp',
            'charles_de_gaulle_giving_a_speech_at_the_elysee_palace_symbols_.webp',
            'construction_site_of_the_paris_observatory_astronomers_and_archi.webp'
        ]) AS name
    ) LOOP
        full_url := 'https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/' || file.name;
        truncated_url := left(full_url, 150); -- Ajustez ce nombre si nécessaire
        
        -- Mise à jour de la table transitoire
        UPDATE transitoire
        SET illustration_url = full_url
        WHERE illustration_url LIKE truncated_url || '%';
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_illustration_urls"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "achievement_key" "text" NOT NULL,
    "achievement_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "xp_bonus" integer DEFAULT 0 NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bokil" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "universel" boolean NOT NULL,
    "region" character varying(100),
    "langue" character varying(50) NOT NULL,
    "ecart_temps_max" integer NOT NULL,
    "facteur_variation" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "niveau_difficulte" integer,
    "types_evenement" "text"[],
    "pays" "text"[],
    "epoque" "text",
    "mots_cles" "text"[],
    "date_formatee" "text",
    "code" "text",
    "date_precision" character varying(5),
    "ecart_temps_min" integer,
    "frequency_score" integer DEFAULT 0,
    "last_used" timestamp with time zone,
    "description_detaillee" "text"
);


ALTER TABLE "public"."bokil" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cinqcentbis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "difficulte" integer
);


ALTER TABLE "public"."cinqcentbis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cinqcents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "difficulte" integer
);


ALTER TABLE "public"."cinqcents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quest_key" "text" NOT NULL,
    "quest_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "target_value" integer NOT NULL,
    "xp_reward" integer DEFAULT 50 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "category" "text" DEFAULT 'general'::"text",
    "parts_reward" integer DEFAULT 0,
    "difficulty" integer DEFAULT 1
);


ALTER TABLE "public"."daily_quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deuxcentcinquante" (
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "difficulte" integer NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."deuxcentcinquante" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evenements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "universel" boolean NOT NULL,
    "region" character varying(100),
    "langue" character varying(50) NOT NULL,
    "ecart_temps_max" integer NOT NULL,
    "facteur_variation" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "niveau_difficulte" integer,
    "types_evenement" "text"[],
    "pays" "text"[],
    "epoque" "text",
    "mots_cles" "text"[],
    "date_formatee" "text",
    "code" "text",
    "date_precision" character varying(5),
    "ecart_temps_min" integer,
    "frequency_score" integer DEFAULT 0,
    "last_used" timestamp with time zone,
    "description_detaillee" "text",
    "donnee_corrigee" boolean DEFAULT false NOT NULL,
    "notoriete" smallint,
    "notoriete_prev" smallint,
    "notoriete_source" "text",
    "notoriete_updated_at" timestamp with time zone DEFAULT "now"(),
    "notoriete_fr" smallint,
    "migration_at" timestamp with time zone,
    "source_goju2_id" "uuid",
    CONSTRAINT "evenements_notoriete_check" CHECK ((("notoriete" >= 0) AND ("notoriete" <= 100)))
);


ALTER TABLE "public"."evenements" OWNER TO "postgres";


COMMENT ON TABLE "public"."evenements" IS 'Table contenant les événements historiques pour le jeu Horo';



COMMENT ON COLUMN "public"."evenements"."id" IS 'Identifiant unique de l''événement';



COMMENT ON COLUMN "public"."evenements"."date" IS 'Date de l''événement (peut aller jusqu''à 3600 ans avant l''invention de l''écriture)';



COMMENT ON COLUMN "public"."evenements"."titre" IS 'Titre ou court descriptif de l''événement';



COMMENT ON COLUMN "public"."evenements"."illustration_url" IS 'URL de l''illustration associée à l''événement';



COMMENT ON COLUMN "public"."evenements"."universel" IS 'Indique si l''événement est universel (true) ou spécifique à une région (false)';



COMMENT ON COLUMN "public"."evenements"."region" IS 'Région ou pays concerné par l''événement (si non universel)';



COMMENT ON COLUMN "public"."evenements"."langue" IS 'Langue dans laquelle l''événement est décrit';



COMMENT ON COLUMN "public"."evenements"."ecart_temps_max" IS 'Écart maximum en années entre cet événement et le suivant';



COMMENT ON COLUMN "public"."evenements"."facteur_variation" IS 'Facteur de variation aléatoire pour l''écart de temps';



COMMENT ON COLUMN "public"."evenements"."created_at" IS 'Date et heure de création de l''enregistrement';



COMMENT ON COLUMN "public"."evenements"."updated_at" IS 'Date et heure de la dernière mise à jour de l''enregistrement';



COMMENT ON COLUMN "public"."evenements"."migration_at" IS 'Date et heure du transfert depuis la table goju2';



COMMENT ON COLUMN "public"."evenements"."source_goju2_id" IS 'ID original dans la table goju2 pour traçabilité parfaite';



CREATE TABLE IF NOT EXISTS "public"."evenements_1190_1195" (
    "uuid" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "difficulté" integer DEFAULT 3
);


ALTER TABLE "public"."evenements_1190_1195" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evenements_architecture" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "universel" boolean DEFAULT true,
    "region" "text",
    "langue" "text" DEFAULT 'français'::"text",
    "theme" "text" DEFAULT 'Architecture (construction de monuments célèbres)'::"text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."evenements_architecture" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evenements_culture_arts" (
    "uuidd" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "universel" boolean DEFAULT true,
    "region" "text",
    "langue" "text" DEFAULT 'français'::"text",
    "ecart_temps_max" integer,
    "facteur_variation" double precision DEFAULT 1.0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "niveau_difficulte" integer,
    "types_evenement" "text",
    "pays" "text",
    "epoque" "text",
    "mots_cles" "text",
    "date_formatee" "text",
    "code" "text",
    "description" "text",
    "theme" "text",
    "periode" "text",
    "date_precision" "text",
    "ecart_temps_min" double precision,
    "importance" double precision,
    "popularite" double precision
);


ALTER TABLE "public"."evenements_culture_arts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evenements_economie" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text",
    "illustration_url" "text",
    "universel" boolean DEFAULT true,
    "region" "text",
    "langue" "text" DEFAULT 'français'::"text",
    "ecart_temps_max" integer,
    "facteur_variation" double precision DEFAULT 1.0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "niveau_difficulte" integer,
    "types_evenement" "text",
    "pays" "text",
    "mots_cles" "text"[],
    "date_formatee" "text",
    "code" "text",
    "description" "text",
    "theme" "text",
    "periode" "text",
    "date_precision" "text",
    "importance" double precision,
    "popularite" double precision,
    "titre_normalise" "text",
    "date_titre_concat" "text",
    "hash_titre_date" "text",
    "validation_doublon" boolean DEFAULT false
);


ALTER TABLE "public"."evenements_economie" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evenements_exploration" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text",
    "illustration_url" "text",
    "universel" boolean DEFAULT true,
    "region" "text",
    "langue" "text" DEFAULT 'français'::"text",
    "ecart_temps_max" integer,
    "facteur_variation" double precision DEFAULT 1.0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "niveau_difficulte" integer,
    "types_evenement" "text",
    "pays" "text",
    "mots_cles" "text"[],
    "date_formatee" "text",
    "code" "text",
    "description" "text",
    "theme" "text",
    "periode" "text",
    "date_precision" "text",
    "importance" double precision,
    "popularite" double precision,
    "titre_normalise" "text",
    "date_titre_concat" "text",
    "hash_titre_date" "text",
    "validation_doublon" boolean DEFAULT false
);


ALTER TABLE "public"."evenements_exploration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evenements_geopolitiques" (
    "uuid" "uuid" NOT NULL,
    "date" "text" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "theme" "text" NOT NULL,
    "periode" "text" NOT NULL
);


ALTER TABLE "public"."evenements_geopolitiques" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "display_name" "text" NOT NULL,
    "score" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "score_type" character varying(20),
    "period" character varying(20),
    "mode" character varying(20) DEFAULT 'classic'::character varying NOT NULL,
    CONSTRAINT "game_scores_mode_check" CHECK ((("mode")::"text" = ANY (ARRAY[('classic'::character varying)::"text", ('precision'::character varying)::"text"])))
);


ALTER TABLE "public"."game_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gogo" (
    "id" "uuid",
    "date" "date",
    "titre" character varying(255),
    "illustration_url" "text",
    "universel" boolean,
    "region" character varying(100),
    "langue" character varying(50),
    "ecart_temps_max" integer,
    "facteur_variation" double precision,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "niveau_difficulte" integer,
    "types_evenement" "text"[],
    "pays" "text"[],
    "epoque" "text",
    "mots_cles" "text"[],
    "filename" "text",
    "prompt_dalle" "text",
    "titre_anglais" "text",
    "keywords_anglais" "text"[],
    "date_formatee" "text",
    "mot_clefs_dalle" "text"[],
    "code" "text"
);


ALTER TABLE "public"."gogo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goju" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "universel" boolean NOT NULL,
    "region" character varying(100),
    "langue" character varying(50) NOT NULL,
    "ecart_temps_max" integer NOT NULL,
    "facteur_variation" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "niveau_difficulte" integer,
    "types_evenement" "text"[],
    "pays" "text"[],
    "epoque" "text",
    "mots_cles" "text"[],
    "date_formatee" "text",
    "code" "text",
    "date_precision" character varying(5),
    "ecart_temps_min" integer,
    "frequency_score" integer DEFAULT 0,
    "last_used" timestamp with time zone,
    "description_detaillee" "text",
    "prompt_flux" "text",
    "contexte_historique" "text",
    "elements_visuels" "json",
    "atmosphere" "text",
    "couleurs_dominantes" "json",
    "validation_status" character varying(20) DEFAULT 'pending'::character varying,
    "validation_notes" "text",
    "validated_by" character varying(255),
    "validated_at" timestamp without time zone,
    "needs_image_change" boolean DEFAULT false,
    "needs_title_change" boolean DEFAULT false,
    "validation_score" integer,
    "validation_explanation" "text",
    "validation_detailed_analysis" "json",
    "transferred" boolean DEFAULT false NOT NULL,
    "transferred_at" timestamp with time zone,
    "focus_type" "text",
    "style_info" "jsonb" DEFAULT '{}'::"jsonb",
    "style_name" "text",
    "prompt_schnell" "text",
    "notoriete" integer,
    "recuperable" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."goju" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goju2" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "types_evenement" "text"[],
    "description_detaillee" "text",
    "notoriete" integer,
    "transferred" boolean DEFAULT false NOT NULL,
    "transferred_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "automatik" boolean DEFAULT false NOT NULL,
    "score_validation" integer DEFAULT 0
);


ALTER TABLE "public"."goju2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mdcq" (
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "difficulte" integer NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."mdcq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mille" (
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "difficulte" integer NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."mille" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."millebis" (
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "code" "text" NOT NULL,
    "difficulte" integer NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."millebis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."neufx" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" character varying,
    "titre" character varying,
    "illustration_url" character varying,
    "universel" boolean DEFAULT false,
    "region" character varying,
    "langue" character varying,
    "ecart_temps_max" integer,
    "facteur_variation" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "niveau_difficulte" integer DEFAULT 2,
    "types_evenement" character varying[],
    "pays" character varying,
    "epoque" character varying,
    "mots_cles" character varying[],
    "date_formatee" character varying,
    "code" character varying,
    "date_precision" character varying,
    "ecart_temps_min" double precision DEFAULT 5,
    "frequency_score" integer DEFAULT 0,
    "last_used" timestamp with time zone,
    "description_detaillee" "text"
);


ALTER TABLE "public"."neufx" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."play_console_stats" (
    "id" bigint NOT NULL,
    "package_name" "text" NOT NULL,
    "total_reviews" integer DEFAULT 0,
    "average_rating" numeric(3,2) DEFAULT 0,
    "fetched_at" timestamp without time zone DEFAULT "now"(),
    "reviews_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."play_console_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."play_console_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."play_console_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."play_console_stats_id_seq" OWNED BY "public"."play_console_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."precision_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "display_name" "text" DEFAULT 'Joueur'::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "precision_scores_display_name_length" CHECK ((("length"("display_name") >= 1) AND ("length"("display_name") <= 50))),
    CONSTRAINT "precision_scores_score_positive" CHECK (("score" >= 0))
);


ALTER TABLE "public"."precision_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "high_score" integer DEFAULT 0,
    "games_played" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "current_level" integer DEFAULT 1,
    "events_completed" integer DEFAULT 0,
    "mastery_levels" "jsonb" DEFAULT '{}'::"jsonb",
    "is_admin" boolean DEFAULT false,
    "xp_total" integer DEFAULT 0 NOT NULL,
    "title_key" "text" DEFAULT 'page'::"text" NOT NULL,
    "parties_per_day" integer DEFAULT 3 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_streak" integer DEFAULT 0,
    "best_streak" integer DEFAULT 0,
    "last_play_date" "date",
    "high_score_precision" integer DEFAULT 0
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quest_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quest_key" "text" NOT NULL,
    "current_value" integer DEFAULT 0 NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "reset_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."quest_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."remote_debug_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "session_id" "text",
    "level" "text" NOT NULL,
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "app_version" "text",
    "platform" "text"
);


ALTER TABLE "public"."remote_debug_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ribi" (
    "id" integer NOT NULL,
    "old_name" "text" NOT NULL,
    "new_name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "annee" smallint,
    "evenement" "text"
);


ALTER TABLE "public"."ribi" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ribi_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."ribi_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ribi_id_seq" OWNED BY "public"."ribi"."id";



CREATE TABLE IF NOT EXISTS "public"."runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mode" "text" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "economy_applied_at" timestamp with time zone,
    "xp_earned" integer,
    "old_xp" integer,
    "new_xp" integer,
    "rank_key" "text",
    "rank_label" "text",
    "parties_per_day" integer,
    "leveled_up" boolean,
    "updated_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "metadata" "jsonb",
    CONSTRAINT "runs_mode_check" CHECK (("mode" = ANY (ARRAY['classic'::"text", 'date'::"text", 'precision'::"text"])))
);


ALTER TABLE "public"."runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."s1" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uuid" "text" NOT NULL,
    "date" "date" NOT NULL,
    "titre" "text" NOT NULL,
    "illustration_url" "text",
    "univers" boolean,
    "region" character varying
);


ALTER TABLE "public"."s1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."secours" (
    "id" "uuid",
    "date" "date",
    "titre" character varying(255),
    "illustration_url" "text",
    "universel" boolean,
    "region" character varying(100),
    "langue" character varying(50),
    "ecart_temps_max" integer,
    "facteur_variation" double precision,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "niveau_difficulte" integer,
    "types_evenement" "text"[],
    "pays" "text"[],
    "epoque" "text",
    "mots_cles" "text"[],
    "filename" "text",
    "prompt_dalle" "text",
    "titre_anglais" "text",
    "keywords_anglais" "text"[],
    "date_formatee" "text",
    "mot_clefs_dalle" "text"[]
);


ALTER TABLE "public"."secours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."serie1" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titre" "text" NOT NULL,
    "date" "text" NOT NULL,
    "illustration_url" "text" NOT NULL
);


ALTER TABLE "public"."serie1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."serie2" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titre" "text",
    "date" "text",
    "illustration_url" "text"
);


ALTER TABLE "public"."serie2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."serie3" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titre" "text" NOT NULL,
    "date" "date" NOT NULL,
    "illustration_url" "text"
);


ALTER TABLE "public"."serie3" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."serie4" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titre" "text",
    "date" "text",
    "illustration_url" "text"
);


ALTER TABLE "public"."serie4" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."série5" (
    "id" bigint NOT NULL,
    "titre" "text" NOT NULL,
    "date" "date" NOT NULL,
    "illustration_url" "text" NOT NULL
);


ALTER TABLE "public"."série5" OWNER TO "postgres";


ALTER TABLE "public"."série5" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."série5_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transitoire" (
    "date" "date" NOT NULL,
    "titre" character varying(255) NOT NULL,
    "illustration_url" character varying(500),
    "code" "text",
    "difficulte" integer,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."transitoire" OWNER TO "postgres";


COMMENT ON COLUMN "public"."transitoire"."date" IS 'Date de l''événement (peut aller jusqu''à 3600 ans avant l''invention de l''écriture)';



COMMENT ON COLUMN "public"."transitoire"."titre" IS 'Titre ou court descriptif de l''événement';



CREATE TABLE IF NOT EXISTS "public"."transitoire2" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"(),
    "date" character varying,
    "titre" character varying,
    "illustration_url" character varying,
    "code" "text",
    "description" "text",
    "theme" character varying,
    "periode" character varying,
    "date_precision" character varying(5),
    "date_formatee" character varying(50)
);


ALTER TABLE "public"."transitoire2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_key" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


ALTER TABLE ONLY "public"."play_console_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."play_console_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ribi" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ribi_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_achievement_key_key" UNIQUE ("achievement_key");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."bokil"
    ADD CONSTRAINT "bokil_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cinqcentbis"
    ADD CONSTRAINT "cinqcentbis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cinqcents"
    ADD CONSTRAINT "cinqcents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_quests"
    ADD CONSTRAINT "daily_quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_quests"
    ADD CONSTRAINT "daily_quests_quest_key_key" UNIQUE ("quest_key");



ALTER TABLE ONLY "public"."deuxcentcinquante"
    ADD CONSTRAINT "deuxcentcinquante_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."deuxcentcinquante"
    ADD CONSTRAINT "deuxcentcinquante_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evenements_1190_1195"
    ADD CONSTRAINT "evenements_1190_1195_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."evenements_architecture"
    ADD CONSTRAINT "evenements_architecture_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."evenements_culture_arts"
    ADD CONSTRAINT "evenements_culture_arts_pkey" PRIMARY KEY ("uuidd");



ALTER TABLE ONLY "public"."evenements_economie"
    ADD CONSTRAINT "evenements_economie_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."evenements_exploration"
    ADD CONSTRAINT "evenements_exploration_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."evenements_geopolitiques"
    ADD CONSTRAINT "evenements_geopolitiques_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."evenements"
    ADD CONSTRAINT "evenements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_scores"
    ADD CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goju2"
    ADD CONSTRAINT "goju2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goju"
    ADD CONSTRAINT "goju_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goju"
    ADD CONSTRAINT "goju_unique_code" UNIQUE ("code");



ALTER TABLE ONLY "public"."mdcq"
    ADD CONSTRAINT "mdcq_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."mdcq"
    ADD CONSTRAINT "mdcq_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mille"
    ADD CONSTRAINT "mille_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."mille"
    ADD CONSTRAINT "mille_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."millebis"
    ADD CONSTRAINT "millebis_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."millebis"
    ADD CONSTRAINT "millebis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."neufx"
    ADD CONSTRAINT "neufx_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."play_console_stats"
    ADD CONSTRAINT "play_console_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."precision_scores"
    ADD CONSTRAINT "precision_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quest_progress"
    ADD CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quest_progress"
    ADD CONSTRAINT "quest_progress_user_quest_unique" UNIQUE ("user_id", "quest_key", "reset_at");



ALTER TABLE ONLY "public"."remote_debug_logs"
    ADD CONSTRAINT "remote_debug_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ribi"
    ADD CONSTRAINT "ribi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."s1"
    ADD CONSTRAINT "s1_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."serie1"
    ADD CONSTRAINT "serie1_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."serie2"
    ADD CONSTRAINT "serie2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."serie3"
    ADD CONSTRAINT "serie3_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."serie4"
    ADD CONSTRAINT "serie4_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."série5"
    ADD CONSTRAINT "série5_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transitoire"
    ADD CONSTRAINT "transitoire_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evenements"
    ADD CONSTRAINT "unique_code" UNIQUE ("code");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_key_unique" UNIQUE ("user_id", "achievement_key");



CREATE INDEX "game_scores_created_at_idx" ON "public"."game_scores" USING "btree" ("created_at");



CREATE INDEX "game_scores_score_idx" ON "public"."game_scores" USING "btree" ("score" DESC);



CREATE INDEX "goju_style_name_idx" ON "public"."goju" USING "btree" ("style_name");



CREATE INDEX "idx_evenements_date" ON "public"."evenements" USING "btree" ("date");



CREATE INDEX "idx_evenements_difficulte_date" ON "public"."evenements" USING "btree" ("niveau_difficulte", "date");



CREATE INDEX "idx_evenements_frequency_score" ON "public"."evenements" USING "btree" ("frequency_score");



CREATE INDEX "idx_evenements_last_used" ON "public"."evenements" USING "btree" ("last_used" DESC);



CREATE INDEX "idx_evenements_notoriete" ON "public"."evenements" USING "btree" ("notoriete");



CREATE INDEX "idx_evenements_notoriete_fr" ON "public"."evenements" USING "btree" ("notoriete_fr");



CREATE INDEX "idx_evenements_region" ON "public"."evenements" USING "btree" ("region");



CREATE INDEX "idx_evenements_universel" ON "public"."evenements" USING "btree" ("universel");



CREATE INDEX "idx_game_scores_created_at" ON "public"."game_scores" USING "btree" ("created_at");



CREATE INDEX "idx_game_scores_created_score" ON "public"."game_scores" USING "btree" ("created_at" DESC, "score" DESC);



CREATE INDEX "idx_game_scores_mode_created_at" ON "public"."game_scores" USING "btree" ("mode", "created_at" DESC);



CREATE INDEX "idx_game_scores_mode_score" ON "public"."game_scores" USING "btree" ("mode", "score" DESC);



CREATE INDEX "idx_game_scores_period" ON "public"."game_scores" USING "btree" ("period");



CREATE INDEX "idx_goju2_automatik" ON "public"."goju2" USING "btree" ("automatik");



CREATE INDEX "idx_goju2_date" ON "public"."goju2" USING "btree" ("date");



CREATE INDEX "idx_goju2_transferred" ON "public"."goju2" USING "btree" ("transferred");



CREATE INDEX "idx_goju_date" ON "public"."goju" USING "btree" ("date");



CREATE INDEX "idx_goju_region" ON "public"."goju" USING "btree" ("region");



CREATE INDEX "idx_goju_transferred" ON "public"."goju" USING "btree" ("transferred");



CREATE INDEX "idx_goju_universel" ON "public"."goju" USING "btree" ("universel");



CREATE INDEX "idx_play_console_fetched" ON "public"."play_console_stats" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_play_console_package" ON "public"."play_console_stats" USING "btree" ("package_name");



CREATE INDEX "idx_precision_scores_created_at" ON "public"."precision_scores" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_precision_scores_date_score" ON "public"."precision_scores" USING "btree" ("created_at" DESC, "score" DESC);



CREATE INDEX "idx_precision_scores_score" ON "public"."precision_scores" USING "btree" ("score" DESC);



CREATE INDEX "idx_precision_scores_top" ON "public"."precision_scores" USING "btree" ("score" DESC) WHERE ("score" >= 1000);



CREATE INDEX "idx_precision_scores_user_created" ON "public"."precision_scores" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_precision_scores_user_id" ON "public"."precision_scores" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_high_score" ON "public"."profiles" USING "btree" ("high_score" DESC);



CREATE INDEX "idx_profiles_high_score_precision" ON "public"."profiles" USING "btree" ("high_score_precision" DESC NULLS LAST);



CREATE INDEX "idx_quest_progress_quest_key" ON "public"."quest_progress" USING "btree" ("quest_key");



CREATE INDEX "idx_quest_progress_reset_at" ON "public"."quest_progress" USING "btree" ("reset_at");



CREATE INDEX "idx_quest_progress_user_completed" ON "public"."quest_progress" USING "btree" ("user_id", "completed");



CREATE INDEX "idx_quest_progress_user_id" ON "public"."quest_progress" USING "btree" ("user_id");



CREATE INDEX "idx_quest_progress_user_reset" ON "public"."quest_progress" USING "btree" ("user_id", "reset_at");



CREATE INDEX "idx_remote_debug_logs_category" ON "public"."remote_debug_logs" USING "btree" ("category");



CREATE INDEX "idx_remote_debug_logs_created_at" ON "public"."remote_debug_logs" USING "btree" ("created_at");



CREATE INDEX "idx_remote_debug_logs_user_id" ON "public"."remote_debug_logs" USING "btree" ("user_id");



CREATE INDEX "idx_user_achievements_achievement_key" ON "public"."user_achievements" USING "btree" ("achievement_key");



CREATE INDEX "idx_user_achievements_user_id" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "transitoire_date_idx" ON "public"."transitoire" USING "btree" ("date");



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_high_score" AFTER INSERT ON "public"."precision_scores" FOR EACH ROW EXECUTE FUNCTION "public"."update_high_score_precision"();



CREATE OR REPLACE TRIGGER "update_bokil_modtime" BEFORE UPDATE ON "public"."bokil" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_evenements_modtime" BEFORE UPDATE ON "public"."evenements" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_goju2_updated_at" BEFORE UPDATE ON "public"."goju2" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goju_modtime" BEFORE UPDATE ON "public"."goju" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."game_scores"
    ADD CONSTRAINT "game_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."precision_scores"
    ADD CONSTRAINT "precision_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quest_progress"
    ADD CONSTRAINT "quest_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."remote_debug_logs"
    ADD CONSTRAINT "remote_debug_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "All authenticated users can view daily quests" ON "public"."daily_quests" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow individual users to update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow reading all profiles for leaderboards" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Autoriser insertion propre profil" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Autoriser lecture propre profil bis" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Autoriser lecture publique" ON "public"."evenements" FOR SELECT USING (true);



CREATE POLICY "Autoriser lecture publique" ON "public"."evenements_1190_1195" FOR SELECT USING (true);



CREATE POLICY "Enable insert for all users" ON "public"."remote_debug_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable select for admin only" ON "public"."remote_debug_logs" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))));



CREATE POLICY "Les utilisateurs peuvent ajouter leurs propres scores" ON "public"."game_scores" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Les utilisateurs peuvent voir et modifier leur propre profil." ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Les utilisateurs peuvent voir tous les scores" ON "public"."game_scores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permettre l'insertion aux admins" ON "public"."admin_users" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "admin_users_1"."user_id"
   FROM "public"."admin_users" "admin_users_1")));



CREATE POLICY "Permettre la lecture aux utilisateurs authentifiés" ON "public"."admin_users" FOR SELECT USING (true);



CREATE POLICY "Quêtes visibles par tous" ON "public"."daily_quests" FOR SELECT USING (true);



CREATE POLICY "Users can delete their own precision scores" ON "public"."precision_scores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own precision scores" ON "public"."precision_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own quest progress" ON "public"."quest_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own runs" ON "public"."runs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own scores" ON "public"."game_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own achievements" ON "public"."user_achievements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own precision scores" ON "public"."precision_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own quest progress" ON "public"."quest_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own quest_progress" ON "public"."quest_progress" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own quest progress" ON "public"."quest_progress" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own quest progress" ON "public"."quest_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all precision scores" ON "public"."precision_scores" FOR SELECT USING (true);



CREATE POLICY "Users can view own achievements" ON "public"."user_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own precision scores" ON "public"."precision_scores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own quest progress" ON "public"."quest_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own runs" ON "public"."runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own scores" ON "public"."game_scores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own achievements" ON "public"."user_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own quest progress" ON "public"."quest_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Utilisateurs créent leur propre progression" ON "public"."quest_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Utilisateurs mettent à jour leur propre progression" ON "public"."quest_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Utilisateurs suppriment leur propre progression" ON "public"."quest_progress" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Utilisateurs voient leur propre progression" ON "public"."quest_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cinqcentbis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cinqcents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_quests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deuxcentcinquante" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements_1190_1195" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements_architecture" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements_culture_arts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements_economie" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements_exploration" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evenements_geopolitiques" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gogo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lecture seule" ON "public"."cinqcentbis" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."cinqcents" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."deuxcentcinquante" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."evenements_architecture" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."evenements_culture_arts" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."evenements_economie" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."evenements_exploration" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."evenements_geopolitiques" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."gogo" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."mdcq" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."mille" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."millebis" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."neufx" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."s1" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."secours" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."serie1" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."serie2" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."serie3" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."serie4" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."série5" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."transitoire" FOR SELECT USING (true);



CREATE POLICY "lecture seule" ON "public"."transitoire2" FOR SELECT USING (true);



ALTER TABLE "public"."mdcq" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mille" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."millebis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."neufx" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."precision_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quest_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."remote_debug_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "runs_insert_own" ON "public"."runs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "runs_select_own" ON "public"."runs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."s1" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."secours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."serie1" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."serie2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."serie3" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."serie4" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."série5" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transitoire" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transitoire2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";









































































































































































































GRANT ALL ON FUNCTION "public"."clean_string"("input_string" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clean_string"("input_string" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_string"("input_string" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fr_month"("month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fr_month"("month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fr_month"("month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fr_month"("month" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fr_month"("month" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fr_month"("month" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fr_to_en"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fr_to_en"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fr_to_en"("input_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_filename"("date_event" "date", "titre" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_filename"("date_event" "date", "titre" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_filename"("date_event" "date", "titre" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_time_top"("limit_n" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_time_top"("limit_n" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_time_top"("limit_n" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_top"("limit_n" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_top"("limit_n" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_top"("limit_n" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_top"("limit_n" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_top"("limit_n" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_top"("limit_n" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_event_usage"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_event_usage"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_event_usage"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_expired_quests"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_expired_quests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_expired_quests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."translate_keywords"("keywords" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."translate_keywords"("keywords" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate_keywords"("keywords" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_high_score_precision"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_high_score_precision"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_high_score_precision"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_illustration_urls"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_illustration_urls"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_illustration_urls"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

































GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."bokil" TO "anon";
GRANT ALL ON TABLE "public"."bokil" TO "authenticated";
GRANT ALL ON TABLE "public"."bokil" TO "service_role";



GRANT ALL ON TABLE "public"."cinqcentbis" TO "anon";
GRANT ALL ON TABLE "public"."cinqcentbis" TO "authenticated";
GRANT ALL ON TABLE "public"."cinqcentbis" TO "service_role";



GRANT ALL ON TABLE "public"."cinqcents" TO "anon";
GRANT ALL ON TABLE "public"."cinqcents" TO "authenticated";
GRANT ALL ON TABLE "public"."cinqcents" TO "service_role";



GRANT ALL ON TABLE "public"."daily_quests" TO "anon";
GRANT ALL ON TABLE "public"."daily_quests" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_quests" TO "service_role";



GRANT ALL ON TABLE "public"."deuxcentcinquante" TO "anon";
GRANT ALL ON TABLE "public"."deuxcentcinquante" TO "authenticated";
GRANT ALL ON TABLE "public"."deuxcentcinquante" TO "service_role";



GRANT ALL ON TABLE "public"."evenements" TO "anon";
GRANT ALL ON TABLE "public"."evenements" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements" TO "service_role";



GRANT ALL ON TABLE "public"."evenements_1190_1195" TO "anon";
GRANT ALL ON TABLE "public"."evenements_1190_1195" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements_1190_1195" TO "service_role";



GRANT ALL ON TABLE "public"."evenements_architecture" TO "anon";
GRANT ALL ON TABLE "public"."evenements_architecture" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements_architecture" TO "service_role";



GRANT ALL ON TABLE "public"."evenements_culture_arts" TO "anon";
GRANT ALL ON TABLE "public"."evenements_culture_arts" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements_culture_arts" TO "service_role";



GRANT ALL ON TABLE "public"."evenements_economie" TO "anon";
GRANT ALL ON TABLE "public"."evenements_economie" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements_economie" TO "service_role";



GRANT ALL ON TABLE "public"."evenements_exploration" TO "anon";
GRANT ALL ON TABLE "public"."evenements_exploration" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements_exploration" TO "service_role";



GRANT ALL ON TABLE "public"."evenements_geopolitiques" TO "anon";
GRANT ALL ON TABLE "public"."evenements_geopolitiques" TO "authenticated";
GRANT ALL ON TABLE "public"."evenements_geopolitiques" TO "service_role";



GRANT ALL ON TABLE "public"."game_scores" TO "anon";
GRANT ALL ON TABLE "public"."game_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."game_scores" TO "service_role";



GRANT ALL ON TABLE "public"."gogo" TO "anon";
GRANT ALL ON TABLE "public"."gogo" TO "authenticated";
GRANT ALL ON TABLE "public"."gogo" TO "service_role";



GRANT ALL ON TABLE "public"."goju" TO "anon";
GRANT ALL ON TABLE "public"."goju" TO "authenticated";
GRANT ALL ON TABLE "public"."goju" TO "service_role";



GRANT ALL ON TABLE "public"."goju2" TO "anon";
GRANT ALL ON TABLE "public"."goju2" TO "authenticated";
GRANT ALL ON TABLE "public"."goju2" TO "service_role";



GRANT ALL ON TABLE "public"."mdcq" TO "anon";
GRANT ALL ON TABLE "public"."mdcq" TO "authenticated";
GRANT ALL ON TABLE "public"."mdcq" TO "service_role";



GRANT ALL ON TABLE "public"."mille" TO "anon";
GRANT ALL ON TABLE "public"."mille" TO "authenticated";
GRANT ALL ON TABLE "public"."mille" TO "service_role";



GRANT ALL ON TABLE "public"."millebis" TO "anon";
GRANT ALL ON TABLE "public"."millebis" TO "authenticated";
GRANT ALL ON TABLE "public"."millebis" TO "service_role";



GRANT ALL ON TABLE "public"."neufx" TO "anon";
GRANT ALL ON TABLE "public"."neufx" TO "authenticated";
GRANT ALL ON TABLE "public"."neufx" TO "service_role";



GRANT ALL ON TABLE "public"."play_console_stats" TO "anon";
GRANT ALL ON TABLE "public"."play_console_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."play_console_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."play_console_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."play_console_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."play_console_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precision_scores" TO "anon";
GRANT ALL ON TABLE "public"."precision_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."precision_scores" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quest_progress" TO "anon";
GRANT ALL ON TABLE "public"."quest_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."quest_progress" TO "service_role";



GRANT ALL ON TABLE "public"."remote_debug_logs" TO "anon";
GRANT ALL ON TABLE "public"."remote_debug_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."remote_debug_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ribi" TO "anon";
GRANT ALL ON TABLE "public"."ribi" TO "authenticated";
GRANT ALL ON TABLE "public"."ribi" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ribi_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ribi_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ribi_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."runs" TO "anon";
GRANT ALL ON TABLE "public"."runs" TO "authenticated";
GRANT ALL ON TABLE "public"."runs" TO "service_role";



GRANT ALL ON TABLE "public"."s1" TO "anon";
GRANT ALL ON TABLE "public"."s1" TO "authenticated";
GRANT ALL ON TABLE "public"."s1" TO "service_role";



GRANT ALL ON TABLE "public"."secours" TO "anon";
GRANT ALL ON TABLE "public"."secours" TO "authenticated";
GRANT ALL ON TABLE "public"."secours" TO "service_role";



GRANT ALL ON TABLE "public"."serie1" TO "anon";
GRANT ALL ON TABLE "public"."serie1" TO "authenticated";
GRANT ALL ON TABLE "public"."serie1" TO "service_role";



GRANT ALL ON TABLE "public"."serie2" TO "anon";
GRANT ALL ON TABLE "public"."serie2" TO "authenticated";
GRANT ALL ON TABLE "public"."serie2" TO "service_role";



GRANT ALL ON TABLE "public"."serie3" TO "anon";
GRANT ALL ON TABLE "public"."serie3" TO "authenticated";
GRANT ALL ON TABLE "public"."serie3" TO "service_role";



GRANT ALL ON TABLE "public"."serie4" TO "anon";
GRANT ALL ON TABLE "public"."serie4" TO "authenticated";
GRANT ALL ON TABLE "public"."serie4" TO "service_role";



GRANT ALL ON TABLE "public"."série5" TO "anon";
GRANT ALL ON TABLE "public"."série5" TO "authenticated";
GRANT ALL ON TABLE "public"."série5" TO "service_role";



GRANT ALL ON SEQUENCE "public"."série5_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."série5_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."série5_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transitoire" TO "anon";
GRANT ALL ON TABLE "public"."transitoire" TO "authenticated";
GRANT ALL ON TABLE "public"."transitoire" TO "service_role";



GRANT ALL ON TABLE "public"."transitoire2" TO "anon";
GRANT ALL ON TABLE "public"."transitoire2" TO "authenticated";
GRANT ALL ON TABLE "public"."transitoire2" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";































drop extension if exists "pg_net";


  create policy "Allow public read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'evenements-image'::text));



  create policy "Allow public uploads 1cpkpvc_0"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'evenements-image'::text));



  create policy "Allow public uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'evenements-image'::text));



  create policy "Enable public uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (true);



  create policy "allow_public_uploads"
  on "storage"."objects"
  as permissive
  for insert
  to anon
with check (true);



  create policy "public_insert_policy"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (true);



