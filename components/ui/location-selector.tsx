"use client"

import { useEffect, useState } from "react"
import { Country, State, City } from "country-state-city"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface LocationSelectorProps {
    country?: string
    state?: string
    city?: string
    onCountryChange: (countryName: string, countryCode: string) => void
    onStateChange: (stateName: string) => void
    onCityChange: (cityName: string) => void
    disabled?: boolean
}

export function LocationSelector({
    country,
    state,
    city,
    onCountryChange,
    onStateChange,
    onCityChange,
    disabled = false,
}: LocationSelectorProps) {
    const [countries, setCountries] = useState<any[]>([])
    const [states, setStates] = useState<any[]>([])
    const [cities, setCities] = useState<any[]>([])
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("")
    const [selectedStateCode, setSelectedStateCode] = useState<string>("")

    useEffect(() => {
        console.log("LocationSelector mounted")
        setCountries(Country.getAllCountries())
    }, [])

    useEffect(() => {
        const selectedC = countries.find((c) => c.name === country)
        if (selectedC) {
            setSelectedCountryCode(selectedC.isoCode)
            setStates(State.getStatesOfCountry(selectedC.isoCode))
        }
    }, [country, countries])

    useEffect(() => {
        const selectedS = states.find((s) => s.name === state)
        if (selectedS && selectedCountryCode) {
            setSelectedStateCode(selectedS.isoCode)
            setCities(City.getCitiesOfState(selectedCountryCode, selectedS.isoCode))
        }
    }, [state, states, selectedCountryCode])

    const handleCountryChange = (value: string) => {
        const selectedC = countries.find((c) => c.name === value)
        if (selectedC) {
            setSelectedCountryCode(selectedC.isoCode)
            setStates(State.getStatesOfCountry(selectedC.isoCode))
            setCities([])
            setSelectedStateCode("")
            onCountryChange(selectedC.name, selectedC.isoCode)
            onStateChange("")
            onCityChange("")
        }
    }

    const handleStateChange = (value: string) => {
        const selectedS = states.find((s) => s.name === value)
        if (selectedS) {
            setSelectedStateCode(selectedS.isoCode)
            setCities(City.getCitiesOfState(selectedCountryCode, selectedS.isoCode))
            onStateChange(selectedS.name)
            onCityChange("")
        }
    }

    const handleCityChange = (value: string) => {
        onCityChange(value)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label>Country</Label>
                <Select disabled={disabled} value={country || ""} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((c) => (
                            <SelectItem key={c.isoCode} value={c.name}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>State/Province</Label>
                <Select disabled={disabled || !selectedCountryCode} value={state || ""} onValueChange={handleStateChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                        {states.map((s) => (
                            <SelectItem key={s.isoCode} value={s.name}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>City</Label>
                <Select disabled={disabled || !selectedStateCode} value={city || ""} onValueChange={handleCityChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                        {cities.map((c) => (
                            <SelectItem key={c.name} value={c.name}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
