import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Signal, TowerControl, Activity, BarChart3, Filter, Menu, X, Plus, ChevronDown, Wifi, WifiOff, Smartphone, MapPinned, LogOut, User as UserIcon, Navigation, Star, Home, Briefcase, TrendingUp, AlertCircle, CheckCircle2, Award, Calendar, Map, Target, Zap } from 'lucide-react';
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
      
      // Orlando area
      { id: 't141', lat: 28.5383, lng: -81.3792, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't142', lat: 28.5389, lng: -81.3788, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't143', lat: 28.5356, lng: -81.3765, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't144', lat: 28.5412, lng: -81.3815, operator: 'T-Mobile', height: 150, tech: ['5G'] },
      { id: 't145', lat: 28.5328, lng: -81.3734, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      
      // Tampa area
      { id: 't146', lat: 27.9506, lng: -82.4572, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't147', lat: 27.9512, lng: -82.4578, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't148', lat: 27.9489, lng: -82.4556, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't149', lat: 27.9535, lng: -82.4601, operator: 'AT&T', height: 145, tech: ['5G'] },
      
      // New Orleans area
      { id: 't150', lat: 29.9511, lng: -90.0715, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't151', lat: 29.9517, lng: -90.0721, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't152', lat: 29.9494, lng: -90.0698, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't153', lat: 29.9540, lng: -90.0743, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Cleveland area
      { id: 't154', lat: 41.4993, lng: -81.6944, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't155', lat: 41.4999, lng: -81.6950, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't156', lat: 41.4976, lng: -81.6927, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't157', lat: 41.5022, lng: -81.6972, operator: 'AT&T', height: 160, tech: ['5G'] },
      
      // Pittsburgh area
      { id: 't158', lat: 40.4406, lng: -79.9959, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't159', lat: 40.4412, lng: -79.9965, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't160', lat: 40.4389, lng: -79.9942, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't161', lat: 40.4435, lng: -79.9987, operator: 'T-Mobile', height: 155, tech: ['5G'] },
      
      // Cincinnati area
      { id: 't162', lat: 39.1031, lng: -84.5120, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't163', lat: 39.1037, lng: -84.5126, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't164', lat: 39.1014, lng: -84.5103, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't165', lat: 39.1060, lng: -84.5148, operator: 'AT&T', height: 150, tech: ['5G'] },
      
      // St. Louis area
      { id: 't166', lat: 38.6270, lng: -90.1994, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't167', lat: 38.6276, lng: -90.2000, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't168', lat: 38.6253, lng: -90.1977, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't169', lat: 38.6299, lng: -90.2022, operator: 'T-Mobile', height: 150, tech: ['5G'] },
      
      // Raleigh area
      { id: 't170', lat: 35.7796, lng: -78.6382, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't171', lat: 35.7802, lng: -78.6388, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't172', lat: 35.7779, lng: -78.6365, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't173', lat: 35.7825, lng: -78.6410, operator: 'AT&T', height: 145, tech: ['5G'] },
      
      // Virginia Beach area
      { id: 't174', lat: 36.8529, lng: -75.9780, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't175', lat: 36.8535, lng: -75.9786, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't176', lat: 36.8512, lng: -75.9763, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      
      // Omaha area
      { id: 't177', lat: 41.2565, lng: -95.9345, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't178', lat: 41.2571, lng: -95.9351, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't179', lat: 41.2548, lng: -95.9328, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't180', lat: 41.2594, lng: -95.9373, operator: 'AT&T', height: 140, tech: ['5G'] },
      
      // Oakland area
      { id: 't181', lat: 37.8044, lng: -122.2712, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't182', lat: 37.8050, lng: -122.2718, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't183', lat: 37.8027, lng: -122.2695, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't184', lat: 37.8073, lng: -122.2740, operator: 'T-Mobile', height: 150, tech: ['5G'] },
      
      // Long Beach area
      { id: 't185', lat: 33.7701, lng: -118.1937, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      { id: 't186', lat: 33.7707, lng: -118.1943, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't187', lat: 33.7684, lng: -118.1920, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      { id: 't188', lat: 33.7730, lng: -118.1965, operator: 'Verizon', height: 135, tech: ['5G'] },
      
      // Arlington, TX area
      { id: 't189', lat: 32.7357, lng: -97.1081, operator: 'AT&T', height: 145, tech: ['LTE', '5G'] },
      { id: 't190', lat: 32.7363, lng: -97.1087, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't191', lat: 32.7340, lng: -97.1064, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't192', lat: 32.7386, lng: -97.1109, operator: 'AT&T', height: 155, tech: ['5G'] },
      
      // Bakersfield area
      { id: 't193', lat: 35.3733, lng: -119.0187, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't194', lat: 35.3739, lng: -119.0193, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      { id: 't195', lat: 35.3716, lng: -119.0170, operator: 'AT&T', height: 115, tech: ['LTE', '5G'] },
      
      // Aurora, CO area
      { id: 't196', lat: 39.7294, lng: -104.8319, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't197', lat: 39.7300, lng: -104.8325, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't198', lat: 39.7277, lng: -104.8302, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't199', lat: 39.7323, lng: -104.8347, operator: 'T-Mobile', height: 145, tech: ['5G'] },
      
      // Anaheim area
      { id: 't200', lat: 33.8366, lng: -117.9143, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't201', lat: 33.8372, lng: -117.9149, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't202', lat: 33.8349, lng: -117.9126, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't203', lat: 33.8395, lng: -117.9171, operator: 'Verizon', height: 140, tech: ['5G'] },
      
      // Santa Ana area
      { id: 't204', lat: 33.7456, lng: -117.8677, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't205', lat: 33.7462, lng: -117.8683, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't206', lat: 33.7439, lng: -117.8660, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      
      // Corpus Christi area
      { id: 't207', lat: 27.8006, lng: -97.3964, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't208', lat: 27.8012, lng: -97.3970, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't209', lat: 27.7989, lng: -97.3947, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      
      // Riverside area
      { id: 't210', lat: 33.9533, lng: -117.3962, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't211', lat: 33.9539, lng: -117.3968, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't212', lat: 33.9516, lng: -117.3945, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't213', lat: 33.9562, lng: -117.3990, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Lexington area
      { id: 't214', lat: 38.0406, lng: -84.5037, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't215', lat: 38.0412, lng: -84.5043, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't216', lat: 38.0389, lng: -84.5020, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      
      // Stockton area
      { id: 't217', lat: 37.9577, lng: -121.2908, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't218', lat: 37.9583, lng: -121.2914, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't219', lat: 37.9560, lng: -121.2891, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      
      // Henderson, NV area
      { id: 't220', lat: 36.0395, lng: -114.9817, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't221', lat: 36.0401, lng: -114.9823, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't222', lat: 36.0378, lng: -114.9800, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't223', lat: 36.0424, lng: -114.9845, operator: 'T-Mobile', height: 145, tech: ['5G'] },
      
      // St. Paul area
      { id: 't224', lat: 44.9537, lng: -93.0900, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't225', lat: 44.9543, lng: -93.0906, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't226', lat: 44.9520, lng: -93.0883, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      
      // Toledo area
      { id: 't227', lat: 41.6528, lng: -83.5379, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't228', lat: 41.6534, lng: -83.5385, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't229', lat: 41.6511, lng: -83.5362, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      
      // Greensboro area
      { id: 't230', lat: 36.0726, lng: -79.7920, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't231', lat: 36.0732, lng: -79.7926, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't232', lat: 36.0709, lng: -79.7903, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      
      // Plano area
      { id: 't233', lat: 33.0198, lng: -96.6989, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't234', lat: 33.0204, lng: -96.6995, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't235', lat: 33.0181, lng: -96.6972, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't236', lat: 33.0227, lng: -96.7017, operator: 'T-Mobile', height: 150, tech: ['5G'] },
      
      // Lincoln area
      { id: 't237', lat: 40.8136, lng: -96.7026, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't238', lat: 40.8142, lng: -96.7032, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't239', lat: 40.8119, lng: -96.7009, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      
      // Buffalo area
      { id: 't240', lat: 42.8864, lng: -78.8784, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      { id: 't241', lat: 42.8870, lng: -78.8790, operator: 'Verizon', height: 150, tech: ['LTE', '5G'] },
      { id: 't242', lat: 42.8847, lng: -78.8767, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't243', lat: 42.8893, lng: -78.8812, operator: 'T-Mobile', height: 155, tech: ['5G'] },
      
      // Jersey City area
      { id: 't244', lat: 40.7178, lng: -74.0431, operator: 'AT&T', height: 150, tech: ['LTE', '5G'] },
      { id: 't245', lat: 40.7184, lng: -74.0437, operator: 'Verizon', height: 155, tech: ['LTE', '5G'] },
      { id: 't246', lat: 40.7161, lng: -74.0414, operator: 'T-Mobile', height: 145, tech: ['LTE', '5G'] },
      
      // Chula Vista area
      { id: 't247', lat: 32.6401, lng: -117.0842, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      { id: 't248', lat: 32.6407, lng: -117.0848, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't249', lat: 32.6384, lng: -117.0825, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      
      // Norfolk area
      { id: 't250', lat: 36.8468, lng: -76.2852, operator: 'AT&T', height: 120, tech: ['LTE', '5G'] },
      { id: 't251', lat: 36.8474, lng: -76.2858, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      { id: 't252', lat: 36.8451, lng: -76.2835, operator: 'T-Mobile', height: 115, tech: ['LTE', '5G'] },
      
      // Chandler area
      { id: 't253', lat: 33.3062, lng: -111.8413, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't254', lat: 33.3068, lng: -111.8419, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't255', lat: 33.3045, lng: -111.8396, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't256', lat: 33.3091, lng: -111.8441, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Laredo area
      { id: 't257', lat: 27.5306, lng: -99.4803, operator: 'AT&T', height: 115, tech: ['LTE', '5G'] },
      { id: 't258', lat: 27.5312, lng: -99.4809, operator: 'Verizon', height: 120, tech: ['LTE', '5G'] },
      { id: 't259', lat: 27.5289, lng: -99.4786, operator: 'T-Mobile', height: 110, tech: ['LTE', '5G'] },
      
      // Madison area
      { id: 't260', lat: 43.0731, lng: -89.4012, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't261', lat: 43.0737, lng: -89.4018, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't262', lat: 43.0714, lng: -89.3995, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't263', lat: 43.0760, lng: -89.4040, operator: 'T-Mobile', height: 145, tech: ['5G'] },
      
      // Durham area
      { id: 't264', lat: 35.9940, lng: -78.8986, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't265', lat: 35.9946, lng: -78.8992, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't266', lat: 35.9923, lng: -78.8969, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      
      // Lubbock area
      { id: 't267', lat: 33.5779, lng: -101.8552, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't268', lat: 33.5785, lng: -101.8558, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      { id: 't269', lat: 33.5762, lng: -101.8535, operator: 'AT&T', height: 115, tech: ['LTE', '5G'] },
      
      // Winston-Salem area
      { id: 't270', lat: 36.0999, lng: -80.2442, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't271', lat: 36.1005, lng: -80.2448, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't272', lat: 36.0982, lng: -80.2425, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      
      // Garland area
      { id: 't273', lat: 32.9126, lng: -96.6389, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't274', lat: 32.9132, lng: -96.6395, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't275', lat: 32.9109, lng: -96.6372, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't276', lat: 32.9155, lng: -96.6417, operator: 'T-Mobile', height: 145, tech: ['5G'] },
      
      // Glendale area
      { id: 't277', lat: 33.5387, lng: -112.1860, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't278', lat: 33.5393, lng: -112.1866, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't279', lat: 33.5370, lng: -112.1843, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      
      // Hialeah area
      { id: 't280', lat: 25.8576, lng: -80.2781, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't281', lat: 25.8582, lng: -80.2787, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      { id: 't282', lat: 25.8559, lng: -80.2764, operator: 'AT&T', height: 115, tech: ['LTE', '5G'] },
      
      // Reno area
      { id: 't283', lat: 39.5296, lng: -119.8138, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't284', lat: 39.5302, lng: -119.8144, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't285', lat: 39.5279, lng: -119.8121, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't286', lat: 39.5325, lng: -119.8166, operator: 'AT&T', height: 135, tech: ['5G'] },
      
      // Chesapeake area
      { id: 't287', lat: 36.7682, lng: -76.2875, operator: 'T-Mobile', height: 115, tech: ['LTE', '5G'] },
      { id: 't288', lat: 36.7688, lng: -76.2881, operator: 'Verizon', height: 120, tech: ['LTE', '5G'] },
      { id: 't289', lat: 36.7665, lng: -76.2858, operator: 'AT&T', height: 110, tech: ['LTE', '5G'] },
      
      // Scottsdale area
      { id: 't290', lat: 33.4942, lng: -111.9261, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      { id: 't291', lat: 33.4948, lng: -111.9267, operator: 'Verizon', height: 140, tech: ['LTE', '5G'] },
      { id: 't292', lat: 33.4925, lng: -111.9244, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't293', lat: 33.4971, lng: -111.9289, operator: 'T-Mobile', height: 145, tech: ['5G'] },
      
      // North Las Vegas area
      { id: 't294', lat: 36.1989, lng: -115.1175, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't295', lat: 36.1995, lng: -115.1181, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't296', lat: 36.1972, lng: -115.1158, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      
      // Fremont area
      { id: 't297', lat: 37.5483, lng: -121.9886, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't298', lat: 37.5489, lng: -121.9892, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't299', lat: 37.5466, lng: -121.9869, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't300', lat: 37.5512, lng: -121.9914, operator: 'T-Mobile', height: 140, tech: ['5G'] },
      
      // Boise area
      { id: 't301', lat: 43.6150, lng: -116.2023, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      { id: 't302', lat: 43.6156, lng: -116.2029, operator: 'Verizon', height: 130, tech: ['LTE', '5G'] },
      { id: 't303', lat: 43.6133, lng: -116.2006, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't304', lat: 43.6179, lng: -116.2051, operator: 'AT&T', height: 135, tech: ['5G'] },
      
      // Richmond area
      { id: 't305', lat: 37.5407, lng: -77.4360, operator: 'T-Mobile', height: 130, tech: ['LTE', '5G'] },
      { id: 't306', lat: 37.5413, lng: -77.4366, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't307', lat: 37.5390, lng: -77.4343, operator: 'AT&T', height: 125, tech: ['LTE', '5G'] },
      
      // Spokane area
      { id: 't308', lat: 47.6588, lng: -117.4260, operator: 'AT&T', height: 130, tech: ['LTE', '5G'] },
      { id: 't309', lat: 47.6594, lng: -117.4266, operator: 'Verizon', height: 135, tech: ['LTE', '5G'] },
      { id: 't310', lat: 47.6571, lng: -117.4243, operator: 'T-Mobile', height: 125, tech: ['LTE', '5G'] },
      
      // Baton Rouge area
      { id: 't311', lat: 30.4515, lng: -91.1871, operator: 'T-Mobile', height: 120, tech: ['LTE', '5G'] },
      { id: 't312', lat: 30.4521, lng: -91.1877, operator: 'Verizon', height: 125, tech: ['LTE', '5G'] },
      { id: 't313', lat: 30.4498, lng: -91.1854, operator: 'AT&T', height: 115, tech: ['LTE', '5G'] },
      { id: 't314', lat: 30.4544, lng: -91.1899, operator: 'T-Mobile', height: 130, tech: ['5G'] },
      
      // Tacoma area
      { id: 't315', lat: 47.2529, lng: -122.4443, operator: 'AT&T', height: 140, tech: ['LTE', '5G'] },
      { id: 't316', lat: 47.2535, lng: -122.4449, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't317', lat: 47.2512, lng: -122.4426, operator: 'T-Mobile', height: 135, tech: ['LTE', '5G'] },
      
      // Irving area
      { id: 't318', lat: 32.8140, lng: -96.9489, operator: 'T-Mobile', height: 140, tech: ['LTE', '5G'] },
      { id: 't319', lat: 32.8146, lng: -96.9495, operator: 'Verizon', height: 145, tech: ['LTE', '5G'] },
      { id: 't320', lat: 32.8123, lng: -96.9472, operator: 'AT&T', height: 135, tech: ['LTE', '5G'] },
      { id: 't321', lat: 32.8169, lng: -96.9517, operator: 'T-Mobile', height: 150, tech: ['5G'] },
      
      // Expand NYC with more towers
      { id: 't322', lat: 40.7289, lng: -73.9962, operator: 'T-Mobile', height: 148, tech: ['LTE', '5G'] },
      { id: 't323', lat: 40.7295, lng: -73.9956, operator: 'Verizon', height: 162, tech: ['LTE', '5G'] },
      { id: 't324', lat: 40.7272, lng: -73.9979, operator: 'AT&T', height: 152, tech: ['5G'] },
      
      // Expand LA with more towers
      { id: 't325', lat: 34.0639, lng: -118.4458, operator: 'T-Mobile', height: 138, tech: ['LTE', '5G'] },
      { id: 't326', lat: 34.0645, lng: -118.4452, operator: 'Verizon', height: 142, tech: ['LTE', '5G'] },
      { id: 't327', lat: 34.0622, lng: -118.4475, operator: 'AT&T', height: 147, tech: ['5G'] },
      
      // Expand Chicago with more towers
      { id: 't328', lat: 41.8756, lng: -87.6244, operator: 'T-Mobile', height: 168, tech: ['LTE', '5G'] },
      { id: 't329', lat: 41.8762, lng: -87.6238, operator: 'Verizon', height: 172, tech: ['LTE', '5G'] },
      { id: 't330', lat: 41.8739, lng: -87.6261, operator: 'AT&T', height: 178, tech: ['5G'] },
      
      // Expand Houston with more towers
      { id: 't331', lat: 29.7512, lng: -95.3621, operator: 'T-Mobile', height: 142, tech: ['LTE', '5G'] },
      { id: 't332', lat: 29.7518, lng: -95.3615, operator: 'Verizon', height: 148, tech: ['LTE', '5G'] },
      { id: 't333', lat: 29.7495, lng: -95.3638, operator: 'AT&T', height: 144, tech: ['5G'] },
      
      // Expand Phoenix with more towers
      { id: 't334', lat: 33.4518, lng: -112.0728, operator: 'T-Mobile', height: 152, tech: ['LTE', '5G'] },
      { id: 't335', lat: 33.4524, lng: -112.0722, operator: 'Verizon', height: 158, tech: ['LTE', '5G'] },
      { id: 't336', lat: 33.4501, lng: -112.0745, operator: 'AT&T', height: 164, tech: ['5G'] },
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

  // City to coordinates lookup based on cities in tower data
  const cityLookup: Record<string, { lat: number; lng: number; name: string }> = {
    'new york': { lat: 40.7128, lng: -74.0060, name: 'New York, NY' },
    'nyc': { lat: 40.7128, lng: -74.0060, name: 'New York, NY' },
    'new york city': { lat: 40.7128, lng: -74.0060, name: 'New York, NY' },
    'los angeles': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' },
    'la': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' },
    'chicago': { lat: 41.8781, lng: -87.6298, name: 'Chicago, IL' },
    'houston': { lat: 29.7604, lng: -95.3698, name: 'Houston, TX' },
    'phoenix': { lat: 33.4484, lng: -112.0740, name: 'Phoenix, AZ' },
    'philadelphia': { lat: 39.9526, lng: -75.1652, name: 'Philadelphia, PA' },
    'san antonio': { lat: 29.4241, lng: -98.4936, name: 'San Antonio, TX' },
    'san diego': { lat: 32.7157, lng: -117.1611, name: 'San Diego, CA' },
    'dallas': { lat: 32.7767, lng: -96.7970, name: 'Dallas, TX' },
    'san jose': { lat: 37.3382, lng: -121.8863, name: 'San Jose, CA' },
    'austin': { lat: 30.2672, lng: -97.7431, name: 'Austin, TX' },
    'jacksonville': { lat: 30.3322, lng: -81.6557, name: 'Jacksonville, FL' },
    'fort worth': { lat: 32.7555, lng: -97.3308, name: 'Fort Worth, TX' },
    'columbus': { lat: 39.9612, lng: -82.9988, name: 'Columbus, OH' },
    'charlotte': { lat: 35.2271, lng: -80.8431, name: 'Charlotte, NC' },
    'san francisco': { lat: 37.7749, lng: -122.4194, name: 'San Francisco, CA' },
    'sf': { lat: 37.7749, lng: -122.4194, name: 'San Francisco, CA' },
    'indianapolis': { lat: 39.7684, lng: -86.1581, name: 'Indianapolis, IN' },
    'seattle': { lat: 47.6062, lng: -122.3321, name: 'Seattle, WA' },
    'denver': { lat: 39.7392, lng: -104.9903, name: 'Denver, CO' },
    'washington dc': { lat: 38.9072, lng: -77.0369, name: 'Washington, DC' },
    'washington': { lat: 38.9072, lng: -77.0369, name: 'Washington, DC' },
    'dc': { lat: 38.9072, lng: -77.0369, name: 'Washington, DC' },
    'boston': { lat: 42.3601, lng: -71.0589, name: 'Boston, MA' },
    'el paso': { lat: 31.7619, lng: -106.4850, name: 'El Paso, TX' },
    'detroit': { lat: 42.3314, lng: -83.0458, name: 'Detroit, MI' },
    'nashville': { lat: 36.1627, lng: -86.7816, name: 'Nashville, TN' },
    'portland': { lat: 45.5152, lng: -122.6784, name: 'Portland, OR' },
    'oklahoma city': { lat: 35.4676, lng: -97.5164, name: 'Oklahoma City, OK' },
    'las vegas': { lat: 36.1699, lng: -115.1398, name: 'Las Vegas, NV' },
    'vegas': { lat: 36.1699, lng: -115.1398, name: 'Las Vegas, NV' },
    'memphis': { lat: 35.1495, lng: -90.0490, name: 'Memphis, TN' },
    'louisville': { lat: 38.2527, lng: -85.7585, name: 'Louisville, KY' },
    'baltimore': { lat: 39.2904, lng: -76.6122, name: 'Baltimore, MD' },
    'milwaukee': { lat: 43.0389, lng: -87.9065, name: 'Milwaukee, WI' },
    'albuquerque': { lat: 35.0844, lng: -106.6504, name: 'Albuquerque, NM' },
    'tucson': { lat: 32.2226, lng: -110.9747, name: 'Tucson, AZ' },
    'fresno': { lat: 36.7378, lng: -119.7871, name: 'Fresno, CA' },
    'sacramento': { lat: 38.5816, lng: -121.4944, name: 'Sacramento, CA' },
    'kansas city': { lat: 39.0997, lng: -94.5786, name: 'Kansas City, MO' },
    'mesa': { lat: 33.4152, lng: -111.8315, name: 'Mesa, AZ' },
    'atlanta': { lat: 33.7490, lng: -84.3880, name: 'Atlanta, GA' },
    'miami': { lat: 25.7617, lng: -80.1918, name: 'Miami, FL' },
    'minneapolis': { lat: 44.9778, lng: -93.2650, name: 'Minneapolis, MN' },
    'orlando': { lat: 28.5383, lng: -81.3792, name: 'Orlando, FL' },
    'tampa': { lat: 27.9506, lng: -82.4572, name: 'Tampa, FL' },
    'new orleans': { lat: 29.9511, lng: -90.0715, name: 'New Orleans, LA' },
    'nola': { lat: 29.9511, lng: -90.0715, name: 'New Orleans, LA' },
    'cleveland': { lat: 41.4993, lng: -81.6944, name: 'Cleveland, OH' },
    'pittsburgh': { lat: 40.4406, lng: -79.9959, name: 'Pittsburgh, PA' },
    'cincinnati': { lat: 39.1031, lng: -84.5120, name: 'Cincinnati, OH' },
    'st louis': { lat: 38.6270, lng: -90.1994, name: 'St. Louis, MO' },
    'raleigh': { lat: 35.7796, lng: -78.6382, name: 'Raleigh, NC' },
    'virginia beach': { lat: 36.8529, lng: -75.9780, name: 'Virginia Beach, VA' },
    'omaha': { lat: 41.2565, lng: -95.9345, name: 'Omaha, NE' },
    'oakland': { lat: 37.8044, lng: -122.2712, name: 'Oakland, CA' },
    'long beach': { lat: 33.7701, lng: -118.1937, name: 'Long Beach, CA' },
    'arlington': { lat: 32.7357, lng: -97.1081, name: 'Arlington, TX' },
    'bakersfield': { lat: 35.3733, lng: -119.0187, name: 'Bakersfield, CA' },
    'aurora': { lat: 39.7294, lng: -104.8319, name: 'Aurora, CO' },
    'anaheim': { lat: 33.8366, lng: -117.9143, name: 'Anaheim, CA' },
    'santa ana': { lat: 33.7456, lng: -117.8677, name: 'Santa Ana, CA' },
    'corpus christi': { lat: 27.8006, lng: -97.3964, name: 'Corpus Christi, TX' },
    'riverside': { lat: 33.9533, lng: -117.3962, name: 'Riverside, CA' },
    'lexington': { lat: 38.0406, lng: -84.5037, name: 'Lexington, KY' },
    'stockton': { lat: 37.9577, lng: -121.2908, name: 'Stockton, CA' },
    'henderson': { lat: 36.0395, lng: -114.9817, name: 'Henderson, NV' },
    'st paul': { lat: 44.9537, lng: -93.0900, name: 'St. Paul, MN' },
    'toledo': { lat: 41.6528, lng: -83.5379, name: 'Toledo, OH' },
    'greensboro': { lat: 36.0726, lng: -79.7920, name: 'Greensboro, NC' },
    'plano': { lat: 33.0198, lng: -96.6989, name: 'Plano, TX' },
    'lincoln': { lat: 40.8136, lng: -96.7026, name: 'Lincoln, NE' },
    'buffalo': { lat: 42.8864, lng: -78.8784, name: 'Buffalo, NY' },
    'jersey city': { lat: 40.7178, lng: -74.0431, name: 'Jersey City, NJ' },
    'chula vista': { lat: 32.6401, lng: -117.0842, name: 'Chula Vista, CA' },
    'norfolk': { lat: 36.8468, lng: -76.2852, name: 'Norfolk, VA' },
    'chandler': { lat: 33.3062, lng: -111.8413, name: 'Chandler, AZ' },
    'laredo': { lat: 27.5306, lng: -99.4803, name: 'Laredo, TX' },
    'madison': { lat: 43.0731, lng: -89.4012, name: 'Madison, WI' },
    'durham': { lat: 35.9940, lng: -78.8986, name: 'Durham, NC' },
    'lubbock': { lat: 33.5779, lng: -101.8552, name: 'Lubbock, TX' },
    'winston salem': { lat: 36.0999, lng: -80.2442, name: 'Winston-Salem, NC' },
    'garland': { lat: 32.9126, lng: -96.6389, name: 'Garland, TX' },
    'glendale': { lat: 33.5387, lng: -112.1860, name: 'Glendale, AZ' },
    'hialeah': { lat: 25.8576, lng: -80.2781, name: 'Hialeah, FL' },
    'reno': { lat: 39.5296, lng: -119.8138, name: 'Reno, NV' },
    'chesapeake': { lat: 36.7682, lng: -76.2875, name: 'Chesapeake, VA' },
    'scottsdale': { lat: 33.4942, lng: -111.9261, name: 'Scottsdale, AZ' },
    'north las vegas': { lat: 36.1989, lng: -115.1175, name: 'North Las Vegas, NV' },
    'fremont': { lat: 37.5483, lng: -121.9886, name: 'Fremont, CA' },
    'boise': { lat: 43.6150, lng: -116.2023, name: 'Boise, ID' },
    'richmond': { lat: 37.5407, lng: -77.4360, name: 'Richmond, VA' },
    'spokane': { lat: 47.6588, lng: -117.4260, name: 'Spokane, WA' },
    'baton rouge': { lat: 30.4515, lng: -91.1871, name: 'Baton Rouge, LA' },
    'tacoma': { lat: 47.2529, lng: -122.4443, name: 'Tacoma, WA' },
    'irving': { lat: 32.8140, lng: -96.9489, name: 'Irving, TX' },
  };

  const findCityCoordinates = (query: string): { lat: number; lng: number; name: string } | null => {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Direct lookup
    if (cityLookup[normalizedQuery]) {
      return cityLookup[normalizedQuery];
    }
    
    // Fuzzy match - find cities that contain the query
    const matches = Object.entries(cityLookup).filter(([key]) => 
      key.includes(normalizedQuery) || normalizedQuery.includes(key)
    );
    
    if (matches.length > 0) {
      // Return the best match (longest key that contains the query)
      const bestMatch = matches.reduce((best, [key, value]) => 
        key.length > best[0].length ? [key, value] : best
      );
      return bestMatch[1];
    }
    
    return null;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Auto-search if coordinates are detected
    const coords = parseCoordinates(query);
    if (coords) {
      setMapCenter(coords);
      setMapZoom(12);
      return;
    }
    // Also try city lookup for auto-search (but only if query looks complete)
    // Only auto-search cities if the query matches exactly or is likely a city name
    if (query.trim().length > 2 && !query.includes(',')) {
      const cityData = findCityCoordinates(query);
      if (cityData && query.toLowerCase() === cityData.name.toLowerCase().split(',')[0]) {
        setMapCenter({ lat: cityData.lat, lng: cityData.lng });
        setMapZoom(12);
      }
    }
  };

  const executeSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    // Try parsing as coordinates first
    const coords = parseCoordinates(query);
    if (coords) {
      setMapCenter(coords);
      setMapZoom(12);
      return;
    }

    // Try city lookup
    const cityData = findCityCoordinates(query);
    if (cityData) {
      setMapCenter({ lat: cityData.lat, lng: cityData.lng });
      setMapZoom(12);
      return;
    }

    // Try ZIP code pattern (5 digits)
    const zipPattern = /^\d{5}$/;
    if (zipPattern.test(query)) {
      // For ZIP codes, we could use a geocoding API, but for now show a message
      // In production, you'd want to use a geocoding service here
      console.log('ZIP code search not yet implemented:', query);
      return;
    }

    // No match found
    console.log('Location not found:', query);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
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
  // Calculate user-specific analytics
  const userReports = reports; // In production, filter by user ID
  const userReportsByCarrier = userReports.reduce((acc, report) => {
    if (!acc[report.carrier]) {
      acc[report.carrier] = [];
    }
    acc[report.carrier].push(report.signalStrength);
    return acc;
  }, {} as Record<string, number[]>);

  const userCarrierPerformance = Object.entries(userReportsByCarrier).map(([carrier, signals]) => {
    const avgSignal = signals.reduce((sum, s) => sum + s, 0) / signals.length;
    const bestSignal = Math.max(...signals);
    const worstSignal = Math.min(...signals);
    return {
      carrier,
      avgSignal: Math.round(avgSignal),
      bestSignal,
      worstSignal,
      reportCount: signals.length,
      color: carrier === 'T-Mobile' ? '#E20074' : carrier === 'Verizon' ? '#CD040B' : '#009FDB'
    };
  }).sort((a, b) => b.avgSignal - a.avgSignal);

  // Coverage at favorite locations
  const favoriteLocationCoverage = favoriteLocations.map(fav => {
    const nearbyReports = reports.filter(r => {
      const distance = calculateDistance(fav.lat, fav.lng, r.lat, r.lng);
      return distance <= 2; // 2km radius
    });
    
    const nearbyTowers = towers.filter(t => {
      const distance = calculateDistance(fav.lat, fav.lng, t.lat, t.lng);
      return distance <= 5; // 5km radius
    });

    const carrierScores: Record<string, { score: number; signal: number }> = {};
    ['T-Mobile', 'Verizon', 'AT&T'].forEach(carrier => {
      const carrierReports = nearbyReports.filter(r => r.carrier === carrier);
      const carrierTowers = nearbyTowers.filter(t => t.operator === carrier);
      
      let avgSignal = -100;
      if (carrierReports.length > 0) {
        avgSignal = carrierReports.reduce((sum, r) => sum + r.signalStrength, 0) / carrierReports.length;
      } else if (carrierTowers.length > 0) {
        const nearestTower = carrierTowers.reduce((nearest, tower) => {
          const dist = calculateDistance(fav.lat, fav.lng, tower.lat, tower.lng);
          const nearestDist = calculateDistance(fav.lat, fav.lng, nearest.lat, nearest.lng);
          return dist < nearestDist ? tower : nearest;
        }, carrierTowers[0]);
        const distance = calculateDistance(fav.lat, fav.lng, nearestTower.lat, nearestTower.lng);
        avgSignal = Math.max(-120, -60 - (distance * 3));
      }

      let score = 0;
      if (avgSignal >= -70) score = 100;
      else if (avgSignal >= -80) score = 75;
      else if (avgSignal >= -90) score = 50;
      else if (avgSignal >= -100) score = 25;
      else score = 10;
      score = Math.min(100, score + (carrierTowers.length * 5));

      carrierScores[carrier] = { score: Math.round(score), signal: Math.round(avgSignal) };
    });

    const bestCarrier = Object.entries(carrierScores).sort((a, b) => b[1].score - a[1].score)[0];
    
    return {
      ...fav,
      bestCarrier: bestCarrier ? bestCarrier[0] : 'Unknown',
      bestScore: bestCarrier ? bestCarrier[1].score : 0,
      carrierScores
    };
  });

  // User's signal trend over time (last 7 days)
  const userSignalTrend: Array<{ date: string; signal: number | null; count: number }> = (() => {
    const now = new Date();
    const days: Array<{ date: string; signal: number | null; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayReports = userReports.filter(r => {
        const reportDate = new Date(r.timestamp);
        return reportDate.toDateString() === date.toDateString();
      });
      const avgSignal = dayReports.length > 0
        ? dayReports.reduce((sum, r) => sum + r.signalStrength, 0) / dayReports.length
        : null;
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signal: avgSignal ? Math.round(avgSignal) : null,
        count: dayReports.length
      });
    }
    return days;
  })();

  // Dead zones (poor signal areas user has encountered)
  const deadZones = userReports
    .filter(r => r.signalStrength <= -100)
    .map(r => ({
      lat: r.lat,
      lng: r.lng,
      signal: r.signalStrength,
      carrier: r.carrier,
      timestamp: r.timestamp,
      location: `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`
    }))
    .slice(0, 5); // Top 5 worst

  // User's coverage map data (where they've reported)
  const userCoverageMap = userReports.map(r => ({
    lat: r.lat,
    lng: r.lng,
    signal: r.signalStrength,
    carrier: r.carrier,
    date: new Date(r.timestamp).toLocaleDateString()
  }));

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

          <div className="h-96 bg-gray-900 border-t border-gray-800 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 size={20} />
                  Analytics Dashboard
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <UserIcon size={14} />
                  <span>Personalized Analytics</span>
                </div>
              </div>

              {/* User-Specific Analytics Section */}
              {userReports.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Target size={16} className="text-pink-500" />
                    My Coverage Analytics
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* My Carrier Performance */}
                    {userCarrierPerformance.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
                          <Zap size={14} />
                          My Carrier Performance
                        </h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={userCarrierPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="carrier" stroke="#9ca3af" fontSize={11} />
                            <YAxis stroke="#9ca3af" fontSize={11} />
                            <Tooltip contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }} />
                            <Bar dataKey="avgSignal" radius={[4, 4, 0, 0]}>
                              {userCarrierPerformance.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-2 text-xs text-gray-500">
                          Based on {userReports.length} report{userReports.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    {/* My Signal Trend (7 days) */}
                    {userSignalTrend.some(d => d.signal !== null) && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
                          <Calendar size={14} />
                          My Signal Trend (7 Days)
                        </h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={userSignalTrend.filter(d => d.signal !== null)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                            <YAxis stroke="#9ca3af" fontSize={11} />
                            <Tooltip contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }} />
                            <Line type="monotone" dataKey="signal" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Coverage at My Locations */}
                    {favoriteLocationCoverage.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
                          <Map size={14} />
                          Coverage at My Locations
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {favoriteLocationCoverage.map(fav => (
                            <div key={fav.id} className="bg-gray-900 rounded p-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {fav.type === 'home' && <Home size={12} className="text-blue-400" />}
                                  {fav.type === 'work' && <Briefcase size={12} className="text-purple-400" />}
                                  {fav.type === 'custom' && <Star size={12} className="text-yellow-400" />}
                                  <span className="text-xs font-medium text-white">{fav.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Best:</span>
                                  <span className="text-xs font-semibold" style={{
                                    color: fav.bestCarrier === 'T-Mobile' ? '#E20074' : 
                                           fav.bestCarrier === 'Verizon' ? '#CD040B' : '#009FDB'
                                  }}>
                                    {fav.bestCarrier}
                                  </span>
                                  <span className="text-xs text-gray-500">({fav.bestScore}%)</span>
                                </div>
                              </div>
                              <div className="flex gap-2 text-xs">
                                {Object.entries(fav.carrierScores).map(([carrier, data]) => (
                                  <div key={carrier} className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{
                                      backgroundColor: carrier === 'T-Mobile' ? '#E20074' : 
                                                       carrier === 'Verizon' ? '#CD040B' : '#009FDB'
                                    }} />
                                    <span className="text-gray-500">{carrier}:</span>
                                    <span className="text-gray-400">{data.score}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* My Dead Zones */}
                    {deadZones.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
                          <AlertCircle size={14} className="text-red-400" />
                          My Dead Zones
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {deadZones.map((zone, idx) => (
                            <div key={idx} className="bg-gray-900 rounded p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-red-400">Poor Signal Area</span>
                                <span className="text-xs text-gray-500" style={{ color: getSignalColor(zone.signal) }}>
                                  {zone.signal} dBm
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{zone.carrier}</span>
                                <button
                                  onClick={() => {
                                    setMapCenter({ lat: zone.lat, lng: zone.lng });
                                    setMapZoom(14);
                                  }}
                                  className="text-pink-500 hover:text-pink-400 text-xs flex items-center gap-1"
                                >
                                  <MapPin size={10} />
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Best Carrier Recommendation */}
                  {userCarrierPerformance.length > 0 && (
                    <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-yellow-400" />
                        <h4 className="text-sm font-semibold text-white">Best Carrier for You</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold" style={{
                          color: userCarrierPerformance[0].color
                        }}>
                          {userCarrierPerformance[0].carrier}
                        </div>
                        <div className="text-sm text-gray-300">
                          Average: {userCarrierPerformance[0].avgSignal} dBm
                          <span className="text-gray-500 ml-2">
                            ({userCarrierPerformance[0].reportCount} reports)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        Best: {userCarrierPerformance[0].bestSignal} dBm | 
                        Worst: {userCarrierPerformance[0].worstSignal} dBm
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* General Analytics Section */}
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                General Network Analytics
              </h3>
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