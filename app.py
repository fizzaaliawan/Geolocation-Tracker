import streamlit as st
import requests
import folium
from streamlit_folium import st_folium
import ipaddress

# --- Page Config ---
st.set_page_config(page_title="IP Geolocation Tracker", page_icon="🌍", layout="wide")

# --- Custom CSS for styling ---
st.markdown("""
<style>
body {
    font-family: 'Inter', sans-serif;
    background-color: #ffffff;
    color: #0f172a;
}
h1 {
    text-align: center;
    color: #2563eb;
}
h1:after {
    content: "";
    display: block;
    width: 72px;
    height: 3px;
    background: #06b6d4;
    margin: 0.5rem auto 0;
    border-radius: 9999px;
}
.stButton > button {
    background-color: #2563eb;
    color: white;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: 600;
    width: 100%;
    transition: all 0.2s ease;
}
.stButton > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.card {
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    margin-bottom: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.search-container {
    display: flex;
    gap: 10px;
}
.search-container input[type="text"] {
    flex: 4;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    font-size: 1rem;
    outline: none;
}
.search-container input[type="text"]:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
}
.button-container {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}
.button-container .stButton {
    flex: 1;
}
</style>
""", unsafe_allow_html=True)

# --- Helpers ---
def is_valid_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip.strip())
        return True
    except:
        return False

@st.cache_data(ttl=300)
def fetch_geo(ip: str) -> dict:
    try:
        r = requests.get(f"http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,org,as,query")
        return r.json()
    except:
        return {"status":"fail","message":"Request error"}

@st.cache_data(ttl=300)
def get_my_ip() -> str:
    try:
        r = requests.get("https://api.ipify.org?format=json", timeout=5)
        return r.json().get("ip","")
    except:
        return ""

# --- Session State ---
if "ip_value" not in st.session_state: st.session_state["ip_value"] = ""
if "last_data" not in st.session_state: st.session_state["last_data"] = None

# --- Title ---
st.title("🌍 IP Geolocation Tracker")
st.markdown("Lookup any IP or detect your current IP location.")

# --- Input + Search Button ---
st.markdown('<div class="search-container">', unsafe_allow_html=True)
ip_input = st.text_input("", value=st.session_state["ip_value"], placeholder="Enter IP address", label_visibility="collapsed")
search_clicked = st.button("Search")
st.markdown('</div>', unsafe_allow_html=True)

# --- GPS / My IP Buttons ---
col1, col2 = st.columns(2)
with col1:
    get_my_ip_clicked = st.button("Get My IP")

# --- Handle IP Search ---
if search_clicked:
    if not ip_input:
        st.warning("Please enter an IP address.")
    elif not is_valid_ip(ip_input):
        st.error("Invalid IP address.")
    else:
        st.session_state["ip_value"] = ip_input
        data = fetch_geo(ip_input)
        if data.get("status") == "success":
            st.session_state["last_data"] = data
        else:
            st.error(data.get("message","Error fetching IP location"))

# --- Handle My IP ---
if get_my_ip_clicked:
    my_ip = get_my_ip()
    if my_ip:
        st.session_state["ip_value"] = my_ip
        data = fetch_geo(my_ip)
        if data.get("status") == "success":
            st.session_state["last_data"] = data
        else:
            st.error(data.get("message","Error fetching IP location"))
    else:
        st.error("Unable to detect your IP.")

# --- Display Results ---
last = st.session_state.get("last_data")
if last and last.get("status")=="success":
    lat, lon = last.get("lat"), last.get("lon")
    city, country = last.get("city"), last.get("country")
    isp = last.get("isp")
    timezone = last.get("timezone")
    
    # Info Card
    st.markdown(f"""
        <div class='card'>
        <h4>📍 IP Location Details</h4>
        <p><strong>IP:</strong> {last.get('query')}</p>
        <p><strong>City:</strong> {city}</p>
        <p><strong>Region:</strong> {last.get('regionName')}</p>
        <p><strong>Country:</strong> {country}</p>
        <p><strong>ISP:</strong> {isp}</p>
        <p><strong>Timezone:</strong> {timezone}</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Map
    m = folium.Map(location=[lat, lon], zoom_start=13)
    folium.Marker([lat, lon],
                  tooltip=f"{city}, {country}",
                  popup=f"IP: {last.get('query')}<br>ISP: {isp}",
                  icon=folium.Icon(color='blue')).add_to(m)
    st_folium(m, height=450, use_container_width=True)
