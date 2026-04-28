import jsPDF from 'jspdf';

/**
 * Export Q&A history as a styled PDF
 */
export function exportQAasPDF(history, filename = 'document') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();   // 210
  const PH = doc.internal.pageSize.getHeight();  // 297
  const M  = 18; // margin
  const CW = PW - M * 2; // content width

  const addPage = () => {
    doc.addPage();
    return M + 10;
  };

  const checkY = (y, needed = 20) => {
    if (y + needed > PH - 20) return addPage();
    return y;
  };

  // ── Header bar ──
  doc.setFillColor(8, 8, 20);
  doc.rect(0, 0, PW, 28, 'F');

  // Gradient-ish title (jsPDF doesn't support true gradients, use layered text)
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('VSAIMS', M, 13);

  doc.setTextColor(225, 225, 255);
  doc.setFontSize(14);
  doc.text(' AI Assistant', M + 28, 13);

  doc.setTextColor(120, 120, 200);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Powered by VSAIMS LABS · Refining AI for human work', M, 21);

  // ── Meta info ──
  let y = 38;
  doc.setDrawColor(60, 60, 100);
  doc.setLineWidth(0.3);
  doc.line(M, y - 3, PW - M, y - 3);

  doc.setTextColor(100, 100, 140);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`📄 Document: ${filename}`, M, y);
  y += 6;
  doc.text(`🕐 Exported: ${new Date().toLocaleString()}`, M, y);
  y += 6;
  doc.text(`💬 Questions answered: ${history.length}`, M, y);
  y += 8;

  doc.setDrawColor(80, 80, 120);
  doc.line(M, y, PW - M, y);
  y += 8;

  // ── Q&A pairs ──
  history.forEach((item, i) => {
    y = checkY(y, 30);

    // Question badge
    doc.setFillColor(30, 30, 60);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);

    const qLines  = doc.splitTextToSize(`Q${i + 1}:  ${item.question}`, CW - 10);
    const qHeight = qLines.length * 5.5 + 8;
    doc.roundedRect(M, y, CW, qHeight, 3, 3, 'FD');

    doc.setTextColor(180, 180, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(qLines, M + 5, y + 6);
    y += qHeight + 4;

    // Answer
    y = checkY(y, 15);
    const cleanAnswer = (item.answer || '')
      .replace(/#{1,6}\s/g, '')   // strip headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // strip bold
      .replace(/\*(.*?)\*/g, '$1')     // strip italic
      .replace(/`(.*?)`/g, '$1')       // strip code
      .replace(/^\s*[-•]\s/gm, '  • ') // bullets
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const aLines = doc.splitTextToSize(cleanAnswer, CW - 4);
    doc.setTextColor(210, 210, 230);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');

    aLines.forEach(line => {
      y = checkY(y);
      doc.text(line, M + 2, y);
      y += 5.2;
    });

    y += 5;

    // Divider
    if (i < history.length - 1) {
      y = checkY(y);
      doc.setDrawColor(50, 50, 80);
      doc.setLineWidth(0.2);
      doc.line(M, y, PW - M, y);
      y += 7;
    }
  });

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(8, 8, 20);
    doc.rect(0, PH - 12, PW, 12, 'F');
    doc.setTextColor(80, 80, 120);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('VSAIMS AI Assistant  |  vsaimslabs.com', M, PH - 5);
    doc.text(`Page ${p} / ${pages}`, PW - M, PH - 5, { align: 'right' });
  }

  const safeFilename = filename.replace(/\.pdf$/i, '').replace(/[^a-z0-9_-]/gi, '_');
  doc.save(`vsaims-qa-${safeFilename}-${new Date().toISOString().split('T')[0]}.pdf`);
}
