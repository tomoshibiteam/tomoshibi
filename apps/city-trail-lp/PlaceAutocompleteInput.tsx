import React, { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceAutocompleteInputProps {
    onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
    placeholder?: string;
    className?: string;
    defaultValue?: string;
    value?: string;  // controlled value
    onValueChange?: (value: string) => void;  // callback for value changes
}

export const PlaceAutocompleteInput = ({
    onPlaceSelect,
    placeholder = "Search for a place",
    className,
    defaultValue = "",
    value: controlledValue,
    onValueChange
}: PlaceAutocompleteInputProps) => {
    const isControlled = controlledValue !== undefined;
    const [inputValue, setInputValue] = useState(defaultValue);

    // For controlled mode, sync with external value
    useEffect(() => {
        if (isControlled && controlledValue !== inputValue) {
            setInputValue(controlledValue);
        }
    }, [controlledValue, isControlled]);

    // For uncontrolled mode, sync with defaultValue
    useEffect(() => {
        if (!isControlled) {
            setInputValue(defaultValue);
        }
    }, [defaultValue, isControlled]);

    const [options, setOptions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const placesLibrary = useMapsLibrary('places');
    const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
    const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
    const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!placesLibrary) return;
        setAutocompleteService(new placesLibrary.AutocompleteService());
        setPlacesService(new placesLibrary.PlacesService(document.createElement('div')));
        setSessionToken(new placesLibrary.AutocompleteSessionToken());
    }, [placesLibrary]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        if (!val.trim() || !autocompleteService || !sessionToken) {
            setOptions([]);
            setIsOpen(false);
            return;
        }

        autocompleteService.getPlacePredictions({
            input: val,
            sessionToken: sessionToken,
            language: 'ja',
            componentRestrictions: { country: 'jp' } // Restrict to Japan for this app
        }, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                setOptions(predictions);
                setIsOpen(true);
            } else {
                setOptions([]);
                setIsOpen(false);
            }
        });
    };

    const handleSelect = (placeId: string, description: string) => {
        setInputValue(description);
        setIsOpen(false);

        if (placesService && sessionToken) {
            placesService.getDetails({
                placeId: placeId,
                fields: ['geometry', 'formatted_address', 'name', 'place_id'],
                sessionToken: sessionToken
            }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    onPlaceSelect(place);
                    // Refresh token after use
                    if (placesLibrary) {
                        setSessionToken(new placesLibrary.AutocompleteSessionToken());
                    }
                }
            });
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInput}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {isOpen && options.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden max-h-60 overflow-y-auto">
                    {options.map((option) => (
                        <button
                            key={option.place_id}
                            onClick={() => handleSelect(option.place_id, option.description)}
                            className="w-full text-left px-4 py-3 hover:bg-brand-base transition-colors flex flex-col gap-0.5 border-b border-stone-100 last:border-0"
                        >
                            <span className="text-sm font-bold text-brand-dark max-w-full truncate">
                                {option.structured_formatting.main_text}
                            </span>
                            <span className="text-xs text-stone-500 max-w-full truncate">
                                {option.structured_formatting.secondary_text}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" className="h-4 w-auto opacity-75" />
            </div>
        </div>
    );
};
