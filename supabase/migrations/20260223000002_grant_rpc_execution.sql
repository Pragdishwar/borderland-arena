-- Grant RPC permission explicitly to anon players
GRANT EXECUTE ON FUNCTION trigger_atmospheric_breach(UUID) TO anon, authenticated;
