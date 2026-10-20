"""Write a readable markdown list of the curated, San Francisco and weird comparison items.

Usage: python export_readable.py <comparisons.json> <out.md>
"""
import json
import sys

lib = json.load(open(sys.argv[1], encoding="utf-8"))
rows = [r for r in lib if r["theme"] in ("sf", "weird") or r["reviewed"]]
rows.sort(key=lambda r: (r["theme"], r["kind"], r["name"]))
lines = ["# Comparison library: San Francisco, weird and curated items", "",
         f"{len(rows)} of {len(lib)} items shown. 'read' means the source text was read; 'snippet' means only a search result.", "",
         "| Theme | Kind | Item | Value | Source | Reliability |", "|---|---|---|---|---|---|"]
for r in rows:
    rel = "read" if r["reviewed"] else "snippet / unreviewed"
    src = f"[{r['source_label']}]({r['source_url']})" if r["source_url"] else r["source_label"]
    note = f" ({r['note']})" if r["note"] else ""
    lines.append(f"| {r['theme']} | {r['kind']} | {r['name']} | {r['display']} | {src} | {rel}{note} |")
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(lines) + "\n")
print(len(rows), "rows written")
