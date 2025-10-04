export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          high_score: number;
          games_played: number;
          current_level: number;
          events_completed: number;
          is_admin: boolean;
          created_at?: string;
          updated_at?: string;
          xp_total: number;
          title_key: string;
          parties_per_day: number;
        };
        Insert: {
          id: string;
          display_name: string;
          high_score?: number;
          games_played?: number;
          current_level?: number;
          events_completed?: number;
          is_admin?: boolean;
          xp_total?: number;
          title_key?: string;
          parties_per_day?: number;
        };
        Update: {
          id?: string;
          display_name?: string;
          high_score?: number;
          games_played?: number;
          current_level?: number;
          events_completed?: number;
          is_admin?: boolean;
          xp_total?: number;
          title_key?: string;
          parties_per_day?: number;
        };
      };
      runs: {
        Row: {
          id: string;
          user_id: string;
          mode: 'classic' | 'date';
          points: number;
          created_at?: string;
          updated_at?: string;
          xp_earned?: number | null;
          old_xp?: number | null;
          new_xp?: number | null;
          rank_key?: string | null;
          rank_label?: string | null;
          parties_per_day?: number | null;
          leveled_up?: boolean | null;
          economy_applied_at?: string | null;
          metadata?: Record<string, unknown> | null;
          processed_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: 'classic' | 'date';
          points: number;
          created_at?: string;
          updated_at?: string;
          xp_earned?: number | null;
          old_xp?: number | null;
          new_xp?: number | null;
          rank_key?: string | null;
          rank_label?: string | null;
          parties_per_day?: number | null;
          leveled_up?: boolean | null;
          economy_applied_at?: string | null;
          metadata?: Record<string, unknown> | null;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: 'classic' | 'date';
          points?: number;
          created_at?: string;
          updated_at?: string;
          xp_earned?: number | null;
          old_xp?: number | null;
          new_xp?: number | null;
          rank_key?: string | null;
          rank_label?: string | null;
          parties_per_day?: number | null;
          leveled_up?: boolean | null;
          economy_applied_at?: string | null;
          metadata?: Record<string, unknown> | null;
          processed_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
