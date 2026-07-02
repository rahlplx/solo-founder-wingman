## 2025-05-14 - Initial Performance Baseline
**Learning:** The "Surface" lag (process startup and script execution) is the dominant performance bottleneck for the Claude Code adapter. While `evaluate()` is fast (~0.01ms), spawning the Node.js process costs ~56ms. The Stop Hook adds another ~78ms.
**Action:** Prioritize reducing startup overhead and process spawns over micro-optimizing the regex matching logic, although matching should still be optimized for scalability.
## 2025-05-14 - Optimized Policy Engine Results
**Learning:** Adding a keyword fast-path to the regex matching logic significantly improves throughput for warm starts (~2.8x faster). Pre-loading a smaller `policy-rules.json` and using `jq` in shell scripts also reduced "surface" overhead.
**Action:** Always include simple string checks before complex regexes in performance-sensitive paths. Use `jq` over `node -e` in shell scripts for a ~4x speed boost in parsing.
## 2025-05-14 - Final Performance Verification
**Learning:** Tailored optimizations for each layer (Surface, Mid, Core) yielded significant gains. The Stop Hook saw the biggest improvement (~5.5x) by avoiding Node.js for simple string checks. The Policy Engine became ~3x faster for warm starts by implementing a keyword fast-path.
**Action:** Use this hybrid "tailored" pattern for future agents. Surface-level lag is often more about process management than raw computation.

**Final Metrics:**
- **Mid-Layer (Policy Engine evaluate())**: 0.0033ms (Warm) | 0.0111ms (Cold)
- **Surface (Claude Code Hook Startup)**: 44.07ms (Baseline was 56.24ms)
- **Surface (Stop Hook Overhead)**: 13.68ms (Baseline was 77.96ms)
