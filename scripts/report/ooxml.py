"""
Helpers that keep WordprocessingML valid: child elements of <w:pPr>, <w:rPr>, <w:style> and
<w:settings> must appear in the order defined by the Office Open XML schema. Pandoc 2.9 and our
own style edits can produce them out of order; normalise() fixes that (and removes duplicate
properties, keeping the first one). Standard library only.
"""
import re

PPR = (
    "pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs "
    "suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd "
    "snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment "
    "textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange"
).split()
RPR = (
    "rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid vanish "
    "webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang "
    "eastAsianLayout specVanish oMath rPrChange"
).split()
STYLE = (
    "name aliases basedOn next link autoRedefine hidden uiPriority semiHidden unhideWhenUsed qFormat locked personal "
    "personalCompose personalReply rsid pPr rPr tblPr trPr tcPr tblStylePr"
).split()
TBLPR = (
    "tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd "
    "tblBorders shd tblLayout tblCellMar tblLook tblCaption tblDescription"
).split()
SETTINGS = (
    "writeProtection view zoom removePersonalInformation removeDateAndTime doNotDisplayPageBoundaries "
    "displayBackgroundShape printPostScriptOverText printFractionalCharacterWidth printFormsData embedTrueTypeFonts "
    "embedSystemFonts saveSubsetFonts saveFormsData mirrorMargins alignBordersAndEdges bordersDoNotSurroundHeader "
    "bordersDoNotSurroundFooter gutterAtTop hideSpellingErrors hideGrammaticalErrors activeWritingStyle proofState "
    "formsDesign attachedTemplate linkStyles stylePaneFormatFilter stylePaneSortMethod documentType mailMerge "
    "revisionView trackRevisions doNotTrackMoves doNotTrackFormatting documentProtection autoFormatOverride "
    "styleLockTheme styleLockQFSet defaultTabStop autoHyphenation consecutiveHyphenLimit hyphenationZone "
    "doNotHyphenateCaps showEnvelope summaryLength clickAndTypeStyle defaultTableStyle evenAndOddHeaders "
    "bookFoldRevPrinting bookFoldPrinting bookFoldPrintingSheets drawingGridHorizontalSpacing "
    "drawingGridVerticalSpacing displayHorizontalDrawingGridEvery displayVerticalDrawingGridEvery "
    "doNotUseMarginsForDrawingGridOrigin drawingGridHorizontalOrigin drawingGridVerticalOrigin doNotShadeFormData "
    "noPunctuationKerning characterSpacingControl printTwoOnOne strictFirstAndLastChars noLineBreaksAfter "
    "noLineBreaksBefore savePreviewPicture doNotValidateAgainstSchema saveInvalidXml ignoreMixedContent "
    "alwaysShowPlaceholderText doNotDemarcateInvalidXml saveXmlDataOnly useXSLTWhenSaving saveThroughXslt "
    "showXMLTags alwaysMergeEmptyNamespace updateFields hdrShapeDefaults footnotePr endnotePr compat docVars rsids "
    "mathPr attachedSchema themeFontLang clrSchemeMapping doNotIncludeSubdocsInStats doNotAutoCompressPictures "
    "forceUpgrade captions readModeInkLockDown smartTagType schemaLibrary shapeDefaults doNotEmbedSmartTags "
    "decimalSymbol listSeparator"
).split()

# Elements that may legally appear more than once and must never be de-duplicated.
REPEATABLE = {"activeWritingStyle", "attachedSchema", "smartTagType", "tblStylePr"}

TAG = re.compile(r"<(/?)([\w:]+)(?:\s[^<>]*?)?(/?)>")


def children(inner: str):
    """Split XML content into its top-level child elements (text between them is dropped)."""
    out, depth, start = [], 0, None
    for m in TAG.finditer(inner):
        closing, _name, selfclose = m.group(1), m.group(2), m.group(3)
        if m.group(0).startswith("<?") or m.group(0).startswith("<!"):
            continue
        if not closing:
            if depth == 0:
                start = m.start()
            if selfclose:
                if depth == 0:
                    out.append(inner[start : m.end()])
            else:
                depth += 1
        else:
            depth -= 1
            if depth == 0:
                out.append(inner[start : m.end()])
    return out


def local(el: str) -> str:
    return TAG.match(el).group(2).split(":")[-1]


def reorder(inner: str, order, dedupe: bool) -> str:
    rank = {n: i for i, n in enumerate(order)}
    kids = children(inner)
    seen, kept = set(), []
    for k in kids:
        name = local(k)
        if dedupe and name in seen and name not in REPEATABLE:
            continue
        seen.add(name)
        kept.append(k)
    kept.sort(key=lambda k: rank.get(local(k), len(order)))  # stable: unknown elements keep their place at the end
    return "".join(kept)


def normalise(xml: str, element: str, order, dedupe: bool) -> str:
    """Reorder the children of every <w:element>...</w:element> (non-nested) in xml."""
    pattern = re.compile(rf"(<w:{element}\b[^>]*?(?<!/)>)(.*?)(</w:{element}>)", re.S)
    return pattern.sub(lambda m: m.group(1) + reorder(m.group(2), order, dedupe) + m.group(3), xml)
