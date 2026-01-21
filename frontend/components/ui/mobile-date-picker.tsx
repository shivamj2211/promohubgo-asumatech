'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MobileDatePickerProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (date: string) => void
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

export default function MobileDatePicker({
  open,
  onOpenChange,
  onSelect,
}: MobileDatePickerProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const totalDays = daysInMonth(month, year)
  const firstDay = new Date(year, month, 1).getDay()

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ]

  const selectDate = (day: number) => {
    const d = new Date(year, month, day)
    const formatted = d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    onSelect(formatted)
    onOpenChange(false)
  }

  const goNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const goPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 rounded-t-3xl bottom-0 fixed translate-x-[-50%] left-[50%] max-w-md w-full">
        <div className="p-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-center">
              {monthNames[month]} {year}
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-between mt-4 px-6">
            <button onClick={goPrev} className="text-xl">‹</button>
            <button onClick={goNext} className="text-xl">›</button>
          </div>
        </div>

        {/* Days grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 text-center text-gray-500 text-xs mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center">
            {/* Empty slots for first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={'e' + i}></div>
            ))}

            {/* Days */}
            {Array.from({ length: totalDays }).map((_, i) => (
              <button
                key={i}
                onClick={() => selectDate(i + 1)}
                className="py-2 text-sm rounded-full hover:bg-gray-200 active:bg-gray-300 transition"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
