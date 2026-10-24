import logging
import httpx

logger = logging.getLogger(__name__)


async def get_weather(location: str) -> str:
    location = location.strip() or "Colombo"
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            geo = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": location, "count": 1, "language": "en", "format": "json"},
            )
            geo.raise_for_status()
            results = geo.json().get("results", [])
            if not results:
                return f"I couldn't find weather information for {location}."

            place = results[0]
            forecast = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": place["latitude"],
                    "longitude": place["longitude"],
                    "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
                    "timezone": "auto",
                },
            )
            forecast.raise_for_status()
            current = forecast.json().get("current", {})
            temp = current.get("temperature_2m")
            feels = current.get("apparent_temperature")
            wind = current.get("wind_speed_10m")
            return f"In {place['name']}, it is currently {temp}°C (feels like {feels}°C) with wind speeds around {wind} km/h."
    except Exception as exc:
        logger.warning("Weather retrieval failed for '%s': %s", location, exc)
        return f"Unable to retrieve live weather for {location} right now. Please verify your internet connection."
