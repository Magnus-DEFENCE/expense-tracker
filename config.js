// Supabase project credentials
// NOTE: The publishable/anon key is safe to expose in frontend code.
// NEVER put the secret key here.

const SUPABASE_URL = "https://ueskjwqfzdvtttudbcxq.supabase.co";
const SUPABASE_KEY = "sb_publishable_VeGeIv41VOClMGjcbPfI7Q_ZMbpPq6T";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
