
import { read, utils } from 'xlsx';

export interface ParsedMovement {
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: 'income' | 'expense';
    originalDate: string; // Keeps original format for reference
}

export const parseBankStatement = async (file: File): Promise<ParsedMovement[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json(sheet, { header: 1 });

                // Header Row Index is 17 (0-based) -> Data starts at 18
                const DATA_START_ROW = 18;

                // Column Indices
                const COL_DATE = 0;
                const COL_DESC = 5;
                const COL_EXPENSE = 9; // Cheques y otros cargos
                const COL_INCOME = 10; // Depósitos y Abono

                const movements: ParsedMovement[] = [];

                for (let i = DATA_START_ROW; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];

                    if (!row || row.length === 0) continue;

                    // Safely access columns
                    const dateStr = row[COL_DATE];
                    const desc = row[COL_DESC];
                    const expenseRaw = row[COL_EXPENSE];
                    const incomeRaw = row[COL_INCOME];

                    // Skip empty rows or summary rows that don't have a date
                    if (!dateStr || typeof dateStr !== 'string' || !desc) continue;

                    // Parse Amount
                    let amount = 0;
                    let type: 'income' | 'expense' = 'expense';

                    const parseAmount = (val: any): number => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                            // Remove dots (thousands separator) using regex to replace ALL dots
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
                        // Skip transactions with 0 amount
                        continue;
                    }

                    // Parse Date (DD/MM/YYYY -> YYYY-MM-DD)
                    // Simple regex check for DD/MM/YYYY
                    const dateParts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    let formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today

                    if (dateParts) {
                        formattedDate = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
                    }

                    movements.push({
                        date: formattedDate,
                        description: String(desc).trim(),
                        amount,
                        type,
                        originalDate: dateStr
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
