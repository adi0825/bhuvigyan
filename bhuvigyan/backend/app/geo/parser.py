import re
import math
from typing import List, Tuple, Optional, Dict, Any
from shapely import from_wkt, to_geojson
from shapely.geometry import mapping, shape, MultiPolygon
from shapely.ops import unary_union
import json


class GeometryParser:
    """
    Parses KGIS WKT polygon responses.

    KGIS returns: POLYGON ((lng lat, lng lat, ...))
    Note: WKT is (X Y) = (longitude latitude)
    Leaflet needs: [[lat, lng], [lat, lng], ...]
    GeoJSON needs: [[lng, lat], [lng, lat], ...]
    """

    @staticmethod
    def parse_wkt(wkt_string: str) -> Optional[Any]:
        """Convert WKT string to Shapely geometry"""
        try:
            geom = from_wkt(wkt_string.strip())
            if geom is None or geom.is_empty:
                return None
            return geom
        except Exception:
            return None

    @staticmethod
    def wkt_to_geojson(wkt_string: str) -> Optional[Dict]:
        """
        Convert WKT → GeoJSON dict
        WKT: POLYGON ((lng lat, lng lat))
        GeoJSON: {"type":"Polygon","coordinates":[[[lng,lat]]]}
        """
        geom = GeometryParser.parse_wkt(wkt_string)
        if geom is None:
            return None
        return json.loads(to_geojson(geom))

    @staticmethod
    def wkt_to_leaflet(wkt_string: str) -> List[List[float]]:
        """
        Convert WKT → Leaflet coordinate array
        Returns [[lat, lng], [lat, lng], ...]
        IMPORTANT: Leaflet uses [lat, lng] not [lng, lat]
        """
        geom = GeometryParser.parse_wkt(wkt_string)
        if geom is None:
            return []

        if geom.geom_type == "Polygon":
            # exterior ring only for main boundary
            coords = list(geom.exterior.coords)
            # WKT is (lng lat), flip to [lat, lng]
            return [[lat, lng] for lng, lat in coords]
        elif geom.geom_type == "MultiPolygon":
            # Return largest polygon's exterior
            largest = max(
                geom.geoms, key=lambda g: g.area
            )
            coords = list(largest.exterior.coords)
            return [[lat, lng] for lng, lat in coords]
        return []

    @staticmethod
    def extract_all_polygons(
        kgis_response: List[Dict]
    ) -> Dict[str, Any]:
        """
        Parse full KGIS geomForSurveyNum response.
        Merges multiple polygon features.
        Returns unified result with all needed formats.
        """
        if not kgis_response:
            return {"found": False,
                    "error": "Empty response"}

        geometries = []
        for item in kgis_response:
            if item.get("message") != "200":
                continue
            geom = GeometryParser.parse_wkt(
                item.get("geom", "")
            )
            if geom and not geom.is_empty:
                geometries.append(geom)

        if not geometries:
            return {"found": False,
                    "error": "No valid geometries"}

        # Merge all polygons
        merged = (unary_union(geometries)
                  if len(geometries) > 1
                  else geometries[0])

        # Validate
        if not merged.is_valid:
            merged = merged.buffer(0)  # auto-fix

        centroid = merged.centroid
        bounds = merged.bounds  # (minx, miny, maxx, maxy)
        area_sqm = GeometryParser._area_sqm(merged)

        # Build all coordinate formats
        if merged.geom_type == "Polygon":
            all_polys = [merged]
        elif merged.geom_type == "MultiPolygon":
            all_polys = list(merged.geoms)
        else:
            all_polys = [merged]

        leaflet_polygons = []
        for poly in all_polys:
            coords = list(poly.exterior.coords)
            # WKT: (lng lat) → Leaflet: [lat, lng]
            leaflet_polygons.append(
                [[lat, lng] for lng, lat in coords]
            )

        geojson_feature = {
            "type": "Feature",
            "geometry": json.loads(to_geojson(merged)),
            "properties": {
                "area_ha": round(area_sqm / 10000, 4),
                "centroid_lat": round(centroid.y, 6),
                "centroid_lng": round(centroid.x, 6),
                "parcel_count": len(all_polys)
            }
        }

        return {
            "found": True,
            "centroid_lat": round(centroid.y, 6),
            "centroid_lng": round(centroid.x, 6),
            "area_ha": round(area_sqm / 10000, 4),
            "area_acres": round(area_sqm / 4046.86, 4),
            "area_sqm": round(area_sqm, 2),
            "bounds": {
                "min_lng": bounds[0], "min_lat": bounds[1],
                "max_lng": bounds[2], "max_lat": bounds[3]
            },
            "leaflet_polygons": leaflet_polygons,
            "geojson_feature": geojson_feature,
            "parcel_count": len(all_polys),
            "is_valid": merged.is_valid,
            "wkt": merged.wkt
        }

    @staticmethod
    def _area_sqm(geom) -> float:
        """
        Approximate area in sq meters using Haversine.
        Accurate enough for Karnataka farm land holdings.
        """
        if geom.geom_type == "Polygon":
            coords = list(geom.exterior.coords)
        elif geom.geom_type == "MultiPolygon":
            # Sum all sub-polygon areas
            return sum(
                GeometryParser._area_sqm(g)
                for g in geom.geoms
            )
        else:
            return 0.0

        R = 6371000  # Earth radius in meters
        n = len(coords)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            lng1, lat1 = coords[i]
            lng2, lat2 = coords[j]
            lat_r = (lat1 + lat2) / 2 * math.pi / 180
            x1 = lng1 * 111320 * math.cos(lat_r)
            y1 = lat1 * 110540
            x2 = lng2 * 111320 * math.cos(lat_r)
            y2 = lat2 * 110540
            area += x1 * y2 - x2 * y1
        return abs(area) / 2.0
