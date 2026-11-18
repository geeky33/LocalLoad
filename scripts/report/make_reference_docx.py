#!/usr/bin/env python3
"""
Builds docs/report/reference.docx: the Word style template pandoc uses for report.docx.

It starts from pandoc's own default reference.docx and applies report conventions:
  * A4 page, 1-inch (1440 twip) margins, centred page number in the footer
  * Times New Roman 12 pt, justified body text with 1.5 line spacing
  * black headings; every chapter (Heading 1) and the table of contents start on a new page
  * cover page: larger centred title, subtitle, author lines and date
  * tables with full single-line borders
Only the Python standard library is used.  Usage:  python3 make_reference_docx.py <out.docx>
"""
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from ooxml import PPR, RPR, STYLE, TBLPR, normalise

FONT = "Times New Roman"
FONT_XML = f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}" w:eastAsia="{FONT}" w:cs="{FONT}"/>'


def fail(msg: str) -> None:
    print(f"[report:reference] ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def style_block(styles: str, style_id: str):
    m = re.search(rf'<w:style\b[^>]*w:styleId="{style_id}"[^>]*>.*?</w:style>', styles, re.S)
    return m


def edit_style(styles: str, style_id: str, ppr_add: str = "", rpr_add: str = "", replace_color: bool = False) -> str:
    m = style_block(styles, style_id)
    if not m:
        return styles
    block = m.group(0)
    if ppr_add:
        if "<w:pPr>" in block:
            block = block.replace("<w:pPr>", "<w:pPr>" + ppr_add, 1)
        elif "<w:pPr/>" in block:
            block = block.replace("<w:pPr/>", f"<w:pPr>{ppr_add}</w:pPr>", 1)
        else:
            block = re.sub(r"(<w:rPr>|<w:rPr/>|</w:style>)", lambda x: f"<w:pPr>{ppr_add}</w:pPr>" + x.group(1), block, count=1)
    if replace_color:
        block = re.sub(r'<w:color\b[^>]*/>', '<w:color w:val="000000"/>', block)
    if rpr_add:
        # remove properties we are about to set, then add them
        for tag in re.findall(r"<w:(\w+)\b", rpr_add):
            block = re.sub(rf"<w:{tag}\b[^>]*/>", "", block)
        if "<w:rPr>" in block:
            block = block.replace("<w:rPr>", "<w:rPr>" + rpr_add, 1)
        else:
            block = block.replace("</w:style>", f"<w:rPr>{rpr_add}</w:rPr></w:style>", 1)
    return styles[: m.start()] + block + styles[m.end():]


def ensure_style(styles: str, style_id: str, xml: str) -> str:
    if style_block(styles, style_id):
        return styles
    return styles.replace("</w:styles>", xml + "</w:styles>")


def patch_styles(styles: str) -> str:
    # 1. Fonts: every theme font becomes Times New Roman; explicit monospace fonts (code) are kept.
    styles = re.sub(r"<w:rFonts\b[^>]*Theme[^>]*/>", FONT_XML, styles)
    # 2. Default size 12 pt
    styles = re.sub(r"(<w:rPrDefault>.*?)<w:sz\b[^>]*/>", r'\1<w:sz w:val="24"/>', styles, count=1, flags=re.S)
    # 3. Body text: justified, 1.5 lines, 6 pt after
    body_ppr = '<w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/>'
    for sid in ("BodyText", "FirstParagraph"):
        m = style_block(styles, sid)
        if m:
            block = re.sub(r"<w:spacing\b[^>]*/>", "", m.group(0))
            block = re.sub(r"<w:jc\b[^>]*/>", "", block)
            styles = styles[: m.start()] + block + styles[m.end():]
            styles = edit_style(styles, sid, ppr_add=body_ppr)
    # 4. Headings: black, with space before and after; chapters start on a new page
    for level in range(1, 10):
        m = style_block(styles, f"Heading{level}")
        if m:
            styles = styles[: m.start()] + re.sub(r"<w:spacing\b[^>]*/>", "", m.group(0)) + styles[m.end():]
        before, after = ("0", "360") if level == 1 else ("360", "120")
        styles = edit_style(styles, f"Heading{level}", ppr_add=f'<w:spacing w:before="{before}" w:after="{after}"/>', replace_color=True)
    styles = edit_style(styles, "Heading1", ppr_add="<w:pageBreakBefore/>", rpr_add='<w:sz w:val="32"/><w:szCs w:val="32"/>')
    styles = edit_style(styles, "Heading2", rpr_add='<w:sz w:val="28"/><w:szCs w:val="28"/>')
    styles = edit_style(styles, "Heading3", rpr_add='<w:sz w:val="26"/><w:szCs w:val="26"/>')
    # 5. Cover page
    styles = edit_style(styles, "Title", ppr_add='<w:spacing w:before="2400" w:after="240"/><w:jc w:val="center"/>', rpr_add='<w:b/><w:sz w:val="56"/><w:szCs w:val="56"/>', replace_color=True)
    styles = edit_style(styles, "Subtitle", ppr_add='<w:spacing w:after="960"/><w:jc w:val="center"/>', rpr_add='<w:sz w:val="28"/><w:szCs w:val="28"/>', replace_color=True)
    styles = edit_style(styles, "Author", ppr_add='<w:spacing w:before="0" w:after="60"/><w:jc w:val="center"/>', rpr_add='<w:sz w:val="26"/><w:szCs w:val="26"/>')
    styles = edit_style(styles, "Date", ppr_add='<w:spacing w:before="480" w:after="480"/><w:jc w:val="center"/>')
    styles = edit_style(styles, "Abstract", ppr_add='<w:jc w:val="center"/>', rpr_add='<w:b/><w:sz w:val="26"/><w:szCs w:val="26"/>')
    # 6. Table of contents heading on its own page
    styles = ensure_style(
        styles,
        "TOCHeading",
        '<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Heading1"/>'
        '<w:next w:val="BodyText"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:qFormat/>'
        '<w:pPr><w:outlineLvl w:val="9"/></w:pPr></w:style>',
    )
    styles = edit_style(styles, "TOCHeading", ppr_add="<w:pageBreakBefore/>", replace_color=True)
    for level, indent, bold in (("1", "0", "<w:b/>"), ("2", "440", "")):
        styles = ensure_style(
            styles,
            f"TOC{level}",
            f'<w:style w:type="paragraph" w:styleId="TOC{level}"><w:name w:val="toc {level}"/><w:basedOn w:val="Normal"/>'
            f'<w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>'
            f'<w:pPr><w:spacing w:before="{"120" if level == "1" else "0"}" w:after="60"/><w:ind w:left="{indent}"/></w:pPr>'
            f'<w:rPr>{bold}</w:rPr></w:style>',
        )
    # 7. Captions centred and italic
    for sid in ("ImageCaption", "TableCaption", "Caption"):
        styles = edit_style(styles, sid, ppr_add='<w:jc w:val="center"/>', rpr_add="<w:i/>")
    # 8. Tables: full grid
    borders = (
        "<w:tblBorders>"
        + "".join(f'<w:{side} w:val="single" w:sz="4" w:space="0" w:color="808080"/>' for side in ("top", "left", "bottom", "right", "insideH", "insideV"))
        + "</w:tblBorders>"
    )
    m = style_block(styles, "Table")
    if m and "<w:tblBorders>" not in m.group(0):
        block = m.group(0)
        if "<w:tblPr>" in block:
            block = block.replace("<w:tblPr>", "<w:tblPr>" + borders, 1)
        else:
            block = block.replace("</w:style>", f"<w:tblPr>{borders}</w:tblPr></w:style>", 1)
        block = re.sub(r'<w:(top|bottom) w:w="0" w:type="dxa"\s*/>', r'<w:\1 w:w="40" w:type="dxa"/>', block)  # cell padding
        styles = styles[: m.start()] + block + styles[m.end():]
    # Table cells and tight lists use "Compact": single spacing, left aligned.
    m = style_block(styles, "Compact")
    if m:
        styles = styles[: m.start()] + re.sub(r"<w:(spacing|jc)\b[^>]*/>", "", m.group(0)) + styles[m.end():]
    styles = edit_style(styles, "Compact", ppr_add='<w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>')
    # Code: 9 pt monospace on a light background (pandoc uses an existing SourceCode style as is).
    styles = ensure_style(
        styles,
        "SourceCode",
        '<w:style w:type="paragraph" w:customStyle="1" w:styleId="SourceCode"><w:name w:val="Source Code"/>'
        '<w:basedOn w:val="Normal"/><w:link w:val="VerbatimChar"/>'
        '<w:pPr><w:wordWrap w:val="off"/><w:shd w:val="clear" w:color="auto" w:fill="F4F4F4"/>'
        '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>',
    )
    styles = edit_style(styles, "VerbatimChar", rpr_add='<w:sz w:val="18"/><w:szCs w:val="18"/>')  # code tokens use this style
    # 9. Put every property in schema order and drop duplicates (our additions come first and win).
    styles = normalise(styles, "pPr", PPR, dedupe=True)
    styles = normalise(styles, "rPr", RPR, dedupe=True)
    styles = normalise(styles, "tblPr", TBLPR, dedupe=True)
    styles = normalise(styles, "style", STYLE, dedupe=False)
    return styles


FOOTER_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    "<w:r><w:t>1</w:t></w:r>"
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    "</w:p></w:ftr>"
)
SECT_PR = (
    '<w:sectPr><w:footerReference w:type="default" r:id="rIdLocalLoadFooter"/>'
    '<w:pgSz w:w="11906" w:h="16838"/>'
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
    "</w:sectPr>"
)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: make_reference_docx.py <output.docx>")
    out = Path(sys.argv[1])
    with tempfile.TemporaryDirectory() as tmp:
        default = Path(tmp) / "default.docx"
        try:
            subprocess.run(["pandoc", "-o", str(default), "--print-default-data-file", "reference.docx"], check=True)
        except (OSError, subprocess.CalledProcessError) as e:
            fail(f"could not get pandoc's default reference.docx ({e}). Is pandoc installed?")

        with zipfile.ZipFile(default) as zin:
            files = {name: zin.read(name) for name in zin.namelist() if not name.endswith("/")}

    styles = files["word/styles.xml"].decode("utf-8")
    files["word/styles.xml"] = patch_styles(styles).encode("utf-8")

    doc = files["word/document.xml"].decode("utf-8")
    if "xmlns:r=" not in doc:
        doc = doc.replace("<w:document ", '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ', 1)
    doc, n = re.subn(r"<w:sectPr\b.*?</w:sectPr>|<w:sectPr\b[^>]*/>", SECT_PR, doc, flags=re.S)
    if n == 0:
        doc = doc.replace("</w:body>", SECT_PR + "</w:body>")
    files["word/document.xml"] = doc.encode("utf-8")

    files["word/footer1.xml"] = FOOTER_XML.encode("utf-8")
    rels = files["word/_rels/document.xml.rels"].decode("utf-8")
    if "rIdLocalLoadFooter" not in rels:
        rels = rels.replace(
            "</Relationships>",
            '<Relationship Id="rIdLocalLoadFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
        )
    files["word/_rels/document.xml.rels"] = rels.encode("utf-8")
    ct = files["[Content_Types].xml"].decode("utf-8")
    if "/word/footer1.xml" not in ct:
        ct = ct.replace(
            "</Types>",
            '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
        )
    files["[Content_Types].xml"] = ct.encode("utf-8")

    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        # [Content_Types].xml first, as Word expects
        for name in sorted(files, key=lambda n: (n != "[Content_Types].xml", n)):
            zout.writestr(name, files[name])
    print(f"[report:reference] wrote {out}")


if __name__ == "__main__":
    main()
