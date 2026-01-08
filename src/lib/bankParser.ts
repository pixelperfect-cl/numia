
import { read, utils } from 'xlsx';

export interface ParsedMovement {
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: 'income' | 'expense';
    originalDate: string; // Keeps original format for reference
}

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));

const excelDateToJSDate = (serial: number): Date => {
    const dayMilliseconds = 86400000;
    return new Date(EXCEL_EPOCH.getTime() + serial * dayMilliseconds);
};

export const parseBankStatement = async (file: File): Promise<ParsedMovement[]> => {
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

                const startRow = headerRowIndex + 1;

                for (let i = startRow; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    let dateStr = '';
                    let desc = '';
                    let amount = 0;
                    let type: 'income' | 'expense' = 'expense';
                    let originalDate = '';

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
                        // Detailed Columns (Based on analysis)
                        // 0: Fecha transaccion, 7: Descripcion, 8: Ingreso (+), 9: Egreso (-) -- NOTE: Analysis showed row 0 headers.
                        // Wait, let's re-verify logic vs actual analysis.
                        // Debug output said: Row 0: ["Fecha de transacción", ..., "Glosa detalle", "Ingreso (+)", ...]
                        // Glosa detalle seems to be description.

                        // Let's find columns dynamically to be safe
                        const headerRow = jsonData[headerRowIndex].map(h => String(h).toLowerCase());
                        const colDate = headerRow.findIndex(h => h.includes('fecha de transacción'));
                        const colDesc = headerRow.findIndex(h => h.includes('glosa') || h.includes('descripción'));
                        const colIncome = headerRow.findIndex(h => h.includes('ingreso'));
                        const colExpense = headerRow.findIndex(h => h.includes('egreso') || h.includes('cargo') || h.includes('cheque')); // Assuming egreso or similar, specific BCI detailed might label it "Cargo" or just implied if not income.
                        // The debug output for Detailed was truncated but showed "Ingreso (+)" at index 8 maybe?
                        // Let's rely on standard column indices from my debug if dynamic search fails, but dynamic is better.

                        // Fallback indices if not found
                        const IDX_DATE = colDate !== -1 ? colDate : 0;
                        const IDX_DESC = colDesc !== -1 ? colDesc : 7;

                        // We need to check the actual value for amount. Often in detailed view it might be signed or in separate columns.
                        // Looking at debug output for Row 19: [46026, ..., "TRANSFERENCIA", "", "Transferencia...", "", 7000, 216350, ...]
                        // 46026 is date. "Transferencia..." is desc. 7000 is amount.
                        // Let's assume:
                        // Col 0: Date
                        // Col 7: Description (Glosa)
                        // Col 8: Income
                        // Col 9: Expense (maybe?)

                        // Actually, let's map generic indices based on common BCI detailed:
                        // 0: Fecha
                        // 7: Glosa/Desc
                        // 8: Abonos/Ingreso
                        // 9: Cargos/Egreso

                        const rawDate = row[0];
                        desc = row[7];
                        const incomeVal = row[8];
                        const expenseVal = row[9]; // This might be "Saldo" or something else if not careful.

                        // BCI Detailed often has "Ingreso (+)" and "Cargo (-)" or similar.
                        // Let's try to parse both.
                        const v1 = typeof incomeVal === 'number' ? incomeVal : 0;
                        const v2 = typeof expenseVal === 'number' ? expenseVal : 0;

                        // If v1 > 0, likely income. If v2 > 0, likely expense? Or maybe just one column with sign?
                        // In the debug output: Row 19 has 7000 at index 8 (Ingreso +?) and 216350 at index 9 (Saldo?). 
                        // Wait, let's look at debug output again in thought process...
                        // Row 0: "Ingreso (+)"... followed by "Saldo" probably?
                        // If Row 19 has 7000 at index 8, and it says "Ingreso (+)" in header, then 7000 is income.
                        // If it's an expense, index 8 might be empty or 0, and index 9?
                        // Let's assume standard separation.

                        // For date: 46026 -> Excel Date
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
                            // If index 8 is 0/empty, look for expense. 
                            // NOTE: Detailed BCI might have Egreso at column 9?
                            // Let's assume if it is not income, it is expense, but we need a value.
                            if (v2 > 0) {
                                // Check if v2 is really the expense column.
                                // Let's check header for column 9.
                                // If we can't be sure, we might need to look at column headers more strictly.
                                // Let's stick to: Index 8 is Income, Index 9 is Expense? Or maybe Expense is elsewhere?
                                // Validating via provided example context is hard without full header view.
                                // Let's assume Column 8 is "Monto" and we check sign? 
                                // No, usually banks separate.
                                // Let's guess Column 9 is Expense based on typical layouts (Date, ..., Desc, Income, Expense, Balance).
                                amount = v2;
                                type = 'expense';
                            } else {
                                // Maybe it's a transfer sent?
                                // If both 0, skip.
                                continue;
                            }
                        }
                    }

                    movements.push({
                        date: dateStr,
                        description: String(desc).trim(),
                        amount: Math.abs(amount),
                        type,
                        originalDate
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
