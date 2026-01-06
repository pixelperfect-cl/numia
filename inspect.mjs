
import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'd:/AI/Proyects/numia/cartolaExcel.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find row with "Fecha"
    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
        if (data[i] && data[i].some(cell => typeof cell === 'string' && cell.toLowerCase().includes('fecha'))) {
            headerRowIndex = i;
            break;
        }
    }

    const output = {
        headerRowIndex,
        headers: headerRowIndex !== -1 ? data[headerRowIndex] : "Not Found",
        firstDataRow: headerRowIndex !== -1 ? data[headerRowIndex + 1] : "Not Found"
    };

    fs.writeFileSync('headers.json', JSON.stringify(output, null, 2));
    console.log('Found headers at index:', headerRowIndex);
} catch (error) {
    console.error(error);
}
