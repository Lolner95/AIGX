#!/usr/bin/env python3
"""aigx-export - safe reference serializer for AIGX documents.

The exporter deliberately separates:
  1. input document model (dict/list/scalars),
  2. renderable block model (discriminated `kind` blocks),
  3. final string output.

It rejects arbitrary object coercion before rendering, validates the final output before write, writes
atomically, and verifies disk readback by SHA-256.
"""

import argparse
import hashlib
import inspect
import json
import math
import os
import re
import sys
import tempfile
from datetime import date, datetime

CORRUPTION_RE = re.compile(
    r"\[object (?:Object|Promise)\]|"
    r"Invalid Date|NaN|</undefined>|<undefined\b|"
    r"\bundefined\b",
    re.IGNORECASE,
)
SUPPORTED_BLOCKS = {"paragraph", "heading", "list", "code", "xml", "table"}


class AigxExportError(ValueError):
    """Raised when an export model or rendered output is unsafe."""


def fail(path, expected, value):
    typename = type(value).__name__
    if isinstance(value, dict):
        detail = "{" + ", ".join(sorted(str(k) for k in value.keys())[:8]) + "}"
    elif isinstance(value, list):
        detail = f"list(len={len(value)})"
    else:
        detail = repr(value)
    raise AigxExportError(
        f"AIGX_EXPORT_INVALID_RENDER_VALUE at {path}: expected {expected}, got {typename} {detail}"
    )


def assert_string(value, path, allow_empty=True):
    if not isinstance(value, str):
        fail(path, "string", value)
    if not allow_empty and not value.strip():
        fail(path, "non-empty string", value)
    return value


def assert_list(value, path):
    if not isinstance(value, list):
        fail(path, "list", value)
    return value


def assert_dict(value, path):
    if not isinstance(value, dict):
        fail(path, "object", value)
    return value


def assert_export_safe(value, path="$", seen=None):
    """Recursively reject values that would stringify unsafely in render sinks."""
    if seen is None:
        seen = set()
    if id(value) in seen:
        fail(path, "acyclic render value", value)

    if value is None:
        fail(path, "explicit string/block value, not null", value)
    if inspect.isawaitable(value):
        fail(path, "resolved value, not awaitable/Promise", value)
    if callable(value):
        fail(path, "data value, not function", value)
    if isinstance(value, (bytes, bytearray)):
        fail(path, "text string, not bytes", value)
    if isinstance(value, float) and not math.isfinite(value):
        fail(path, "finite number", value)
    if isinstance(value, (str, int, bool, float, datetime, date)):
        return
    if isinstance(value, list):
        seen.add(id(value))
        for i, item in enumerate(value):
            assert_export_safe(item, f"{path}[{i}]", seen)
        seen.remove(id(value))
        return
    if isinstance(value, dict):
        seen.add(id(value))
        for key, item in value.items():
            if not isinstance(key, str):
                fail(f"{path}.<key>", "string key", key)
            assert_export_safe(item, f"{path}.{key}", seen)
        seen.remove(id(value))
        return
    fail(path, "string | finite number | boolean | date | list | object", value)


def escape_xml_text(text):
    text = assert_string(text, "xml_text")
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def escape_xml_attr(text):
    return (
        escape_xml_text(text)
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def render_scalar(value, path):
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float) and math.isfinite(value):
        return repr(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    fail(path, "safe scalar", value)


def render_metadata(meta, fmt, path="metadata"):
    if meta is None:
        return ""
    meta = assert_dict(meta, path)
    lines = []
    for key in sorted(meta):
        value = meta[key]
        if isinstance(value, (dict, list)):
            fail(f"{path}.{key}", "safe scalar metadata value", value)
        rendered = render_scalar(value, f"{path}.{key}")
        if fmt == "markdown":
            lines.append(f"- **{key}:** {rendered}")
        else:
            lines.append(f'  <meta key="{escape_xml_attr(key)}">{escape_xml_text(rendered)}</meta>')
    if not lines:
        return ""
    if fmt == "markdown":
        return "## Metadata\n\n" + "\n".join(lines) + "\n"
    return "\n".join(lines) + "\n"


def render_title(title, path):
    return assert_string(title, path, allow_empty=False)


def render_block(block, fmt, path):
    block = assert_dict(block, path)
    kind = assert_string(block.get("kind"), f"{path}.kind", allow_empty=False)
    if kind not in SUPPORTED_BLOCKS:
        fail(f"{path}.kind", f"one of {sorted(SUPPORTED_BLOCKS)}", kind)
    if kind == "paragraph":
        text = assert_string(block.get("text"), f"{path}.text")
        return escape_xml_text(text) if fmt == "aigx" else text
    if kind == "heading":
        level = block.get("level")
        if not isinstance(level, int) or level < 1 or level > 6:
            fail(f"{path}.level", "integer heading level 1..6", level)
        text = render_title(block.get("text"), f"{path}.text")
        return f"<h{level}>{escape_xml_text(text)}</h{level}>" if fmt == "aigx" else f"{'#' * level} {text}"
    if kind == "list":
        items = assert_list(block.get("items"), f"{path}.items")
        rendered = [assert_string(item, f"{path}.items[{i}]", allow_empty=False) for i, item in enumerate(items)]
        if fmt == "aigx":
            return "<list>" + "".join(f"<item>{escape_xml_text(item)}</item>" for item in rendered) + "</list>"
        return "\n".join(f"- {item}" for item in rendered)
    if kind == "code":
        code = assert_string(block.get("code"), f"{path}.code")
        lang = block.get("language", "")
        lang = assert_string(lang, f"{path}.language") if lang is not None else ""
        if fmt == "aigx":
            return f'<code language="{escape_xml_attr(lang)}">{escape_xml_text(code)}</code>'
        return f"```{lang}\n{code}\n```"
    if kind == "xml":
        xml = assert_string(block.get("xml"), f"{path}.xml", allow_empty=False)
        return xml
    if kind == "table":
        headers = [assert_string(h, f"{path}.headers[{i}]", allow_empty=False)
                   for i, h in enumerate(assert_list(block.get("headers"), f"{path}.headers"))]
        rows = assert_list(block.get("rows"), f"{path}.rows")
        rendered_rows = []
        for ri, row in enumerate(rows):
            cells = [assert_string(c, f"{path}.rows[{ri}][{ci}]")
                     for ci, c in enumerate(assert_list(row, f"{path}.rows[{ri}]"))]
            if len(cells) != len(headers):
                fail(f"{path}.rows[{ri}]", f"{len(headers)} cells", row)
            rendered_rows.append(cells)
        if fmt == "aigx":
            head = "".join(f"<cell>{escape_xml_text(h)}</cell>" for h in headers)
            body = "".join(
                "<row>" + "".join(f"<cell>{escape_xml_text(c)}</cell>" for c in row) + "</row>"
                for row in rendered_rows
            )
            return f"<table><header>{head}</header>{body}</table>"
        return "\n".join([
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join("---" for _ in headers) + " |",
            *("| " + " | ".join(row) + " |" for row in rendered_rows),
        ])
    fail(f"{path}.kind", "supported block kind", kind)


def render_blocks(blocks, fmt, path):
    blocks = assert_list(blocks, path)
    return "\n\n".join(render_block(block, fmt, f"{path}[{i}]") for i, block in enumerate(blocks))


def render_section(section, fmt, path):
    section = assert_dict(section, path)
    title = render_title(section.get("title"), f"{path}.title")
    blocks = render_blocks(section.get("blocks", []), fmt, f"{path}.blocks")
    children = assert_list(section.get("children", []), f"{path}.children")
    rendered_children = [render_section(child, fmt, f"{path}.children[{i}]") for i, child in enumerate(children)]
    if fmt == "aigx":
        body = blocks + ("\n" if blocks and rendered_children else "") + "\n".join(rendered_children)
        return f'<section title="{escape_xml_attr(title)}">\n{body}\n</section>'
    parts = [f"## {title}"]
    if blocks:
        parts.append(blocks)
    parts.extend(rendered_children)
    return "\n\n".join(parts)


def render_aigx_document(document):
    document = assert_dict(document, "document")
    assert_export_safe(document, "document")
    title = render_title(document.get("title"), "document.title")
    sections = assert_list(document.get("sections"), "document.sections")
    meta = render_metadata(document.get("metadata", {}), "aigx", "document.metadata")
    rendered_sections = "\n".join(render_section(s, "aigx", f"document.sections[{i}]") for i, s in enumerate(sections))
    output = (
        f'<aigx-document title="{escape_xml_attr(title)}">\n'
        f"{meta}"
        f"{rendered_sections}\n"
        f"</aigx-document>\n"
    )
    validate_export_output(output, "aigx")
    return output


def render_markdown_document(document):
    document = assert_dict(document, "document")
    assert_export_safe(document, "document")
    title = render_title(document.get("title"), "document.title")
    sections = assert_list(document.get("sections"), "document.sections")
    parts = [f"# {title}"]
    meta = render_metadata(document.get("metadata", {}), "markdown", "document.metadata")
    if meta:
        parts.append(meta.rstrip())
    parts.extend(render_section(s, "markdown", f"document.sections[{i}]") for i, s in enumerate(sections))
    output = "\n\n".join(parts) + "\n"
    validate_export_output(output, "markdown")
    return output


def validate_export_output(output, fmt):
    assert_string(output, "output", allow_empty=False)
    match = CORRUPTION_RE.search(output)
    if match:
        raise AigxExportError(f"AIGX_EXPORT_CORRUPT_OUTPUT at byte {match.start()}: {match.group(0)}")
    if fmt == "aigx":
        if not output.lstrip().startswith("<aigx-document"):
            raise AigxExportError("Invalid AIGX export: missing <aigx-document> root")
        if not output.rstrip().endswith("</aigx-document>"):
            raise AigxExportError("Invalid AIGX export: missing closing </aigx-document> root")
        if output.count("<section ") != output.count("</section>"):
            raise AigxExportError("Invalid AIGX export: unbalanced <section> tags")
    if fmt == "markdown":
        fence_count = sum(1 for line in output.splitlines() if line.startswith("```"))
        if fence_count % 2:
            raise AigxExportError("Invalid Markdown export: unbalanced fenced code block")


def sha256_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def atomic_write_export(path, output, fmt):
    validate_export_output(output, fmt)
    directory = os.path.abspath(os.path.dirname(path) or ".")
    os.makedirs(directory, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".aigx-export-", suffix=".tmp", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(output)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        with open(path, encoding="utf-8", newline="") as f:
            readback = f.read()
        expected = sha256_text(output)
        actual = sha256_text(readback)
        if readback != output or actual != expected:
            raise AigxExportError(
                f"AIGX_EXPORT_READBACK_MISMATCH: expected sha256 {expected}, got {actual}"
            )
        return {"path": path, "bytes": len(output.encode("utf-8")), "sha256": actual}
    except Exception:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        finally:
            raise


def export_document(document, fmt, output_path=None):
    if fmt == "aigx":
        output = render_aigx_document(document)
    elif fmt == "markdown":
        output = render_markdown_document(document)
    else:
        raise AigxExportError(f"Unsupported export format: {fmt}")
    result = {"format": fmt, "bytes": len(output.encode("utf-8")), "sha256": sha256_text(output)}
    if output_path:
        result.update(atomic_write_export(output_path, output, fmt))
    return output, result


def guard_handoff_payload(output, fmt):
    validate_export_output(output, fmt)
    return {"bytes": len(output.encode("utf-8")), "sha256": sha256_text(output)}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Safely render an AIGX export model.")
    parser.add_argument("input", help="JSON document model")
    parser.add_argument("--format", choices=("aigx", "markdown"), default="aigx")
    parser.add_argument("--output", help="output file path; omitted prints to stdout")
    args = parser.parse_args(argv)
    with open(args.input, encoding="utf-8") as f:
        document = json.load(f)
    output, result = export_document(document, args.format, args.output)
    if args.output:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AigxExportError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
