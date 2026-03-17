SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 9iOIBos4SsgYKhSns2GEiGdLnUFqcXs4h1zQqvIHZrXd8XPclE2O9nbm10grYHv

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_chat; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: aregenerer; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bokil; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cinqcentbis; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cinqcents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_quests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: deuxcentcinquante; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_1190_1195; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_architecture; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_culture_arts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_economie; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_embeddings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_exploration; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evenements_geopolitiques; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: game_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: gogo; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: goju; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: goju2; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: labo; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: labo_embeddings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: leaderboard_rewards; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: mdcq; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: mille; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: millebis; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: neufx; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: play_console_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: precision_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quest_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: queue_sevent; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: remote_control; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: remote_debug_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ribi; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: runs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: s1; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: secours; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: serie1; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: serie2; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: serie3; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: serie4; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: série5; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transitoire; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transitoire2; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_event_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: labo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."labo_id_seq"', 1, false);


--
-- Name: play_console_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."play_console_stats_id_seq"', 1, false);


--
-- Name: queue_sevent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."queue_sevent_id_seq"', 1, false);


--
-- Name: ribi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."ribi_id_seq"', 1, false);


--
-- Name: série5_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."série5_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 9iOIBos4SsgYKhSns2GEiGdLnUFqcXs4h1zQqvIHZrXd8XPclE2O9nbm10grYHv

RESET ALL;
