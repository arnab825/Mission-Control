import requests

urls = [
    "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1659040/header.jpg",
    "https://shared.steamstatic.com/store_item_assets/steam/apps/1659040/header.jpg",
    "https://cdn.akamai.steamstatic.com/steam/apps/1659040/header.jpg",
]

for url in urls:
    try:
        resp = requests.get(url, allow_redirects=True, timeout=5)
        print(f"{url} -> {resp.url} : {resp.status_code}")
    except Exception as e:
        print(f"{url} : Failed ({e})")
