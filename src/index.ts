#!/usr/bin/env node
/**
 * @frankxai/suno-mcp-server — Music Superpowers MCP
 * Phase 1: Prompt Strategy Engine (stdio)
 *
 * Env (optional, Phase 6 generation):
 *   SUNO_API_KEY — not used in Phase 1
 *   HEARTMULA_PATH — not used in Phase 1
 */
import { startStdioServer } from "./server.js";

startStdioServer().catch((err) => {
  console.error("[music-mcp] fatal:", err);
  process.exit(1);
});
