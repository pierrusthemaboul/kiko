export interface Database {
    public: {
      Tables: {
        profiles: {
          Row: {
            id: string
            display_name: string
            high_score: number
            games_played: number
            current_level: number
            events_completed: number
            is_admin: boolean
            created_at?: string
            updated_at?: string
          }
          Insert: {
            id: string
            display_name: string
            high_score?: number
            games_played?: number
            current_level?: number
            events_completed?: number
            is_admin?: boolean
          }
          Update: {
            id?: string
            display_name?: string
            high_score?: number
            games_played?: number
            current_level?: number
            events_completed?: number
            is_admin?: boolean
          }
        }
      }
    }
  }