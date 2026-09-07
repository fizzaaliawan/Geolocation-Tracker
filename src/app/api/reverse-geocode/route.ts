import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Latitude and longitude query parameters are required." },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Invalid coordinate values." },
      { status: 400 }
    );
  }

  try {
    // 1. Try OpenStreetMap Nominatim reverse geocode
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "GeoTrack-App/1.0 (contact@geotrack.local)",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district ||
        "Unknown City";

      const region = addr.state || addr.province || addr.region || "Unknown Region";
      const country = addr.country || "Unknown Country";
      const country_code = (addr.country_code || "UN").toUpperCase();
      const zip_code = addr.postcode || "Unknown";

      return NextResponse.json({
        city,
        region,
        country,
        country_code,
        latitude,
        longitude,
        zip_code,
        display_name: data.display_name || `${city}, ${region}, ${country}`,
        provider: "Device GPS & OpenStreetMap",
      });
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode failed, trying fallback:", err);
  }

  // 2. Fallback to BigDataCloud client-side reverse geocoding
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(bdcUrl, {
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        city: data.city || data.locality || "Unknown City",
        region: data.principalSubdivision || "Unknown Region",
        country: data.countryName || "Unknown Country",
        country_code: (data.countryCode || "UN").toUpperCase(),
        latitude,
        longitude,
        zip_code: data.postcode || "Unknown",
        display_name: `${data.city || data.locality}, ${data.principalSubdivision}, ${data.countryName}`,
        provider: "Device GPS & BigDataCloud",
      });
    }
  } catch (err) {
    console.error("All reverse geocoders failed:", err);
  }

  // Fallback return with coordinates
  return NextResponse.json({
    city: "Exact GPS Coordinates",
    region: "Local Device",
    country: "Local Device",
    country_code: "UN",
    latitude,
    longitude,
    zip_code: "Unknown",
    display_name: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
    provider: "Device GPS Coordinates",
  });
}
