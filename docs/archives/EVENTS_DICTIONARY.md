# Analytics Events Dictionary

This document lists the analytics events, parameters, and user properties currently supported by the application.

## User Properties

| Property | Type | Description | Example |
| --- | --- | --- | --- |
| `membership_status` | `'guest' \| 'registered'` | Tracks whether the player is anonymous or authenticated. | `registered` |
| `has_personalized_ads` | `'true' \| 'false'` | Indicates if personalized ads are allowed. | `true` |
| `display_name` | `string` | Current display name used for leaderboards. | `"Alice"` |
| `locale` | `string` | Player locale when available. | `"fr-FR"` |
| `app_version` | `string` | App version pushed from `expoConfig`. | `"1.5.1"` |
| `platform` | `string` | Platform identifier (`ios`, `android`). | `"android"` |

## Auth & Session

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `login_attempt` | `method` (string), `screen` (string, optional) | `{"method":"password","screen":"login"}` |
| `login_failed` | `reason` (string), `method` (string), `screen` (string), `message` (string, optional), `error_code` (string, optional) | `{"reason":"invalid_credentials","method":"password","screen":"login"}` |
| `login` | `method` (string), `screen` (string), `user_type` (string, optional) | `{"method":"google","screen":"login"}` |
| `signup_attempt` | `method` (string), `screen` (string) | `{"method":"password","screen":"signup"}` |
| `signup_failed` | `reason` (string), `method` (string), `screen` (string), `message` (string, optional) | `{"reason":"email_exists","method":"password","screen":"signup"}` |
| `sign_up` | `method` (string), `status` (string, optional), `screen` (string) | `{"method":"password","screen":"signup"}` |
| `navigate_to_signup` | `screen` (string) | `{"screen":"login"}` |
| `user_login` | `method` (string), `is_returning_user` (boolean, optional), `screen` (string, optional) | `{"method":"auto","is_returning_user":true,"screen":"home"}` |
| `user_logout` | `user_type` (string, optional), `from_screen` (string, optional) | `{"user_type":"guest","from_screen":"home"}` |
| `guest_login` | `guest_id` (number), `guest_name` (string), `screen` (string, optional) | `{"guest_id":1234,"guest_name":"Explorateur-1234","screen":"home"}` |
| `guest_mode_confirmed` | `guest_name` (string, optional), `screen` (string, optional) | `{"guest_name":"Explorateur-1234","screen":"home"}` |
| `guest_to_signup` | `from_screen` (string), `guest_name` (string, optional) | `{"from_screen":"home","guest_name":"Explorateur-1234"}` |

## App Lifecycle & UI

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `app_update` | `from_version` (string, optional), `to_version` (string, optional) | `{"from_version":"1.5.0","to_version":"1.5.1"}` |
| `app_backgrounded_during_game` | `event_id` (string), `level` (number, optional), `streak` (number, optional), `context` (string, optional), `screen` (string, optional), `reason` (string), `seconds_since_last` (number, optional) | `{"event_id":"evt_42","level":3,"context":"classic_game","reason":"background"}` |
| `app_backgrounded` | `time_left` (number, optional), `current_level` (number, optional), `current_score` (number, optional) | `{"time_left":7}` |
| `app_foregrounded` | `current_level` (number, optional), `current_score` (number, optional) | `{"current_level":4}` |
| `splash_complete` | `time_shown` (number), `screen` (string, optional) | `{"time_shown":3800,"screen":"home"}` |
| `login_button_clicked` | `from_screen` (string) | `{"from_screen":"home"}` |
| `signup_button_clicked` | `from_screen` (string) | `{"from_screen":"home"}` |
| `start_game_button_clicked` | `player_name` (string), `is_guest` (boolean), `user_type` (string), `from_screen` (string) | `{"player_name":"Alice","is_guest":false,"user_type":"registered","from_screen":"home"}` |

## Gameplay – Classic

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `timeout` | `level` (number), `events_completed_in_level` (number), `current_streak` (number) | `{"level":2,"events_completed_in_level":4,"current_streak":3}` |
| `life_lost` | `reason` (string), `level` (number), `remaining_lives` (number), `event_id` (string, optional), `context` (string, optional) | `{"reason":"timeout","level":2,"remaining_lives":2,"event_id":"evt_14","context":"classic_game"}` |
| `reward_applied` | `reward_type` (string), `reward_amount` (number), `new_points` (number), `new_lives` (number), `level` (number) | `{"reward_type":"EXTRA_LIFE","reward_amount":1,"new_points":2100,"new_lives":4,"level":3}` |
| `new_high_score` | `score` (number), `previous_high_score` (number, optional), `mode` (string, optional) | `{"score":5200,"previous_high_score":4800,"mode":"classic"}` |
| `game_started` | `player_name` (string), `is_guest` (boolean), `initial_level` (number) | `{"player_name":"Alice","is_guest":false,"initial_level":1}` |
| `level_started` | `level_id` (number), `level_name` (string), `events_needed` (number), `current_score` (number) | `{"level_id":2,"level_name":"Niveau 2","events_needed":10,"current_score":1200}` |
| `level_completed` | `level_id` (number), `level_name` (string), `events_completed` (number), `score` (number), `correct_answers` (number), `max_streak` (number, optional) | `{"level_id":2,"level_name":"Niveau 2","events_completed":10,"score":1800,"correct_answers":8}` |
| `question_answered` | `event_id` (string), `event_title` (string), `event_period` (string), `event_difficulty` (number), `choice` (string), `is_correct` (boolean), `response_time` (number), `level_id` (number), `current_streak` (number) | `{"event_id":"evt_22","choice":"1923","is_correct":true,"response_time":3200}` |
| `streak_achieved` | `streak_count` (number), `level_id` (number) | `{"streak_count":10,"level_id":3}` |
| `game_over` | `final_score` (number), `max_level` (number), `total_events_completed` (number), `max_streak` (number), `is_high_score` (boolean) | `{"final_score":5400,"max_level":5,"total_events_completed":36,"max_streak":9,"is_high_score":true}` |

## Gameplay – Precision Mode

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `precision_guess` | `event_id` (string), `level` (number), `abs_difference` (number), `hp_loss` (number), `score_gain` (number), `leveled_up` (boolean) | `{"event_id":"evt_81","level":2,"abs_difference":17,"hp_loss":120,"score_gain":260,"leveled_up":false}` |
| `precision_timeout` | `event_id` (string), `level` (number) | `{"event_id":"evt_81","level":2}` |
| `precision_game_over` | `total_events` (number), `final_score` (number) | `{"total_events":14,"final_score":3120}` |
| `precision_continue_declined` | `score` (number) | `{"score":3120}` |
| `precision_continued` | `score` (number), `hp_restored` (number) | `{"score":3120,"hp_restored":400}` |
| `temporal_jump` | `from_year` (number), `to_year` (number), `jump_distance` (number), `jump_direction` (`'forward' \| 'backward'`), `user_level` (number) | `{"from_year":1540,"to_year":1100,"jump_distance":440,"jump_direction":"backward","user_level":3}` |
| `precision_sound_played` | `sound_name` (string) | `{"sound_name":"perfectAnswer"}` |

## Audio & Settings

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `sound_played` | `sound_name` (string) | `{"sound_name":"levelUp"}` |
| `sound_toggled` | `enabled` (boolean), `type` (`'effects' \| 'music'`) | `{"enabled":false,"type":"music"}` |

## Ads & Monetization

`ad_event` is the unified funnel for all ad telemetry recorded through `trackAd`.

| Required Fields | Optional Fields | Example Payload |
| --- | --- | --- |
| `placement` (string), `action` (string) | `ad_type` (string), `level` (number), `reward_type` (string), `reward_amount` (number), `error_code` (string), `network` (string) | `{"placement":"level_up","action":"loaded","ad_type":"interstitial","level":3}` |

Typical `action` values: `loaded`, `failed`, `triggered`, `opened`, `closed`, `error_show`, `earned_reward`, `not_available`.

## Consentement UMP

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `consent_status_updated` | `status` (string), `can_show_personalized_ads` (boolean), `source` (`'restore' \| 'update'`) | `{"status":"obtained","can_show_personalized_ads":true,"source":"update"}` |
| `consent_form_shown` | `status` (string), `source` (`'auto' \| 'manual'`) | `{"status":"required","source":"auto"}` |
| `consent_form_error` | `status` (string), `error_code` (string, optional), `message` (string, optional) | `{"status":"unknown","error_code":"Timeout"}` |

## Errors & Diagnostics

| Event | Parameters | Example Payload |
| --- | --- | --- |
| `error_occurred` | `code` (string), `message` (string, optional), `screen` (string, optional), `context` (string, optional), `severity` (`'warning' \| 'error'`, optional) | `{"code":"ad_show_error","message":"Generic Ad Failure","screen":"HomeScreen","severity":"error"}` |

## Notes

- All string parameters are truncated to 100 characters before being sent.
- `app_backgrounded_during_game` emission is rate-limited to one event every five seconds.
- Use Firebase DebugView to validate payloads: `npx expo start --dev-client`, shake the device, and enable Analytics Debug mode.
