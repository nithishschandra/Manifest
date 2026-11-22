import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, Search } from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import { Field } from './ui'

const DEFAULT_CENTER = [13.0827, 80.2707]
const CHENNAI_BOUNDS = [[12.75, 80.05], [13.25, 80.35]]

function isInsideChennai(lat, lon) {
  return lat >= 12.75 && lat <= 13.25 && lon >= 80.05 && lon <= 80.35
}

function addressParts(address = {}) {
  const city = address.city || address.town || address.village || address.municipality || address.county || ''
  const road = address.road || address.pedestrian || address.suburb || address.neighbourhood || ''
  return {
    house_number: address.house_number || '',
    address_line: road,
    landmark: address.neighbourhood && address.neighbourhood !== road ? address.neighbourhood : '',
    city,
    state: address.state || address.region || '',
    postal_code: address.postcode || '',
    country: address.country || 'India',
  }

  function shortLocationName(displayName = '') {
    return displayName
      .split(',')
      .map((part) => part.trim())
      .filter((part) =>
        part
        && !/^chennai$/i.test(part)
        && !/^tamil ?nadu$/i.test(part)
        && !/^india$/i.test(part)
        && !/\b\d{6}\b/.test(part),
      )
      .join(', ')
  }
}

export default function DeliveryAddressPicker({ shipping, setShipping }) {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const reverseTimer = useRef(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [addressType, setAddressType] = useState('Home')
  const [isDefault, setIsDefault] = useState(false)
  const [houseNumber, setHouseNumber] = useState('')
  const [streetName, setStreetName] = useState('')
  const [areaName, setAreaName] = useState('')
  const manualFields = useRef(new Set())

  useEffect(() => {
    setShipping((current) => ({
      ...current,
      city: 'Chennai',
      postal_code: '',
      country: 'India',
    }))
  }, [setShipping])

  function updateShipping(field, value) {
    setShipping((current) => ({ ...current, [field]: value }))
  }

  function applyAddressFromResult(result, preserveManual = true) {
    const parts = addressParts(result.address || {})
    if (!preserveManual || !manualFields.current.has('house_number')) {
      setHouseNumber(parts.house_number)
    }
    if (!preserveManual || !manualFields.current.has('street_name')) setStreetName(parts.address_line)
    if (!preserveManual || !manualFields.current.has('area_name')) setAreaName(parts.landmark)
    updateShipping('city', 'Chennai')
    updateShipping('postal_code', '')
    updateShipping('country', 'India')
    const house = preserveManual && manualFields.current.has('house_number') ? houseNumber : parts.house_number
    const street = preserveManual && manualFields.current.has('street_name') ? streetName : parts.address_line
    const area = preserveManual && manualFields.current.has('area_name') ? areaName : parts.landmark
    updateShipping('address_line', [house, street, area].filter(Boolean).join(', '))
  }

  async function reverseGeocode(lat, lon) {
    setReverseLoading(true)
    setLocationError('')
    try {
      const { data } = await api.get('/addresses/geocode/reverse', { params: { lat, lon } })
      applyAddressFromResult(data)
      setSearch('')
    } catch (err) {
      setLocationError(getErrorMessage(err, 'Could not retrieve the address for this map location.'))
    } finally {
      setReverseLoading(false)
    }
  }

  function scheduleReverseGeocode(lat, lon) {
    if (!isInsideChennai(lat, lon)) {
      setLocationError('Delivery location must be within Chennai.')
      setMarkerPosition(DEFAULT_CENTER)
      updateShipping('latitude', DEFAULT_CENTER[0])
      updateShipping('longitude', DEFAULT_CENTER[1])
      return
    }
    updateShipping('latitude', lat)
    updateShipping('longitude', lon)
    if (reverseTimer.current) clearTimeout(reverseTimer.current)
    reverseTimer.current = setTimeout(() => reverseGeocode(lat, lon), 500)
  }

  function setMarkerPosition(lat, lon, moveMap = true) {
    if (!mapRef.current || !markerRef.current) return
    const position = [lat, lon]
    markerRef.current.setLatLng(position)
    if (moveMap) mapRef.current.setView(position, Math.max(mapRef.current.getZoom(), 16), { animate: true })
  }

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const map = L.map(mapElement.current, {
      zoomControl: true,
      minZoom: 10,
      maxBounds: CHENNAI_BOUNDS,
      maxBoundsViscosity: 1,
    }).setView(DEFAULT_CENTER, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map)
    mapRef.current = map
    markerRef.current = marker

    marker.on('dragend', (event) => {
      const position = event.target.getLatLng()
      scheduleReverseGeocode(position.lat, position.lng)
    })
    map.on('click', (event) => {
      setMarkerPosition(event.latlng.lat, event.latlng.lng, false)
      scheduleReverseGeocode(event.latlng.lat, event.latlng.lng)
    })

    window.requestAnimationFrame(() => map.invalidateSize())
    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current)
      map.off()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    api.get('/addresses').then(({ data }) => setSavedAddresses(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get('/addresses/geocode/search', { params: { q: search.trim() } })
        const results = Array.isArray(data) ? data.filter((result) =>
          isInsideChennai(Number(result.lat), Number(result.lon)),
        ) : []
        setSearchResults(results)
      } catch (err) {
        setLocationError(getErrorMessage(err, 'Address search is currently unavailable.'))
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
      return
    }
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLocating(false)
      if (!isInsideChennai(latitude, longitude)) {
        setLocationError('Your current location is outside Chennai. Only Chennai delivery addresses are supported.')
        setMarkerPosition(DEFAULT_CENTER)
        updateShipping('latitude', DEFAULT_CENTER[0])
        updateShipping('longitude', DEFAULT_CENTER[1])
        return
      }
        setMarkerPosition(latitude, longitude)
        scheduleReverseGeocode(latitude, longitude)
        if (accuracy > 1000) {
          setLocationError(`Location accuracy is low (about ${Math.round(accuracy / 100)} km). You can drag the map pin to correct it.`)
        }
      },
      (error) => {
        setLocating(false)
        const messages = {
          1: 'Location permission was denied. You can still search or choose a point on the map.',
          2: 'Your location is unavailable. Please search or select a point on the map.',
          3: 'The location request timed out. Please try again or select a point on the map.',
        }
        setLocationError(messages[error.code] || 'Could not determine your location.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  function selectSearchResult(result) {
    const lat = Number(result.lat)
    const lon = Number(result.lon)
    if (!isInsideChennai(lat, lon)) {
      setLocationError('Only locations within Chennai can be selected.')
      return
    }
    setMarkerPosition(lat, lon)
    updateShipping('latitude', lat)
    updateShipping('longitude', lon)
    applyAddressFromResult(result, false)
    setSearchResults([])
    setSearch(result.display_name || '')
  }

  function selectSavedAddress(address) {
    if (
      address.latitude != null
      && address.longitude != null
      && !isInsideChennai(address.latitude, address.longitude)
    ) {
      setLocationError('This saved address is outside Chennai and cannot be selected.')
      return
    }
    setHouseNumber(address.house_number || '')
    setStreetName(address.address_line || '')
    setAreaName(address.landmark || '')
    setAddressType(address.address_type || 'Home')
    setIsDefault(address.is_default)
    setShipping((current) => ({
      ...current,
      full_name: address.full_name,
      phone: address.phone,
      address_line: address.address_line,
      city: address.city,
      postal_code: '',
      country: 'India',
      latitude: address.latitude,
      longitude: address.longitude,
    }))
    manualFields.current = new Set()
    if (address.latitude != null && address.longitude != null) {
      setMarkerPosition(address.latitude, address.longitude)
    }
  }

  function markManual(field, setter) {
    return (event) => {
      manualFields.current.add(field)
      setter(event.target.value)
    }
  }

  async function saveAddress() {
    setSaveError('')
    setSaveSuccess('')
    if (!shipping.city || !shipping.city.toLowerCase().includes('chennai')) {
      setSaveError('Only Chennai delivery addresses can be saved.')
      return
    }
    if (
      shipping.latitude != null
      && shipping.longitude != null
      && !isInsideChennai(shipping.latitude, shipping.longitude)
    ) {
      setSaveError('The selected map location must be within Chennai.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: shipping.full_name,
        phone: shipping.phone,
        house_number: houseNumber,
        address_line: [streetName, areaName].filter(Boolean).join(', '),
        landmark: '',
        city: 'Chennai',
        state: '',
        postal_code: '',
        country: 'India',
        address_type: addressType,
        latitude: shipping.latitude,
        longitude: shipping.longitude,
        is_default: isDefault,
      }
      const { data } = await api.post('/addresses', payload)
      setSavedAddresses((addresses) => [data, ...addresses.filter((a) => a.id !== data.id)])
      setSaveSuccess('Delivery address saved.')
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Could not save the delivery address.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="delivery-address-picker space-y-4">
      {savedAddresses.length > 0 && (
        <Field label="Saved addresses">
          <select
            className="field"
            value=""
            onChange={(event) => {
              const address = savedAddresses.find((item) => item.id === Number(event.target.value))
              if (address) selectSavedAddress(address)
            }}
          >
            <option value="">Choose a saved address</option>
            {savedAddresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.address_type} - {address.address_line}, {address.city}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="delivery-location-tools">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="field field-with-icon"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search a Chennai street or area"
            aria-label="Search delivery location"
          />
          {searchResults.length > 0 && (
            <div className="delivery-search-results">
              {searchResults.map((result) => (
                <button type="button" key={`${result.place_id}-${result.lat}-${result.lon}`} onClick={() => selectSearchResult(result)}>
                  <MapPin size={16} />
                  <span>{shortLocationName(result.display_name)}</span>
                </button>
              ))}
            </div>
          )}
          {searching && <span className="delivery-search-status">Searching…</span>}
        </div>
        <button type="button" className="secondary delivery-location-button" onClick={useCurrentLocation} disabled={locating}>
          <Navigation size={17} />
          {locating ? 'Detecting…' : 'Use my current location'}
        </button>
      </div>

      {locationError && <div className="alert alert-error" role="alert">{locationError}</div>}

      <div className="delivery-map-shell">
        <div ref={mapElement} className="delivery-map" aria-label="Interactive delivery location map" />
        {reverseLoading && <span className="delivery-map-status">Updating address…</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className="field" required minLength={2} maxLength={120} value={shipping.full_name} onChange={(e) => { manualFields.current.add('full_name'); updateShipping('full_name', e.target.value) }} autoComplete="name" />
        </Field>
        <Field label="Phone number">
          <input className="field" required type="tel" value={shipping.phone} onChange={(e) => { manualFields.current.add('phone'); updateShipping('phone', e.target.value) }} autoComplete="tel" placeholder="+91 98765 43210" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="House number / flat / building">
          <input
            className="field"
            value={houseNumber}
            onChange={(event) => {
              manualFields.current.add('house_number')
              const value = event.target.value
              setHouseNumber(value)
              updateShipping('address_line', [value, streetName, areaName].filter(Boolean).join(', '))
            }}
            maxLength={120}
          />
        </Field>
        <Field label="Street name">
          <input
            className="field"
            required
            minLength={3}
            maxLength={180}
            value={streetName}
            onChange={(event) => {
              manualFields.current.add('street_name')
              const value = event.target.value
              setStreetName(value)
              updateShipping('address_line', [houseNumber, value, areaName].filter(Boolean).join(', '))
            }}
            autoComplete="street-address"
          />
        </Field>
      </div>
      <Field label="Area">
        <input
          className="field"
          required
          minLength={2}
          maxLength={180}
          value={areaName}
          onChange={(event) => {
            manualFields.current.add('area_name')
            const value = event.target.value
            setAreaName(value)
            updateShipping('address_line', [houseNumber, streetName, value].filter(Boolean).join(', '))
          }}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address type">
          <select className="field" value={addressType} onChange={(event) => setAddressType(event.target.value)}>
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-600">
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          Make this my default address
        </label>
      </div>

      {saveError && <div className="alert alert-error" role="alert">{saveError}</div>}
      {saveSuccess && <div className="alert alert-success" role="status">{saveSuccess}</div>}
      <button type="button" className="secondary" onClick={saveAddress} disabled={saving}>
        {saving ? 'Saving address…' : 'Save delivery address'}
      </button>
    </div>
  )
}
