import asyncio
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "aigx-export" / "aigx_export.py"
spec = importlib.util.spec_from_file_location("aigx_export", MODULE_PATH)
aigx_export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aigx_export)


def valid_document():
    return {
        "title": "AIGX Brain",
        "metadata": {"version": "test", "stable": True},
        "sections": [
            {
                "title": "Phase 7: ATLAS",
                "blocks": [
                    {"kind": "paragraph", "text": "Atlas content is explicit."},
                    {"kind": "list", "items": ["one", "two"]},
                ],
            }
        ],
    }


class AigxExportTests(unittest.TestCase):
    def test_object_title_fails_before_serialization(self):
        doc = valid_document()
        doc["sections"][0]["title"] = {"text": "Phase 7: ATLAS"}
        with self.assertRaisesRegex(aigx_export.AigxExportError, r"document\.sections\[0\]\.title"):
            aigx_export.render_markdown_document(doc)

    def test_object_block_fails_before_serialization(self):
        doc = valid_document()
        doc["sections"][0]["blocks"].append({"foo": "bar"})
        with self.assertRaisesRegex(aigx_export.AigxExportError, r"blocks\[2\]\.kind"):
            aigx_export.render_markdown_document(doc)

    def test_array_of_objects_does_not_join_to_object_object(self):
        doc = valid_document()
        doc["sections"][0]["blocks"][1]["items"] = [{"label": "A"}]
        with self.assertRaisesRegex(aigx_export.AigxExportError, r"items\[0\]"):
            aigx_export.render_markdown_document(doc)

    def test_awaitable_block_fails(self):
        async def later():
            return "not rendered"

        doc = valid_document()
        coro = later()
        doc["sections"][0]["blocks"].append(coro)
        try:
            with self.assertRaisesRegex(aigx_export.AigxExportError, r"blocks\[2\]"):
                aigx_export.render_markdown_document(doc)
        finally:
            coro.close()

    def test_valid_document_serializes_cleanly(self):
        output = aigx_export.render_markdown_document(valid_document())
        self.assertIn("## Phase 7: ATLAS", output)
        self.assertNotIn("[object Object]", output)
        self.assertNotIn("[object Promise]", output)
        self.assertNotIn("undefined", output)

    def test_xml_escaping_works(self):
        doc = valid_document()
        doc["title"] = "A&B <Brain> \"Prime\""
        doc["sections"][0]["blocks"][0]["text"] = "Use & < > safely."
        output = aigx_export.render_aigx_document(doc)
        self.assertIn('title="A&amp;B &lt;Brain&gt; &quot;Prime&quot;"', output)
        self.assertIn("Use &amp; &lt; &gt; safely.", output)
        self.assertTrue(output.rstrip().endswith("</aigx-document>"))

    def test_markdown_code_fences_close(self):
        doc = valid_document()
        doc["sections"][0]["blocks"].append({"kind": "code", "language": "ts", "code": "const x = 1;"})
        output = aigx_export.render_markdown_document(doc)
        self.assertEqual(sum(1 for line in output.splitlines() if line.startswith("```")), 2)

    def test_corrupted_fixture_is_blocked(self):
        fixture = ROOT / "fixtures" / "corrupted" / "aigx-brain-object-object-truncated.txt"
        text = fixture.read_text(encoding="utf-8")
        with self.assertRaisesRegex(aigx_export.AigxExportError, r"AIGX_EXPORT_CORRUPT_OUTPUT"):
            aigx_export.guard_handoff_payload(text, "markdown")

    def test_atomic_write_readback_checksum(self):
        output, result = aigx_export.export_document(valid_document(), "aigx")
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "brain.aigx"
            write_result = aigx_export.atomic_write_export(str(path), output, "aigx")
            self.assertEqual(result["sha256"], write_result["sha256"])
            self.assertEqual(output, path.read_text(encoding="utf-8"))

    def test_cli_writes_deterministic_export(self):
        with tempfile.TemporaryDirectory() as d:
            model = Path(d) / "model.json"
            out = Path(d) / "brain.md"
            model.write_text(json.dumps(valid_document()), encoding="utf-8")
            output, result = aigx_export.export_document(valid_document(), "markdown", str(out))
            output2, result2 = aigx_export.export_document(valid_document(), "markdown")
            self.assertEqual(output, output2)
            self.assertEqual(result["sha256"], result2["sha256"])
            self.assertEqual(out.read_text(encoding="utf-8"), output)


if __name__ == "__main__":
    unittest.main()
