const { mdToPdf } = require('md-to-pdf');
const path = require('path');

async function generatePDF() {
  const inputFile = path.join(__dirname, 'ARCHITECTURE_COMPACT.md');
  const outputFile = path.join(__dirname, 'ARCHITECTURE_COMPACT.pdf');

  console.log('Generating PDF from:', inputFile);
  console.log('Output file:', outputFile);

  try {
    const pdf = await mdToPdf(
      { path: inputFile },
      {
        dest: outputFile,
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm',
          },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 9px; margin: 0 auto;">Bloom Academia - Comprehensive Architecture Overview</div>',
          footerTemplate: '<div style="font-size: 9px; margin: 0 auto;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        },
        launch_options: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      }
    );

    console.log('✅ PDF generated successfully!');
    console.log('📄 File location:', outputFile);
    return outputFile;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

generatePDF()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
