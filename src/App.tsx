import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download, Calculator, TrendingUp, TrendingDown, DollarSign, Sun, Moon, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import IsoLevelWarp from '@/components/ui/isometric-wave-grid-background';

interface Transaction {
    id: string;
    date: string;
    particulars: string;
    debit: string;
    credit: string;
    overrideDrCr?: 'Dr' | 'Cr' | null;
}

interface AccountDetails {
    name: string;
    email: string;
    phone: string;
}

interface LedgerRow {
    date: string;
    particulars: string;
    debit: number;
    credit: number;
    balance: number;
    drCr: 'Dr' | 'Cr';
}

const LedgerAutomationApp = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [accountDetails, setAccountDetails] = useState<AccountDetails>({
        name: '',
        email: '',
        phone: '',
    });

    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [selectedCalculation, setSelectedCalculation] = useState<string>('closingBalance');
    const [calculationResult, setCalculationResult] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const addTransaction = () => {
        setTransactions([
            ...transactions,
            { id: Date.now().toString(), date: '', particulars: '', debit: '', credit: '', overrideDrCr: null },
        ]);
    };

    const removeTransaction = (id: string) => {
        setTransactions(transactions.filter((t) => t.id !== id));
    };

    const updateTransaction = (id: string, field: keyof Transaction, value: any) => {
        setTransactions(
            transactions.map((t) => (t.id === id ? { ...t, [field]: value } : t))
        );
    };

    const updateAccountDetails = (field: keyof AccountDetails, value: string) => {
        setAccountDetails({ ...accountDetails, [field]: value });
    };

    const { totalDebit, totalCredit, closingBalance, ledgerRows } = useMemo(() => {
        let runningBalance = 0;
        let debitSum = 0;
        let creditSum = 0;

        const rows: LedgerRow[] = transactions.map((t) => {
            const debit = parseFloat(t.debit) || 0;
            const credit = parseFloat(t.credit) || 0;
            debitSum += debit;
            creditSum += credit;
            runningBalance = runningBalance - debit + credit;

            return {
                date: t.date,
                particulars: t.particulars,
                debit,
                credit,
                balance: Math.abs(runningBalance),
                drCr: t.overrideDrCr || (runningBalance >= 0 ? 'Cr' : 'Dr'),
            };
        });

        return {
            totalDebit: debitSum,
            totalCredit: creditSum,
            closingBalance: runningBalance,
            ledgerRows: rows,
        };
    }, [transactions]);

    const runCalculation = () => {
        let result = '';
        const avgDebit = transactions.length > 0 ? totalDebit / transactions.length : 0;
        const avgCredit = transactions.length > 0 ? totalCredit / transactions.length : 0;

        switch (selectedCalculation) {
            case 'closingBalance':
                result = `₹${closingBalance.toFixed(2)} ${closingBalance >= 0 ? 'Cr' : 'Dr'}`;
                break;
            case 'totalDebit':
                result = `₹${totalDebit.toFixed(2)}`;
                break;
            case 'totalCredit':
                result = `₹${totalCredit.toFixed(2)}`;
                break;
            case 'netCashFlow':
                result = `₹${(totalCredit - totalDebit).toFixed(2)}`;
                break;
            case 'avgDebit':
                result = `₹${avgDebit.toFixed(2)}`;
                break;
            case 'avgCredit':
                result = `₹${avgCredit.toFixed(2)}`;
                break;
        }
        setCalculationResult(result);
    };

    const exportToExcel = async () => {
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Ledger');

            const cleanName = (accountDetails.name || 'Account').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const fileName = `Ledger_${cleanName}.xlsx`;

            // Column widths
            ws.columns = [
                { width: 18 }, // Date
                { width: 28 }, // Particulars
                { width: 14 }, // Debit Rs
                { width: 8 },  // Debit P
                { width: 14 }, // Credit Rs
                { width: 8 },  // Credit P
                { width: 8 },  // Dr/Cr
                { width: 16 }, // Balance
            ];

            // ----- ROW 1: Title -----
            const titleRow = ws.addRow(['LEDGER ACCOUNT', '', '', '', '', '', '', '']);
            ws.mergeCells('A1:H1');
            titleRow.getCell(1).style = {
                alignment: { horizontal: 'center', vertical: 'middle' },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } },
                font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' },
            } as any;
            titleRow.height = 24;

            // ----- ROW 2: Account Info -----
            const infoRow = ws.addRow([
                `A/c of: ${accountDetails.name || ''}`,
                `Email: ${accountDetails.email || 'N/A'}`,
                '',
                '',
                `Phone: ${accountDetails.phone || 'N/A'}`,
                '', '', ''
            ]);
            infoRow.font = { name: 'Calibri', size: 11 };

            // ----- ROW 3: Blank -----
            ws.addRow([]);

            // ----- ROW 4: Column Headers -----
            const headerRow = ws.addRow([
                'Date', 'Particulars', 'Debit (₹)', 'Debit', 'Credit (₹)', 'Credit', 'Dr/Cr', 'Balance'
            ]);
            const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
            const headerFont: any = { bold: true, name: 'Calibri', size: 11 };
            const headerBorder: any = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            headerRow.eachCell((cell) => {
                cell.fill = headerFill;
                cell.font = headerFont;
                cell.border = headerBorder;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            headerRow.height = 18;

            // ----- DATA ROWS -----
            const dataBorder: any = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            transactions.forEach((t, index) => {
                const rowData = ledgerRows[index] || { drCr: 'Cr', balance: 0 };
                const debit = parseFloat(t.debit) || 0;
                const credit = parseFloat(t.credit) || 0;
                const dataRow = ws.addRow([
                    t.date || '',
                    t.particulars || '',
                    Math.floor(debit) || 0,
                    debit > 0 ? Math.round((debit % 1) * 100) : 0,
                    Math.floor(credit) || 0,
                    credit > 0 ? Math.round((credit % 1) * 100) : 0,
                    rowData.drCr,
                    parseFloat(rowData.balance.toFixed(2))
                ]);
                dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    cell.border = dataBorder;
                    cell.font = { name: 'Calibri', size: 11 };
                    if (colNum === 2) {
                        cell.alignment = { horizontal: 'center' };
                    } else if (colNum >= 3) {
                        cell.alignment = { horizontal: 'right' };
                    }
                });
            });

            // ----- SUMMARY SECTION -----
            ws.addRow([]);
            const summaryLabelStyle: any = {
                font: { bold: true, name: 'Calibri', size: 11 },
                border: dataBorder
            };
            const summaryValueStyle: any = {
                font: { name: 'Calibri', size: 11 },
                border: dataBorder,
                alignment: { horizontal: 'right' }
            };

            const summaryTitleRow = ws.addRow(['', 'SUMMARY', '', '', '', '', '', '']);
            summaryTitleRow.getCell(2).style = summaryLabelStyle;

            const debitRow = ws.addRow(['', 'Total Debit', '', '', totalDebit, '', '', '']);
            debitRow.getCell(2).style = summaryLabelStyle;
            debitRow.getCell(5).style = summaryValueStyle;
            debitRow.getCell(5).numFmt = '#,##0.00';

            const creditRow = ws.addRow(['', 'Total Credit', '', '', totalCredit, '', '', '']);
            creditRow.getCell(2).style = summaryLabelStyle;
            creditRow.getCell(5).style = summaryValueStyle;
            creditRow.getCell(5).numFmt = '#,##0.00';

            const balanceRow = ws.addRow(['', 'Closing Balance', '', '', Math.abs(closingBalance), closingBalance >= 0 ? 'Cr' : 'Dr', '', '']);
            balanceRow.getCell(2).style = { ...summaryLabelStyle, font: { bold: true, color: { argb: 'FF1F3864' }, name: 'Calibri', size: 11 } };
            balanceRow.getCell(5).style = summaryValueStyle;
            balanceRow.getCell(5).numFmt = '#,##0.00';
            balanceRow.getCell(6).font = { bold: true, name: 'Calibri', size: 11 };

            // ----- FOOTER -----
            ws.addRow([]);
            const footerRow = ws.addRow(['Generated by Ledger Pro', new Date().toLocaleString()]);
            footerRow.font = { italic: true, color: { argb: 'FF888888' }, name: 'Calibri', size: 10 };

            // ----- GENERATE & SAVE -----
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            if ('showSaveFilePicker' in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'Excel Spreadsheet (.xlsx)', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: any) {
            if (error?.name !== 'AbortError') {
                console.error('Excel Export Error:', error);
                alert(`Export failed: ${error}`);
            }
        }
    };

    const getExportData = () => {
        const wsData: any[][] = [];
        wsData.push(['LEDGER ACCOUNT']);
        wsData.push([
            `A/c of: ${accountDetails.name || 'Ledger'}`,
            `Email: ${accountDetails.email || 'N/A'}`,
            `Phone: ${accountDetails.phone || 'N/A'}`,
        ]);
        wsData.push([]);
        wsData.push(['Date', 'Particulars', 'Debit (₹)', 'Debit (P)', 'Credit (₹)', 'Credit (P)', 'Dr/Cr', 'Balance']);

        transactions.forEach((t, index) => {
            const rowData = ledgerRows[index] || { drCr: 'Cr', balance: 0 };
            const debit = parseFloat(t.debit) || 0;
            const credit = parseFloat(t.credit) || 0;
            wsData.push([
                t.date || 'N/A',
                t.particulars || '-',
                Math.floor(debit) || '',
                debit > 0 ? Math.round((debit % 1) * 100) : '',
                Math.floor(credit) || '',
                credit > 0 ? Math.round((credit % 1) * 100) : '',
                rowData.drCr,
                rowData.balance.toFixed(2)
            ]);
        });

        wsData.push([]);
        wsData.push(['', 'SUMMARY', '', '', '', '', '', '']);
        wsData.push(['', 'Total Debit', '', '', totalDebit.toFixed(2), '', '', '']);
        wsData.push(['', 'Total Credit', '', '', totalCredit.toFixed(2), '', '', '']);
        wsData.push(['', 'Closing Balance', '', '', closingBalance.toFixed(2), closingBalance >= 0 ? 'Cr' : 'Dr', '', '']);
        wsData.push([]);
        wsData.push(['Generated by Ledger Pro', new Date().toLocaleString()]);
        return wsData;
    };

    const exportToCSV = async () => {
        try {
            const wsData = getExportData();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const cleanName = (accountDetails.name || 'Account').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const fileName = `Ledger_${cleanName}.csv`;

            if ('showSaveFilePicker' in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'CSV File (.csv)',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: any) {
            if (error?.name !== 'AbortError') {
                console.error('CSV Export Error:', error);
                alert(`CSV export failed: ${error}`);
            }
        }
    };

    if (showWelcome) {
        return (
            <div className="relative w-full h-screen overflow-hidden font-sans">
                <IsoLevelWarp
                    color="79, 70, 229" // Indigo-600
                    density={50}
                    speed={1.5}
                />
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white mb-8 drop-shadow-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Welcome to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
                            Ledger Pro
                        </span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-lg mb-12 drop-shadow-md">
                        Simplifying accounting for small businesses with modern tools and elegant design.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => setShowWelcome(false)}
                        className="rounded-full px-12 py-7 text-xl bg-white text-black hover:bg-gray-200 transition-all hover:scale-105 shadow-xl"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        Get Started
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowWelcome(true)}
                            className="rounded-full hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                Ledger Pro
                            </h1>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="rounded-full"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <Tabs defaultValue="entry" className="w-full">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-white dark:bg-card border border-border rounded-full p-1 mb-8">
                        <TabsTrigger
                            value="entry"
                            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                        >
                            Entry
                        </TabsTrigger>
                        <TabsTrigger
                            value="summary"
                            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                        >
                            Summary
                        </TabsTrigger>
                        <TabsTrigger
                            value="calculate"
                            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                        >
                            Calculate
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="entry" className="space-y-6">
                        <Card className="border-border shadow-md bg-white dark:bg-card">
                            <CardHeader>
                                <CardTitle className="text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                    Account Details
                                </CardTitle>
                                <CardDescription>Enter the account holder information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="accountName">A/c of</Label>
                                        <Input
                                            id="accountName"
                                            value={accountDetails.name}
                                            onChange={(e: any) => updateAccountDetails('name', e.target.value)}
                                            placeholder="Account Holder Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={accountDetails.email}
                                            onChange={(e: any) => updateAccountDetails('email', e.target.value)}
                                            placeholder="example@mail.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={accountDetails.phone}
                                            onChange={(e: any) => updateAccountDetails('phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border shadow-md bg-white dark:bg-card">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                                <div>
                                    <CardTitle className="text-primary flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                                        <span className="text-4xl">Ledger</span>
                                        <span className="text-xl opacity-50">Journal Entries</span>
                                    </CardTitle>
                                    <CardDescription>Real-time transaction tracking with automated balance</CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                                    <Button
                                        onClick={addTransaction}
                                        className="transition-all hover:-translate-y-0.5 w-full sm:w-auto"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Row
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={exportToExcel}
                                            variant="outline"
                                            className={`transition-all hover:-translate-y-0.5 flex-1 sm:flex-none ${showSuccess ? 'bg-green-500 text-white border-green-500' : ''}`}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            {showSuccess ? 'Excel Ready' : 'View in Excel'}
                                        </Button>
                                        <Button
                                            onClick={exportToCSV}
                                            variant="ghost"
                                            className="transition-all hover:-translate-y-0.5 text-xs opacity-70 hover:opacity-100"
                                        >
                                            CSV
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-primary bg-muted/30">
                                                <th className="text-left p-3 text-primary border-r border-border min-w-[120px]" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Date
                                                </th>
                                                <th className="text-left p-3 text-primary border-r border-border min-w-[200px]" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Particulars
                                                </th>
                                                <th colSpan={2} className="text-center p-3 text-primary border-r border-border" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Debit (₹)
                                                    <div className="flex justify-between mt-1 text-[10px] opacity-70">
                                                        <span>Rs.</span>
                                                        <span>P.</span>
                                                    </div>
                                                </th>
                                                <th colSpan={2} className="text-center p-3 text-primary border-r border-border" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Credit (₹)
                                                    <div className="flex justify-between mt-1 text-[10px] opacity-70">
                                                        <span>Rs.</span>
                                                        <span>P.</span>
                                                    </div>
                                                </th>
                                                <th className="text-center p-3 text-primary border-r border-border" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Dr/Cr
                                                </th>
                                                <th className="text-right p-3 text-primary border-r border-border" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Balance
                                                </th>
                                                <th className="w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((transaction, index) => {
                                                const rowData = ledgerRows[index] || { balance: 0, drCr: 'Cr' };
                                                const debitVal = parseFloat(transaction.debit) || 0;
                                                const creditVal = parseFloat(transaction.credit) || 0;

                                                return (
                                                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors group">
                                                        <td className="p-2 border-r border-border">
                                                            <Input
                                                                type="date"
                                                                value={transaction.date}
                                                                onChange={(e: any) => updateTransaction(transaction.id, 'date', e.target.value)}
                                                                className="border-none shadow-none focus-visible:ring-1"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-r border-border">
                                                            <Input
                                                                value={transaction.particulars}
                                                                onChange={(e: any) => updateTransaction(transaction.id, 'particulars', e.target.value)}
                                                                placeholder="Description"
                                                                className="border-none shadow-none focus-visible:ring-1"
                                                            />
                                                        </td>
                                                        {/* Debit Split */}
                                                        <td className="p-1 sm:p-2 w-20 sm:w-24">
                                                            <Input
                                                                type="number"
                                                                value={Math.floor(debitVal) || ''}
                                                                onChange={(e: any) => {
                                                                    const currentPaise = (debitVal % 1).toFixed(2);
                                                                    updateTransaction(transaction.id, 'debit', (parseFloat(e.target.value || '0') + parseFloat(currentPaise)).toString());
                                                                }}
                                                                className="border-none shadow-none text-right font-serif focus-visible:ring-0 px-1 placeholder:opacity-50"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="p-1 sm:p-2 w-10 sm:w-12 border-r border-border">
                                                            <Input
                                                                type="number"
                                                                value={Math.round((debitVal % 1) * 100) || ''}
                                                                onChange={(e: any) => {
                                                                    const currentRs = Math.floor(debitVal);
                                                                    updateTransaction(transaction.id, 'debit', (currentRs + parseFloat(e.target.value || '0') / 100).toString());
                                                                }}
                                                                className="border-none shadow-none text-center text-xs opacity-70 focus-visible:ring-0 px-0 sm:px-1 placeholder:opacity-50"
                                                                placeholder="00"
                                                            />
                                                        </td>
                                                        {/* Credit Split */}
                                                        <td className="p-1 sm:p-2 w-20 sm:w-24">
                                                            <Input
                                                                type="number"
                                                                value={Math.floor(creditVal) || ''}
                                                                onChange={(e: any) => {
                                                                    const currentPaise = (creditVal % 1).toFixed(2);
                                                                    updateTransaction(transaction.id, 'credit', (parseFloat(e.target.value || '0') + parseFloat(currentPaise)).toString());
                                                                }}
                                                                className="border-none shadow-none text-right font-serif focus-visible:ring-0 px-1 placeholder:opacity-50"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="p-1 sm:p-2 w-10 sm:w-12 border-r border-border">
                                                            <Input
                                                                type="number"
                                                                value={Math.round((creditVal % 1) * 100) || ''}
                                                                onChange={(e: any) => {
                                                                    const currentRs = Math.floor(creditVal);
                                                                    updateTransaction(transaction.id, 'credit', (currentRs + parseFloat(e.target.value || '0') / 100).toString());
                                                                }}
                                                                className="border-none shadow-none text-center text-xs opacity-70 focus-visible:ring-0 px-0 sm:px-1 placeholder:opacity-50"
                                                                placeholder="00"
                                                            />
                                                        </td>
                                                        <td className="p-2 border-r border-border text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const current = transaction.overrideDrCr || rowData.drCr;
                                                                    const next = current === 'Cr' ? 'Dr' : 'Cr';
                                                                    updateTransaction(transaction.id, 'overrideDrCr', next);
                                                                }}
                                                                className={`h-7 px-2 text-[10px] font-bold rounded-md transition-all ${(transaction.overrideDrCr || rowData.drCr) === 'Cr'
                                                                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                                                    }`}
                                                            >
                                                                {transaction.overrideDrCr || rowData.drCr}
                                                                {transaction.overrideDrCr && (
                                                                    <span className="ml-1 opacity-50 text-[8px]">•</span>
                                                                )}
                                                            </Button>
                                                        </td>
                                                        <td className="p-2 border-r border-border text-right font-bold text-sm min-w-[100px]" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                            ₹{rowData.balance.toFixed(2)}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeTransaction(transaction.id)}
                                                                className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="summary" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-border shadow-md bg-white dark:bg-card hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Debit</CardTitle>
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-red-600" style={{ fontFamily: 'Playfair Display, serif' }}>
                                        ₹{totalDebit.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border shadow-md bg-white dark:bg-card hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Credit</CardTitle>
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-600" style={{ fontFamily: 'Playfair Display, serif' }}>
                                        ₹{totalCredit.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border shadow-md bg-white dark:bg-card hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Closing Balance</CardTitle>
                                    <DollarSign className="w-5 h-5 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`text-3xl font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                            style={{ fontFamily: 'Playfair Display, serif' }}
                                        >
                                            ₹{Math.abs(closingBalance).toFixed(2)}
                                        </div>
                                        <Badge variant={closingBalance >= 0 ? 'default' : 'destructive'} className="text-xs">
                                            {closingBalance >= 0 ? 'Cr' : 'Dr'}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-border shadow-md bg-white dark:bg-card">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                        Ledger Preview
                                    </CardTitle>
                                    <CardDescription>Complete ledger with running balance</CardDescription>
                                </div>
                                <Button
                                    onClick={exportToExcel}
                                    variant="outline"
                                    className={`transition-all hover:-translate-y-0.5 ${showSuccess ? 'bg-green-500 text-white border-green-500' : ''
                                        }`}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    {showSuccess ? 'Downloaded!' : 'Export Excel'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-primary">
                                                <th className="text-left p-3 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Date
                                                </th>
                                                <th className="text-left p-3 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Particulars
                                                </th>
                                                <th className="text-right p-3 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Debit (₹)
                                                </th>
                                                <th className="text-right p-3 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Credit (₹)
                                                </th>
                                                <th className="text-center p-3 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Dr/Cr
                                                </th>
                                                <th className="text-right p-3 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    Balance (₹)
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ledgerRows.map((row, index) => (
                                                <tr
                                                    key={index}
                                                    className={`border-b border-border ${index % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-muted/30'}`}
                                                >
                                                    <td className="p-3">{row.date}</td>
                                                    <td className="p-3">{row.particulars}</td>
                                                    <td className="p-3 text-right text-red-600" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                        {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="p-3 text-right text-green-600" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                        {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Badge variant={row.drCr === 'Cr' ? 'default' : 'destructive'} className="text-xs">
                                                            {row.drCr}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                        {row.balance.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-primary text-primary-foreground font-bold">
                                                <td className="p-3" colSpan={2} style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    TOTALS
                                                </td>
                                                <td className="p-3 text-right" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    {totalDebit.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    {totalCredit.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Badge variant={closingBalance >= 0 ? 'secondary' : 'destructive'} className="text-xs">
                                                        {closingBalance >= 0 ? 'Cr' : 'Dr'}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                    {Math.abs(closingBalance).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="calculate" className="space-y-6">
                        <Card className="border-border shadow-md bg-white dark:bg-card">
                            <CardHeader>
                                <CardTitle className="text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                    Financial Calculations
                                </CardTitle>
                                <CardDescription>Select a calculation type and run analysis</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { id: 'closingBalance', label: 'Closing Balance', icon: DollarSign },
                                        { id: 'totalDebit', label: 'Total Debit', icon: TrendingDown },
                                        { id: 'totalCredit', label: 'Total Credit', icon: TrendingUp },
                                        { id: 'netCashFlow', label: 'Net Cash Flow', icon: Calculator },
                                        { id: 'avgDebit', label: 'Average Debit', icon: TrendingDown },
                                        { id: 'avgCredit', label: 'Average Credit', icon: TrendingUp },
                                    ].map((calc) => {
                                        const Icon = calc.icon;
                                        return (
                                            <button
                                                key={calc.id}
                                                onClick={() => setSelectedCalculation(calc.id)}
                                                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${selectedCalculation === calc.id
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-white dark:bg-card hover:border-primary'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className="w-5 h-5" />
                                                    <span className="font-medium">{calc.label}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-center">
                                    <Button
                                        onClick={runCalculation}
                                        size="lg"
                                        className="px-12 py-6 text-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                                        style={{ fontFamily: 'Playfair Display, serif' }}
                                    >
                                        <Calculator className="w-6 h-6 mr-3" />
                                        GO
                                    </Button>
                                </div>

                                {calculationResult && (
                                    <Card className="border-primary border-2 bg-gradient-to-br from-white to-muted/30 dark:from-card dark:to-card/50">
                                        <CardContent className="p-8 text-center">
                                            <div className="text-sm text-muted-foreground mb-2">Result</div>
                                            <div className="text-5xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                                                {calculationResult}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <footer className="bg-white dark:bg-card border-t border-border py-8 mt-12 transition-colors">
                <div className="container mx-auto px-6 text-center text-muted-foreground">
                    <p>© 2026 Ledger Pro. Simplifying accounting for small businesses.</p>
                </div>
            </footer>
        </div>
    );
};

export default LedgerAutomationApp;
