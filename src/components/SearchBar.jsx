import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search, X, Crosshair } from 'lucide-react';

export default function SearchBar({ onPick, onLocate }) {
  const places = useMapsLibrary('places');
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [value, setValue] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!places) return;
    sessionTokenRef.current = new places.AutocompleteSessionToken();
  }, [places]);

  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, []);

  function runPredictions(input) {
    if (!places || !input || input.length < 2) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    const request = {
      input,
      sessionToken: sessionTokenRef.current,
      // Bias to NY/NJ region.
      locationBias: {
        north: 45.1,
        south: 38.7,
        east: -71.5,
        west: -80.0,
      },
      includedRegionCodes: ['us'],
    };
    places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      .then(({ suggestions }) => {
        setPredictions(suggestions || []);
        setOpen(true);
      })
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }

  function handleChange(e) {
    const v = e.target.value;
    setValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPredictions(v), 220);
  }

  async function selectSuggestion(s) {
    if (!s?.placePrediction) return;
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
      });
      const loc = place.location;
      if (!loc) return;
      const point = { lat: loc.lat(), lng: loc.lng() };
      const viewport = place.viewport
        ? {
            north: place.viewport.getNorthEast().lat(),
            east: place.viewport.getNorthEast().lng(),
            south: place.viewport.getSouthWest().lat(),
            west: place.viewport.getSouthWest().lng(),
          }
        : null;
      onPick?.({
        point,
        viewport,
        name: place.displayName || s.placePrediction.text?.text,
        address: place.formattedAddress,
      });
      setValue(place.displayName || s.placePrediction.text?.text || '');
      setOpen(false);
      sessionTokenRef.current = places ? new places.AutocompleteSessionToken() : null;
      inputRef.current?.blur();
    } catch (err) {
      console.error(err);
    }
  }

  function clear() {
    setValue('');
    setPredictions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-input-row">
        <Search size={18} className="search-icon" aria-hidden />
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          placeholder="Search address, venue, or town"
          value={value}
          onChange={handleChange}
          onFocus={() => predictions.length > 0 && setOpen(true)}
        />
        {value && (
          <button className="icon-btn" onClick={clear} aria-label="Clear">
            <X size={16} />
          </button>
        )}
        <button
          className="icon-btn locate-btn"
          onClick={onLocate}
          aria-label="Use my location"
          title="Use my location"
        >
          <Crosshair size={16} />
        </button>
      </div>

      {open && (predictions.length > 0 || loading) && (
        <ul className="search-results" role="listbox">
          {loading && predictions.length === 0 && (
            <li className="search-result search-empty">Searching…</li>
          )}
          {predictions.map((s) => {
            const text = s.placePrediction?.text?.text || '';
            const main = s.placePrediction?.mainText?.text || text;
            const secondary = s.placePrediction?.secondaryText?.text || '';
            return (
              <li
                key={s.placePrediction?.placeId || text}
                className="search-result"
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
              >
                <span className="search-result-main">{main}</span>
                {secondary && (
                  <span className="search-result-sub">{secondary}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
