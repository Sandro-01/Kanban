/**
 * Genera un PDF dal contenuto di un'email usando pdfkit
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface EmailPdfOptions {
  from: string;
  to?: string;
  cc?: string;
  date?: string;
  subject: string;
  body: string; // HTML email body (verrà convertito in testo)
}

/**
 * Converte HTML in testo leggibile per il PDF
 */
function htmlToText(html: string): string {
  let text = html;

  // Rimuovi style e script
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Converti tag in newline
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '  • ');
  text = text.replace(/<hr[^>]*>/gi, '\n────────────────────────────────\n');

  // Rimuovi tutti gli altri tag
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Pulisci righe vuote multiple
  text = text.replace(/\n{4,}/g, '\n\n\n');
  // Rimuovi spazi a fine riga
  text = text.replace(/[ \t]+$/gm, '');

  return text.trim();
}

/**
 * Genera un file PDF con il contenuto dell'email e ritorna il path
 */
export async function generateEmailPdf(
  options: EmailPdfOptions,
  ticketId: string
): Promise<{ filePath: string; fileName: string; fileSize: number }> {
  const uploadDir = path.join(__dirname, '../../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `email-originale-${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Email: ${options.subject}`,
        Author: options.from,
        Subject: options.subject,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header blu
    doc
      .rect(0, 0, doc.page.width, 80)
      .fill('#2563eb');

    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text('EMAIL ORIGINALE', 50, 20, { align: 'left' })
      .fontSize(14)
      .text(options.subject, 50, 38, { width: doc.page.width - 100 });

    // Metadata email
    doc.moveDown(0.5);
    const metaY = 95;
    doc.fillColor('#374151').fontSize(9);

    let currentY = metaY;
    doc.font('Helvetica-Bold').text('Da:', 50, currentY, { continued: true })
      .font('Helvetica').text(`  ${options.from}`);
    currentY += 16;

    if (options.to) {
      doc.font('Helvetica-Bold').text('A:', 50, currentY, { continued: true })
        .font('Helvetica').text(`  ${options.to}`);
      currentY += 16;
    }

    if (options.cc) {
      doc.font('Helvetica-Bold').text('Cc:', 50, currentY, { continued: true })
        .font('Helvetica').text(`  ${options.cc}`);
      currentY += 16;
    }

    if (options.date) {
      doc.font('Helvetica-Bold').text('Data:', 50, currentY, { continued: true })
        .font('Helvetica').text(`  ${options.date}`);
      currentY += 16;
    }

    doc.font('Helvetica-Bold').text('Oggetto:', 50, currentY, { continued: true })
      .font('Helvetica').text(`  ${options.subject}`);
    currentY += 20;

    // Linea separatrice
    doc
      .moveTo(50, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor('#d1d5db')
      .stroke();

    currentY += 15;

    // Corpo email convertito in testo
    const bodyText = htmlToText(options.body);
    doc
      .fillColor('#111827')
      .fontSize(10)
      .font('Helvetica')
      .text(bodyText, 50, currentY, {
        width: doc.page.width - 100,
        lineGap: 3,
      });

    // Footer
    doc
      .fontSize(7)
      .fillColor('#9ca3af')
      .text(
        `Generato automaticamente dal sistema Kanban - ${new Date().toLocaleString('it-IT')}`,
        50,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 100 }
      );

    doc.end();

    stream.on('finish', () => {
      const stats = fs.statSync(filePath);
      resolve({ filePath: fileName, fileName: 'Email-originale.pdf', fileSize: stats.size });
    });

    stream.on('error', reject);
  });
}
