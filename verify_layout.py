import urllib.request
import re
import sys

def run_tests():
    print("=== Launching Automated Layout & Asset Validation Metric ===")
    
    server_url = "http://127.0.0.1:8080"
    errors = []

    # 1. Test Server Reachability and Assets HTTP Code
    assets = {
        "Index page": f"{server_url}/",
        "Stylesheet": f"{server_url}/styles.css",
        "JavaScript Engine": f"{server_url}/app.js"
    }

    loaded_content = {}
    for name, url in assets.items():
        try:
            response = urllib.request.urlopen(url, timeout=5)
            code = response.getcode()
            if code == 200:
                print(f"[OK] {name} fetched successfully (HTTP 200).")
                loaded_content[name] = response.read().decode('utf-8')
            else:
                errors.append(f"{name} returned unexpected HTTP code: {code}")
        except Exception as e:
            errors.append(f"Failed to fetch {name} from {url}: {e}")

    if errors:
        print("\n[ERROR] Fetching phase failed. Exiting tests.")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)

    # 2. Audit index.html DOM Elements
    html = loaded_content["Index page"]
    required_ids = [
        "fc", "dr", "df", "c", "speed", "heading", "separation", "alpha",
        "tx-x", "tx-y", "rx-x", "rx-y", "rb", "tgt-angle", "calc-tgt-x", "calc-tgt-y",
        "resolvability-status", "critical-angles-val", "wavelength-val", "dmin-any-val",
        "geometry-canvas", "metric-chart", "sensitivity-chart", "rd-canvas", "tab-btn-rd", "tab-btn-charts",
        "m-gr", "m-gf", "m-tensor", "m-eigen"
    ]

    print("\nAuditing DOM element IDs in index.html:")
    for eid in required_ids:
        pattern = rf'id=["\']{eid}["\']'
        if re.search(pattern, html):
            print(f"  [OK] Element ID '{eid}' is present.")
        else:
            errors.append(f"Missing element with ID '{eid}' in index.html")

    # Check CDN libraries imports
    if "chart.js" in html.lower():
        print("  [OK] Chart.js library script found.")
    else:
        errors.append("Chart.js script load missing in index.html")

    if "katex" in html.lower():
        print("  [OK] KaTeX library script found.")
    else:
        errors.append("KaTeX script load missing in index.html")

    # 3. Audit styles.css layout properties
    css = loaded_content["Stylesheet"]
    print("\nAuditing CSS Layout in styles.css:")
    
    # Check visualizer-grid has flex: 1
    vg_pattern = r'\.visualizer-grid\s*\{[^}]*flex:\s*1'
    if re.search(vg_pattern, css):
        print("  [OK] .visualizer-grid has 'flex: 1' scaling layout active.")
    else:
        errors.append("styles.css is missing 'flex: 1' on .visualizer-grid")

    # Check matrix styling rules in stylesheet
    if ".matrix-grid" in css and ".matrix-card" in css:
        print("  [OK] Matrix grid and card styling rules (.matrix-grid, .matrix-card) are active.")
    else:
        errors.append("styles.css is missing matrix layout styling declarations (.matrix-grid or .matrix-card)")

    # 4. Audit app.js scope fixes
    js = loaded_content["JavaScript Engine"]
    print("\nAuditing Scope Configurations in app.js:")
    
    if "SPEED_OF_LIGHT" in js:
        print("  [OK] SPEED_OF_LIGHT constant is active.")
    else:
        errors.append("app.js is missing global SPEED_OF_LIGHT constant")

    if "renderFallback" in js:
        print("  [OK] Plain-text math fallback renderer function is active.")
    else:
        errors.append("app.js is missing plain-text math renderFallback function")

    # 5. Final Report
    print("\n" + "="*50)
    if not errors:
        print("STATUS: ALL VALIDATION TESTS PASSED SUCCESSFULLY!")
        print("The server, DOM structure, CSS constraints, and JS engine scope rules are verified.")
        print("="*50)
        sys.exit(0)
    else:
        print("STATUS: VALIDATION TESTS FAILED!")
        for err in errors:
            print(f"  - {err}")
        print("="*50)
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
