import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

type CityEntry = { city: string; state: string }

type PincodeOffice = {
  officename: string
  pincode: number
  district: string
  statename: string
  latitude: string
  longitude: string
}

type PincodeMap = Record<string, PincodeOffice[]>

// Cache for raw JSON and city list
let RAW_CACHE: PincodeMap | null = null
let CITY_CACHE: CityEntry[] | null = null

function loadRawPincodeData(): PincodeMap {
  if (RAW_CACHE) return RAW_CACHE

  try {
    // JSON file is located one level above the project folder
    const jsonPath = path.join(process.cwd(), '..', 'pincode_cleaned (1).json')
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const obj = JSON.parse(raw) as PincodeMap
    RAW_CACHE = obj
    return obj
  } catch (err) {
    console.error('Failed to load pincodes JSON:', err)
    RAW_CACHE = {}
    return RAW_CACHE
  }
}

function loadCities(): CityEntry[] {
  if (CITY_CACHE) return CITY_CACHE

  const obj = loadRawPincodeData()

  const seen = new Set<string>()
  const list: CityEntry[] = []

  for (const arr of Object.values(obj)) {
    for (const entry of arr) {
      const city = (entry.officename as string || (entry as any).city || '').trim()
      const state = (entry.statename as string || (entry as any).state || '').trim()
      if (!city) continue
      const key = `${city.toLowerCase()}|${state.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ city, state })
    }
  }

  CITY_CACHE = list
  return list
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const pincode = (searchParams.get('pincode') || '').trim()

  // 🧠 1) If pincode is passed → return offices for that pincode
  if (pincode) {
    const data = loadRawPincodeData()
    const offices = data[pincode] ?? []
    return NextResponse.json({
      pincode,
      offices,
    })
  }

  // 🧠 2) Otherwise behave like your old city search (?q=...)
  const list = loadCities()

  if (!q) {
    // return first 100 entries as a lightweight default
    return NextResponse.json(list.slice(0, 100))
  }

  const results: CityEntry[] = []
  for (const item of list) {
    if (
      item.city.toLowerCase().includes(q) ||
      item.state.toLowerCase().includes(q)
    ) {
      results.push(item)
      if (results.length >= 100) break
    }
  }

  return NextResponse.json(results)
}
