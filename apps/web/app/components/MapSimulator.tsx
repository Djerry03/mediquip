'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

type Coords = [number, number];

type Depot = {
  id: string;
  name: { fr: string; en: string };
  coords: Coords;
};

type Neighborhood = {
  id: string;
  name: { fr: string; en: string };
  coords: Coords;
  zone_code: string;
};

const DEPOTS: Depot[] = [
  { id: 'b0000000-0000-0000-0000-000000000002', name: { fr: 'Boutique Melen', en: 'Melen Boutique' }, coords: [3.859, 11.487] },
  { id: 'b0000000-0000-0000-0000-000000000003', name: { fr: 'Boutique Cradat', en: 'Cradat Boutique' }, coords: [3.879, 11.515] },
  { id: 'b0000000-0000-0000-0000-000000000001', name: { fr: 'Pharmacie Bleue Ngousso', en: 'Ngousso Pharmacy' }, coords: [3.898, 11.541] },
];

const YAOUNDE_NEIGHBORHOODS: Neighborhood[] = [
  { id: 'y1', name: { fr: 'Bastos', en: 'Bastos' }, coords: [3.896, 11.512], zone_code: 'Z1' },
  { id: 'y2', name: { fr: 'Melen', en: 'Melen' }, coords: [3.864, 11.498], zone_code: 'Z1' },
  { id: 'y3', name: { fr: 'Cradat', en: 'Cradat' }, coords: [3.879, 11.515], zone_code: 'Z1' },
  { id: 'y4', name: { fr: 'Ngousso', en: 'Ngousso' }, coords: [3.891, 11.547], zone_code: 'Z1' },
  { id: 'y5', name: { fr: 'Obili', en: 'Obili' }, coords: [3.860, 11.491], zone_code: 'Z1' },
  { id: 'y6', name: { fr: 'Mokolo', en: 'Mokolo' }, coords: [3.869, 11.502], zone_code: 'Z2' },
  { id: 'y7', name: { fr: 'Etoudi', en: 'Etoudi' }, coords: [3.912, 11.528], zone_code: 'Z2' },
  { id: 'y8', name: { fr: 'Tsinga', en: 'Tsinga' }, coords: [3.888, 11.498], zone_code: 'Z2' },
  { id: 'y9', name: { fr: 'Essos', en: 'Essos' }, coords: [3.868, 11.539], zone_code: 'Z1' },
  { id: 'y10', name: { fr: 'Mvan', en: 'Mvan' }, coords: [3.820, 11.518], zone_code: 'Z2' },
  { id: 'y11', name: { fr: 'Biyem-Assi', en: 'Biyem-Assi' }, coords: [3.840, 11.488], zone_code: 'Z2' },
  { id: 'y12', name: { fr: 'Mendong', en: 'Mendong' }, coords: [3.834, 11.470], zone_code: 'Z3' },
  { id: 'y13', name: { fr: 'Odza', en: 'Odza' }, coords: [3.805, 11.535], zone_code: 'Z3' },
  { id: 'y14', name: { fr: 'Nkolbisson', en: 'Nkolbisson' }, coords: [3.867, 11.455], zone_code: 'Z3' },
  { id: 'y15', name: { fr: 'Simbock', en: 'Simbock' }, coords: [3.821, 11.472], zone_code: 'Z3' },
  { id: 'y16', name: { fr: 'Nlongkak', en: 'Nlongkak' }, coords: [3.882, 11.518], zone_code: 'Z1' },
  { id: 'y17', name: { fr: 'Hippodrome', en: 'Hippodrome' }, coords: [3.871, 11.515], zone_code: 'Z1' },
  { id: 'y18', name: { fr: 'Elig-Essono', en: 'Elig-Essono' }, coords: [3.875, 11.523], zone_code: 'Z1' },
  { id: 'y19', name: { fr: 'Omnisport', en: 'Omnisport' }, coords: [3.882, 11.533], zone_code: 'Z1' },
  { id: 'y20', name: { fr: 'Mimboman', en: 'Mimboman' }, coords: [3.858, 11.558], zone_code: 'Z2' },
  { id: 'y21', name: { fr: 'Ekounou', en: 'Ekounou' }, coords: [3.835, 11.537], zone_code: 'Z2' },
  { id: 'y22', name: { fr: 'Ngoa-Ekellé', en: 'Ngoa-Ekellé' }, coords: [3.861, 11.512], zone_code: 'Z1' },
  { id: 'y23', name: { fr: 'Madagascar', en: 'Madagascar' }, coords: [3.881, 11.493], zone_code: 'Z2' },
  { id: 'y24', name: { fr: 'Briqueterie', en: 'Briqueterie' }, coords: [3.878, 11.503], zone_code: 'Z2' },
  { id: 'y25', name: { fr: 'Messa', en: 'Messa' }, coords: [3.872, 11.501], zone_code: 'Z2' },
  { id: 'y26', name: { fr: 'Mvolyé', en: 'Mvolyé' }, coords: [3.849, 11.506], zone_code: 'Z2' },
  { id: 'y27', name: { fr: 'Emana', en: 'Emana' }, coords: [3.921, 11.528], zone_code: 'Z2' },
  { id: 'y28', name: { fr: 'Nkolmesseng', en: 'Nkolmesseng' }, coords: [3.895, 11.562], zone_code: 'Z2' },
  { id: 'y29', name: { fr: 'Nkoabang', en: 'Nkoabang' }, coords: [3.856, 11.602], zone_code: 'Z3' },
  { id: 'y30', name: { fr: 'Soa', en: 'Soa' }, coords: [3.985, 11.602], zone_code: 'Z3' },
  { id: 'y31', name: { fr: 'Obala', en: 'Obala' }, coords: [4.167, 11.533], zone_code: 'Z4' },
];

const DOUALA_NEIGHBORHOODS: Neighborhood[] = [
  { id: 'd1', name: { fr: 'Akwa', en: 'Akwa' }, coords: [4.050, 9.708], zone_code: 'Z3' },
  { id: 'd2', name: { fr: 'Bonanjo', en: 'Bonanjo' }, coords: [4.043, 9.689], zone_code: 'Z3' },
  { id: 'd3', name: { fr: 'Deido', en: 'Deido' }, coords: [4.063, 9.711], zone_code: 'Z3' },
  { id: 'd4', name: { fr: 'Bonapriso', en: 'Bonapriso' }, coords: [4.028, 9.701], zone_code: 'Z3' },
  { id: 'd5', name: { fr: 'Ndokoti', en: 'Ndokoti' }, coords: [4.048, 9.756], zone_code: 'Z4' },
  { id: 'd6', name: { fr: 'Bepanda', en: 'Bepanda' }, coords: [4.061, 9.735], zone_code: 'Z4' },
  { id: 'd7', name: { fr: 'Bali', en: 'Bali' }, coords: [4.037, 9.696], zone_code: 'Z3' },
  { id: 'd8', name: { fr: 'New Bell', en: 'New Bell' }, coords: [4.025, 9.715], zone_code: 'Z4' },
  { id: 'd9', name: { fr: 'Kotto', en: 'Kotto' }, coords: [4.095, 9.765], zone_code: 'Z4' },
  { id: 'd10', name: { fr: 'Bonaberi', en: 'Bonaberi' }, coords: [4.078, 9.667], zone_code: 'Z4' },
  { id: 'd11', name: { fr: 'Logbessou', en: 'Logbessou' }, coords: [4.098, 9.790], zone_code: 'Z4' },
  { id: 'd12', name: { fr: 'Yassa', en: 'Yassa' }, coords: [4.005, 9.805], zone_code: 'Z4' },
  { id: 'd13', name: { fr: 'Japoma', en: 'Japoma' }, coords: [3.992, 9.825], zone_code: 'Z4' },
  { id: 'd14', name: { fr: 'Makepe', en: 'Makepe' }, coords: [4.081, 9.755], zone_code: 'Z4' },
  { id: 'd15', name: { fr: 'Denver', en: 'Denver' }, coords: [4.074, 9.746], zone_code: 'Z4' },
  { id: 'd16', name: { fr: 'Logpom', en: 'Logpom' }, coords: [4.085, 9.775], zone_code: 'Z4' },
];

export default function MapSimulator({
  selectedQuartier,
  onFeeCalculated,
  selectedBoutiqueId: parentBoutiqueId,
  onBoutiqueSelect,
}: {
  selectedQuartier?: { id: string; nom: string; zone_code: string; latitude?: number; longitude?: number };
  onFeeCalculated?: (fee: number, delay: string) => void;
  selectedBoutiqueId?: string;
  onBoutiqueSelect?: (id: string) => void;
} = {}) {
  const { lang } = useApp();
  const [selectedCity, setSelectedCity] = useState<'yaounde' | 'douala'>('yaounde');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>('y2'); // default Melen
  const [activeBoutiqueId, setActiveBoutiqueId] = useState<string>('b0000000-0000-0000-0000-000000000002'); // default Melen
  const [distance, setDistance] = useState<number>(0);
  const [fee, setFee] = useState<number>(1000);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mapRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<any>(null);

  const t = {
    fr: {
      mapTitle: 'Calculez vos frais de livraison en direct',
      cityLabel: '1. Choisissez votre Ville :',
      neighborhoodLabel: '2. Cliquez pour choisir votre quartier :',
      boutiqueLabel: '3. Choisissez la boutique d’expédition :',
      distance: 'Distance de livraison :',
      shippingFee: 'Frais estimés :',
      routeDesc: 'Trajet optimisé',
      yaounde: 'Yaoundé',
      douala: 'Douala',
      selectQuartierBtn: 'Sélectionner un quartier...',
    },
    en: {
      mapTitle: 'Calculate your shipping costs live',
      cityLabel: '1. Choose your City:',
      neighborhoodLabel: '2. Click to choose your neighborhood:',
      boutiqueLabel: '3. Choose the shipping boutique:',
      distance: 'Shipping distance:',
      shippingFee: 'Estimated fee:',
      routeDesc: 'Optimized route',
      yaounde: 'Yaoundé',
      douala: 'Douala',
      selectQuartierBtn: 'Select a neighborhood...',
    },
  }[lang];

  // Distance calculator (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getNeighborhoodList = () => {
    return selectedCity === 'yaounde' ? YAOUNDE_NEIGHBORHOODS : DOUALA_NEIGHBORHOODS;
  };

  // Main routing logic
  const updateRouting = (nhCoords: Coords, boutiqueCoords: Coords, zoneCode: string, nhName: string) => {
    const dist = calculateDistance(boutiqueCoords[0], boutiqueCoords[1], nhCoords[0], nhCoords[1]);
    setDistance(Math.round(dist * 10) / 10);

    // Calculate fee based on distance
    let shippingFee = 1000;
    if (dist < 6) {
      shippingFee = 1000;
    } else if (dist >= 6 && dist < 15) {
      shippingFee = 1500;
    } else if (dist >= 15 && dist < 35) {
      shippingFee = 2000;
    } else if (dist >= 35 && dist < 230) {
      shippingFee = 3000;
    } else {
      shippingFee = 5000;
    }

    setFee(shippingFee);

    if (onFeeCalculated) {
      const delay = zoneCode === 'Z1' ? 'sous 2h' : zoneCode === 'Z2' ? 'sous 4h' : 'sous 24h';
      onFeeCalculated(shippingFee, delay);
    }

    // Update map view & polyline
    const map = mapRef.current;
    const L = LRef.current;
    if (map && L) {
      map.flyTo(nhCoords, 13, { duration: 1 });

      if (targetMarkerRef.current) {
        targetMarkerRef.current.setLatLng(nhCoords);
        targetMarkerRef.current.setPopupContent(`<strong>${nhName}</strong><br/>${t.routeDesc}`).openPopup();
      }

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      const polyline = L.polyline([nhCoords, boutiqueCoords], {
        color: 'var(--magenta)',
        weight: 4,
        dashArray: '5, 8',
        opacity: 0.8,
      }).addTo(map);

      polylineRef.current = polyline;
    }
  };

  const handleNeighborhoodSelect = (nh: Neighborhood) => {
    setSelectedNeighborhoodId(nh.id);
    setIsDrawerOpen(false);

    const boutique = DEPOTS.find((d) => d.id === activeBoutiqueId) || DEPOTS[0];
    updateRouting(nh.coords, boutique.coords, nh.zone_code, nh.name[lang]);
  };

  const handleBoutiqueSelect = (boutiqueId: string) => {
    setActiveBoutiqueId(boutiqueId);
    if (onBoutiqueSelect) {
      onBoutiqueSelect(boutiqueId);
    }

    const nhList = getNeighborhoodList();
    const currentNh = nhList.find((n) => n.id === selectedNeighborhoodId) || nhList[0];
    const boutique = DEPOTS.find((d) => d.id === boutiqueId) || DEPOTS[0];

    updateRouting(currentNh.coords, boutique.coords, currentNh.zone_code, currentNh.name[lang]);
  };

  const handleCityChange = (cityKey: 'yaounde' | 'douala') => {
    setSelectedCity(cityKey);
    const nhList = cityKey === 'yaounde' ? YAOUNDE_NEIGHBORHOODS : DOUALA_NEIGHBORHOODS;
    const defaultNh = nhList[0];
    setSelectedNeighborhoodId(defaultNh.id);
    setIsDrawerOpen(true); // auto open sliding drawer when city switches

    const boutique = DEPOTS.find((d) => d.id === activeBoutiqueId) || DEPOTS[0];
    
    // Pan map to city center
    const map = mapRef.current;
    if (map) {
      map.setView(cityKey === 'yaounde' ? [3.866, 11.520] : [4.050, 9.710], 12);
    }

    updateRouting(defaultNh.coords, boutique.coords, defaultNh.zone_code, defaultNh.name[lang]);
  };

  // Sync selectedBoutiqueId prop from parent
  useEffect(() => {
    if (parentBoutiqueId && parentBoutiqueId !== activeBoutiqueId) {
      setActiveBoutiqueId(parentBoutiqueId);
      const nhList = getNeighborhoodList();
      const currentNh = nhList.find((n) => n.id === selectedNeighborhoodId) || nhList[0];
      const boutique = DEPOTS.find((d) => d.id === parentBoutiqueId) || DEPOTS[0];
      updateRouting(currentNh.coords, boutique.coords, currentNh.zone_code, currentNh.name[lang]);
    }
  }, [parentBoutiqueId]);

  // Sync selectedQuartier prop from parent search box
  useEffect(() => {
    if (!selectedQuartier || !mapRef.current) return;

    const lat = selectedQuartier.latitude || 3.86;
    const lng = selectedQuartier.longitude || 11.52;
    const coords: Coords = [lat, lng];

    // Identify if the searched neighborhood matches Yaoundé or Douala
    const isDouala = selectedQuartier.zone_code === 'Z3' || selectedQuartier.zone_code === 'Z4';
    const targetCityKey = isDouala ? 'douala' : 'yaounde';
    setSelectedCity(targetCityKey);

    const nhList = targetCityKey === 'yaounde' ? YAOUNDE_NEIGHBORHOODS : DOUALA_NEIGHBORHOODS;
    
    // Find closest coordinate match or fallback to list addition
    let matchedNh = nhList.find((n) => n.name[lang].toLowerCase() === selectedQuartier.nom.toLowerCase());
    
    if (!matchedNh) {
      // Dynamic append to list to support new quartiers
      matchedNh = {
        id: `dyn-${selectedQuartier.id}`,
        name: { fr: selectedQuartier.nom, en: selectedQuartier.nom },
        coords: coords,
        zone_code: selectedQuartier.zone_code,
      };
      nhList.push(matchedNh);
    }

    setSelectedNeighborhoodId(matchedNh.id);

    const boutique = DEPOTS.find((d) => d.id === activeBoutiqueId) || DEPOTS[0];
    updateRouting(coords, boutique.coords, selectedQuartier.zone_code, selectedQuartier.nom);
  }, [selectedQuartier]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('leaflet').then((L) => {
      if (!containerRef.current) return;
      LRef.current = L;

      // Fix default icons
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      if (mapRef.current) return;

      const map = L.map(containerRef.current).setView(CITIES_CENTERS.yaounde, 12);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Add depot markers
      const hqIcon = L.divIcon({
        className: 'custom-hq-marker',
        html: `<div style="background-color: var(--forest); width: 26px; height: 26px; border-radius: 50%; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.3)">✚</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      DEPOTS.forEach((depot) => {
        L.marker(depot.coords, { icon: hqIcon })
          .addTo(map)
          .bindPopup(`<strong>${depot.name[lang]} Mediquipe</strong>`);
      });

      // Target marker
      const defaultNh = YAOUNDE_NEIGHBORHOODS[1]; // Melen
      const targetMarker = L.marker(defaultNh.coords)
        .addTo(map)
        .bindPopup(`<strong>${defaultNh.name[lang]}</strong>`);
      
      targetMarkerRef.current = targetMarker;

      // Draw initial polyline to default Melen boutique
      const polyline = L.polyline([defaultNh.coords, DEPOTS[0].coords], {
        color: 'var(--magenta)',
        weight: 4,
        dashArray: '5, 8',
        opacity: 0.8,
      }).addTo(map);
      
      polylineRef.current = polyline;

      updateRouting(defaultNh.coords, DEPOTS[0].coords, defaultNh.zone_code, defaultNh.name[lang]);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const CITIES_CENTERS = {
    yaounde: [3.866, 11.520] as Coords,
    douala: [4.050, 9.710] as Coords,
  };

  const currentNeighborhood = getNeighborhoodList().find((n) => n.id === selectedNeighborhoodId) || getNeighborhoodList()[0];
  const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';

  // Sliding Switch styles
  const citySliderStyle = {
    display: 'flex',
    position: 'relative' as const,
    background: 'var(--line)',
    borderRadius: '30px',
    padding: '4px',
    width: '260px',
    margin: '10px auto 14px',
    cursor: 'pointer',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
  };

  const cityOptionStyle = (isActive: boolean) => ({
    flex: 1,
    textAlign: 'center' as const,
    fontSize: '13px',
    fontWeight: 700,
    padding: '8px 0',
    color: isActive ? '#fff' : 'var(--ink-soft)',
    zIndex: 2,
    transition: 'color 0.25s',
  });

  const cityActiveBgStyle = {
    position: 'absolute' as const,
    top: '4px',
    bottom: '4px',
    left: selectedCity === 'yaounde' ? '4px' : '130px',
    width: '126px',
    background: 'var(--forest)',
    borderRadius: '26px',
    zIndex: 1,
    transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // Sliding Drawer style
  const drawerStyle = {
    maxHeight: isDrawerOpen ? '180px' : '0px',
    overflowY: 'auto' as const,
    transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s',
    border: isDrawerOpen ? '1px solid var(--line)' : 'none',
    borderRadius: '12px',
    padding: isDrawerOpen ? '10px' : '0px',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
    background: '#fff',
    marginTop: '6px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
  };

  return (
    <div style={{ background: 'var(--paper)', borderRadius: '16px', border: '1px solid var(--line)', padding: '18px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--forest)' }}>
        🗺️ {t.mapTitle}
      </h3>

      {/* City Sliding switch */}
      <div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)' }}>{t.cityLabel}</span>
        <div style={citySliderStyle} onClick={() => handleCityChange(selectedCity === 'yaounde' ? 'douala' : 'yaounde')}>
          <div style={cityActiveBgStyle} />
          <div style={cityOptionStyle(selectedCity === 'yaounde')}>{t.yaounde}</div>
          <div style={cityOptionStyle(selectedCity === 'douala')}>{t.douala}</div>
        </div>
      </div>

      {/* Neighborhood Sliding filter panel */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)' }}>
            {t.neighborhoodLabel}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '8px' }}
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          >
            {currentNeighborhood ? currentNeighborhood.name[lang] : t.selectQuartierBtn} {isDrawerOpen ? '▲' : '▼'}
          </button>
        </div>

        <div style={drawerStyle}>
          {getNeighborhoodList().map((nh) => (
            <button
              key={nh.id}
              type="button"
              onClick={() => handleNeighborhoodSelect(nh)}
              style={{
                borderRadius: '6px',
                padding: '5px 9px',
                fontSize: '11.5px',
                fontWeight: 500,
                border: '1px solid',
                borderColor: selectedNeighborhoodId === nh.id ? 'var(--magenta)' : 'var(--line)',
                background: selectedNeighborhoodId === nh.id ? 'var(--amber-soft)' : '#fff',
                color: selectedNeighborhoodId === nh.id ? 'var(--ink)' : 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              {nh.name[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Store selection row */}
      <div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '8px' }}>
          {t.boutiqueLabel}
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {DEPOTS.map((depot) => (
            <button
              key={depot.id}
              type="button"
              onClick={() => handleBoutiqueSelect(depot.id)}
              style={{
                flex: 1,
                minWidth: '100px',
                borderRadius: '10px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                border: '2px solid',
                borderColor: activeBoutiqueId === depot.id ? 'var(--forest)' : 'var(--line)',
                background: activeBoutiqueId === depot.id ? 'var(--sage-bg)' : '#fff',
                color: activeBoutiqueId === depot.id ? 'var(--forest)' : 'var(--ink-soft)',
                transition: 'all 0.15s',
              }}
            >
              🏬 {depot.name[lang].replace(' Boutique', '').replace(' Pharmacy', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Map display */}
      <div style={{ position: 'relative', width: '100%', height: '240px', borderRadius: '12px', overflow: 'hidden', zIndex: 10 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Realtime calculations display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', background: 'var(--sage-bg)', padding: '12px', borderRadius: '10px', border: '1px dashed var(--line)' }}>
        <div>
          <strong>{t.distance}</strong> <br />
          <span>{distance} km</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>{t.shippingFee}</strong> <br />
          <span style={{ color: 'var(--forest)', fontWeight: 800, fontSize: '15px' }}>{fmt(fee)}</span>
        </div>
      </div>
    </div>
  );
}
