#!/usr/bin/env python3
"""
Post-processes the report.docx produced by pandoc:
  * fills the (empty) table-of-contents field with the chapter and section titles, so the
    contents are visible in any viewer before the field is updated, and
  * sets "update fields on open", so Microsoft Word refreshes the table of contents and adds
    page numbers when the document is opened.
Standard library only.  Usage:  python3 finalize_docx.py <report.docx>
"""
import html
import re
import sys
import zipfile
from pathlib import Path

from ooxml import PPR, RPR, SETTINGS, normalise

W_RIGHT_TAB = '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9016"/></w:tabs>'


def fail(msg: str) -> None:
    print(f"[report:finalize] ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def para_text(p_xml: str) -> str:
    return html.unescape("".join(re.findall(r"<w:t(?:\s[^>]*)?>([^<]*)</w:t>", p_xml)))


def build_toc(doc: str, instr: str) -> str:
    entries = []
    for m in re.finditer(r"<w:p>(?:(?!</w:p>).)*?<w:pStyle w:val=\"Heading([12])\"\s*/>(?:(?!</w:p>).)*</w:p>", doc, re.S):
        level, text = m.group(1), para_text(m.group(0)).strip()
        if text:
            entries.append((level, text))
    if not entries:
        fail("no Heading 1/2 paragraphs found for the table of contents")
    paras = []
    for i, (level, text) in enumerate(entries):
        runs = ""
        if i == 0:  # field start + instruction live in the first entry
            runs += (
                '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
                f'<w:r><w:instrText xml:space="preserve">{instr}</w:instrText></w:r>'
                '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
            )
        runs += f'<w:r><w:t xml:space="preserve">{html.escape(text, quote=False)}</w:t></w:r>'
        paras.append(f'<w:p><w:pPr><w:pStyle w:val="TOC{level}"/>{W_RIGHT_TAB}</w:pPr>{runs}</w:p>')
    paras.append('<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')
    return "".join(paras)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: finalize_docx.py <report.docx>")
    path = Path(sys.argv[1])
    with zipfile.ZipFile(path) as z:
        files = {n: z.read(n) for n in z.namelist() if not n.endswith("/")}  # drop folder entries

    doc = files["word/document.xml"].decode("utf-8")
    m = re.search(
        r'<w:p><w:r><w:fldChar w:fldCharType="begin"[^>]*/><w:instrText[^>]*>(TOC [^<]*)</w:instrText>'
        r'<w:fldChar w:fldCharType="separate"\s*/><w:fldChar w:fldCharType="end"\s*/></w:r></w:p>',
        doc,
    )
    if m:
        doc = doc[: m.start()] + build_toc(doc, m.group(1)) + doc[m.end():]
        files["word/document.xml"] = doc.encode("utf-8")
        print("[report:finalize] table of contents pre-filled")
    elif "TOC \\o" in doc:
        print("[report:finalize] table of contents already has content; left unchanged")
    else:
        fail("no table-of-contents field found (is toc: true set in metadata.yaml?)")

    # Paragraph/run properties in schema order (pandoc 2.9 writes list items with numPr before pStyle).
    doc = files["word/document.xml"].decode("utf-8")
    doc = normalise(doc, "pPr", PPR, dedupe=False)
    doc = normalise(doc, "rPr", RPR, dedupe=False)
    files["word/document.xml"] = doc.encode("utf-8")

    settings = files["word/settings.xml"].decode("utf-8")
    if "<w:updateFields" not in settings:
        settings = settings.replace("</w:settings>", '<w:updateFields w:val="true"/></w:settings>')
        print("[report:finalize] Word will update fields (page numbers in the contents) on open")
    files["word/settings.xml"] = normalise(settings, "settings", SETTINGS, dedupe=True)  # pandoc 2.9 writes proofState twice.encode("utf-8")

    # Declare the PNG content type once (pandoc 2.9 only adds per-file overrides).
    ct = files["[Content_Types].xml"].decode("utf-8")
    if 'Extension="png"' not in ct:
        ct = ct.replace("<Default ", '<Default Extension="png" ContentType="image/png"/><Default ', 1)
        files["[Content_Types].xml"] = ct.encode("utf-8")

    tmp = path.with_suffix(".tmp.docx")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for name in sorted(files, key=lambda n: (n != "[Content_Types].xml", n)):
            z.writestr(name, files[name])
    tmp.replace(path)


if __name__ == "__main__":
    main()
