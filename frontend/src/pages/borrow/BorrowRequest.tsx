import React, { useState } from 'react'
import Navbar from '../../components/shared/Navbar'
import BorrowTab from './BorrowTab'
import GatePassTab from './GatepassTab'
import ReturnSlipTab from './ReturnSlipTab'

export default function BorrowRequest() {
  const [activeTab, setActiveTab] = useState<'borrow' | 'gatepass' | 'return'>('borrow')

  const tabs = [
    {
      key: 'borrow' as const,
      label: 'Borrow Request',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: 'gatepass' as const,
      label: 'Gate Pass',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      key: 'return' as const,
      label: 'Return Slip',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="w-full min-h-screen bg-[#080e1a]">

      {/* Shared Navbar — matches Assets / Dashboard pages */}
      <Navbar />

      {/* Page Body */}
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-6">

          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-white">Borrow &amp; Gate Pass</h1>
            <p className="text-slate-400 text-sm mt-0.5">Submit borrow requests, generate gate pass slips, and process returns</p>
          </div>

          {/* Tabs */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1 bg-[#0a1120] border border-[#1a2744] rounded-2xl p-1.5 w-fit min-w-full sm:min-w-0">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#0f1a2e]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'borrow'   && <BorrowTab />}
          {activeTab === 'gatepass' && <GatePassTab />}
          {activeTab === 'return'   && <ReturnSlipTab />}

      </div>
    </div>
  )
}
