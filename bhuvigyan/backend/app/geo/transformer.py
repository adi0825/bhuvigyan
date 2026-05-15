from typing import List, Dict, Any
from pyproj import Transformer


class CoordinateTransformer:
    WGS84 = "EPSG:4326"

    @staticmethod
    def flip_coords(coords: List[List[float]]) -> List[List[float]]:
        """Flip [lng, lat] to [lat, lng] or vice versa"""
        return [[c[1], c[0]] for c in coords]

    @staticmethod
    def bounds_to_leaflet(bounds: Dict[str, float]) -> List[List[float]]:
        return [
            [bounds["min_lat"], bounds["min_lng"]],
            [bounds["max_lat"], bounds["max_lng"]]
        ]
