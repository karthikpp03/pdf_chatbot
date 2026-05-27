"""
Hybrid chunking strategy:
  - Pipe/tab/multi-space delimited rows  → one chunk per row
  - Everything else                      → RecursiveCharacterTextSplitter
"""

import re
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter


def structured_chunking(text: str) -> List[str]:
    chunks: List[str]         = []
    non_table_lines: List[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            non_table_lines.append("")
            continue
        if _is_table_row(stripped):
            row_chunk = _format_row_chunk(stripped)
            if row_chunk:
                chunks.append(row_chunk)
        else:
            non_table_lines.append(stripped)

    remaining_text = "\n".join(non_table_lines).strip()
    if remaining_text:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size    = 400,
            chunk_overlap = 60,
            separators    = ["\n\n", "\n", ". ", " ", ""],
        )
        semantic = [
            c.strip()
            for c in splitter.split_text(remaining_text)
            if len(c.strip()) > 40
        ]
        chunks.extend(semantic)

    return list(dict.fromkeys(chunks))   # deduplicate, preserve order


def _is_table_row(line: str) -> bool:
    if line.count("|") >= 2:
        parts = [p.strip() for p in line.split("|") if p.strip()]
        if len(parts) >= 3:
            return True
    if "\t" in line:
        parts = [p.strip() for p in line.split("\t") if p.strip()]
        if len(parts) >= 3:
            return True
    parts = re.split(r"  +", line)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) >= 3:
        return True
    return False


def _format_row_chunk(line: str) -> str:
    if "|" in line:
        fields = [p.strip() for p in line.split("|") if p.strip()]
    elif "\t" in line:
        fields = [p.strip() for p in line.split("\t") if p.strip()]
    else:
        fields = [p.strip() for p in re.split(r"  +", line) if p.strip()]

    if len(fields) < 2:
        return ""
    return " | ".join(fields)


def clean_text(text: str) -> str:
    import re as _re
    return _re.sub(r"\s+", " ", text).strip()
