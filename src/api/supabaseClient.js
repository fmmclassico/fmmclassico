import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://kptlejtauwqvaapsrjfx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdGxlanRhdXdxdmFhcHNyamZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDcxNzQsImV4cCI6MjA5Nzc4MzE3NH0.ghtyNablJiYmFUboLPzup48oT-byQV7tqHIjPndCW8k'
)
