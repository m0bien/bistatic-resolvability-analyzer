import numpy as np

def run_verification():
    print("=== Bistatic Resolvability Mathematical Verification ===")
    
    # 1. Inputs
    fc = 100.0 * 1e6         # Hz (100 MHz)
    C0 = 299792458           # m/s
    lam = C0 / fc            # m
    dR_min = 1500.0          # m (1500 m)
    df_min = 20.0            # Hz
    c = 1.0                  # Threshold factor
    
    tx = np.array([-10000.0, 0.0])
    rx = np.array([10000.0, 0.0])
    
    # Polar positioning
    rb = 36055.51            # m (Bistatic range)
    tgt_angle_deg = 123.69   # deg (Angle from receiver node)
    theta = np.radians(tgt_angle_deg)
    
    L = np.linalg.norm(rx - tx)
    d_RT = tx - rx
    u = np.array([np.cos(theta), np.sin(theta)])
    u_dot_d = np.dot(u, d_RT)
    RR_calc = (rb**2 - L**2) / (2.0 * (rb - u_dot_d))
    tgt = rx + RR_calc * u
    
    speed = 150.0            # m/s
    heading_deg = 45.0
    phi = np.radians(heading_deg)
    v = np.array([speed * np.cos(phi), speed * np.sin(phi)])
    
    d = 1000.0               # m (1 km)
    alpha_deg = 30.0
    alpha = np.radians(alpha_deg)
    a = np.array([np.cos(alpha), np.sin(alpha)])
    
    print(f"Carrier Frequency: {fc/1e9:.1f} GHz")
    print(f"Wavelength (lambda): {lam:.4f} m")
    print(f"Target position: {tgt}")
    print(f"Target Velocity: {v} (Speed={speed} m/s, Heading={heading_deg} deg)")
    print(f"Separation: d={d} m, Aspect angle alpha={alpha_deg} deg")
    
    # 2. Vector Computations
    rT = tgt - tx
    RT = np.linalg.norm(rT)
    uT = rT / RT
    
    rR = tgt - rx
    RR = np.linalg.norm(rR)
    uR = rR / RR
    
    cosBeta = np.dot(uT, uR)
    beta = np.arccos(np.clip(cosBeta, -1.0, 1.0))
    print(f"\nRanges: RT = {RT:.2f} m, RR = {RR:.2f} m")
    print(f"Bistatic Angle beta: {np.degrees(beta):.2f} deg")
    
    # 3. Gradients
    gR = uT + uR
    print(f"Range Gradient gR: {gR}")
    
    PT = np.eye(2) - np.outer(uT, uT)
    PR = np.eye(2) - np.outer(uR, uR)
    A = (PT / RT + PR / RR) / lam
    gf = A @ v
    print(f"Doppler Gradient gf: {gf}")
    
    # 4. Metric Tensor M
    M = np.outer(gR, gR) / (dR_min**2) + np.outer(gf, gf) / (df_min**2)
    print(f"Metric Tensor M:\n{M}")
    
    # 5. Eigenvalues and Bounds
    C0_val = (M[0, 0] + M[1, 1]) / 2.0
    Cc = (M[0, 0] - M[1, 1]) / 2.0
    Cs = M[0, 1]
    D = np.hypot(Cc, Cs)
    psi = np.atan2(Cs, Cc)
    
    lambda1 = C0_val + D
    lambda2 = max(0.0, C0_val - D)
    print(f"\nEigenvalues: lambda_1 = {lambda1:.6e}, lambda_2 = {lambda2:.6e}")
    
    d_min_any = c / np.sqrt(lambda1) if lambda1 > 0 else float('inf')
    d_min_all = c / np.sqrt(lambda2) if lambda2 > 0 else float('inf')
    print(f"Resolving Thresholds (c={c}):")
    print(f"  - Minimum separation to resolve in ANY orientation: {d_min_any:.2f} m")
    print(f"  - Minimum separation to resolve in ALL orientations: {d_min_all:.2f} m")
    
    # 6. Current State Resolvability
    metric_val = (d**2) * (a.T @ M @ a)
    is_resolved = metric_val >= (c**2)
    print(f"\nCurrent Separation: d = {d} m, alpha = {alpha_deg} deg")
    print(f"  - Metric value F(d, alpha): {metric_val:.4f} (Threshold c^2 = {c**2:.4f})")
    print(f"  - Resolved? {is_resolved}")
    
    # 7. Critical Angles
    val = ((c**2) / (d**2) - C0_val) / D
    print(f"Critical equation term V: {val:.4f}")
    if abs(val) <= 1.0:
        gamma = np.arccos(val)
        alpha1 = (psi + gamma) / 2.0
        alpha2 = (psi - gamma) / 2.0
        
        # normalize to [0, pi]
        alpha1 = (alpha1 % np.pi + np.pi) % np.pi
        alpha2 = (alpha2 % np.pi + np.pi) % np.pi
        
        c_angles = sorted([np.degrees(alpha1), np.degrees(alpha2)])
        print(f"  - Critical separation angles alpha_crit: {c_angles[0]:.2f} deg, {c_angles[1]:.2f} deg")
    else:
        if val > 1.0:
            print("  - Critical angles: None (Target is NEVER resolved for any orientation)")
        else:
            print("  - Critical angles: None (Target is ALWAYS resolved for all orientations)")
            
    print("=======================================================")

if __name__ == "__main__":
    run_verification()
