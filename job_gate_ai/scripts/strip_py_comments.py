"""
Strip comments and docstrings from Python files in workspace.
Creates backups under `backups/` before writing changes.
Only writes the modified file if the stripped source compiles successfully.

Usage: run from workspace root: 
    python scripts/strip_py_comments.py

This script removes:
 - line comments starting with `#` (including shebangs)
 - docstrings (module, class, function level triple-quoted string literals)

CAUTION: Removing docstrings or other multiline string literals may alter program behavior.
"""

import ast
import io
import os
import sys
import shutil
import tokenize
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / "backups" / "py_originals"
EXCLUDE_DIRS = {"backups", "jobgate_env", "__pycache__", ".git"}


def find_py_files(root: Path):
    for p in root.rglob("*.py"):
        parts = set(p.parts)
        if parts & EXCLUDE_DIRS:
            continue
        # Skip files in the script folder itself to avoid editing the tool
        if p.resolve() == Path(__file__).resolve():
            continue
        yield p


def remove_docstrings(source: str):
    try:
        tree = ast.parse(source)
    except Exception:
        return source  # if parsing fails, return original

    docstring_spans = []  # list of (start_lineno, end_lineno)

    # Module docstring
    if tree.body and isinstance(tree.body[0], ast.Expr) and isinstance(getattr(tree.body[0], 'value', None), ast.Constant) and isinstance(tree.body[0].value.value, str):
        node = tree.body[0]
        if hasattr(node, 'lineno') and hasattr(node, 'end_lineno'):
            docstring_spans.append((node.lineno, node.end_lineno))

    # Function, AsyncFunction, Class docstrings
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.body:
            first = node.body[0]
            if isinstance(first, ast.Expr) and isinstance(getattr(first, 'value', None), ast.Constant) and isinstance(first.value.value, str):
                if hasattr(first, 'lineno') and hasattr(first, 'end_lineno'):
                    docstring_spans.append((first.lineno, first.end_lineno))

    if not docstring_spans:
        return source

    # Remove spans from source lines (process in reverse order so indices stay valid)
    lines = source.splitlines()
    for start, end in sorted(docstring_spans, reverse=True):
        # ast uses 1-based line numbers
        del lines[start - 1:end]

    return "\n".join(lines) + ("\n" if source.endswith("\n") else "")


def remove_comments_tokenize(source: str):
    # tokenize and remove COMMENT tokens
    try:
        bio = io.BytesIO(source.encode('utf-8'))
        tokens = list(tokenize.tokenize(bio.readline))
    except Exception:
        return source

    new_tokens = []
    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            # drop comment
            continue
        # drop encoding and endmarker handled by untokenize
        new_tokens.append((tok.type, tok.string))

    try:
        new_source = tokenize.untokenize(new_tokens)
        # tokenize.untokenize returns bytes in some versions, ensure str
        if isinstance(new_source, bytes):
            new_source = new_source.decode('utf-8')
        return new_source
    except Exception:
        return source


def process_file(path: Path):
    src = path.read_text(encoding='utf-8')
    no_doc = remove_docstrings(src)
    no_comments = remove_comments_tokenize(no_doc)

    # Normalize trailing newline to match original
    if src.endswith('\n') and not no_comments.endswith('\n'):
        no_comments += '\n'

    # Check syntax
    try:
        compile(no_comments, str(path), 'exec')
    except Exception as e:
        return False, f"syntax error after stripping: {e}"

    # Backup
    backup_path = BACKUP_DIR / path.relative_to(ROOT)
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup_path)

    # Write new content
    path.write_text(no_comments, encoding='utf-8')
    return True, "ok"


def main():
    print(f"Workspace root: {ROOT}")
    print(f"Backups will be stored under: {BACKUP_DIR}")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    files = list(find_py_files(ROOT))
    print(f"Found {len(files)} Python files to consider.")

    processed = 0
    modified = 0
    skipped = []

    for f in files:
        processed += 1
        ok, msg = process_file(f)
        if ok:
            modified += 1
            print(f"Modified: {f}")
        else:
            skipped.append((f, msg))
            print(f"Skipped (would break syntax): {f} -> {msg}")

    print("\nSummary:")
    print(f"  Files considered: {processed}")
    print(f"  Files modified:   {modified}")
    print(f"  Files skipped:    {len(skipped)}")
    if skipped:
        print("Skipped files details:")
        for p, reason in skipped:
            print(f" - {p}: {reason}")


if __name__ == '__main__':
    main()
