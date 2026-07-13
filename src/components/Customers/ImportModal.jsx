import { useState, useRef } from 'react'
import { Upload, AlertTriangle, CheckCircle, X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

const HEADER_ALIASES = {
  customerName: ['customer name', 'name', 'customer_name', 'client name', 'client', 'customer name'],
  mobileNumber: ['mobile number', 'mobile', 'phone', 'phone number', 'contact', 'mobile_no', 'contact number', 'mobile no'],
  vehicleNumber: ['vehicle number', 'vehicle', 'vehicle_no', 'reg number', 'registration', 'plate number', 'vehicle no'],
  model: ['model', 'vehicle model', 'car model', 'model no', 'model_no'],
  dcNumber: ['dc number', 'dc', 'dc_no', 'job card', 'dc no'],
  serviceType: ['service type', 'service', 'service_type', 'type of service', 'service type'],
  lastServiceDate: ['last service date', 'service date', 'date', 'last_service_date', 'service_date', 'last attend', 'last_attend'],
  location: ['location', 'city', 'area', 'branch'],
  totalVisits: ['visit', 'visits', 'total visits', 'total_visits'],
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
    chassisNumber: 'JTDBE30K123456789',
    model: 'Toyota Allion',
    dcNumber: 'DC-2024-001',
    serviceType: 'Regular Service',
    lastServiceDate: '2024-01-15',
    location: 'Dhaka',
  },
]

function downloadSample() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sample')
  XLSX.writeFile(wb, 'customer-import-sample.xlsx')
}

function parseExcelDate(value) {
  if (!value) return ''
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return value
  }
  return String(value)
}

export default function ImportModal({ open, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
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
          setErrors(['No recognized columns found. Expected columns: Service Type, DC No, Vehicle No, etc.'])
          setPreview([])
          return
        }

        const rows = json.map((row, idx) => {
          const mapped = {}
          for (const raw of rawHeaders) {
            const key = normalizeHeader(raw)
            if (key) {
              let val = row[raw]
              if (key === 'lastServiceDate') val = parseExcelDate(val)
              mapped[key] = String(val).trim()
            }
          }
          const rowErrors = []
          if (!mapped.customerName) rowErrors.push('Customer Name is required')
          if (!mapped.mobileNumber) rowErrors.push('Mobile No is required')
          if (!mapped.vehicleNumber) rowErrors.push('Vehicle No is required')

          const isDuplicate = preview.some(
            (p) => p.data.vehicleNumber === mapped.vehicleNumber || p.data.mobileNumber === mapped.mobileNumber
          )
          if (isDuplicate) rowErrors.push('Duplicate in file - will update existing row')

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
    if (valid.length === 0) return

    setImporting(true)
    let added = 0
    let updated = 0
    let failed = 0
    for (const row of valid) {
      try {
        const result = await onImport(row.data)
        if (result?.action === 'updated') updated++
        else added++
      } catch {
        failed++
      }
    }
    setResult({ added, updated, failed, total: valid.length })
    setImporting(false)
  }

  const reset = () => {
    setFile(null)
    setPreview([])
    setErrors([])
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Customers</h2>
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
              <span><strong>Service Type</strong></span>
              <span><strong>DC No</strong></span>
              <span><strong>Vehicle No</strong> (required)</span>
              <span><strong>Model No</strong></span>
              <span><strong>Customer Name</strong> (required)</span>
              <span><strong>Location</strong></span>
              <span><strong>Mobile No</strong> (required)</span>
              <span><strong>Last Attend</strong></span>
              <span><strong>Visit</strong></span>
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
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Customer Name</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Mobile No</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Vehicle No</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">Model No</th>
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
                {result.total} processed ({result.added} added, {result.updated} updated)
                {result.failed > 0 && `, ${result.failed} failed`}
              </p>
              <button onClick={handleClose} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Done
              </button>
            </div>
          )}

          {preview.length > 0 && !result && (
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={handleClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || preview.filter((r) => r.errors.length === 0).length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : `Import ${preview.filter((r) => r.errors.length === 0).length} Customers`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
