import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Signal, TowerControl, Activity, BarChart3, Filter, Menu, X, Plus, ChevronDown, Wifi, WifiOff, Smartphone, MapPinned, LogOut, User as UserIcon, Navigation, Star, Home, Briefcase, TrendingUp, AlertCircle, CheckCircle2, Award } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from './AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to update map center when mapCenter state changes
function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const lastUpdateRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  
  useEffect(() => {
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    // Only update if the view is actually different (avoid loops)
    const centerDiff = Math.abs(currentCenter.lat - center[0]) > 0.001 || 
                       Math.abs(currentCenter.lng - center[1]) > 0.001;
    const zoomDiff = Math.abs(currentZoom - zoom) > 0.5;
    
    // Check if this is a duplicate update (same center/zoom as last update)
    const isDuplicate = lastUpdateRef.current?.center[0] === center[0] && 
                       lastUpdateRef.current?.center[1] === center[1] &&
                       lastUpdateRef.current?.zoom === zoom;
    
    if ((centerDiff || zoomDiff) && !isDuplicate) {
      lastUpdateRef.current = { center, zoom };
      map.setView(center, zoom, { animate: false });
    }
  }, [map, center, zoom]);
  
  return null;
}

// Component to track user map interactions
function MapInteractionTracker({ 
  onMoveEnd, 
  onZoomEnd 
}: { 
  onMoveEnd: (center: { lat: number; lng: number }, zoom: number) => void;
  onZoomEnd: (zoom: number) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      onMoveEnd({ lat: center.lat, lng: center.lng }, map.getZoom());
    };
    
    const handleZoomEnd = () => {
      onZoomEnd(map.getZoom());
    };
    
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleZoomEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, onMoveEnd, onZoomEnd]);
  
  return null;
}

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
type FavoriteLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'home' | 'work' | 'custom';
};
type CarrierComparison = {
  carrier: string;
  avgSignal: number;
  towerCount: number;
  coverageScore: number; // 0-100
  recommendation: 'best' | 'good' | 'fair' | 'poor';
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
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [carrierComparison, setCarrierComparison] = useState<CarrierComparison[] | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCoverageHeatmap, setShowCoverageHeatmap] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    fetchTowers();
    fetchReports();
    loadFavoriteLocations();
  }, [token]);

  // Calculate carrier comparison for current map center
  useEffect(() => {
    if (towers.length > 0) {
      calculateCarrierComparison(mapCenter.lat, mapCenter.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [towers.length, mapCenter.lat, mapCenter.lng, reports.length]);

  // Handle user map interactions (pan/zoom)
  const handleMapMoveEnd = (center: { lat: number; lng: number }, zoom: number) => {
    // Only update if significantly different to avoid loops
    const centerDiff = Math.abs(mapCenter.lat - center.lat) > 0.001 || 
                       Math.abs(mapCenter.lng - center.lng) > 0.001;
    const zoomDiff = Math.abs(mapZoom - zoom) > 0.5;
    
    if (centerDiff || zoomDiff) {
      setMapCenter(center);
      setMapZoom(zoom);
    }
  };
  
  const handleMapZoomEnd = (zoom: number) => {
    if (Math.abs(mapZoom - zoom) > 0.5) {
      setMapZoom(zoom);
    }
  };
  const fetchTowers = async () => {
    // In production, this would be an API call with auth token
    // const response = await fetch('http://localhost:8000/api/towers', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // const data = await response.json();
    // setTowers(data);

    // Comprehensive tower data for major US cities
    const mockTowers: Tower[] = [
      // New York City area
      { id: 't1', lat: 40.7128, lng: -74.0060, operator: 'T-Mobile', height: 150, tech: ['LTE', '5G'] },
      { id: 't2', lat: 40.7580, lng: -73.9855, operator: 'Verizon', height: 165, tech: ['LTE', '5G'] },
      { id: 't3', lat: 40.7282, lng: -74.0776, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't4', lat: 40.7614, lng: -73.9776, operator: 'T-Mobile', height: 155, tech: ['5G'] },
      { id: 't5', lat: 40.7505, lng: -73.9934, operator: 'Verizon', height: 160, tech: ['LTE', '5G'] },
      { id: 't6', lat: 40.6892, lng: -74.0445, operator: 'AT&T', height: 170, tech: ['LTE', '5G'] },
      { id: 't7', lat: 40.7489, lng: -73.9680, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't8', lat: 40.6943, lng: -73.9249, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      
      // Los Angeles area
      { id: 't9', lat: 34.0522, lng: -118.2437, operator: 'Verizon', height: 120, tech: ['LTE', '5G'] },
      { id: 't10', lat: 34.0537, lng: -118.2425, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't11', lat: 34.0689, lng: -118.4452, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't12', lat: 34.1478, lng: -118.1445, operator: 'Verizon', height: 130, tech: ['5G'] },
      { id: 't13', lat: 34.0195, lng: -118.4912, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't14', lat: 34.0928, lng: -118.3287, operator: 'AT&T', height: 155, tech: ['LTE', '5G'] },
      { id: 't15', lat: 34.0522, lng: -118.4158, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      
      // Chicago area
      { id: 't16', lat: 41.8781, lng: -87.6298, operator: 'AT&T', height: 180, tech: ['LTE'] },
      { id: 't17', lat: 41.8818, lng: -87.6231, operator: 'T-Mobile', height: 165, tech: ['LTE', '5G'] },
      { id: 't18', lat: 41.8842, lng: -87.6324, operator: 'Verizon', height: 170, tech: ['LTE', '5G'] },
      { id: 't19', lat: 41.8992, lng: -87.6250, operator: 'AT&T', height: 175, tech: ['LTE', '5G'] },
      { id: 't20', lat: 41.8676, lng: -87.6244, operator: 'T-Mobile', height: 160, tech: ['5G'] },
      { id: 't21', lat: 41.8789, lng: -87.6359, operator: 'Verizon', height: 185, tech: ['LTE', '5G'] },
      
      // Houston area
      { id: 't22', lat: 29.7604, lng: -95.3698, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't23', lat: 29.7589, lng: -95.3677, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't24', lat: 29.7516, lng: -95.3605, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't25', lat: 29.7628, lng: -95.3830, operator: 'T-Mobile', height: 135, tech: ['5G'] },
      { id: 't26', lat: 29.7764, lng: -95.3760, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      
      // Phoenix area
      { id: 't27', lat: 33.4484, lng: -112.0740, operator: 'Verizon', height: 160, tech: ['LTE', '5G'] },
      { id: 't28', lat: 33.4531, lng: -112.0715, operator: 'T-Mobile', height: 150, tech: ['LTE', '5G'] },
      { id: 't29', lat: 33.4490, lng: -112.0734, operator: 'AT&T', height: 165, tech: ['LTE', '5G'] },
      { id: 't30', lat: 33.4629, lng: -112.0711, operator: 'Verizon', height: 155, tech: ['5G'] },
      
      // Philadelphia area
      { id: 't31', lat: 39.9526, lng: -75.1652, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't32', lat: 39.9496, lng: -75.1503, operator: 'Verizon', height: 160, tech: ['LTE', '5G'] },
      { id: 't33', lat: 39.9612, lng: -75.1598, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't34', lat: 39.9538, lng: -75.1974, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // San Antonio area
      { id: 't35', lat: 29.4241, lng: -98.4936, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't36', lat: 29.4249, lng: -98.4946, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't37', lat: 29.4316, lng: -98.4869, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      
      // San Diego area
      { id: 't38', lat: 32.7157, lng: -117.1611, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't39', lat: 32.7153, lng: -117.1572, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't40', lat: 32.7239, lng: -117.1681, operator: 'AT&T', height: 135, tech: ['5G'] },
      { id: 't41', lat: 32.7078, lng: -117.1568, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      
      // Dallas area
      { id: 't42', lat: 32.7767, lng: -96.7970, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't43', lat: 32.7781, lng: -96.7954, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't44', lat: 32.7825, lng: -96.7975, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't45', lat: 32.7688, lng: -96.7959, operator: 'AT&T', height: 160, tech: ['5G'] },
      
      // San Jose area
      { id: 't46', lat: 37.3382, lng: -121.8863, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't47', lat: 37.3394, lng: -121.8950, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't48', lat: 37.3349, lng: -121.8883, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      
      // Austin area
      { id: 't49', lat: 30.2672, lng: -97.7431, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't50', lat: 30.2676, lng: -97.7429, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't51', lat: 30.2747, lng: -97.7404, operator: 'AT&T', height: 145, tech: ['5G'] },
      { id: 't52', lat: 30.2596, lng: -97.7386, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      
      // Jacksonville area
      { id: 't53', lat: 30.3322, lng: -81.6557, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't54', lat: 30.3328, lng: -81.6586, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't55', lat: 30.3376, lng: -81.6613, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      
      // Fort Worth area
      { id: 't56', lat: 32.7555, lng: -97.3308, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't57', lat: 32.7489, lng: -97.3294, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't58', lat: 32.7601, lng: -97.3332, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Columbus area
      { id: 't59', lat: 39.9612, lng: -82.9988, operator: 'T-Mobile', height: 150, tech: ['LTE', '5G'] },
      { id: 't60', lat: 39.9623, lng: -83.0006, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't61', lat: 39.9549, lng: -83.0015, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      
      // Charlotte area
      { id: 't62', lat: 35.2271, lng: -80.8431, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't63', lat: 35.2277, lng: -80.8436, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't64', lat: 35.2313, lng: -80.8477, operator: 'T-Mobile', height: 135, tech: ['5G'] },
      
      // San Francisco area
      { id: 't65', lat: 37.7749, lng: -122.4194, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't66', lat: 37.7849, lng: -122.4094, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't67', lat: 37.7742, lng: -122.4171, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't68', lat: 37.7749, lng: -122.4313, operator: 'T-Mobile', height: 135, tech: ['5G'] },
      { id: 't69', lat: 37.7949, lng: -122.4094, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      
      // Indianapolis area
      { id: 't70', lat: 39.7684, lng: -86.1581, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't71', lat: 39.7690, lng: -86.1575, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't72', lat: 39.7726, lng: -86.1608, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      
      // Seattle area
      { id: 't73', lat: 47.6062, lng: -122.3321, operator: 'AT&T', height: 170, tech: ['LTE', '5G'] },
      { id: 't74', lat: 47.6101, lng: -122.3337, operator: 'T-Mobile', height: 165, tech: ['LTE', '5G'] },
      { id: 't75', lat: 47.6061, lng: -122.3351, operator: 'Verizon', height: 175, tech: ['LTE', '5G'] },
      { id: 't76', lat: 47.6098, lng: -122.3331, operator: 'AT&T', height: 160, tech: ['5G'] },
      
      // Denver area
      { id: 't77', lat: 39.7392, lng: -104.9903, operator: 'T-Mobile', height: 130, tech: ['5G'] },
      { id: 't78', lat: 39.7398, lng: -104.9901, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't79', lat: 39.7390, lng: -104.9908, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't80', lat: 39.7474, lng: -104.9923, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      
      // Washington DC area
      { id: 't81', lat: 38.9072, lng: -77.0369, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't82', lat: 38.9087, lng: -77.0352, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't83', lat: 38.9025, lng: -77.0276, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't84', lat: 38.9081, lng: -77.0450, operator: 'AT&T', height: 155, tech: ['5G'] },
      
      // Boston area
      { id: 't85', lat: 42.3601, lng: -71.0589, operator: 'T-Mobile', height: 150, tech: ['LTE', '5G'] },
      { id: 't86', lat: 42.3611, lng: -71.0574, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't87', lat: 42.3589, lng: -71.0586, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't88', lat: 42.3662, lng: -71.0621, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // El Paso area
      { id: 't89', lat: 31.7619, lng: -106.4850, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      { id: 't90', lat: 31.7625, lng: -106.4858, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      
      // Detroit area
      { id: 't91', lat: 42.3314, lng: -83.0458, operator: 'T-Mobile', height: 150, tech: ['LTE', '5G'] },
      { id: 't92', lat: 42.3322, lng: -83.0455, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't93', lat: 42.3292, lng: -83.0478, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      
      // Nashville area
      { id: 't94', lat: 36.1627, lng: -86.7816, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't95', lat: 36.1634, lng: -86.7819, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't96', lat: 36.1601, lng: -86.7776, operator: 'T-Mobile', height: 135, tech: ['5G'] },
      
      // Portland area
      { id: 't97', lat: 45.5152, lng: -122.6784, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't98', lat: 45.5158, lng: -122.6775, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't99', lat: 45.5121, lng: -122.6755, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      
      // Oklahoma City area
      { id: 't100', lat: 35.4676, lng: -97.5164, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't101', lat: 35.4682, lng: -97.5168, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't102', lat: 35.4649, lng: -97.5137, operator: 'T-Mobile', height: 125, tech: ['5G'] },
      
      // Las Vegas area
      { id: 't103', lat: 36.1699, lng: -115.1398, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't104', lat: 36.1705, lng: -115.1401, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't105', lat: 36.1689, lng: -115.1412, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't106', lat: 36.1721, lng: -115.1386, operator: 'T-Mobile', height: 150, tech: ['5G'] },
      
      // Memphis area
      { id: 't107', lat: 35.1495, lng: -90.0490, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't108', lat: 35.1501, lng: -90.0495, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      
      // Louisville area
      { id: 't109', lat: 38.2527, lng: -85.7585, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't110', lat: 38.2533, lng: -85.7589, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      
      // Baltimore area
      { id: 't111', lat: 39.2904, lng: -76.6122, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't112', lat: 39.2910, lng: -76.6126, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't113', lat: 39.2889, lng: -76.6098, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Milwaukee area
      { id: 't114', lat: 43.0389, lng: -87.9065, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't115', lat: 43.0395, lng: -87.9069, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      
      // Albuquerque area
      { id: 't116', lat: 35.0844, lng: -106.6504, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't117', lat: 35.0850, lng: -106.6508, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      
      // Tucson area
      { id: 't118', lat: 32.2226, lng: -110.9747, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't119', lat: 32.2232, lng: -110.9751, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      
      // Fresno area
      { id: 't120', lat: 36.7378, lng: -119.7871, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      { id: 't121', lat: 36.7384, lng: -119.7875, operator: 'T-Mobile', height: 125, tech: ['5G'] },
      
      // Sacramento area
      { id: 't122', lat: 38.5816, lng: -121.4944, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't123', lat: 38.5822, lng: -121.4948, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't124', lat: 38.5799, lng: -121.4920, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      
      // Kansas City area
      { id: 't125', lat: 39.0997, lng: -94.5786, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't126', lat: 39.1003, lng: -94.5790, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't127', lat: 39.0979, lng: -94.5762, operator: 'T-Mobile', height: 135, tech: ['5G'] },
      
      // Mesa area
      { id: 't128', lat: 33.4152, lng: -111.8315, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't129', lat: 33.4158, lng: -111.8319, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      
      // Atlanta area
      { id: 't130', lat: 33.7490, lng: -84.3880, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't131', lat: 33.7496, lng: -84.3884, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't132', lat: 33.7473, lng: -84.3856, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't133', lat: 33.7515, lng: -84.3912, operator: 'AT&T', height: 160, tech: ['5G'] },
      
      // Miami area
      { id: 't134', lat: 25.7617, lng: -80.1918, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't135', lat: 25.7623, lng: -80.1922, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't136', lat: 25.7600, lng: -80.1894, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't137', lat: 25.7642, lng: -80.1950, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Minneapolis area
      { id: 't138', lat: 44.9778, lng: -93.2650, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't139', lat: 44.9784, lng: -93.2654, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't140', lat: 44.9761, lng: -93.2626, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
    ];
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
    // Auto-search if coordinates are detected
    const coords = parseCoordinates(query);
    if (coords) {
      setMapCenter(coords);
      setMapZoom(12);
    }
  };

  const executeSearch = () => {
    const coords = parseCoordinates(searchQuery);
    if (coords) {
      setMapCenter(coords);
      setMapZoom(12);
    } else if (searchQuery.trim()) {
      // Could implement city/ZIP code search here
      // For now, just keep the existing behavior
      console.log('Searching for:', searchQuery);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
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

  // Get GPS location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setGpsLocation(location);
          setMapCenter(location);
          setMapZoom(15);
          
          // Auto-fill report modal if open
          const latInput = document.querySelector('input[name="lat"]') as HTMLInputElement;
          const lngInput = document.querySelector('input[name="lng"]') as HTMLInputElement;
          if (latInput) latInput.value = location.lat.toString();
          if (lngInput) lngInput.value = location.lng.toString();
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate carrier comparison at a location
  const calculateCarrierComparison = (lat: number, lng: number) => {
    const radiusKm = 5; // 5km radius
    const nearbyTowers = towers.filter(tower => {
      const distance = calculateDistance(lat, lng, tower.lat, tower.lng);
      return distance <= radiusKm;
    });

    const nearbyReports = reports.filter(report => {
      const distance = calculateDistance(lat, lng, report.lat, report.lng);
      return distance <= radiusKm;
    });

    const carriers = ['T-Mobile', 'Verizon', 'AT&T'];
    const comparison: CarrierComparison[] = carriers.map(carrier => {
      const carrierTowers = nearbyTowers.filter(t => t.operator === carrier);
      const carrierReports = nearbyReports.filter(r => r.carrier === carrier);
      
      // Calculate average signal (use reports if available, otherwise estimate from towers)
      let avgSignal = -100; // Default poor signal
      if (carrierReports.length > 0) {
        avgSignal = carrierReports.reduce((sum, r) => sum + r.signalStrength, 0) / carrierReports.length;
      } else if (carrierTowers.length > 0) {
        // Estimate signal based on distance to nearest tower
        const nearestTower = carrierTowers.reduce((nearest, tower) => {
          const dist = calculateDistance(lat, lng, tower.lat, tower.lng);
          const nearestDist = calculateDistance(lat, lng, nearest.lat, nearest.lng);
          return dist < nearestDist ? tower : nearest;
        }, carrierTowers[0]);
        
        const distance = calculateDistance(lat, lng, nearestTower.lat, nearestTower.lng);
        // Rough estimate: -60dBm at tower, -3dB per km
        avgSignal = Math.max(-120, -60 - (distance * 3));
      }

      // Calculate coverage score (0-100)
      let coverageScore = 0;
      if (avgSignal >= -70) coverageScore = 100;
      else if (avgSignal >= -80) coverageScore = 75;
      else if (avgSignal >= -90) coverageScore = 50;
      else if (avgSignal >= -100) coverageScore = 25;
      else coverageScore = 10;

      // Factor in tower count (more towers = better coverage)
      coverageScore = Math.min(100, coverageScore + (carrierTowers.length * 5));

      let recommendation: 'best' | 'good' | 'fair' | 'poor';
      if (coverageScore >= 75) recommendation = 'best';
      else if (coverageScore >= 50) recommendation = 'good';
      else if (coverageScore >= 25) recommendation = 'fair';
      else recommendation = 'poor';

      return {
        carrier,
        avgSignal: Math.round(avgSignal),
        towerCount: carrierTowers.length,
        coverageScore: Math.round(coverageScore),
        recommendation
      };
    });

    // Sort by coverage score
    comparison.sort((a, b) => b.coverageScore - a.coverageScore);
    setCarrierComparison(comparison);
  };

  // Favorite locations
  const loadFavoriteLocations = () => {
    const saved = localStorage.getItem('signalscope_favorites');
    if (saved) {
      setFavoriteLocations(JSON.parse(saved));
    }
  };

  const saveFavoriteLocation = (name: string, type: 'home' | 'work' | 'custom') => {
    const newFavorite: FavoriteLocation = {
      id: `fav_${Date.now()}`,
      name,
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      type
    };
    const updated = [...favoriteLocations, newFavorite];
    setFavoriteLocations(updated);
    localStorage.setItem('signalscope_favorites', JSON.stringify(updated));
  };

  const deleteFavoriteLocation = (id: string) => {
    const updated = favoriteLocations.filter(f => f.id !== id);
    setFavoriteLocations(updated);
    localStorage.setItem('signalscope_favorites', JSON.stringify(updated));
  };

  const navigateToFavorite = (favorite: FavoriteLocation) => {
    setMapCenter({ lat: favorite.lat, lng: favorite.lng });
    setMapZoom(14);
    setShowFavorites(false);
  };
  const filteredTowers = selectedCarrier === 'All' ? towers : towers.filter(t => t.operator === selectedCarrier);
  const filteredReports = selectedCarrier === 'All' ? reports : reports.filter(r => r.carrier === selectedCarrier);
  
  const getSignalColor = (strength: number): string => {
    const range = SIGNAL_RANGES.find(r => strength >= r.min && strength < r.max);
    return range?.color || '#7f1d1d';
  };

  // Create custom icons for towers and reports
  const createTowerIcon = () => {
    return L.divIcon({
      className: 'custom-tower-icon',
      html: `<div style="
        width: 24px;
        height: 24px;
        background-color: #ec4899;
        border: 4px solid rgba(236, 72, 153, 0.3);
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        pointer-events: auto;
        cursor: pointer;
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const createReportIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-report-icon',
      html: `<div style="
        width: 18px;
        height: 18px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        pointer-events: auto;
        cursor: pointer;
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
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
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by city, ZIP code, or coordinates (e.g., 40.7128, -74.0060)" 
                value={searchQuery} 
                onChange={e => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent" 
              />
            </div>
            <button
              onClick={executeSearch}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-300 hover:text-white"
              title="Search"
            >
              <Search size={18} />
              <span className="hidden lg:inline">Search</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={getCurrentLocation} 
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-300 hover:text-white"
            title="Use my location"
          >
            <Navigation size={18} />
            <span className="hidden lg:inline">My Location</span>
          </button>
          
          <button 
            onClick={() => setShowFavorites(!showFavorites)} 
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-300 hover:text-white"
            title="Favorite locations"
          >
            <Star size={18} className={showFavorites ? 'fill-yellow-500 text-yellow-500' : ''} />
            <span className="hidden lg:inline">Favorites</span>
          </button>

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

          {/* Carrier Comparison Panel */}
          {carrierComparison && carrierComparison.length > 0 && (
            <div className="p-4 border-b border-gray-800 bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-pink-500" />
                BEST CARRIER HERE
              </h3>
              <div className="space-y-2">
                {carrierComparison.slice(0, 3).map((comp, idx) => (
                  <div 
                    key={comp.carrier} 
                    className={`p-2 rounded-lg border ${
                      idx === 0 
                        ? 'bg-pink-600/20 border-pink-500/50' 
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Award size={14} className="text-yellow-500" />}
                        <span className="text-xs font-semibold text-white">{comp.carrier}</span>
                      </div>
                      <span className={`text-xs font-bold ${
                        comp.recommendation === 'best' ? 'text-green-400' :
                        comp.recommendation === 'good' ? 'text-blue-400' :
                        comp.recommendation === 'fair' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {comp.coverageScore}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{comp.towerCount} towers</span>
                      <span>{comp.avgSignal} dBm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorite Locations Panel */}
          {showFavorites && (
            <div className="p-4 border-b border-gray-800 bg-gray-800/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  FAVORITES
                </h3>
                <button
                  onClick={() => {
                    const name = prompt('Enter location name:');
                    if (name) saveFavoriteLocation(name, 'custom');
                  }}
                  className="text-xs text-pink-500 hover:text-pink-400"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {favoriteLocations.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No favorites yet</p>
                ) : (
                  favoriteLocations.map(fav => (
                    <div 
                      key={fav.id} 
                      className="p-2 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer transition-colors flex items-center justify-between group"
                      onClick={() => navigateToFavorite(fav)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {fav.type === 'home' && <Home size={14} className="text-blue-400" />}
                        {fav.type === 'work' && <Briefcase size={14} className="text-purple-400" />}
                        {fav.type === 'custom' && <MapPin size={14} className="text-gray-400" />}
                        <span className="text-xs text-white flex-1">{fav.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFavoriteLocation(fav.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
                <div className="flex gap-1 pt-2 border-t border-gray-700">
                  <button
                    onClick={() => {
                      const name = prompt('Home location name:', 'Home');
                      if (name) saveFavoriteLocation(name, 'home');
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-600/30"
                  >
                    <Home size={12} className="mx-auto mb-1" />
                    Home
                  </button>
                  <button
                    onClick={() => {
                      const name = prompt('Work location name:', 'Work');
                      if (name) saveFavoriteLocation(name, 'work');
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded border border-purple-600/30"
                  >
                    <Briefcase size={12} className="mx-auto mb-1" />
                    Work
                  </button>
                </div>
              </div>
            </div>
          )}

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
              <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapZoom}
              className="absolute inset-0 z-0"
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              scrollWheelZoom={true}
              dragging={true}
              touchZoom={true}
              doubleClickZoom={true}
              boxZoom={true}
              keyboard={true}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Update map center when state changes */}
              <MapCenterUpdater center={[mapCenter.lat, mapCenter.lng]} zoom={mapZoom} />
              
              {/* Track user map interactions */}
              <MapInteractionTracker 
                onMoveEnd={handleMapMoveEnd}
                onZoomEnd={handleMapZoomEnd}
              />

              {/* Tower markers */}
              {filteredTowers.map(tower => (
                <Marker
                  key={tower.id}
                  position={[tower.lat, tower.lng]}
                  icon={createTowerIcon()}
                  eventHandlers={{
                    click: (e) => {
                      const event = e.originalEvent;
                      if (event) {
                        event.stopPropagation();
                        event.preventDefault();
                      }
                      setSelectedMarker({
                        id: tower.id,
                        lat: tower.lat,
                        lng: tower.lng,
                        type: 'tower',
                        data: tower
                      });
                    },
                  }}
                  bubblingMouseEvents={false}
                  interactive={true}
                >
                  <Popup closeOnClick={false} autoClose={false}>
                    <div className="text-sm text-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <TowerControl size={16} className="text-pink-500" />
                        <h4 className="font-semibold">Tower {tower.id}</h4>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Operator:</span>
                          <span className="font-medium">{tower.operator}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Height:</span>
                          <span>{tower.height}ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Technology:</span>
                          <span>{tower.tech.join(', ')}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>Location:</span>
                          <span>{tower.lat.toFixed(4)}, {tower.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Report markers */}
              {filteredReports.map(report => (
                <Marker
                  key={report.id}
                  position={[report.lat, report.lng]}
                  icon={createReportIcon(getSignalColor(report.signalStrength))}
                  eventHandlers={{
                    click: (e) => {
                      const event = e.originalEvent;
                      if (event) {
                        event.stopPropagation();
                        event.preventDefault();
                      }
                      setSelectedMarker({
                        id: report.id,
                        lat: report.lat,
                        lng: report.lng,
                        type: 'report',
                        data: report
                      });
                    },
                  }}
                  bubblingMouseEvents={false}
                  interactive={true}
                >
                  <Popup closeOnClick={false} autoClose={false}>
                    <div className="text-sm text-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Signal size={16} className="text-green-500" />
                        <h4 className="font-semibold">Signal Report</h4>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Carrier:</span>
                          <span className="font-medium">{report.carrier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Signal:</span>
                          <span style={{ color: getSignalColor(report.signalStrength) }}>
                            {report.signalStrength} dBm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Device:</span>
                          <span className="text-xs">{report.device}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>Time:</span>
                          <span>{new Date(report.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Favorite location markers */}
              {favoriteLocations.map(fav => (
                <Marker
                  key={fav.id}
                  position={[fav.lat, fav.lng]}
                  icon={L.divIcon({
                    className: 'custom-favorite-icon',
                    html: `<div style="
                      width: 32px;
                      height: 32px;
                      background-color: ${fav.type === 'home' ? '#3b82f6' : fav.type === 'work' ? '#a855f7' : '#fbbf24'};
                      border: 3px solid white;
                      border-radius: 50%;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 16px;
                      color: white;
                      pointer-events: auto;
                      cursor: pointer;
                    ">${fav.type === 'home' ? '🏠' : fav.type === 'work' ? '💼' : '⭐'}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                  eventHandlers={{
                    click: (e) => {
                      const event = e.originalEvent;
                      if (event) {
                        event.stopPropagation();
                        event.preventDefault();
                      }
                      navigateToFavorite(fav);
                    },
                  }}
                  bubblingMouseEvents={false}
                  interactive={true}
                >
                  <Popup closeOnClick={false} autoClose={false}>
                    <div className="text-sm text-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        {fav.type === 'home' && <Home size={16} className="text-blue-500" />}
                        {fav.type === 'work' && <Briefcase size={16} className="text-purple-500" />}
                        {fav.type === 'custom' && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                        <h4 className="font-semibold">{fav.name}</h4>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Location:</span>
                          <span>{fav.lat.toFixed(4)}, {fav.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Practical Insights Panel */}
            {carrierComparison && carrierComparison.length > 0 && !selectedMarker && (
              <div className="absolute top-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl z-[1000] min-w-[280px] max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-pink-500" />
                    Coverage Insights
                  </h3>
                  <button
                    onClick={() => setCarrierComparison(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                {carrierComparison[0].recommendation === 'best' && (
                  <div className="mb-3 p-2 bg-green-600/20 border border-green-500/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={14} className="text-green-400" />
                      <span className="text-xs font-semibold text-green-400">Excellent Coverage</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      {carrierComparison[0].carrier} is the best choice here with {carrierComparison[0].coverageScore}% coverage score.
                    </p>
                  </div>
                )}

                {carrierComparison[0].recommendation === 'poor' && (
                  <div className="mb-3 p-2 bg-red-600/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} className="text-red-400" />
                      <span className="text-xs font-semibold text-red-400">Poor Coverage Area</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Signal quality is limited. Consider checking nearby areas or using WiFi calling.
                    </p>
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">Carrier Comparison:</h4>
                  {carrierComparison.map((comp, idx) => (
                    <div 
                      key={comp.carrier}
                      className={`p-2 rounded-lg border ${
                        idx === 0 ? 'bg-pink-600/20 border-pink-500/50' : 'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Award size={12} className="text-yellow-500" />}
                          <span className="text-xs font-semibold text-white">{comp.carrier}</span>
                        </div>
                        <span className={`text-xs font-bold ${
                          comp.recommendation === 'best' ? 'text-green-400' :
                          comp.recommendation === 'good' ? 'text-blue-400' :
                          comp.recommendation === 'fair' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {comp.coverageScore}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{comp.towerCount} towers nearby</span>
                        <span>{comp.avgSignal} dBm avg</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <strong className="text-white">💡 Practical Uses:</strong><br/>
                    • Moving? Check coverage before you go<br/>
                    • Traveling? Find the best carrier for your route<br/>
                    • Home office? See which carrier works best<br/>
                    • Rural areas? Identify dead zones
                  </p>
                </div>
              </div>
            )}

            {/* Selected marker info panel */}
            {selectedMarker && (
              <div className="absolute top-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl z-[1000] min-w-[250px] max-w-sm">
                <button 
                  onClick={() => setSelectedMarker(null)} 
                  className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                {selectedMarker.type === 'tower' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TowerControl size={20} className="text-pink-500" />
                      <h4 className="font-semibold text-white">Tower {selectedMarker.id}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Operator:</span>
                        <span className="font-medium text-white">{(selectedMarker.data as Tower).operator}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Height:</span>
                        <span className="text-white">{(selectedMarker.data as Tower).height}ft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Technology:</span>
                        <span className="text-white">{(selectedMarker.data as Tower).tech.join(', ')}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-3 pt-3 border-t border-gray-700">
                        <span className="text-gray-400">Location:</span>
                        <span className="text-gray-500">{selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Signal size={20} className="text-green-500" />
                      <h4 className="font-semibold text-white">Signal Report</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Carrier:</span>
                        <span className="font-medium text-white">{(selectedMarker.data as SignalReport).carrier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Signal:</span>
                        <span style={{ color: getSignalColor((selectedMarker.data as SignalReport).signalStrength) }}>
                          {(selectedMarker.data as SignalReport).signalStrength} dBm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Device:</span>
                        <span className="text-xs text-white">{(selectedMarker.data as SignalReport).device}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-3 pt-3 border-t border-gray-700">
                        <span className="text-gray-400">Time:</span>
                        <span className="text-gray-500">
                          {new Date((selectedMarker.data as SignalReport).timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-400">Location (Latitude)</label>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                    title="Use my current location"
                  >
                    <Navigation size={12} />
                    Use GPS
                  </button>
                </div>
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