'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { ErrorBanner } from '@/components/ui/error-banner'
import { exportToCSV, formatRupiah } from '@/lib/export'
import { Download, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Tarif PPh Indonesia 2024
const PPH_DIVIDEN = 0.10      // 10% dari dividen
const PPH_TRANSAKSI = 0.001   // 0.1% dari nilai penjualan
const PPH_BUNGA_DEP = 0.20   // 20% dari bunga deposito

export default function TaxPage() {
  // Dividen
  const [divGross, setDivGross] = useState('')
  // Transaksi saham
  const [txJual, setTxJual] = useState('')
  // Deposito
  const [depBunga, setDepBunga] = useState('')
  // Capital gain (non-IDX — reksadana saham etc)
  const [cgGain, setCgGain] = useState('')

  // ============================================================
  // Kalkulasi
  // ============================================================
  const grossDividen = parseFloat(divGross) || 0
  const pphDividen = grossDividen * PPH_DIVIDEN
  const netDividen = grossDividen - pphDividen

  const nilaiJual = parseFloat(txJual) || 0
  const pphTransaksi = nilaiJual * PPH_TRANSAKSI
  const feeTransaksiTotal = nilaiJual * 0.0029 // avg broker fee 0.19% + 0.10% PPh

  const bungaDep = parseFloat(depBunga) || 0
  const pphDeposito = bungaDep * PPH_BUNGA_DEP
  const netDeposito = bungaDep - pphDeposito

  const capitalGain = parseFloat(cgGain) || 0
  // Reksadana saham: PPh 0% (sudah dikenakan di fund level)
  // Reksadana campuran/obligasi: dikenakan di fund
  // Saham IDX: tidak ada CGT terpisah, sudah via PPh transaksi

  const totalPPh = pphDividen + pphTransaksi + pphDeposito

  function handleExport() {
    exportToCSV([
      { komponen: 'Dividen Bruto', nilai: grossDividen, pph: pphDividen, tarif: '10%', net: netDividen },
      { komponen: 'Penjualan Saham IDX', nilai: nilaiJual, pph: pphTransaksi, tarif: '0.1%', net: nilaiJual - pphTransaksi },
      { komponen: 'Bunga Deposito', nilai: bungaDep, pph: pphDeposito, tarif: '20%', net: netDeposito },
      { komponen: 'TOTAL PPh', nilai: '', pph: totalPPh, tarif: '', net: '' },
    ], 'tax-calculator')
  }

  const taxItems = [
    {
      id: 'dividen',
      title: 'PPh Dividen',
      subtitle: 'Saham IDX & Reksa Dana',
      rate: '10%',
      basis: 'Tarif final atas dividen yang diterima',
      color: 'border-blue-800/50',
      inputs: (
        <Input
          id="tax-dividen"
          label="Total Dividen Bruto (Rp)"
          type="number"
          min="0"
          placeholder="5000000"
          value={divGross}
          onChange={e => setDivGross(e.target.value)}
          hint="Sebelum dipotong PPh"
        />
      ),
      result: grossDividen > 0 ? [
        { label: 'Dividen bruto', value: formatRupiah(grossDividen) },
        { label: 'PPh 10%', value: `- ${formatRupiah(pphDividen)}`, highlight: true },
        { label: 'Dividen bersih', value: formatRupiah(netDividen), bold: true },
      ] : null,
    },
    {
      id: 'transaksi',
      title: 'PPh Transaksi Saham',
      subtitle: 'Penjualan Saham IDX Bursa',
      rate: '0.1%',
      basis: 'Dihitung dari nilai jual, terlepas untung/rugi',
      color: 'border-emerald-800/50',
      inputs: (
        <Input
          id="tax-jual"
          label="Nilai Penjualan Saham (Rp)"
          type="number"
          min="0"
          placeholder="100000000"
          value={txJual}
          onChange={e => setTxJual(e.target.value)}
          hint="Total nilai saham yang dijual hari ini"
        />
      ),
      result: nilaiJual > 0 ? [
        { label: 'Nilai jual', value: formatRupiah(nilaiJual) },
        { label: 'PPh transaksi 0.1%', value: `- ${formatRupiah(pphTransaksi)}`, highlight: true },
        { label: 'Est. fee broker (0.19%)', value: `- ${formatRupiah(Math.round(nilaiJual * 0.0019))}` },
        { label: 'Total potongan', value: `- ${formatRupiah(Math.round(feeTransaksiTotal))}`, bold: true },
      ] : null,
    },
    {
      id: 'deposito',
      title: 'PPh Bunga Deposito',
      subtitle: 'Deposito & Tabungan Bank',
      rate: '20%',
      basis: 'Tarif final, dipotong bank otomatis',
      color: 'border-yellow-800/50',
      inputs: (
        <Input
          id="tax-dep"
          label="Total Bunga Deposito (Rp)"
          type="number"
          min="0"
          placeholder="3000000"
          value={depBunga}
          onChange={e => setDepBunga(e.target.value)}
          hint="Bunga sebelum dipotong PPh"
        />
      ),
      result: bungaDep > 0 ? [
        { label: 'Bunga bruto', value: formatRupiah(bungaDep) },
        { label: 'PPh 20%', value: `- ${formatRupiah(pphDeposito)}`, highlight: true },
        { label: 'Bunga bersih', value: formatRupiah(netDeposito), bold: true },
      ] : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Calculator Investasi</h1>
          <p className="text-gray-400 text-sm mt-1">Hitung PPh dividen, transaksi saham IDX, dan bunga deposito — sesuai aturan Indonesia 2024</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} />Export</Button>
      </div>

      {/* Total summary */}
      {totalPPh > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Total PPh Dividen" value={formatRupiah(pphDividen)} subtitle="10% × dividen" />
          <StatCard title="Total PPh Transaksi" value={formatRupiah(pphTransaksi)} subtitle="0.1% × nilai jual" />
          <StatCard title="Total PPh Deposito" value={formatRupiah(pphDeposito)} subtitle="20% × bunga" />
        </div>
      )}
      {totalPPh > 0 && (
        <Card className="border-red-800/40">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator size={24} className="text-red-400" />
                <div>
                  <p className="text-gray-400 text-sm">Total PPh yang dibayar</p>
                  <p className="text-3xl font-black text-red-400">{formatRupiah(totalPPh)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculator cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {taxItems.map(item => (
          <Card key={item.id} className={`border ${item.color}`}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono font-bold">{item.rate}</span>
                <span className="text-xs text-gray-500">{item.subtitle}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">{item.basis}</p>
              {item.inputs}
              {item.result && (
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  {item.result.map((row, i) => (
                    <div key={i} className={`flex justify-between text-sm ${row.bold ? 'border-t border-gray-800 pt-2 mt-2' : ''}`}>
                      <span className="text-gray-400">{row.label}</span>
                      <span className={`font-semibold ${row.highlight ? 'text-red-400' : row.bold ? 'text-emerald-400' : 'text-white'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info tabel tarif */}
      <Card>
        <CardHeader><CardTitle>Ringkasan Tarif PPh Investasi Indonesia 2024</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Jenis Investasi</th>
                  <th className="text-right py-3 px-3 text-gray-400 font-medium">Tarif PPh</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Basis</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Sifat</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { jenis: 'Dividen saham IDX', tarif: '10%', basis: 'Nilai dividen', sifat: 'Final' },
                  { jenis: 'Penjualan saham IDX', tarif: '0.1%', basis: 'Nilai jual (bukan profit)', sifat: 'Final' },
                  { jenis: 'Bunga deposito', tarif: '20%', basis: 'Bunga bruto', sifat: 'Final' },
                  { jenis: 'Reksa dana saham', tarif: '0%', basis: 'Sudah dikenakan di fund', sifat: 'Tidak kena langsung' },
                  { jenis: 'Obligasi korporasi (bunga)', tarif: '15%', basis: 'Bunga kupon', sifat: 'Final' },
                  { jenis: 'Obligasi negara (SBN)', tarif: '10%', basis: 'Bunga kupon', sifat: 'Final' },
                  { jenis: 'Capital gain properti', tarif: '2.5%', basis: 'Nilai jual', sifat: 'Final (BPHTB terpisah)' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="py-3 px-3 text-white">{row.jenis}</td>
                    <td className="py-3 px-3 text-right text-red-400 font-bold">{row.tarif}</td>
                    <td className="py-3 px-3 text-gray-400">{row.basis}</td>
                    <td className="py-3 px-3 text-gray-500">{row.sifat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ErrorBanner type="warning" message="Informasi ini bersifat edukasi umum. Konsultasikan dengan konsultan pajak untuk situasi spesifik kamu. Peraturan perpajakan dapat berubah." />
        </CardContent>
      </Card>
    </div>
  )
}
