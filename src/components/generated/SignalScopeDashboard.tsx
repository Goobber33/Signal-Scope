import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Signal, TowerControl, Activity, BarChart3, Filter, Menu, X, Plus, ChevronDown, Wifi, WifiOff, Smartphone, MapPinned, LogOut, User as UserIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from './AuthContext';
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
  const {
    user,
    logout,
    token
  } = useAuth();
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
  }, [token]);
  const fetchTowers = async () => {
    // In production, this would be an API call with auth token
    // const response = await fetch('http://localhost:8000/api/towers', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // const data = await response.json();
    // setTowers(data);

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
    // In production, this would be an API call with auth token
    // const response = await fetch('http://localhost:8000/api/reports', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // const data = await response.json();
    // setReports(data);

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
  const handleSubmitReport = async (report: Omit<SignalReport, 'id' | 'timestamp'>) => {
    // In production, this would be an API call with auth token
    // const response = await fetch('http://localhost:8000/api/reports', {
    //   method: 'POST',
    //   headers: { 
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(report)
    // });

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
  return <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors lg:hidden">
            {showSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Signal size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SignalScope</h1>
              <p className="text-xs text-gray-400">Network Analytics</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 max-w-2xl mx-auto px-6 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search by city, ZIP code, or coordinates (e.g., 40.7128, -74.0060)" value={searchQuery} onChange={e => handleSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowReportModal(true)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus size={18} />
            <span className="hidden sm:inline">Report Signal</span>
          </button>
          
          {/* User Menu */}
          <div className="flex items-center gap-3 pl-3 ml-3 border-l border-gray-800">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button onClick={logout} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative w-72 bg-gray-900 border-r border-gray-800 transition-transform duration-300 z-40 h-full flex flex-col`}>
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Filter size={16} />
              FILTERS
            </h2>
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Carrier</label>
              <div className="relative">
                <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-600">
                  {CARRIERS.map(carrier => <option key={carrier} value={carrier}>
                      {carrier}
                    </option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Activity size={16} />
              SIGNAL LEGEND
            </h3>
            <div className="space-y-2">
              {SIGNAL_RANGES.map(range => <div key={range.label} className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded" style={{
                backgroundColor: range.color
              }} />
                  <span className="flex-1">{range.label}</span>
                  <span className="text-gray-500">{range.min} to {range.max} dBm</span>
                </div>)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <TowerControl size={16} />
              TOWERS ({filteredTowers.length})
            </h3>
            <div className="space-y-2">
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
            }}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium">{tower.operator}</span>
                    <span className="text-xs text-gray-500">{tower.id}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    <div>Height: {tower.height}ft</div>
                    <div className="flex gap-1 mt-1">
                      {tower.tech.map(t => <span key={t} className="px-1.5 py-0.5 bg-pink-600/20 text-pink-400 rounded text-xs">
                          {t}
                        </span>)}
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <div ref={mapRef} className="absolute inset-0 bg-gray-900" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={64} className="mx-auto text-gray-700 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Interactive Map View</h3>
                  <p className="text-gray-500 text-sm max-w-md">
                    Map integration with Leaflet or Mapbox would render here.<br />
                    Showing towers, coverage heatmap, and user reports.
                  </p>
                  <div className="mt-6 text-xs text-gray-600">
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
            })} />)}

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
            })} />)}

              {selectedMarker && <div className="absolute bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl z-10 min-w-[250px]" style={{
              left: `${(selectedMarker.lng + 180) / 360 * 100}%`,
              top: `${(90 - selectedMarker.lat) / 180 * 100}%`,
              transform: 'translate(-50%, calc(-100% - 20px))'
            }}>
                  <button onClick={() => setSelectedMarker(null)} className="absolute top-2 right-2 text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                  {selectedMarker.type === 'tower' ? <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TowerControl size={20} className="text-pink-500" />
                        <h4 className="font-semibold">Tower {selectedMarker.id}</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Operator:</span>
                          <span className="font-medium">{(selectedMarker.data as Tower).operator}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Height:</span>
                          <span>{(selectedMarker.data as Tower).height}ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Technology:</span>
                          <span>{(selectedMarker.data as Tower).tech.join(', ')}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Location:</span>
                          <span className="text-gray-500">{selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div> : <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Signal size={20} className="text-green-500" />
                        <h4 className="font-semibold">Signal Report</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Carrier:</span>
                          <span className="font-medium">{(selectedMarker.data as SignalReport).carrier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Signal:</span>
                          <span style={{
                      color: getSignalColor((selectedMarker.data as SignalReport).signalStrength)
                    }}>
                            {(selectedMarker.data as SignalReport).signalStrength} dBm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Device:</span>
                          <span className="text-xs">{(selectedMarker.data as SignalReport).device}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Time:</span>
                          <span className="text-gray-500">
                            {new Date((selectedMarker.data as SignalReport).timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>}
                </div>}
            </div>
          </div>

          <div className="h-80 bg-gray-900 border-t border-gray-800 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Analytics Dashboard
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Towers by Carrier</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={analyticsData.towersByCarrier} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                        {analyticsData.towersByCarrier.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Avg Signal by ZIP</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analyticsData.avgSignalByZip}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="zip" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} />
                      <Bar dataKey="avgSignal" fill="#E20074" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Signal Trend (24h)</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={analyticsData.signalTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} />
                      <Line type="monotone" dataKey="signal" stroke="#10b981" strokeWidth={2} dot={{
                      fill: '#10b981'
                    }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-6 bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Latest Reports</h3>
                <div className="space-y-2">
                  {reports.slice(-5).reverse().map(report => <div key={report.id} className="flex items-center justify-between p-2 bg-gray-900 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{
                      backgroundColor: getSignalColor(report.signalStrength)
                    }} />
                        <span className="text-sm font-medium">{report.carrier}</span>
                        <span className="text-xs text-gray-500">{report.device}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm" style={{
                      color: getSignalColor(report.signalStrength)
                    }}>
                          {report.signalStrength} dBm
                        </span>
                        <span className="text-xs text-gray-500">
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

      {showReportModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-md">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPinned size={20} className="text-pink-500" />
                Submit Signal Report
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
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
        }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Location (Latitude)</label>
                <input type="number" name="lat" step="0.0001" required placeholder="40.7128" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Location (Longitude)</label>
                <input type="number" name="lng" step="0.0001" required placeholder="-74.0060" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Carrier</label>
                <select name="carrier" required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600">
                  <option value="">Select carrier</option>
                  <option value="T-Mobile">T-Mobile</option>
                  <option value="Verizon">Verizon</option>
                  <option value="AT&T">AT&T</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Signal Strength (dBm)</label>
                <input type="number" name="signalStrength" min="-120" max="0" required placeholder="-65" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Device Model</label>
                <input type="text" name="device" required placeholder="iPhone 14 Pro" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors font-medium">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};