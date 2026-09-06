import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzegkeupgxwtolifwckx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6ZWdrZXVwZ3h3dG9saWZ3Y2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTgzMDgsImV4cCI6MjEwMzkzNDMwOH0.CHwshHSS2_TApktTyEbFOmkl12FBe-5zOlpKs4Ao-No'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)