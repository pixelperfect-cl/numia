
import { read, utils } from 'xlsx';

export type BankProvider = 'bci';

export interface ParsedMovement {
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: 'income' | 'expense';
    originalDate: string; // Keeps original format for reference
    bankTransactionId: string; // Bank transaction code for deduplication
}

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));

const excelDateToJSDate = (serial: number): Date => {
    const dayMilliseconds = 86400000;
    return new Date(EXCEL_EPOCH.getTime() + serial * dayMilliseconds);
};

export const parseBankStatement = async (file: File, bank: BankProvider = 'bci'): Promise<ParsedMovement[]> => {
    switch (bank) {
        case 'bci':
            return parseBCIStatement(file);
        default:
            throw new Error(`Banco "${bank}" no soportado aún.`);
    }
};

const parseBCIStatement = async (file: File): Promise<ParsedMovement[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                const movements: ParsedMovement[] = [];

                // Detect Format
                let format: 'historical' | 'detailed' | 'unknown' = 'unknown';
                let headerRowIndex = -1;

                // Check for Detailed format (Header usually at row 0)
                if (jsonData.length > 0 && jsonData[0].includes('Fecha de transacción')) {
                    format = 'detailed';
                    headerRowIndex = 0;
                }
                // Check for Historical format (Header usually around row 17)
                else {
                    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                        const row = jsonData[i];
                        if (row && row.includes('Fecha') && row.includes('Descripción') && row.includes('Cheques y otros cargos')) {
                            format = 'historical';
                            headerRowIndex = i;
                            break;
                        }
                    }
                }

                if (format === 'unknown') {
                    throw new Error('Formato de archivo no reconocido. Asegúrate de usar una cartola válida de BCI.');
                }

                // Find transaction code column index dynamically
                const headerRow = jsonData[headerRowIndex];
                let txCodeColIndex = -1;
                if (headerRow) {
                    txCodeColIndex = headerRow.findIndex((h: any) => {
                        const headerStr = String(h).toLowerCase().trim();
                        return headerStr.includes('código de transacción') || headerStr.includes('codigo de transaccion');
                    });
                }

                const startRow = headerRowIndex + 1;

                for (let i = startRow; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    let dateStr = '';
                    let desc = '';
                    let amount = 0;
                    let type: 'income' | 'expense' = 'expense';
                    let originalDate = '';
                    let bankTransactionId = '';

                    // Extract transaction code if column was found
                    if (txCodeColIndex !== -1 && row[txCodeColIndex] != null) {
                        bankTransactionId = String(row[txCodeColIndex]).trim();
                    }

                    if (format === 'historical') {
                        // Historical Columns
                        const COL_DATE = 0;
                        const COL_DESC = 5;
                        const COL_EXPENSE = 9;
                        const COL_INCOME = 10;

                        dateStr = row[COL_DATE];
                        desc = row[COL_DESC];

                        if (!dateStr || typeof dateStr !== 'string' || !desc) continue;

                        const expenseRaw = row[COL_EXPENSE];
                        const incomeRaw = row[COL_INCOME];

                        const parseAmount = (val: any): number => {
                            if (typeof val === 'number') return val;
                            if (typeof val === 'string') {
                                return parseFloat(val.replace(/\./g, '').replace(',', '.'));
                            }
                            return 0;
                        };

                        const expenseVal = parseAmount(expenseRaw);
                        const incomeVal = parseAmount(incomeRaw);

                        if (incomeVal > 0) {
                            amount = incomeVal;
                            type = 'income';
                        } else if (expenseVal > 0) {
                            amount = expenseVal;
                            type = 'expense';
                        } else {
                            continue;
                        }

                        // Parse Date DD/MM/YYYY
                        const dateParts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                        if (dateParts) {
                            originalDate = dateStr;
                            dateStr = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
                        } else {
                            dateStr = new Date().toISOString().split('T')[0];
                        }
                    } else if (format === 'detailed') {
                        const rawDate = row[0];
                        desc = row[7];
                        const incomeVal = row[8];
                        const expenseVal = row[9];

                        const v1 = typeof incomeVal === 'number' ? incomeVal : 0;
                        const v2 = typeof expenseVal === 'number' ? expenseVal : 0;

                        // For date: Excel serial number
                        if (typeof rawDate === 'number') {
                            const jsDate = excelDateToJSDate(rawDate);
                            dateStr = jsDate.toISOString().split('T')[0];
                            originalDate = jsDate.toLocaleDateString('es-CL');
                        } else {
                            dateStr = String(rawDate);
                            originalDate = dateStr;
                        }

                        if (v1 > 0) {
                            amount = v1;
                            type = 'income';
                        } else {
                            if (v2 > 0) {
                                amount = v2;
                                type = 'expense';
                            } else {
                                continue;
                            }
                        }
                    }

                    movements.push({
                        date: dateStr,
                        description: String(desc).trim(),
                        amount: Math.abs(amount),
                        type,
                        originalDate,
                        bankTransactionId
                    });
                }
                resolve(movements);
            } catch (error) {
                console.error('Error parsing excel:', error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
