import math

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Earth radius in km
    return c * r

def estimate_signal_strength(tower_lat: float, tower_lng: float, 
                            tower_height: int, point_lat: float, 
                            point_lng: float) -> int:
    """Estimate signal strength in dBm"""
    distance = haversine_distance(tower_lat, tower_lng, point_lat, point_lng)
    base_signal = -40
    height_bonus = min(tower_height / 50, 10)
    distance_penalty = distance * 8
    signal = base_signal + height_bonus - distance_penalty
    return max(-120, min(-50, int(signal)))

