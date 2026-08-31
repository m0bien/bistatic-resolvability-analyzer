### A Pluto.jl notebook ###
# v0.20.17

using Markdown
using InteractiveUtils

# ╔═╡ 00000000-0000-0000-0000-000000000012
begin
    using LinearAlgebra
    using Printf
    using Plots
end

# ╔═╡ 00000000-0000-0000-0000-000000000011
md"""
# Bistatic Target Resolvability Analysis
This Pluto notebook calculates and validates target resolvability in a bistatic radar geometry. It evaluates whether two closely spaced targets moving with identical velocity vectors can be resolved in Range-Doppler space, and solves analytically for the critical separation aspect angles.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000013
md"""
## 1. System Parameters & Configuration
Define the radar carrier frequency $f_c$, the range resolution $\Delta R_{min}$, the Doppler resolution $\Delta f_{d,min}$, and transmitter/receiver coordinates.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000014
begin
    # Constants
    fc = 100.0 * 1e6         # Hz (100 MHz)
    C0 = 299792458.0         # Speed of light (m/s)
    lam = C0 / fc            # Wavelength (m)
    
    # Resolutions
    dR_min = 1500.0          # m
    df_min = 20.0            # Hz
    c = 1.0                  # Threshold factor
    
    # Nodes positions (m)
    tx = [-10000.0, 0.0]
    rx = [10000.0, 0.0]
end

# ╔═╡ 00000000-0000-0000-0000-000000000015
md"""
## 2. Target Geometry & Positioning
We position the targets using the polar equation of the constant bistatic range ellipse.
* $r_b$ is the bistatic range.
* $\theta_{rx}$ is the polar angle relative to the receiver.
* $d$ is the targets separation distance.
* $\alpha$ is the aspect separation angle.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000016
begin
    # Target midpoint positioning
    rb = 36055.51            # m
    tgt_angle_deg = 123.69   # deg
    theta = deg2rad(tgt_angle_deg)
    
    L = norm(rx - tx)
    d_RT = tx - rx
    u = [cos(theta), sin(theta)]
    u_dot_d = dot(u, d_RT)
    RR_calc = (rb^2 - L^2) / (2.0 * (rb - u_dot_d))
    tgt = rx + RR_calc * u
    
    # Target velocity vector
    speed = 150.0            # m/s
    heading_deg = 45.0
    phi = deg2rad(heading_deg)
    v = [speed * cos(phi), speed * sin(phi)]
    
    # Target separation
    d = 1000.0               # m
    alpha_deg = 30.0
    alpha = deg2rad(alpha_deg)
    a = [cos(alpha), sin(alpha)]
    
    # Target A & B exact positions
    tgtA = tgt + (d/2) * a
    tgtB = tgt - (d/2) * a
    
    # Text output summary of current configuration
    md"""
    * **Wavelength $\lambda$**: $(round(lam, digits=4)) m
    * **Target Midpoint**: $(round.(tgt, digits=2)) m
    * **Target A**: $(round.(tgtA, digits=2)) m
    * **Target B**: $(round.(tgtB, digits=2)) m
    * **Velocity Vector**: $(round.(v, digits=2)) m/s
    """
end

# ╔═╡ 00000000-0000-0000-0000-000000000017
begin
    # Plot radar geometry
    p_geom = plot(
        [tx[1]], [tx[2]], 
        seriestype=:scatter, label="Transmitter (Tx)", 
        markershape=:rect, markersize=8, color=:red,
        legend=:outertopright, aspect_ratio=:equal,
        title="Bistatic Radar Geometry",
        xlabel="X Position (m)", ylabel="Y Position (m)"
    )
    scatter!(p_geom, [rx[1]], [rx[2]], label="Receiver (Rx)", markershape=:rect, markersize=8, color=:blue)
    scatter!(p_geom, [tgt[1]], [tgt[2]], label="Target Midpoint", markershape=:circle, markersize=6, color=:green)
    
    # Draw paths
    plot!(p_geom, [tx[1], tgt[1]], [tx[2], tgt[2]], color=:red, linestyle=:dash, label="Tx-to-Target")
    plot!(p_geom, [rx[1], tgt[1]], [rx[2], tgt[2]], color=:blue, linestyle=:dash, label="Rx-to-Target")
    
    # Draw velocity vector (scaled for visualization)
    scale_v = 15.0
    plot!(p_geom, [tgt[1], tgt[1] + v[1]*scale_v], [tgt[2], tgt[2] + v[2]*scale_v], 
          arrow=arrow(:simple, :closed, 0.3, 0.3), color=:orange, linewidth=2, label="Velocity (scaled)")
          
    # Draw Target A and B separation vector
    scatter!(p_geom, [tgtA[1], tgtB[1]], [tgtA[2], tgtB[2]], label="Targets A & B", markershape=:circle, markersize=5, color=:purple)
    plot!(p_geom, [tgtA[1], tgtB[1]], [tgtA[2], tgtB[2]], color=:purple, linewidth=1.5, label="Separation axis")
    
    p_geom
end

# ╔═╡ 00000000-0000-0000-0000-000000000018
md"""
## 3. Spatial Gradients Computation
Compute the range spatial gradient $\mathbf{g}_R$ and Doppler spatial gradient $\mathbf{g}_f$:
$$\mathbf{g}_R = \mathbf{u}_T + \mathbf{u}_R$$
$$\mathbf{g}_f = \frac{1}{\lambda} \left[ \frac{\mathbf{I} - \mathbf{u}_T \mathbf{u}_T^T}{R_T} + \frac{\mathbf{I} - \mathbf{u}_R \mathbf{u}_R^T}{R_R} \right] \mathbf{v}$$
"""

# ╔═╡ 00000000-0000-0000-0000-000000000019
begin
    # Ranges from Tx and Rx to target midpoint
    rT = tgt - tx
    RT = norm(rT)
    uT = rT / RT
    
    rR = tgt - rx
    RR = norm(rR)
    uR = rR / RR
    
    # Bistatic angle
    cosBeta = dot(uT, uR)
    beta = acos(clamp(cosBeta, -1.0, 1.0))
    
    # Range gradient
    gR = uT + uR
    
    # Doppler gradient
    PT = I - uT * uT'
    PR = I - uR * uR'
    A_mat = (PT / RT + PR / RR) / lam
    gf = A_mat * v
    
    md"""
    * **Bistatic Angle $\beta$**: $(round(rad2deg(beta), digits=2))°
    * **Range Gradient $\mathbf{g}_R$**: $[$(round(gR[1], digits=6)),\ $(round(gR[2], digits=6))]$
    * **Doppler Gradient $\mathbf{g}_f$**: $[$(round(gf[1], digits=6)),\ $(round(gf[2], digits=6))]$
    """
end

# ╔═╡ 00000000-0000-0000-0000-000000000020
md"""
## 4. Resolution Metric Tensor ($\mathbf{M}$) & Eigenvalues
$$\mathbf{M} = \frac{\mathbf{g}_R \mathbf{g}_R^T}{\Delta R_{min}^2} + \frac{\mathbf{g}_f \mathbf{g}_f^T}{\Delta f_{d,min}^2}$$
The eigenvalues of $\mathbf{M}$ correspond to the principal axis bounds of target separability.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000021
begin
    # Metric tensor M
    M = (gR * gR') / (dR_min^2) + (gf * gf') / (df_min^2)
    
    # Analytical eigenvalues
    C0_val = (M[1, 1] + M[2, 2]) / 2.0
    Cc = (M[1, 1] - M[2, 2]) / 2.0
    Cs = M[1, 2]
    D_val = hypot(Cc, Cs)
    psi = atan(Cs, Cc)
    
    lambda1 = C0_val + D_val
    lambda2 = max(0.0, C0_val - D_val)
    
    # Minimum separation limits
    d_min_any = lambda1 > 0 ? c / sqrt(lambda1) : Inf
    d_min_all = lambda2 > 0 ? c / sqrt(lambda2) : Inf
    
    md"""
    * **Metric Tensor $\mathbf{M}$**:
      $$\begin{bmatrix} $(M[1,1]) & $(M[1,2]) \\ $(M[2,1]) & $(M[2,2]) \end{bmatrix}$$
    * **Eigenvalues**: $\lambda_1 = $(lambda1)$, \lambda_2 = $(lambda2)$
    * **Minimum separation to resolve in ANY orientation ($d_{min,any}$)**: $(round(d_min_any, digits=2)) m
    * **Minimum separation to resolve in ALL orientations ($d_{min,all}$)**: $(round(d_min_all, digits=2)) m
    """
end

# ╔═╡ 00000000-0000-0000-0000-000000000022
begin
    # Parameterize and plot the resolution ellipse
    phi_vals = range(0, 2*pi, length=200)
    r1_val = lambda1 > 0 ? c / sqrt(lambda1) : 0.0
    r2_val = lambda2 > 0 ? c / sqrt(lambda2) : 25000.0
    
    # Rotation angle (angle of first eigenvector is psi / 2)
    rot_angle = psi / 2
    
    # Ellipse local coordinates
    x_prime = r1_val .* cos.(phi_vals)
    y_prime = r2_val .* sin.(phi_vals)
    
    # Rotate to global coordinates
    ellipse_x = x_prime .* cos(rot_angle) .- y_prime .* sin(rot_angle)
    ellipse_y = x_prime .* sin(rot_angle) .+ y_prime .* cos(rot_angle)
    
    p_ellipse = plot(
        ellipse_x, ellipse_y, 
        label="Metric Resolution Cell Limit (F(d)=1)", 
        color=:red, linewidth=2, linestyle=:dash,
        aspect_ratio=:equal, legend=:outertopright,
        title="Target Separation vs. Resolution Ellipse",
        xlabel="Local X Separation (m)", ylabel="Local Y Separation (m)"
    )
    
    # Target separation vector
    plot!(p_ellipse, [-d/2 * a[1], d/2 * a[1]], [-d/2 * a[2], d/2 * a[2]], 
          color=:purple, linewidth=3, marker=:circle, markersize=6,
          label="Separation Vector (d = $(d)m, α = $(alpha_deg)°)")
          
    # Highlight targets status
    is_approx_resolved = (d^2) * (a' * M * a) >= (c^2)
    status_str = is_approx_resolved ? "STATUS: RESOLVED (Vector ends outside cell)" : "STATUS: UNRESOLVED (Vector ends inside cell)"
    title!(p_ellipse, "Target Separation vs. Resolution Ellipse\n$status_str")
    
    p_ellipse
end

# ╔═╡ 00000000-0000-0000-0000-000000000023
md"""
## 5. Current State Resolvability Check
Evaluate the current targets separability using both the first-order gradient tensor approximation and the exact Range-Doppler signal coordinates.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000024
begin
    # Gradient approximation metric
    metric_val = (d^2) * (a' * M * a)
    is_approx_resolved_val = metric_val >= (c^2)
    
    # Exact non-linear check
    rT_A = norm(tgtA - tx)
    rR_A = norm(tgtA - rx)
    Rb_A = rT_A + rR_A
    fd_A = (1 / lam) * dot(v, (tgtA - tx)/rT_A + (tgtA - rx)/rR_A)
    
    rT_B = norm(tgtB - tx)
    rR_B = norm(tgtB - rx)
    Rb_B = rT_B + rR_B
    fd_B = (1 / lam) * dot(v, (tgtB - tx)/rT_B + (tgtB - rx)/rR_B)
    
    exact_metric = ((Rb_A - Rb_B) / dR_min)^2 + ((fd_A - fd_B) / df_min)^2
    is_exact_resolved = exact_metric >= c^2
    
    md"""
    * **Current separation $d$**: $(d) m, **Aspect angle $\alpha$**: $(alpha_deg)°
    * **Gradient Approximation Metric**: $(round(metric_val, digits=4)) (Resolved? **$(is_approx_resolved_val)**)
    * **Exact Range-Doppler Space Metric**: $(round(exact_metric, digits=4)) (Resolved? **$(is_exact_resolved)**)
    """
end

# ╔═╡ 00000000-0000-0000-0000-000000000025
md"""
## 6. Critical Aspect Angle Boundaries ($\alpha_{crit}$)
Solve for the aspect separation angles where the targets transition between resolved and unresolved.
"""

# ╔═╡ 00000000-0000-0000-0000-000000000026
begin
    val = ((c^2) / (d^2) - C0_val) / D_val
    
    if abs(val) <= 1.0
        gamma = acos(val)
        alpha1 = (psi + gamma) / 2.0
        alpha2 = (psi - gamma) / 2.0
        
        # normalize to [0, pi]
        alpha1 = mod(alpha1, pi)
        alpha2 = mod(alpha2, pi)
        
        c_angles = sort([rad2deg(alpha1), rad2deg(alpha2)])
        
        md"""
        * **Critical Separation aspect angles**: **$(round(c_angles[1], digits=2))°** and **$(round(c_angles[2], digits=2))°**
        (along with their antipodals). Separations falling in these sectors will be resolved.
        """
    else
        if val > 1.0
            md"""* **Status**: Target is **NEVER** resolved for any orientation angle $\alpha$ at the current separation distance of $(d) m."""
        else
            md"""* **Status**: Target is **ALWAYS** resolved for all orientation angles $\alpha$ at the current separation distance of $(d) m."""
        end
    end
end

# ╔═╡ Cell order:
# ╠═00000000-0000-0000-0000-000000000011
# ╠═00000000-0000-0000-0000-000000000012
# ╠═00000000-0000-0000-0000-000000000013
# ╠═00000000-0000-0000-0000-000000000014
# ╠═00000000-0000-0000-0000-000000000015
# ╠═00000000-0000-0000-0000-000000000016
# ╠═00000000-0000-0000-0000-000000000017
# ╠═00000000-0000-0000-0000-000000000018
# ╠═00000000-0000-0000-0000-000000000019
# ╠═00000000-0000-0000-0000-000000000020
# ╠═00000000-0000-0000-0000-000000000021
# ╠═00000000-0000-0000-0000-000000000022
# ╠═00000000-0000-0000-0000-000000000023
# ╠═00000000-0000-0000-0000-000000000024
# ╠═00000000-0000-0000-0000-000000000025
# ╠═00000000-0000-0000-0000-000000000026
