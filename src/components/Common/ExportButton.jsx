import { useState } from 'react'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function ExportButton({ data, filename = 'export', columns }) {
  const [open, setOpen] = useState(false)

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, `${filename}.xlsx`)
    setOpen(false)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text(filename, 14, 15)
    doc.autoTable({
      head: [columns],
      body: data.map((row) => columns.map((col) => row[col] || '-')),
      startY: 25,
    })
    doc.save(`${filename}.pdf`)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]">
            <button onClick={exportExcel} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Export Excel
            </button>
            <button onClick={exportPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
