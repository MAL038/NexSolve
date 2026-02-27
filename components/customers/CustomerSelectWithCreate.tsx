'use client'

import { useState, useEffect, useRef } from 'react'
import { CustomerWizard } from '../CustomerWizard'
import type { Customer } from '@/types'

interface Props {
  value: string | null
  onChange: (customerId: string | null) => void
  customers: Customer[]
  onCustomerCreated: (customer: Customer) => void
}

export function CustomerSelectWithCreate({ 
  value, 
  onChange, 
  customers: initialCustomers,
  onCustomerCreated 
}: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = customers.find(c => c.id === value)

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleCustomerCreated(newCustomer: Customer) {
    // Voeg toe aan lokale lijst
    setCustomers(prev => [newCustomer, ...prev])
    // Selecteer direct
    onChange(newCustomer.id)
    // Notify parent (voor bijv. SWR revalidation)
    onCustomerCreated(newCustomer)
    // Sluit wizard
    setShowWizard(false)
    setIsOpen(false)
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.name : 'Selecteer klant...'}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            {/* Zoekbalk */}
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                placeholder="Zoek klant..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Lijst */}
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">
                  Geen klanten gevonden
                </li>
              )}
              {filtered.map(customer => (
                <li
                  key={customer.id}
                  onClick={() => {
                    onChange(customer.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                    customer.id === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  }`}
                >
                  <span>{customer.name}</span>
                  {customer.code && (
                    <span className="text-xs text-gray-400">{customer.code}</span>
                  )}
                </li>
              ))}
            </ul>

            {/* + Nieuwe klant aanmaken */}
            <div className="border-t border-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setShowWizard(true)
                  setIsOpen(false)
                  setSearch('')
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nieuwe klant aanmaken
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CustomerWizard als modal — alleen renderen als nodig */}
      {showWizard && (
        <CustomerWizard
          mode="modal"
          onCreated={handleCustomerCreated}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </>
  )
}