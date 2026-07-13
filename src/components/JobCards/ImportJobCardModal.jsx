import { useState, useRef } from 'react'
import { Upload, AlertTriangle, CheckCircle, X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

const HEADER_ALIASES = {
  customerName: ['customer name', 'name', 'customer', 'client name', 'client', 'customername'],
  mobileNumber: ['mobile number', 'mobile', 'phone', 'phone number', 'contact', 'mobilenumber'],
  vehicleNumber: ['vehicle number', 'vehicle', 'vehicle no', 'reg number', 'registration', 'vehiclenumber'],
  model: ['model', 'vehicle model', 'car model', 'model no'],
  services: ['services', 'service', 'service type', 'service_type', 'servicetype'],
  parts: ['parts', 'materials', 'items'],
  laborCharge: ['labor charge', 'labour charge', 'labor', 'labour', 'laborcharge', 'labourcharge'],
  otherCharges: ['other charges', 'other', 'extra charges', 'othercharges'],
  discount: ['discount', 'discount'],
  notes: ['notes', 'note', 'remarks', 'remark'],
  serviceDate: ['service date', 'date', 'service_date', 'servicedate'],
}

function normalizeHeader(header) {
  const cleaned = header.trim().toLowerCase()
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(cleaned)) return key
  }
  return null
}

const SAMPLE_DATA = [
  {
    customerName: 'Md. Rahim Uddin',
    mobileNumber: '01712345678',
    vehicleNumber: 'Dhaka Metro-Ga 12-3456',
    model: 'Toyota Allion',
    services: 'Regular Service, Oil Change',
    laborCharge: 500,
    otherCharges: 0,
    discount: 0,
    notes: 'Check brake pads',
  },
]

function downloadSample() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sample')
  XLSX.writeFile(wb, 'jobcard-import-sample.xlsx')
}

export default function ImportJobCardModal({ open, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setErrors([])
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (json.length === 0) {
          setErrors(['File is empty'])
          setPreview([])
          return
        }

        const rawHeaders = Object.keys(json[0])
        const mappedHeaders = rawHeaders.map((h) => normalizeHeader(h))
        const unmapped = rawHeaders.filter((_, i) => !mappedHeaders[i])

        if (unmapped.length === rawHeaders.length) {
          setErrors(['No recognized columns found. Expected: Customer Name, Mobile, Vehicle No, etc.'])
          setPreview([])
          return
        }

        const rows = json.map((row, idx) => {
          const mapped = {}
          for (const raw of rawHeaders) {
            const key = normalizeHeader(raw)
            if (key) {
              let val = String(row[raw]).trim()
              if (['laborCharge', 'otherCharges', 'discount'].includes(key)) {
                val = Number(val.replace(/[^0-9.-]/g, '')) || 0
              }
              mapped[key] = val
            }
          }
          const rowErrors = []
          if (!mapped.customerName) rowErrors.push('Customer Name is required')
          if (!mapped.vehicleNumber) rowErrors.push('Vehicle No is required')
          return { row: idx + 2, data: mapped, errors: rowErrors }
        })

        setPreview(rows)
        if (errors.length === 0 && rows.some((r) => r.errors.length > 0)) {
          setErrors(['Some rows have validation errors. Review before importing.'])
        }
      } catch (err) {
        setErrors(['Failed to parse file: ' + err.message])
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleImport = async () => {
    const valid = preview.filter((r) => r.errors.length === 0)
    const total = valid.length
    if (total === 0) return

    setImporting(true)
    setProgress(0)
    let added = 0
    let failed = 0
    const CONCURRENCY = 5

    for (let i = 0; i < total; i += CONCURRENCY) {
      const batch = valid.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map((row) => {
          const data = {
            ...row.data,
            services: row.data.services ? row.data.services.split(',').map((s) => s.trim()) : [],
            parts: [],
            partsTotal: 0,
            grandTotal: (Number(row.data.laborCharge) || 0) + (Number(row.data.otherCharges) || 0) - (Number(row.data.discount) || 0),
            status: 'open',
          }
          return onImport(data)
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') added++
        else failed++
      }
      setProgress(Math.min(((i + CONCURRENCY) / total) * 100, 100))
    }

    setResult({ added, failed, total })
    setImporting(false)
  }

  const reset = () => {
    setFile(null)
    setPreview([])
    setErrors([])
    setProgress(0)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Job Cards</h2>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium mb-1">File format</p>
                <p>Upload a .xlsx, .xls, or .csv file. The following columns are recognized:</p>
              </div>
              <button
                onClick={downloadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Sample File
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-2 text-xs">
              <span><strong>Customer Name</strong> (required)</span>
              <span><strong>Mobile Number</strong></span>
              <span><strong>Vehicle No</strong> (required)</span>
              <span><strong>Model</strong></span>
              <span><strong>Services</strong> (comma separated)</span>
              <span><strong>Labor Charge</strong></span>
              <span><strong>Other Charges</strong></span>
              <span><strong>Discount</strong></span>
              <span><strong>Notes</strong></span>
            </div>
          </div>

          {!result && (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {file ? file.name : 'Click to select a file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {errors.map((e, i) => <p key={i} className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 shrink-0" />{e}</p>)}
            </div>
          )}

          {preview.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview ({preview.length} rows, {preview.filter((r) => r.errors.length === 0).length} valid)
              </p>
              <div className="overflow-x-auto max-h-64 border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">#</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Customer</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Mobile</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Vehicle</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Model</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.slice(0, 50).map((row) => (
                      <tr key={row.row} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="px-2 py-1.5 text-gray-500">{row.row}</td>
                        <td className="px-2 py-1.5 text-gray-900 dark:text-white">{row.data.customerName || '-'}</td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{row.data.mobileNumber || '-'}</td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{row.data.vehicleNumber || '-'}</td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{row.data.model || '-'}</td>
                        <td className="px-2 py-1.5">
                          {row.errors.length > 0 ? (
                            <span className="text-red-600 dark:text-red-400" title={row.errors.join('; ')}>
                              <AlertTriangle className="w-3.5 h-3.5 inline" /> {row.errors.length} err
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3.5 h-3.5 inline" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 50 && (
                <p className="text-xs text-gray-500">...and {preview.length - 50} more rows</p>
              )}
            </div>
          )}

          {result && (
            <div className="text-center py-6 space-y-2">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Import Complete</p>
              <p className="text-sm text-gray-500">
                {result.total} processed ({result.added} added)
                {result.failed > 0 && `, ${result.failed} failed`}
              </p>
              <button onClick={handleClose} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Done
              </button>
            </div>
          )}

          {preview.length > 0 && !result && (
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={handleClose} disabled={importing} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                Cancel
              </button>
              <div className="flex flex-col items-end gap-2">
                {importing && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <button
                  onClick={handleImport}
                  disabled={importing || preview.filter((r) => r.errors.length === 0).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {importing
                    ? `Importing... ${Math.round(progress)}%`
                    : `Import ${preview.filter((r) => r.errors.length === 0).length} Job Cards`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
