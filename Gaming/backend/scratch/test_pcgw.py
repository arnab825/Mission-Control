"""
Check Fortnite (known Reflex and DLSS game) PCGW page for all feature fields.
"""
import urllib.request, json, ssl, urllib.parse

ctx = ssl._create_unverified_context()
UA = "MissionControl/1.0 python-urllib"


def do_query(params: dict) -> dict:
    params["format"] = "json"
    url = "https://www.pcgamingwiki.com/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    r = urllib.request.urlopen(req, timeout=12, context=ctx)
    return json.loads(r.read().decode())


# Fetch Fortnite page
data = do_query({"action": "parse", "page": "Fortnite", "prop": "wikitext"})
if "error" in data:
    print("Error:", data["error"])
else:
    wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
    print("Page length:", len(wikitext))
    # Print lines mentioning key features
    kws = ["reflex", "dlss", "framegen", "frame gen", "ray tracing", "path tracing", "upscaling", "nvidia"]
    for i, line in enumerate(wikitext.splitlines()):
        if any(k in line.lower() for k in kws):
            print(f"{i:4}: {line[:160]}")
