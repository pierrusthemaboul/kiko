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
          current_streak: number;
          best_streak: number;
          last_play_date: string | null;
          last_reroll_date: string | null;
          reroll_count: number;
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
          current_streak?: number;
          best_streak?: number;
          last_play_date?: string | null;
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
          current_streak?: number;
          best_streak?: number;
          last_play_date?: string | null;
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
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_key: string;
          achievement_type: string;
          unlocked_at: string;
          xp_bonus: number;
          metadata: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_key: string;
          achievement_type: string;
          unlocked_at?: string;
          xp_bonus?: number;
          metadata?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_key?: string;
          achievement_type?: string;
          unlocked_at?: string;
          xp_bonus?: number;
          metadata?: any;
        };
      };
      daily_quests: {
        Row: {
          id: string;
          quest_key: string;
          quest_type: string;
          title: string;
          description: string;
          target_value: number;
          xp_reward: number;
          parts_reward: number | null;
          difficulty: number;
          category: string;
          is_active: boolean;
          created_at?: string;
        };
        Insert: {
          id?: string;
          quest_key: string;
          quest_type: string;
          title: string;
          description: string;
          target_value: number;
          xp_reward?: number;
          parts_reward?: number | null;
          difficulty?: number;
          category?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          quest_key?: string;
          quest_type?: string;
          title?: string;
          description?: string;
          target_value?: number;
          xp_reward?: number;
          parts_reward?: number | null;
          difficulty?: number;
          category?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      quest_progress: {
        Row: {
          id: string;
          user_id: string;
          quest_key: string;
          current_value: number;
          completed: boolean;
          claimed: boolean;
          completed_at: string | null;
          reset_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_key: string;
          current_value?: number;
          completed?: boolean;
          claimed?: boolean;
          completed_at?: string | null;
          reset_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quest_key?: string;
          current_value?: number;
          completed?: boolean;
          claimed?: boolean;
          completed_at?: string | null;
          reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_key: string;
          unlocked_at: string;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_key: string;
          unlocked_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_key?: string;
          unlocked_at?: string;
          created_at?: string;
        };
      };
      game_scores: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          score: number;
          mode: string;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          score: number;
          mode: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          score?: number;
          mode?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}