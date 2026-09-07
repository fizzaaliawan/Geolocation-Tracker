# GeoTrack — Enterprise IP Geolocation & Network Intelligence Hub

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet)

A high-performance, full-stack IP Geolocation and Network Telemetry intelligence platform. Search IP addresses or domain hostnames, visualize precise coordinates on interactive dynamic maps, inspect Autonomous System Numbers (ASN), track search history with real-time visual analytics, and export audit logs.

---

## Overview

GeoTrack provides instant geographical, network, and security intelligence for any IPv4, IPv6, or domain name (e.g., `google.com`, `1.1.1.1`). Built with a modern Next.js 14 App Router frontend, resilient multi-provider API failover routines, in-memory caching mechanisms, and complementary Python (FastAPI & Streamlit) backends.

---

## Features

### IP & Domain Geolocation
- **Dual Lookup Modes**: Geolocate raw IPv4/IPv6 addresses or resolve domain hostnames on the fly via DNS lookup.
- **One-Click Auto Detection**: Automatically locate the client's public IP address with a single click.
- **Precise Device GPS Pinpoint**: Built-in high-accuracy HTML5 browser GPS detection with reverse geocoding to resolve street and city-level physical coordinates.
- **High-Resilience Multi-Provider Failover**: Sequential fallback strategy (`ip-api.com` → `ipapi.co` → `ipinfo.io`) ensuring high availability.
- **In-Memory Caching (1 Hour TTL)**: Reduces latency and prevents rate-limit exhaustion.

### Interactive Cartography & Visual Mapping
- **Dynamic Leaflet Map**: Client-rendered Leaflet map with custom pulsating markers and interactive popup tooltips.
- **Coordinate & Accuracy Overlay**: Real-time bounding circles for location uncertainty and precise latitude/longitude coordinates.
- **Tile Switching & Dark Mode Compatibility**: Fluid map rendering adapting to light and dark theme modes.

### Network & Telemetry Inspection
- **ASN & ISP Data**: Autonomous System Number (ASN), Internet Service Provider, Organization, and Routing info.
- **Geographical Breakdown**: Country, Country Code with Flag, Region/State, City, Postal/ZIP Code.
- **Live Local Timezone Sync**: Synchronized digital clock displaying target IP's exact local time in real-time.

### Historical Analytics & Data Export
- **Search History Tracking**: Persistent local search log storing recent searches and telemetry.
- **Visual Analytics**: Interactive distribution charts (Country & ISP breakdown) powered by Recharts.
- **Data Exporting**: Export search history logs to JSON and CSV formats, or direct-to-clipboard telemetry copy.

### Design & User Experience
- **Glassmorphic UI**: Modern interface with smooth micro-animations, blur effects, and typography.
- **Theme Switching**: Light and dark mode toggling using `next-themes`.
- **User Profile & Authentication**: Integrated authentication modal, user menu, and role management.

---

## Quick Start

### 1. Next.js Full-Stack Application (Primary)

#### Prerequisites
- Node.js: `v18.17.0` or higher
- Package Manager: `npm`, `yarn`, or `pnpm`

#### Installation & Setup
```bash
# 1. Clone the repository
git clone https://github.com/fizzaaliawan/Geolocation-Tracker.git
cd Geolocation-Tracker

# 2. Install dependencies
npm install

# 3. Launch the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the web dashboard.

---

### 2. Python FastAPI Backend (Optional REST API)

To run the standalone Python FastAPI backend server:

```bash
# 1. Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the FastAPI server
uvicorn main:app --reload --port 8000
```

- Interactive Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 3. Python Streamlit Dashboard (Optional Lightweight GUI)

To launch the Streamlit data app:

```bash
# Ensure virtual environment is active and dependencies are installed
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501) in your browser.

---

## API Reference

### Next.js API Routes

#### 1. Geolocation Lookup
`GET /api/geolocate?q={ip_or_domain}`

**Parameters:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `q` | `string` | Yes | IPv4, IPv6, or domain name (e.g., `8.8.8.8`, `github.com`) |

**Sample Response (`200 OK`):**
```json
{
  "query": "github.com",
  "ip": "140.82.121.4",
  "resolved": true,
  "city": "San Francisco",
  "region": "California",
  "country": "United States",
  "country_code": "US",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timezone": "America/Los_Angeles",
  "isp": "GitHub, Inc.",
  "org": "GitHub, Inc.",
  "asn": "AS36459",
  "zip_code": "94107",
  "provider": "ip-api.com"
}
```

#### 2. Client IP Detection
`GET /api/my-ip`

**Sample Response (`200 OK`):**
```json
{
  "ip": "203.0.113.195"
}
```

#### 3. Reverse Geocoding (Exact GPS)
`GET /api/reverse-geocode?lat={latitude}&lon={longitude}`

**Sample Response (`200 OK`):**
```json
{
  "city": "Sahiwal",
  "region": "Punjab",
  "country": "Pakistan",
  "country_code": "PK",
  "latitude": 30.6682,
  "longitude": 73.1114,
  "zip_code": "57000",
  "display_name": "Sahiwal, Sahiwal District, Punjab, Pakistan",
  "provider": "Device GPS & OpenStreetMap"
}
```

---

## Resilient Failover Mechanism

GeoTrack is engineered to prevent lookup failures through automatic multi-provider fallback:

```mermaid
flowchart TD
    A[Incoming Query: IP or Domain] --> B{In-Memory Cache Hit?}
    B -- Yes --> C[Return Cached Result (TTL 1h)]
    B -- No --> D[Resolve Domain DNS if applicable]
    D --> E[Provider 1: ip-api.com]
    E -- Success --> G[Cache & Return Result]
    E -- Fail / Timeout --> F[Provider 2: ipapi.co]
    F -- Success --> G
    F -- Fail / Timeout --> H[Provider 3: ipinfo.io]
    H -- Success --> G
    H -- All Failed --> I[Return Standardized Fallback Error]
```

---

## Tech Stack & Dependencies

| Category | Technology |
| :--- | :--- |
| Frontend Framework | Next.js 14 (App Router) |
| Language | TypeScript / Python 3.10+ |
| Styling | Tailwind CSS & Tailwind Animate |
| Map Rendering | Leaflet & React-Leaflet |
| Data Visualization | Recharts |
| Iconography | Lucide React |
| Notifications | Sonner |
| Theming | Next Themes |
| Backend (Alternative) | FastAPI, Uvicorn, Streamlit |
