import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Signal, TowerControl, Activity, BarChart3, Filter, Menu, X, Plus, ChevronDown, Wifi, WifiOff, Smartphone, MapPinned } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
type Tower = {
  id: string;
  lat: number;
  lng: number;
  operator: string;
  height: number;
  tech: string[];
};
type SignalReport = {
  id: string;
  lat: number;
  lng: number;
  carrier: string;
  signalStrength: number;
  device: string;
  timestamp: string;
};
type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  type: 'tower' | 'report';
  data: Tower | SignalReport;
};
const CARRIERS = ['T-Mobile', 'Verizon', 'AT&T', 'All'];
const SIGNAL_RANGES = [{
  min: -50,
  max: 0,
  color: '#10b981',
  label: 'Excellent'
}, {
  min: -80,
  max: -50,
  color: '#f59e0b',
  label: 'Good'
}, {
  min: -100,
  max: -80,
  color: '#ef4444',
  label: 'Poor'
}, {
  min: -120,
  max: -100,
  color: '#7f1d1d',
  label: 'Very Poor'
}];

// @component: SignalScopeDashboard
export const SignalScopeDashboard = () => {
  const [selectedCarrier, setSelectedCarrier] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mapCenter, setMapCenter] = useState({
    lat: 39.8283,
    lng: -98.5795
  });
  const [mapZoom, setMapZoom] = useState(5);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [reports, setReports] = useState<SignalReport[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetchTowers();
    fetchReports();
  }, []);
  const fetchTowers = async () => {
    const mockTowers: Tower[] = [{
      id: 't1',
      lat: 40.7128,
      lng: -74.0060,
      operator: 'T-Mobile',
      height: 150,
      tech: ['LTE', '5G']
    }, {
      id: 't2',
      lat: 34.0522,
      lng: -118.2437,
      operator: 'Verizon',
      height: 120,
      tech: ['LTE', '5G']
    }, {
      id: 't3',
      lat: 41.8781,
      lng: -87.6298,
      operator: 'AT&T',
      height: 180,
      tech: ['LTE']
    }, {
      id: 't4',
      lat: 29.7604,
      lng: -95.3698,
      operator: 'T-Mobile',
      height: 140,
      tech: ['LTE', '5G']
    }, {
      id: 't5',
      lat: 33.4484,
      lng: -112.0740,
      operator: 'Verizon',
      height: 160,
      tech: ['LTE', '5G']
    }, {
      id: 't6',
      lat: 39.7392,
      lng: -104.9903,
      operator: 'T-Mobile',
      height: 130,
      tech: ['5G']
    }, {
      id: 't7',
      lat: 47.6062,
      lng: -122.3321,
      operator: 'AT&T',
      height: 170,
      tech: ['LTE', '5G']
    }, {
      id: 't8',
      lat: 37.7749,
      lng: -122.4194,
      operator: 'T-Mobile',
      height: 145,
      tech: ['LTE', '5G']
    }];
    setTowers(mockTowers);
  };
  const fetchReports = async () => {
    const mockReports: SignalReport[] = [{
      id: 'r1',
      lat: 40.7580,
      lng: -73.9855,
      carrier: 'T-Mobile',
      signalStrength: -65,
      device: 'iPhone 14 Pro',
      timestamp: '2024-01-15T10:30:00Z'
    }, {
      id: 'r2',
      lat: 34.0522,
      lng: -118.2437,
      carrier: 'Verizon',
      signalStrength: -75,
      device: 'Samsung Galaxy S23',
      timestamp: '2024-01-15T11:00:00Z'
    }, {
      id: 'r3',
      lat: 41.8781,
      lng: -87.6298,
      carrier: 'AT&T',
      signalStrength: -90,
      device: 'Google Pixel 8',
      timestamp: '2024-01-15T12:15:00Z'
    }];
    setReports(mockReports);
  };
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const coords = parseCoordinates(query);
    if (coords) {
      setMapCenter(coords);
      setMapZoom(12);
    }
  };
  const parseCoordinates = (query: string): {
    lat: number;
    lng: number;
  } | null => {
    const coordPattern = /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/;
    const match = query.match(coordPattern);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  };
  const handleSubmitReport = (report: Omit<SignalReport, 'id' | 'timestamp'>) => {
    const newReport: SignalReport = {
      ...report,
      id: `r${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setReports([...reports, newReport]);
    setShowReportModal(false);
  };
  const filteredTowers = selectedCarrier === 'All' ? towers : towers.filter(t => t.operator === selectedCarrier);
  const getSignalColor = (strength: number): string => {
    const range = SIGNAL_RANGES.find(r => strength >= r.min && strength < r.max);
    return range?.color || '#7f1d1d';
  };
  const analyticsData = {
    towersByCarrier: [{
      name: 'T-Mobile',
      value: towers.filter(t => t.operator === 'T-Mobile').length,
      color: '#E20074'
    }, {
      name: 'Verizon',
      value: towers.filter(t => t.operator === 'Verizon').length,
      color: '#CD040B'
    }, {
      name: 'AT&T',
      value: towers.filter(t => t.operator === 'AT&T').length,
      color: '#009FDB'
    }],
    avgSignalByZip: [{
      zip: '10001',
      avgSignal: -68,
      carrier: 'T-Mobile'
    }, {
      zip: '90001',
      avgSignal: -72,
      carrier: 'Verizon'
    }, {
      zip: '60601',
      avgSignal: -85,
      carrier: 'AT&T'
    }, {
      zip: '77001',
      avgSignal: -70,
      carrier: 'T-Mobile'
    }, {
      zip: '85001',
      avgSignal: -75,
      carrier: 'Verizon'
    }],
    signalTrend: [{
      time: '00:00',
      signal: -70
    }, {
      time: '04:00',
      signal: -68
    }, {
      time: '08:00',
      signal: -75
    }, {
      time: '12:00',
      signal: -72
    }, {
      time: '16:00',
      signal: -78
    }, {
      time: '20:00',
      signal: -65
    }]
  };

  // @return
  return <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden" data-magicpath-id="0" data-magicpath-path="SignalScopeDashboard.tsx">
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0 z-50" data-magicpath-id="1" data-magicpath-path="SignalScopeDashboard.tsx">
        <div className="flex items-center gap-4" data-magicpath-id="2" data-magicpath-path="SignalScopeDashboard.tsx">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors lg:hidden" data-magicpath-id="3" data-magicpath-path="SignalScopeDashboard.tsx">
            {showSidebar ? <X size={20} data-magicpath-id="4" data-magicpath-path="SignalScopeDashboard.tsx" /> : <Menu size={20} data-magicpath-id="5" data-magicpath-path="SignalScopeDashboard.tsx" />}
          </button>
          <div className="flex items-center gap-3" data-magicpath-id="6" data-magicpath-path="SignalScopeDashboard.tsx">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg flex items-center justify-center" data-magicpath-id="7" data-magicpath-path="SignalScopeDashboard.tsx">
              <Signal size={24} className="text-white" data-magicpath-id="8" data-magicpath-path="SignalScopeDashboard.tsx" />
            </div>
            <div data-magicpath-id="9" data-magicpath-path="SignalScopeDashboard.tsx">
              <h1 className="text-xl font-bold" data-magicpath-id="10" data-magicpath-path="SignalScopeDashboard.tsx">SignalScope</h1>
              <p className="text-xs text-gray-400" data-magicpath-id="11" data-magicpath-path="SignalScopeDashboard.tsx">Network Analytics</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 max-w-2xl mx-auto px-6 hidden md:block" data-magicpath-id="12" data-magicpath-path="SignalScopeDashboard.tsx">
          <div className="relative" data-magicpath-id="13" data-magicpath-path="SignalScopeDashboard.tsx">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} data-magicpath-id="14" data-magicpath-path="SignalScopeDashboard.tsx" />
            <input type="text" placeholder="Search by city, ZIP code, or coordinates (e.g., 40.7128, -74.0060)" value={searchQuery} onChange={e => handleSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent" data-magicpath-id="15" data-magicpath-path="SignalScopeDashboard.tsx" />
          </div>
        </div>

        <div className="flex items-center gap-3" data-magicpath-id="16" data-magicpath-path="SignalScopeDashboard.tsx">
          <button onClick={() => setShowReportModal(true)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2" data-magicpath-id="17" data-magicpath-path="SignalScopeDashboard.tsx">
            <Plus size={18} data-magicpath-id="18" data-magicpath-path="SignalScopeDashboard.tsx" />
            <span className="hidden sm:inline" data-magicpath-id="19" data-magicpath-path="SignalScopeDashboard.tsx">Report Signal</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden" data-magicpath-id="20" data-magicpath-path="SignalScopeDashboard.tsx">
        <aside className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative w-72 bg-gray-900 border-r border-gray-800 transition-transform duration-300 z-40 h-full flex flex-col`} data-magicpath-id="21" data-magicpath-path="SignalScopeDashboard.tsx">
          <div className="p-4 border-b border-gray-800" data-magicpath-id="22" data-magicpath-path="SignalScopeDashboard.tsx">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2" data-magicpath-id="23" data-magicpath-path="SignalScopeDashboard.tsx">
              <Filter size={16} data-magicpath-id="24" data-magicpath-path="SignalScopeDashboard.tsx" />
              FILTERS
            </h2>
            <div className="space-y-2" data-magicpath-id="25" data-magicpath-path="SignalScopeDashboard.tsx">
              <label className="text-xs text-gray-500" data-magicpath-id="26" data-magicpath-path="SignalScopeDashboard.tsx">Carrier</label>
              <div className="relative" data-magicpath-id="27" data-magicpath-path="SignalScopeDashboard.tsx">
                <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-600" data-magicpath-id="28" data-magicpath-path="SignalScopeDashboard.tsx">
                  {CARRIERS.map(carrier => <option key={carrier} value={carrier} data-magicpath-id="29" data-magicpath-path="SignalScopeDashboard.tsx">
                      {carrier}
                    </option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} data-magicpath-id="30" data-magicpath-path="SignalScopeDashboard.tsx" />
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-800" data-magicpath-id="31" data-magicpath-path="SignalScopeDashboard.tsx">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2" data-magicpath-id="32" data-magicpath-path="SignalScopeDashboard.tsx">
              <Activity size={16} data-magicpath-id="33" data-magicpath-path="SignalScopeDashboard.tsx" />
              SIGNAL LEGEND
            </h3>
            <div className="space-y-2" data-magicpath-id="34" data-magicpath-path="SignalScopeDashboard.tsx">
              {SIGNAL_RANGES.map(range => <div key={range.label} className="flex items-center gap-2 text-xs" data-magicpath-id="35" data-magicpath-path="SignalScopeDashboard.tsx">
                  <div className="w-4 h-4 rounded" style={{
                backgroundColor: range.color
              }} data-magicpath-id="36" data-magicpath-path="SignalScopeDashboard.tsx" />
                  <span className="flex-1" data-magicpath-id="37" data-magicpath-path="SignalScopeDashboard.tsx">{range.label}</span>
                  <span className="text-gray-500" data-magicpath-id="38" data-magicpath-path="SignalScopeDashboard.tsx">{range.min} to {range.max} dBm</span>
                </div>)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4" data-magicpath-id="39" data-magicpath-path="SignalScopeDashboard.tsx">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2" data-magicpath-id="40" data-magicpath-path="SignalScopeDashboard.tsx">
              <TowerControl size={16} data-magicpath-id="41" data-magicpath-path="SignalScopeDashboard.tsx" />
              TOWERS ({filteredTowers.length})
            </h3>
            <div className="space-y-2" data-magicpath-id="42" data-magicpath-path="SignalScopeDashboard.tsx">
              {filteredTowers.slice(0, 10).map(tower => <div key={tower.id} className="p-3 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer transition-colors" onClick={() => {
              setMapCenter({
                lat: tower.lat,
                lng: tower.lng
              });
              setMapZoom(14);
              setSelectedMarker({
                id: tower.id,
                lat: tower.lat,
                lng: tower.lng,
                type: 'tower',
                data: tower
              });
            }} data-magicpath-id="43" data-magicpath-path="SignalScopeDashboard.tsx">
                  <div className="flex items-start justify-between mb-1" data-magicpath-id="44" data-magicpath-path="SignalScopeDashboard.tsx">
                    <span className="text-xs font-medium" data-magicpath-id="45" data-magicpath-path="SignalScopeDashboard.tsx">{tower.operator}</span>
                    <span className="text-xs text-gray-500" data-magicpath-id="46" data-magicpath-path="SignalScopeDashboard.tsx">{tower.id}</span>
                  </div>
                  <div className="text-xs text-gray-400" data-magicpath-id="47" data-magicpath-path="SignalScopeDashboard.tsx">
                    <div data-magicpath-id="48" data-magicpath-path="SignalScopeDashboard.tsx">Height: {tower.height}ft</div>
                    <div className="flex gap-1 mt-1" data-magicpath-id="49" data-magicpath-path="SignalScopeDashboard.tsx">
                      {tower.tech.map(t => <span key={t} className="px-1.5 py-0.5 bg-pink-600/20 text-pink-400 rounded text-xs" data-magicpath-id="50" data-magicpath-path="SignalScopeDashboard.tsx">
                          {t}
                        </span>)}
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden" data-magicpath-id="51" data-magicpath-path="SignalScopeDashboard.tsx">
          <div className="flex-1 relative" data-magicpath-id="52" data-magicpath-path="SignalScopeDashboard.tsx">
            <div ref={mapRef} className="absolute inset-0 bg-gray-900" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} data-magicpath-id="53" data-magicpath-path="SignalScopeDashboard.tsx">
              <div className="absolute inset-0 flex items-center justify-center" data-magicpath-id="54" data-magicpath-path="SignalScopeDashboard.tsx">
                <div className="text-center" data-magicpath-id="55" data-magicpath-path="SignalScopeDashboard.tsx">
                  <MapPin size={64} className="mx-auto text-gray-700 mb-4" data-magicpath-id="56" data-magicpath-path="SignalScopeDashboard.tsx" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2" data-magicpath-id="57" data-magicpath-path="SignalScopeDashboard.tsx">Interactive Map View</h3>
                  <p className="text-gray-500 text-sm max-w-md" data-magicpath-id="58" data-magicpath-path="SignalScopeDashboard.tsx">
                    Map integration with Leaflet or Mapbox would render here.<br data-magicpath-id="59" data-magicpath-path="SignalScopeDashboard.tsx" />
                    Showing towers, coverage heatmap, and user reports.
                  </p>
                  <div className="mt-6 text-xs text-gray-600" data-magicpath-id="60" data-magicpath-path="SignalScopeDashboard.tsx">
                    Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)} | Zoom: {mapZoom}
                  </div>
                </div>
              </div>

              {filteredTowers.map(tower => <div key={tower.id} className="absolute w-8 h-8 bg-pink-600 rounded-full border-4 border-pink-400/30 cursor-pointer hover:scale-110 transition-transform" style={{
              left: `${(tower.lng + 180) / 360 * 100}%`,
              top: `${(90 - tower.lat) / 180 * 100}%`,
              transform: 'translate(-50%, -50%)'
            }} onClick={() => setSelectedMarker({
              id: tower.id,
              lat: tower.lat,
              lng: tower.lng,
              type: 'tower',
              data: tower
            })} data-magicpath-id="61" data-magicpath-path="SignalScopeDashboard.tsx" />)}

              {reports.map(report => <div key={report.id} className="absolute w-6 h-6 rounded-full border-2 border-white cursor-pointer hover:scale-110 transition-transform" style={{
              left: `${(report.lng + 180) / 360 * 100}%`,
              top: `${(90 - report.lat) / 180 * 100}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: getSignalColor(report.signalStrength)
            }} onClick={() => setSelectedMarker({
              id: report.id,
              lat: report.lat,
              lng: report.lng,
              type: 'report',
              data: report
            })} data-magicpath-id="62" data-magicpath-path="SignalScopeDashboard.tsx" />)}

              {selectedMarker && <div className="absolute bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl z-10 min-w-[250px]" style={{
              left: `${(selectedMarker.lng + 180) / 360 * 100}%`,
              top: `${(90 - selectedMarker.lat) / 180 * 100}%`,
              transform: 'translate(-50%, calc(-100% - 20px))'
            }} data-magicpath-id="63" data-magicpath-path="SignalScopeDashboard.tsx">
                  <button onClick={() => setSelectedMarker(null)} className="absolute top-2 right-2 text-gray-400 hover:text-white" data-magicpath-id="64" data-magicpath-path="SignalScopeDashboard.tsx">
                    <X size={16} data-magicpath-id="65" data-magicpath-path="SignalScopeDashboard.tsx" />
                  </button>
                  {selectedMarker.type === 'tower' ? <div data-magicpath-id="66" data-magicpath-path="SignalScopeDashboard.tsx">
                      <div className="flex items-center gap-2 mb-3" data-magicpath-id="67" data-magicpath-path="SignalScopeDashboard.tsx">
                        <TowerControl size={20} className="text-pink-500" data-magicpath-id="68" data-magicpath-path="SignalScopeDashboard.tsx" />
                        <h4 className="font-semibold" data-magicpath-id="69" data-magicpath-path="SignalScopeDashboard.tsx">Tower {selectedMarker.id}</h4>
                      </div>
                      <div className="space-y-2 text-sm" data-magicpath-id="70" data-magicpath-path="SignalScopeDashboard.tsx">
                        <div className="flex justify-between" data-magicpath-id="71" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="72" data-magicpath-path="SignalScopeDashboard.tsx">Operator:</span>
                          <span className="font-medium" data-magicpath-id="73" data-magicpath-path="SignalScopeDashboard.tsx">{(selectedMarker.data as Tower).operator}</span>
                        </div>
                        <div className="flex justify-between" data-magicpath-id="74" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="75" data-magicpath-path="SignalScopeDashboard.tsx">Height:</span>
                          <span data-magicpath-id="76" data-magicpath-path="SignalScopeDashboard.tsx">{(selectedMarker.data as Tower).height}ft</span>
                        </div>
                        <div className="flex justify-between" data-magicpath-id="77" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="78" data-magicpath-path="SignalScopeDashboard.tsx">Technology:</span>
                          <span data-magicpath-id="79" data-magicpath-path="SignalScopeDashboard.tsx">{(selectedMarker.data as Tower).tech.join(', ')}</span>
                        </div>
                        <div className="flex justify-between text-xs" data-magicpath-id="80" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="81" data-magicpath-path="SignalScopeDashboard.tsx">Location:</span>
                          <span className="text-gray-500" data-magicpath-id="82" data-magicpath-path="SignalScopeDashboard.tsx">{selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div> : <div data-magicpath-id="83" data-magicpath-path="SignalScopeDashboard.tsx">
                      <div className="flex items-center gap-2 mb-3" data-magicpath-id="84" data-magicpath-path="SignalScopeDashboard.tsx">
                        <Signal size={20} className="text-green-500" data-magicpath-id="85" data-magicpath-path="SignalScopeDashboard.tsx" />
                        <h4 className="font-semibold" data-magicpath-id="86" data-magicpath-path="SignalScopeDashboard.tsx">Signal Report</h4>
                      </div>
                      <div className="space-y-2 text-sm" data-magicpath-id="87" data-magicpath-path="SignalScopeDashboard.tsx">
                        <div className="flex justify-between" data-magicpath-id="88" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="89" data-magicpath-path="SignalScopeDashboard.tsx">Carrier:</span>
                          <span className="font-medium" data-magicpath-id="90" data-magicpath-path="SignalScopeDashboard.tsx">{(selectedMarker.data as SignalReport).carrier}</span>
                        </div>
                        <div className="flex justify-between" data-magicpath-id="91" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="92" data-magicpath-path="SignalScopeDashboard.tsx">Signal:</span>
                          <span style={{
                      color: getSignalColor((selectedMarker.data as SignalReport).signalStrength)
                    }} data-magicpath-id="93" data-magicpath-path="SignalScopeDashboard.tsx">
                            {(selectedMarker.data as SignalReport).signalStrength} dBm
                          </span>
                        </div>
                        <div className="flex justify-between" data-magicpath-id="94" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="95" data-magicpath-path="SignalScopeDashboard.tsx">Device:</span>
                          <span className="text-xs" data-magicpath-id="96" data-magicpath-path="SignalScopeDashboard.tsx">{(selectedMarker.data as SignalReport).device}</span>
                        </div>
                        <div className="flex justify-between text-xs" data-magicpath-id="97" data-magicpath-path="SignalScopeDashboard.tsx">
                          <span className="text-gray-400" data-magicpath-id="98" data-magicpath-path="SignalScopeDashboard.tsx">Time:</span>
                          <span className="text-gray-500" data-magicpath-id="99" data-magicpath-path="SignalScopeDashboard.tsx">
                            {new Date((selectedMarker.data as SignalReport).timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>}
                </div>}
            </div>
          </div>

          <div className="h-80 bg-gray-900 border-t border-gray-800 overflow-y-auto" data-magicpath-id="100" data-magicpath-path="SignalScopeDashboard.tsx">
            <div className="p-6" data-magicpath-id="101" data-magicpath-path="SignalScopeDashboard.tsx">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" data-magicpath-id="102" data-magicpath-path="SignalScopeDashboard.tsx">
                <BarChart3 size={20} data-magicpath-id="103" data-magicpath-path="SignalScopeDashboard.tsx" />
                Analytics Dashboard
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-magicpath-id="104" data-magicpath-path="SignalScopeDashboard.tsx">
                <div className="bg-gray-800 rounded-lg p-4" data-magicpath-id="105" data-magicpath-path="SignalScopeDashboard.tsx">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3" data-magicpath-id="106" data-magicpath-path="SignalScopeDashboard.tsx">Towers by Carrier</h3>
                  <ResponsiveContainer width="100%" height={180} data-magicpath-id="107" data-magicpath-path="SignalScopeDashboard.tsx">
                    <PieChart data-magicpath-id="108" data-magicpath-path="SignalScopeDashboard.tsx">
                      <Pie data={analyticsData.towersByCarrier} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" data-magicpath-id="109" data-magicpath-path="SignalScopeDashboard.tsx">
                        {analyticsData.towersByCarrier.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} data-magicpath-id="110" data-magicpath-path="SignalScopeDashboard.tsx" />)}
                      </Pie>
                      <Tooltip contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} data-magicpath-id="111" data-magicpath-path="SignalScopeDashboard.tsx" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-4" data-magicpath-id="112" data-magicpath-path="SignalScopeDashboard.tsx">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3" data-magicpath-id="113" data-magicpath-path="SignalScopeDashboard.tsx">Avg Signal by ZIP</h3>
                  <ResponsiveContainer width="100%" height={180} data-magicpath-id="114" data-magicpath-path="SignalScopeDashboard.tsx">
                    <BarChart data={analyticsData.avgSignalByZip} data-magicpath-id="115" data-magicpath-path="SignalScopeDashboard.tsx">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" data-magicpath-id="116" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <XAxis dataKey="zip" stroke="#9ca3af" fontSize={12} data-magicpath-id="117" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <YAxis stroke="#9ca3af" fontSize={12} data-magicpath-id="118" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <Tooltip contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} data-magicpath-id="119" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <Bar dataKey="avgSignal" fill="#E20074" radius={[4, 4, 0, 0]} data-magicpath-id="120" data-magicpath-path="SignalScopeDashboard.tsx" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-4" data-magicpath-id="121" data-magicpath-path="SignalScopeDashboard.tsx">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3" data-magicpath-id="122" data-magicpath-path="SignalScopeDashboard.tsx">Signal Trend (24h)</h3>
                  <ResponsiveContainer width="100%" height={180} data-magicpath-id="123" data-magicpath-path="SignalScopeDashboard.tsx">
                    <LineChart data={analyticsData.signalTrend} data-magicpath-id="124" data-magicpath-path="SignalScopeDashboard.tsx">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" data-magicpath-id="125" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} data-magicpath-id="126" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <YAxis stroke="#9ca3af" fontSize={12} data-magicpath-id="127" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <Tooltip contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} data-magicpath-id="128" data-magicpath-path="SignalScopeDashboard.tsx" />
                      <Line type="monotone" dataKey="signal" stroke="#10b981" strokeWidth={2} dot={{
                      fill: '#10b981'
                    }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-6 bg-gray-800 rounded-lg p-4" data-magicpath-id="129" data-magicpath-path="SignalScopeDashboard.tsx">
                <h3 className="text-sm font-semibold text-gray-400 mb-3" data-magicpath-id="130" data-magicpath-path="SignalScopeDashboard.tsx">Latest Reports</h3>
                <div className="space-y-2" data-magicpath-id="131" data-magicpath-path="SignalScopeDashboard.tsx">
                  {reports.slice(-5).reverse().map(report => <div key={report.id} className="flex items-center justify-between p-2 bg-gray-900 rounded" data-magicpath-id="132" data-magicpath-path="SignalScopeDashboard.tsx">
                      <div className="flex items-center gap-3" data-magicpath-id="133" data-magicpath-path="SignalScopeDashboard.tsx">
                        <div className="w-3 h-3 rounded-full" style={{
                      backgroundColor: getSignalColor(report.signalStrength)
                    }} data-magicpath-id="134" data-magicpath-path="SignalScopeDashboard.tsx" />
                        <span className="text-sm font-medium" data-magicpath-id="135" data-magicpath-path="SignalScopeDashboard.tsx">{report.carrier}</span>
                        <span className="text-xs text-gray-500" data-magicpath-id="136" data-magicpath-path="SignalScopeDashboard.tsx">{report.device}</span>
                      </div>
                      <div className="flex items-center gap-4" data-magicpath-id="137" data-magicpath-path="SignalScopeDashboard.tsx">
                        <span className="text-sm" style={{
                      color: getSignalColor(report.signalStrength)
                    }} data-magicpath-id="138" data-magicpath-path="SignalScopeDashboard.tsx">
                          {report.signalStrength} dBm
                        </span>
                        <span className="text-xs text-gray-500" data-magicpath-id="139" data-magicpath-path="SignalScopeDashboard.tsx">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>)}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showReportModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-magicpath-id="140" data-magicpath-path="SignalScopeDashboard.tsx">
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md" data-magicpath-id="141" data-magicpath-path="SignalScopeDashboard.tsx">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between" data-magicpath-id="142" data-magicpath-path="SignalScopeDashboard.tsx">
              <h3 className="text-lg font-semibold flex items-center gap-2" data-magicpath-id="143" data-magicpath-path="SignalScopeDashboard.tsx">
                <MapPinned size={20} className="text-pink-500" data-magicpath-id="144" data-magicpath-path="SignalScopeDashboard.tsx" />
                Submit Signal Report
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white" data-magicpath-id="145" data-magicpath-path="SignalScopeDashboard.tsx">
                <X size={20} data-magicpath-id="146" data-magicpath-path="SignalScopeDashboard.tsx" />
              </button>
            </div>
            <form onSubmit={e => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmitReport({
            lat: parseFloat(formData.get('lat') as string),
            lng: parseFloat(formData.get('lng') as string),
            carrier: formData.get('carrier') as string,
            signalStrength: parseInt(formData.get('signalStrength') as string),
            device: formData.get('device') as string
          });
        }} className="p-6 space-y-4" data-magicpath-id="147" data-magicpath-path="SignalScopeDashboard.tsx">
              <div data-magicpath-id="148" data-magicpath-path="SignalScopeDashboard.tsx">
                <label className="block text-sm font-medium text-gray-400 mb-2" data-magicpath-id="149" data-magicpath-path="SignalScopeDashboard.tsx">Location (Latitude)</label>
                <input type="number" name="lat" step="0.0001" required placeholder="40.7128" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" data-magicpath-id="150" data-magicpath-path="SignalScopeDashboard.tsx" />
              </div>
              <div data-magicpath-id="151" data-magicpath-path="SignalScopeDashboard.tsx">
                <label className="block text-sm font-medium text-gray-400 mb-2" data-magicpath-id="152" data-magicpath-path="SignalScopeDashboard.tsx">Location (Longitude)</label>
                <input type="number" name="lng" step="0.0001" required placeholder="-74.0060" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" data-magicpath-id="153" data-magicpath-path="SignalScopeDashboard.tsx" />
              </div>
              <div data-magicpath-id="154" data-magicpath-path="SignalScopeDashboard.tsx">
                <label className="block text-sm font-medium text-gray-400 mb-2" data-magicpath-id="155" data-magicpath-path="SignalScopeDashboard.tsx">Carrier</label>
                <select name="carrier" required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" data-magicpath-id="156" data-magicpath-path="SignalScopeDashboard.tsx">
                  <option value="" data-magicpath-id="157" data-magicpath-path="SignalScopeDashboard.tsx">Select carrier</option>
                  <option value="T-Mobile" data-magicpath-id="158" data-magicpath-path="SignalScopeDashboard.tsx">T-Mobile</option>
                  <option value="Verizon" data-magicpath-id="159" data-magicpath-path="SignalScopeDashboard.tsx">Verizon</option>
                  <option value="AT&T" data-magicpath-id="160" data-magicpath-path="SignalScopeDashboard.tsx">AT&T</option>
                </select>
              </div>
              <div data-magicpath-id="161" data-magicpath-path="SignalScopeDashboard.tsx">
                <label className="block text-sm font-medium text-gray-400 mb-2" data-magicpath-id="162" data-magicpath-path="SignalScopeDashboard.tsx">Signal Strength (dBm)</label>
                <input type="number" name="signalStrength" min="-120" max="0" required placeholder="-65" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" data-magicpath-id="163" data-magicpath-path="SignalScopeDashboard.tsx" />
              </div>
              <div data-magicpath-id="164" data-magicpath-path="SignalScopeDashboard.tsx">
                <label className="block text-sm font-medium text-gray-400 mb-2" data-magicpath-id="165" data-magicpath-path="SignalScopeDashboard.tsx">Device Model</label>
                <input type="text" name="device" required placeholder="iPhone 14 Pro" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" data-magicpath-id="166" data-magicpath-path="SignalScopeDashboard.tsx" />
              </div>
              <div className="flex gap-3 pt-4" data-magicpath-id="167" data-magicpath-path="SignalScopeDashboard.tsx">
                <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors" data-magicpath-id="168" data-magicpath-path="SignalScopeDashboard.tsx">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors font-medium" data-magicpath-id="169" data-magicpath-path="SignalScopeDashboard.tsx">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};