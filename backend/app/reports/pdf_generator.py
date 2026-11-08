import os
import datetime
from pathlib import Path
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)
from reportlab.pdfgen import canvas

from app.core.config import settings

class NumberedCanvas(canvas.Canvas):
    """Canvas that computes total pages and prints header/footer with page numbers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Top Header
        self.drawString(54, letter[1] - 36, "DFIR CaseVault | Digital Forensics & Incident Response Platform")
        self.setStrokeColor(colors.HexColor("#334155"))
        self.setLineWidth(0.5)
        self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Bottom Footer
        self.line(54, 45, letter[0] - 54, 45)
        self.drawString(
            54, 32,
            "DEMO ADVISORY: Generated for portfolio demonstration purposes. Independent forensic validation required."
        )
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_text)
        self.restoreState()


def generate_case_pdf_report(
    case_data: dict,
    evidence_list: list,
    custody_list: list,
    notes_list: list,
    timeline_events: list,
    report_type: str = "Full Investigation Report",
    output_dir: Optional[Path] = None
) -> Path:
    """
    Generates a structured, professional PDF forensic report using ReportLab.
    """
    if output_dir is None:
        output_dir = settings.storage_path / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    clean_case_id = case_data.get("case_id", "CASE").replace("-", "_")
    report_filename = f"DFIR_Report_{clean_case_id}_{timestamp_str}.pdf"
    pdf_path = output_dir / report_filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0f172a") # dark slate
    accent_color = colors.HexColor("#2563eb")  # blue
    text_color = colors.HexColor("#1e293b")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=accent_color,
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_color
    )
    mono_style = ParagraphStyle(
        'MonoStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=text_color
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # Title & Header
    story.append(Paragraph(f"FORENSIC INVESTIGATION REPORT", title_style))
    story.append(Paragraph(f"Report Type: <b>{report_type}</b> | Classification: TLP:AMBER (Forensic Evidence)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=12))

    # Case Overview Section
    story.append(Paragraph("1. Incident & Case Overview", heading_style))
    case_table_data = [
        [Paragraph("<b>Case ID:</b>", table_cell_bold), Paragraph(str(case_data.get('case_id', '')), table_cell_style),
         Paragraph("<b>Status:</b>", table_cell_bold), Paragraph(str(case_data.get('status', '')), table_cell_style)],
        [Paragraph("<b>Incident Title:</b>", table_cell_bold), Paragraph(str(case_data.get('title', '')), table_cell_style),
         Paragraph("<b>Priority:</b>", table_cell_bold), Paragraph(str(case_data.get('priority', '')), table_cell_style)],
        [Paragraph("<b>Incident Type:</b>", table_cell_bold), Paragraph(str(case_data.get('incident_type', '')), table_cell_style),
         Paragraph("<b>Lead Investigator:</b>", table_cell_bold), Paragraph(str(case_data.get('investigator', '')), table_cell_style)],
        [Paragraph("<b>Date of Incident:</b>", table_cell_bold), Paragraph(str(case_data.get('incident_date') or 'Unspecified'), table_cell_style),
         Paragraph("<b>Report Generated:</b>", table_cell_bold), Paragraph(datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"), table_cell_style)]
    ]
    case_table = Table(case_table_data, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
    case_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(case_table)
    story.append(Spacer(1, 10))

    # Case Description
    story.append(Paragraph("<b>Case Summary & Narrative:</b>", table_cell_bold))
    story.append(Paragraph(case_data.get('description', 'No narrative provided.'), body_style))
    story.append(Spacer(1, 12))

    # Evidence Inventory Section
    if report_type in ("Full Investigation Report", "Evidence Inventory", "Case Summary"):
        story.append(Paragraph("2. Digital Evidence Inventory & Integrity Hashes", heading_style))
        if evidence_list:
            ev_table_data = [
                [
                    Paragraph("<b>ID</b>", table_cell_bold),
                    Paragraph("<b>Filename / Source</b>", table_cell_bold),
                    Paragraph("<b>Size</b>", table_cell_bold),
                    Paragraph("<b>SHA-256 Hash</b>", table_cell_bold),
                    Paragraph("<b>Integrity Status</b>", table_cell_bold)
                ]
            ]
            for ev in evidence_list:
                size_kb = f"{ev.get('file_size', 0) / 1024:.1f} KB"
                ev_table_data.append([
                    Paragraph(str(ev.get("evidence_id", "")), table_cell_style),
                    Paragraph(f"<b>{ev.get('original_filename', '')}</b><br/><font color='#64748b'>{ev.get('collection_source', '')}</font>", table_cell_style),
                    Paragraph(size_kb, table_cell_style),
                    Paragraph(str(ev.get("sha256_hash", "")), mono_style),
                    Paragraph(str(ev.get("integrity_status", "Unverified")), table_cell_style)
                ])

            ev_table = Table(ev_table_data, colWidths=[0.8*inch, 1.8*inch, 0.7*inch, 2.7*inch, 1.0*inch])
            ev_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(ev_table)
        else:
            story.append(Paragraph("No evidence items currently logged for this case.", body_style))
        story.append(Spacer(1, 14))

    # Chain of Custody Section
    if report_type in ("Full Investigation Report", "Chain of Custody Report"):
        story.append(Paragraph("3. Chain of Custody Ledger", heading_style))
        if custody_list:
            coc_table_data = [
                [
                    Paragraph("<b>Timestamp (UTC)</b>", table_cell_bold),
                    Paragraph("<b>Action / Type</b>", table_cell_bold),
                    Paragraph("<b>Custodian</b>", table_cell_bold),
                    Paragraph("<b>Details & Hash Verification</b>", table_cell_bold)
                ]
            ]
            for c in custody_list:
                ts_str = str(c.get("timestamp", ""))[:19]
                hash_sub = str(c.get("sha256_hash", ""))
                if len(hash_sub) > 24:
                    hash_sub = f"{hash_sub[:16]}...{hash_sub[-8:]}"
                coc_table_data.append([
                    Paragraph(ts_str, table_cell_style),
                    Paragraph(f"<b>{c.get('event_type', '')}</b>", table_cell_style),
                    Paragraph(str(c.get('actor', '')), table_cell_style),
                    Paragraph(f"{c.get('description', '')}<br/><font color='#475569' face='Courier'>Hash: {hash_sub}</font>", table_cell_style)
                ])

            coc_table = Table(coc_table_data, colWidths=[1.3*inch, 1.4*inch, 1.5*inch, 2.8*inch])
            coc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(coc_table)
        else:
            story.append(Paragraph("No chain-of-custody transfer entries recorded.", body_style))
        story.append(Spacer(1, 14))

    # Investigation Timeline Section
    if report_type in ("Full Investigation Report", "Investigation Timeline"):
        story.append(Paragraph("4. Incident Reconstruction Timeline", heading_style))
        if timeline_events:
            tl_table_data = [
                [
                    Paragraph("<b>Timestamp (UTC)</b>", table_cell_bold),
                    Paragraph("<b>Event Type</b>", table_cell_bold),
                    Paragraph("<b>Source</b>", table_cell_bold),
                    Paragraph("<b>Event Description</b>", table_cell_bold)
                ]
            ]
            for ev in timeline_events[:25]:  # include up to 25 primary events
                ts_str = str(ev.get("timestamp", ""))[:19]
                tl_table_data.append([
                    Paragraph(ts_str, table_cell_style),
                    Paragraph(f"<b>{ev.get('event_type', '')}</b>", table_cell_style),
                    Paragraph(str(ev.get('source', '')), table_cell_style),
                    Paragraph(f"<b>{ev.get('title', '')}</b>: {ev.get('description', '')}", table_cell_style)
                ])

            tl_table = Table(tl_table_data, colWidths=[1.3*inch, 1.4*inch, 1.1*inch, 3.2*inch])
            tl_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(tl_table)
        else:
            story.append(Paragraph("No timeline entries registered.", body_style))
        story.append(Spacer(1, 14))

    # Investigation Notes Section
    if report_type in ("Full Investigation Report", "Case Summary") and notes_list:
        story.append(Paragraph("5. Investigator Notes & Observations", heading_style))
        for note in notes_list:
            created_str = str(note.get("created_at", ""))[:19]
            story.append(Paragraph(
                f"<b>{note.get('title', 'Note')}</b> &mdash; <i>{note.get('author', 'Investigator')} ({created_str})</i>",
                body_style
            ))
            story.append(Paragraph(note.get('content', ''), body_style))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 10))

    # Disclaimer Block
    disclaimer_text = (
        "<b>LEGAL & COMPLIANCE NOTICE:</b> This forensic report was automatically compiled by DFIR CaseVault "
        "for incident response tracking and cybersecurity portfolio demonstration. All cryptographic SHA-256 "
        "hashes reflect the byte state at time of verification. Chain of custody events conform to internal "
        "system auditing records and require independent verification for legal or judicial evidence presentation."
    )
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))
    story.append(Paragraph(disclaimer_text, ParagraphStyle('Disc', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b"))))

    # Build PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    return pdf_path
