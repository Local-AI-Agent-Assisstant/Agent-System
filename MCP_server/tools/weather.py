import requests
import logging

logger = logging.getLogger(__name__)

# ---------------- Weather ---------------- #

def get_current_weather(city: str) -> dict:
    logger.info(f"Tool called: get_current_weather({city})")

    try:
        response = requests.get(
            f"https://wttr.in/{city}?format=j1",
            timeout=20
        )

        response.raise_for_status()

        data = response.json()

        current = data["current_condition"][0]

        temp_c = int(current.get("temp_C", 0))
        condition = current.get("weatherDesc", [{}])[0].get("value", "").lower()
        humidity = int(current.get("humidity", 0))

        recommendations = []

        # Rain
        if "rain" in condition or "drizzle" in condition or "shower" in condition:
            recommendations.append(
                "You should probably take an umbrella with you."
            )

        # Hot weather
        if temp_c >= 30:
            recommendations.append(
                "It is quite hot outside, so staying hydrated is recommended."
            )

        # Nice weather
        if 20 <= temp_c <= 28 and "sun" in condition:
            recommendations.append(
                "The weather looks pleasant today — it could be a good time to go outside."
            )

        # Cold weather
        if temp_c <= 10:
            recommendations.append(
                "It is cold outside, so wearing warm clothes is recommended."
            )

        # Fog
        if "fog" in condition or "mist" in condition:
            recommendations.append(
                "Visibility may be limited outdoors due to fog."
            )

        # High humidity
        if humidity >= 85:
            recommendations.append(
                "Humidity is quite high today, so the weather may feel heavier than usual."
            )

        if not recommendations:
            recommendations.append(
                "Weather conditions look fairly normal today."
            )
        today = data["weather"][0]
        astronomy = today["astronomy"][0]

        return {
            "city": city,

            "recommendations": recommendations,

            "temperature_c": current.get("temp_C"),
            "feels_like_c": current.get("FeelsLikeC"),

            "condition": current.get("weatherDesc", [{}])[0].get("value"),

            "humidity": current.get("humidity"),
            "wind_kph": current.get("windspeedKmph"),
            "wind_direction": current.get("winddir16Point"),

            "visibility_km": current.get("visibility"),
            "pressure": current.get("pressure"),

            "uv_index": current.get("uvIndex"),

            "sunrise": astronomy.get("sunrise"),
            "sunset": astronomy.get("sunset"),

            "max_temp_c": today.get("maxtempC"),
            "min_temp_c": today.get("mintempC"),

            "chance_of_rain": today["hourly"][0].get("chanceofrain"),

            "local_time": data.get("time_zone", [{}])[0].get("localtime"),
        }

    except requests.RequestException as e:
        logger.error(f"Weather fetch error: {e}")
        return {
            "error": f"Error fetching weather: {e}"
        }

    except Exception as e:
        logger.error(f"Weather parsing error: {e}")
        return {
            "error": f"Error parsing weather data: {e}"
        }