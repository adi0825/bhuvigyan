from shapely.geometry import shape
from typing import Dict, Any, List


class GeometryValidator:

    # Karnataka bounding box
    KA_BOUNDS = {
        "min_lat": 11.5, "max_lat": 18.5,
        "min_lng": 74.0, "max_lng": 78.5
    }

    @classmethod
    def is_in_karnataka(
        cls, lat: float, lng: float
    ) -> bool:
        b = cls.KA_BOUNDS
        return (b["min_lat"] <= lat <= b["max_lat"] and
                b["min_lng"] <= lng <= b["max_lng"])

    @classmethod
    def validate_polygon(
        cls, geo_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        issues = []

        if not geo_result.get("found"):
            return {
                "valid": False,
                "issues": ["No geometry found"]
            }

        lat = geo_result.get("centroid_lat", 0)
        lng = geo_result.get("centroid_lng", 0)

        if not cls.is_in_karnataka(lat, lng):
            issues.append(
                f"Centroid ({lat},{lng}) outside Karnataka"
            )

        area = geo_result.get("area_ha", 0)
        if area < 0.01:
            issues.append("Area < 0.01 Ha (suspect)")
        if area > 500:
            issues.append("Area > 500 Ha (unusually large)")

        if not geo_result.get("is_valid", True):
            issues.append("Polygon geometry is invalid")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "in_karnataka": cls.is_in_karnataka(lat, lng),
            "area_ha": area
        }
