// Speed of light
const SPEED_OF_LIGHT = 299792458;

// UI Elements
const inputs = {
    fc: document.getElementById('fc'),
    dr: document.getElementById('dr'),
    df: document.getElementById('df'),
    c: document.getElementById('c'),
    speed: document.getElementById('speed'),
    heading: document.getElementById('heading'),
    separation: document.getElementById('separation'),
    alpha: document.getElementById('alpha'),
    txX: document.getElementById('tx-x'),
    txY: document.getElementById('tx-y'),
    rxX: document.getElementById('rx-x'),
    rxY: document.getElementById('rx-y'),
    rb: document.getElementById('rb'),
    tgtAngle: document.getElementById('tgt-angle'),
};

const labels = {
    fc: document.getElementById('fc-val'),
    dr: document.getElementById('dr-val'),
    df: document.getElementById('df-val'),
    c: document.getElementById('c-val'),
    speed: document.getElementById('speed-val'),
    heading: document.getElementById('heading-val'),
    separation: document.getElementById('separation-val'),
    alpha: document.getElementById('alpha-val'),
    rb: document.getElementById('rb-val'),
    tgtAngle: document.getElementById('tgt-angle-val'),
};

const stats = {
    statusCard: document.getElementById('status-card'),
    status: document.getElementById('resolvability-status'),
    subtext: document.getElementById('resolvability-subtext'),
    criticalAngles: document.getElementById('critical-angles-val'),
    wavelength: document.getElementById('wavelength-val'),
    dminAny: document.getElementById('dmin-any-val'),
};

const math = {
    gr: document.getElementById('m-gr'),
    gf: document.getElementById('m-gf'),
    tensor: document.getElementById('m-tensor'),
    eigen: document.getElementById('m-eigen'),
};

// Canvas Setup
const canvas = document.getElementById('geometry-canvas');
const ctx = canvas.getContext('2d');

const rdCanvas = document.getElementById('rd-canvas');
const rdCtx = rdCanvas ? rdCanvas.getContext('2d') : null;

// Chart Setup
let metricChart = null;
let sensitivityChart = null;

// Tab Switching Logic
function switchTab(tabId) {
    document.getElementById('tab-content-rd').classList.remove('active');
    document.getElementById('tab-content-charts').classList.remove('active');
    document.getElementById('tab-btn-rd').classList.remove('active');
    document.getElementById('tab-btn-charts').classList.remove('active');
    
    document.getElementById(`tab-content-${tabId}`).classList.add('active');
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
    
    // Wait for the browser to complete layout reflow (display block/none toggles)
    // before reading canvas client boundaries and rendering. This prevents 
    // asynchronous height-shift canvas stretching.
    requestAnimationFrame(() => {
        const state = computeState();
        if (tabId === 'rd') {
            drawRangeDopplerMap(state);
        } else if (tabId === 'charts') {
            if (metricChart) {
                metricChart.resize();
                metricChart.update('none');
            }
            if (sensitivityChart) {
                sensitivityChart.resize();
                sensitivityChart.update('none');
            }
        }
        // Always redraw the left-side geometry canvas to adapt to the final right column height
        drawGeometry(state);
    });
}
window.switchTab = switchTab;



// Setup input listeners
Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', () => {
        updateLabels();
        calculateAndRender();
    });
});

// Update slider label text
function updateLabels() {
    labels.fc.textContent = `${parseFloat(inputs.fc.value).toFixed(0)} MHz`;
    labels.dr.textContent = `${parseFloat(inputs.dr.value).toFixed(1)} m`;
    labels.df.textContent = `${parseFloat(inputs.df.value).toFixed(1)} Hz`;
    labels.c.textContent = `${parseFloat(inputs.c.value).toFixed(1)}`;
    labels.speed.textContent = `${inputs.speed.value} m/s`;
    labels.heading.textContent = `${inputs.heading.value}°`;
    labels.separation.textContent = `${parseFloat(inputs.separation.value).toFixed(1)} m`;
    labels.alpha.textContent = `${inputs.alpha.value}°`;
    labels.rb.textContent = `${(parseFloat(inputs.rb.value) / 1000).toFixed(1)} km`;
    labels.tgtAngle.textContent = `${parseFloat(inputs.tgtAngle.value).toFixed(1)}°`;
}

// Compute the resolution metric variables based on current UI inputs
function computeState(overrideHeadingDeg = null) {
    // Inputs
    const fc = parseFloat(inputs.fc.value) * 1e6;
    const lambda = SPEED_OF_LIGHT / fc;
    const dR_min = parseFloat(inputs.dr.value);
    const df_min = parseFloat(inputs.df.value);
    const c = parseFloat(inputs.c.value);
    
    const tx = [parseFloat(inputs.txX.value), parseFloat(inputs.txY.value)];
    const rx = [parseFloat(inputs.rxX.value), parseFloat(inputs.rxY.value)];
    
    // Baseline Distance L
    const L = Math.hypot(rx[0] - tx[0], rx[1] - tx[1]);
    
    // Dynamically limit Rb min to L + 100
    const minRb = Math.ceil(L + 100);
    inputs.rb.min = minRb;
    if (parseFloat(inputs.rb.value) < minRb) {
        inputs.rb.value = minRb;
        labels.rb.textContent = `${(minRb / 1000).toFixed(1)} km`;
    }
    
    const rb = parseFloat(inputs.rb.value);
    const tgtAngleDeg = parseFloat(inputs.tgtAngle.value);
    const theta = tgtAngleDeg * Math.PI / 180;
    
    // Vector from Rx to Tx (d_RT)
    const d_RT = [tx[0] - rx[0], tx[1] - rx[1]];
    
    // Unit direction vector from Rx at angle theta
    const u = [Math.cos(theta), Math.sin(theta)];
    
    // Projection of u along baseline d_RT
    const u_dot_d = u[0] * d_RT[0] + u[1] * d_RT[1];
    
    // R_R from polar equation: R_R = (rb^2 - L^2) / (2 * (rb - u_dot_d))
    const RR_calc = (rb * rb - L * L) / (2 * (rb - u_dot_d));
    
    // Calculated Target Position (tgt)
    const tgt = [
        rx[0] + RR_calc * Math.cos(theta),
        rx[1] + RR_calc * Math.sin(theta)
    ];
    
    // Update calculated target labels on UI
    document.getElementById('calc-tgt-x').textContent = `${Math.round(tgt[0])} m`;
    document.getElementById('calc-tgt-y').textContent = `${Math.round(tgt[1])} m`;

    const speed = parseFloat(inputs.speed.value);
    const headingDeg = overrideHeadingDeg !== null ? overrideHeadingDeg : parseFloat(inputs.heading.value);
    const phi = headingDeg * Math.PI / 180;
    const v = [speed * Math.cos(phi), speed * Math.sin(phi)];
    
    const d = parseFloat(inputs.separation.value);
    const alphaDeg = parseFloat(inputs.alpha.value);
    const alpha = alphaDeg * Math.PI / 180;

    // Vectors to Target
    const rT = [tgt[0] - tx[0], tgt[1] - tx[1]];
    const RT = Math.hypot(rT[0], rT[1]);
    const uT = [rT[0] / RT, rT[1] / RT];
    
    const rR = [tgt[0] - rx[0], tgt[1] - rx[1]];
    const RR = Math.hypot(rR[0], rR[1]);
    const uR = [rR[0] / RR, rR[1] / RR];

    // Bistatic Angle
    const cosBeta = uT[0] * uR[0] + uT[1] * uR[1];
    const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));

    // Gradients
    const gR = [uT[0] + uR[0], uT[1] + uR[1]];
    
    // Doppler Gradient: gf = 1/lambda * [ (I - uT uT^T)/RT + (I - uR uR^T)/RR ] * v
    const PT = [
        [1 - uT[0]*uT[0], -uT[0]*uT[1]],
        [-uT[0]*uT[1], 1 - uT[1]*uT[1]]
    ];
    const PR = [
        [1 - uR[0]*uR[0], -uR[0]*uR[1]],
        [-uR[0]*uR[1], 1 - uR[1]*uR[1]]
    ];
    
    const A = [
        [
            (PT[0][0]/RT + PR[0][0]/RR) / lambda,
            (PT[0][1]/RT + PR[0][1]/RR) / lambda
        ],
        [
            (PT[1][0]/RT + PR[1][0]/RR) / lambda,
            (PT[1][1]/RT + PR[1][1]/RR) / lambda
        ]
    ];
    
    const gf = [
        A[0][0] * v[0] + A[0][1] * v[1],
        A[1][0] * v[0] + A[1][1] * v[1]
    ];

    // Metric Tensor M = gR gR^T / dR_min^2 + gf gf^T / df_min^2
    const M = [
        [
            (gR[0]*gR[0]) / (dR_min * dR_min) + (gf[0]*gf[0]) / (df_min * df_min),
            (gR[0]*gR[1]) / (dR_min * dR_min) + (gf[0]*gf[1]) / (df_min * df_min)
        ],
        [
            (gR[0]*gR[1]) / (dR_min * dR_min) + (gf[0]*gf[1]) / (df_min * df_min),
            (gR[1]*gR[1]) / (dR_min * dR_min) + (gf[1]*gf[1]) / (df_min * df_min)
        ]
    ];

    // Double Angle Form Variables
    const C0 = (M[0][0] + M[1][1]) / 2;
    const Cc = (M[0][0] - M[1][1]) / 2;
    const Cs = M[0][1];
    const D = Math.hypot(Cc, Cs);
    const psi = Math.atan2(Cs, Cc);

    // Eigenvalues of M
    const lambda1 = C0 + D;
    const lambda2 = Math.max(0, C0 - D); // clamp to 0 due to precision

    // Wavelength and limits
    const d_min_any = lambda1 > 0 ? c / Math.sqrt(lambda1) : Infinity;
    const d_min_all = lambda2 > 0 ? c / Math.sqrt(lambda2) : Infinity;

    // Current separation metric
    // F(d, alpha) = d^2 * (C0 + D * cos(2*alpha - psi))
    const currentMetricVal = d * d * (C0 + D * Math.cos(2 * alpha - psi));
    const isCurrentResolved = currentMetricVal >= c * c;

    // Critical angles calculation
    let criticalAngles = [];
    const valForArccos = (c * c / (d * d) - C0) / D;
    
    if (Math.abs(valForArccos) <= 1) {
        const gamma = Math.acos(valForArccos);
        // Solution 1: (psi + gamma)/2, Solution 2: (psi - gamma)/2
        let alpha1 = (psi + gamma) / 2;
        let alpha2 = (psi - gamma) / 2;
        
        // Normalize to [0, pi] range
        alpha1 = ((alpha1 % Math.PI) + Math.PI) % Math.PI;
        alpha2 = ((alpha2 % Math.PI) + Math.PI) % Math.PI;
        
        criticalAngles = [alpha1, alpha2].sort((a, b) => a - b);
    }

    return {
        tx, rx, tgt, speed, phi, v, d, alpha, c, lambda, dR_min, df_min,
        rT, RT, uT, rR, RR, uR, beta,
        gR, gf, M, C0, Cc, Cs, D, psi,
        lambda1, lambda2, d_min_any, d_min_all,
        currentMetricVal, isCurrentResolved,
        criticalAngles, valForArccos
    };
}

// Draw the bistatic scenario and zoom separation map
function drawGeometry(state) {
    // Reset canvas scale and clear
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Split layout: 55% left (Global Map), 45% right (Target separation Zoom)
    const midX = w * 0.55;
    
    // Draw Divider Line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // -------------------------------------------------------------
    // LEFT VIEW: GLOBAL MAP
    // -------------------------------------------------------------
    const globalWidth = midX;
    const globalHeight = h;
    const padding = 50;

    // Bounds for auto-scale
    const coords = [state.tx, state.rx, state.tgt];
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    
    const dataW = Math.max(200, maxX - minX);
    const dataH = Math.max(200, maxY - minY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Scaling factors (keeping aspect ratio 1:1)
    const scaleX = (globalWidth - padding * 2) / dataW;
    const scaleY = (globalHeight - padding * 2) / dataH;
    const scaleGlobal = Math.max(0.001, Math.min(scaleX, scaleY));

    const toGlobal = (pt) => {
        return [
            globalWidth / 2 + (pt[0] - centerX) * scaleGlobal,
            globalHeight / 2 - (pt[1] - centerY) * scaleGlobal // invert Y for screen space
        ];
    };

    const gTx = toGlobal(state.tx);
    const gRx = toGlobal(state.rx);
    const gTgt = toGlobal(state.tgt);

    // 1. Draw Baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gTx[0], gTx[1]);
    ctx.lineTo(gRx[0], gRx[1]);
    ctx.stroke();

    // 2. Draw Transmitter (Tx)
    ctx.fillStyle = '#8B5CF6'; // purple
    ctx.beginPath();
    ctx.arc(gTx[0], gTx[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.fillStyle = '#F3F4F6';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Transmitter (Tx)', gTx[0], gTx[1] - 14);

    // 3. Draw Receiver (Rx)
    ctx.fillStyle = '#3B82F6'; // blue
    ctx.beginPath();
    ctx.arc(gRx[0], gRx[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#F3F4F6';
    ctx.fillText('Receiver (Rx)', gRx[0], gRx[1] - 14);

    // 4. Draw Bistatic Ellipse (R_T + R_R = Constant)
    const baselineCenter = [(state.tx[0] + state.rx[0]) / 2, (state.tx[1] + state.rx[1]) / 2];
    const gBaselineCenter = toGlobal(baselineCenter);
    const a = (state.RT + state.RR) / 2; // Semi-major axis
    const L = Math.hypot(state.rx[0] - state.tx[0], state.rx[1] - state.tx[1]);
    const bSq = a * a - (L / 2) * (L / 2);
    const b = bSq > 0 ? Math.sqrt(bSq) : 0.1; // Semi-minor axis
    const rot = Math.atan2(state.rx[1] - state.tx[1], state.rx[0] - state.tx[0]);
    
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
        gBaselineCenter[0], gBaselineCenter[1], 
        a * scaleGlobal, b * scaleGlobal, 
        -rot, 0, Math.PI * 2
    );
    ctx.stroke();

    // 5. Draw Target Midpoint
    ctx.fillStyle = '#00F0FF'; // cyan
    ctx.beginPath();
    ctx.arc(gTgt[0], gTgt[1], 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Target (x₀)', gTgt[0] + 10, gTgt[1] + 4);

    // Draw Target Velocity Vector on Global Map
    if (state.speed > 0) {
        const velEnd = [
            state.tgt[0] + state.v[0] * 2, // scale velocity vector visually
            state.tgt[1] + state.v[1] * 2
        ];
        const gVelEnd = toGlobal(velEnd);
        drawArrow(gTgt[0], gTgt[1], gVelEnd[0], gVelEnd[1], 'rgba(139, 92, 246, 0.7)', 2);
    }

    // -------------------------------------------------------------
    // RIGHT VIEW: LOCAL ZOOM TARGET SEPARATION
    // -------------------------------------------------------------
    const zoomCenterX = midX + (w - midX) / 2;
    const zoomCenterY = h / 2;
    
    // We scale such that target separation distance d fits in a 80m visual radius
    const zoomRadiusPixels = Math.min(w - midX, h) * 0.35;
    // Let's set a fixed relative radius for the separation distance d circle
    const visualD = zoomRadiusPixels; 

    // Zoom Center label
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = 'bold 36px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('ZOOM VIEW', zoomCenterX, zoomCenterY - zoomRadiusPixels * 0.9);

    // Render resolved vs unresolved sectors on the local zoom circle
    const steps = 360;
    let sectorStart = null;
    let lastState = null; // true = resolved, false = unresolved

    for (let i = 0; i <= steps; i++) {
        const theta = (i * Math.PI / 180);
        // F(d, theta) = d^2 * (C0 + D * cos(2*theta - psi))
        const metric = state.d * state.d * (state.C0 + state.D * Math.cos(2 * theta - state.psi));
        const resolved = metric >= state.c * state.c;

        if (i === 0) {
            lastState = resolved;
            sectorStart = 0;
            continue;
        }

        if (resolved !== lastState || i === steps) {
            // Draw sector
            ctx.fillStyle = lastState ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
            ctx.strokeStyle = lastState ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.moveTo(zoomCenterX, zoomCenterY);
            ctx.arc(zoomCenterX, zoomCenterY, visualD, -sectorStart, -theta, true); // clock direction Y-flipped
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            sectorStart = theta;
            lastState = resolved;
        }
    }

    // Draw Separability Boundary Lines (Angle critical lines)
    if (state.criticalAngles.length === 2) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        state.criticalAngles.forEach(ang => {
            for (let mult = 0; mult < 2; mult++) { // Draw both directions (antipodal symmetric)
                const drawAng = ang + mult * Math.PI;
                ctx.beginPath();
                ctx.moveTo(zoomCenterX, zoomCenterY);
                ctx.lineTo(
                    zoomCenterX + visualD * 1.1 * Math.cos(drawAng),
                    zoomCenterY - visualD * 1.1 * Math.sin(drawAng) // invert Y for screen
                );
                ctx.stroke();
            }
        });
        ctx.setLineDash([]);
    }

    // Draw Separation Vector line for current separation alpha
    const sepX = visualD * Math.cos(state.alpha);
    const sepY = visualD * Math.sin(state.alpha);
    const colorCurrent = state.isCurrentResolved ? '#10B981' : '#EF4444';

    ctx.strokeStyle = colorCurrent;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(zoomCenterX - sepX/2, zoomCenterY + sepY/2);
    ctx.lineTo(zoomCenterX + sepX/2, zoomCenterY - sepY/2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Target A and Target B
    ctx.fillStyle = '#00F0FF';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1.5;
    
    // Target A (positive direction)
    const tgtAx = zoomCenterX + (sepX / 2);
    const tgtAy = zoomCenterY - (sepY / 2);
    ctx.beginPath();
    ctx.arc(tgtAx, tgtAy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Target B (negative direction)
    const tgtBx = zoomCenterX - (sepX / 2);
    const tgtBy = zoomCenterY + (sepY / 2);
    ctx.beginPath();
    ctx.arc(tgtBx, tgtBy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelOffset = 20;
    const labelAx = zoomCenterX + (visualD / 2 + labelOffset) * Math.cos(state.alpha);
    const labelAy = zoomCenterY - (visualD / 2 + labelOffset) * Math.sin(state.alpha);
    const labelBx = zoomCenterX - (visualD / 2 + labelOffset) * Math.cos(state.alpha);
    const labelBy = zoomCenterY + (visualD / 2 + labelOffset) * Math.sin(state.alpha);
    
    ctx.fillText('Target A', labelAx, labelAy);
    ctx.fillText('Target B', labelBx, labelBy);
    ctx.textBaseline = 'alphabetic';

    // Draw Zoom view velocity vector arrow at the center
    if (state.speed > 0) {
        const velArrowX = zoomCenterX + visualD * 0.4 * Math.cos(state.phi);
        const velArrowY = zoomCenterY - visualD * 0.4 * Math.sin(state.phi);
        drawArrow(zoomCenterX, zoomCenterY, velArrowX, velArrowY, 'rgba(139, 92, 246, 0.8)', 2.5);
        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 10px Inter';
        ctx.fillText('Velocity (v)', velArrowX, velArrowY - 8);
    }
}

// Arrow helper
function drawArrow(fromx, fromy, tox, toy, color, width) {
    const headlen = 8;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

// Redraw / update the Chart.js visual graphs
function updateCharts(state) {
    // 1. Metric Chart: F(d, alpha)/c^2 vs Alpha
    const alphaData = [];
    const metricData = [];
    for (let aDeg = 0; aDeg <= 360; aDeg += 2) {
        alphaData.push(aDeg);
        const alphaRad = aDeg * Math.PI / 180;
        // normalized metric F/c^2
        const f = state.d * state.d * (state.C0 + state.D * Math.cos(2 * alphaRad - state.psi));
        metricData.push(f / (state.c * state.c));
    }

    // Dot data for current separation angle
    const currentAlphaDeg = state.alpha * 180 / Math.PI;
    const currentAlphaIdx = Math.min(180, Math.max(0, Math.round(currentAlphaDeg / 2)));
    const dotData = Array(alphaData.length).fill(null);
    dotData[currentAlphaIdx] = state.currentMetricVal / (state.c * state.c);

    if (metricChart === null) {
        const mCtx = document.getElementById('metric-chart').getContext('2d');
        metricChart = new Chart(mCtx, {
            type: 'line',
            data: {
                labels: alphaData,
                datasets: [
                    {
                        label: 'Separability Metric F(d, α)/c²',
                        data: metricData,
                        borderColor: '#00F0FF',
                        borderWidth: 2.5,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Threshold',
                        data: Array(alphaData.length).fill(1.0),
                        borderColor: '#EF4444',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Current Angle',
                        data: dotData,
                        borderColor: '#00F0FF',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9CA3AF', maxTicksLimit: 9, callback: val => `${val}°` }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9CA3AF' },
                        title: { display: true, text: 'Metric F / c²', color: '#F3F4F6' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } else {
        metricChart.data.datasets[0].data = metricData;
        metricChart.data.datasets[2].data = dotData;
        metricChart.update('none');
    }

    // 2. Sensitivity Chart: d_min(phi) = c/sqrt(lambda1) vs phi
    const headingData = [];
    const dminData = [];
    for (let hDeg = 0; hDeg <= 360; hDeg += 5) {
        headingData.push(hDeg);
        const headingState = computeState(hDeg);
        dminData.push(headingState.d_min_any);
    }

    // Dot data for current heading angle
    const currentHeadingDeg = state.phi * 180 / Math.PI;
    const currentHeadingIdx = Math.min(72, Math.max(0, Math.round(currentHeadingDeg / 5)));
    const headDotData = Array(headingData.length).fill(null);
    headDotData[currentHeadingIdx] = state.d_min_any;

    if (sensitivityChart === null) {
        const sCtx = document.getElementById('sensitivity-chart').getContext('2d');
        sensitivityChart = new Chart(sCtx, {
            type: 'line',
            data: {
                labels: headingData,
                datasets: [
                    {
                        label: 'Min Separation d_min (m) vs Heading',
                        data: dminData,
                        borderColor: '#8B5CF6',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Current Heading',
                        data: headDotData,
                        borderColor: '#8B5CF6',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9CA3AF', maxTicksLimit: 9, callback: val => `${val}°` }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9CA3AF' },
                        title: { display: true, text: 'd_min (m)', color: '#F3F4F6' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } else {
        sensitivityChart.data.datasets[0].data = dminData;
        sensitivityChart.data.datasets[1].data = headDotData;
        sensitivityChart.update('none');
    }
}

// Update stats and LaTeX drawer values
function updateUI(state) {
    // 1. Status Card Styling
    stats.wavelength.textContent = `${state.lambda.toFixed(4)} m`;
    stats.dminAny.textContent = `${state.d_min_any.toFixed(2)} m`;

    let statusText = "";
    let subtext = "";
    let statusClass = "resolved-status";

    if (state.d > state.d_min_all) {
        statusText = "Fully Resolved";
        subtext = `Targets separated by ${state.d.toFixed(1)}m are resolved for ALL orientations α.`;
        stats.statusCard.className = "stat-card resolved-status resolved";
    } else if (state.d < state.d_min_any) {
        statusText = "Not Resolved";
        subtext = `Targets are UNRESOLVED for all angles (requires at least ${state.d_min_any.toFixed(2)}m).`;
        stats.statusCard.className = "stat-card resolved-status unresolved";
    } else {
        statusText = "Partially Resolved";
        subtext = `Resolvability depends on separation aspect angle α.`;
        stats.statusCard.className = "stat-card resolved-status mixed";
    }
    stats.status.textContent = statusText;
    stats.subtext.textContent = subtext;

    // 2. Critical Angles displays
    if (state.criticalAngles.length === 2) {
        const cDeg1 = (state.criticalAngles[0] * 180 / Math.PI).toFixed(1);
        const cDeg2 = (state.criticalAngles[1] * 180 / Math.PI).toFixed(1);
        stats.criticalAngles.innerHTML = `${cDeg1}° &amp; ${cDeg2}°`;
    } else {
        stats.criticalAngles.textContent = "N/A";
    }

    // 3. LaTeX displays
    if (typeof katex !== 'undefined') {
        try {
            // Range Gradient
            katex.render(
                `\\mathbf{g}_R = \\begin{bmatrix} ${state.gR[0].toFixed(4)} \\\\ ${state.gR[1].toFixed(4)} \\end{bmatrix}`, 
                math.gr
            );
            // Doppler Gradient
            katex.render(
                `\\mathbf{g}_f = \\begin{bmatrix} ${state.gf[0].toFixed(4)} \\\\ ${state.gf[1].toFixed(4)} \\end{bmatrix}`, 
                math.gf
            );
            // Metric Tensor M
            katex.render(
                `\\mathbf{M} = \\begin{bmatrix} ${state.M[0][0].toFixed(4)} & ${state.M[0][1].toFixed(4)} \\\\ ${state.M[1][0].toFixed(4)} & ${state.M[1][1].toFixed(4)} \\end{bmatrix}`, 
                math.tensor
            );
            // Eigenvalues
            katex.render(
                `\\lambda_1 = ${state.lambda1.toFixed(4)},\\ \\lambda_2 = ${state.lambda2.toFixed(4)}\\\\` + 
                `d_{\\text{min,any}} = ${state.d_min_any.toFixed(2)}\\text{ m},\\ d_{\\text{min,all}} = ${state.d_min_all.toFixed(2)}\\text{ m}`, 
                math.eigen
            );
        } catch (e) {
            console.error("KaTeX rendering error: ", e);
            renderFallback();
        }
    } else {
        renderFallback();
    }

    function renderFallback() {
        math.gr.innerHTML = `gR = [${state.gR[0].toFixed(4)}, ${state.gR[1].toFixed(4)}]`;
        math.gf.innerHTML = `gf = [${state.gf[0].toFixed(4)}, ${state.gf[1].toFixed(4)}]`;
        math.tensor.innerHTML = `M = [[${state.M[0][0].toFixed(4)}, ${state.M[0][1].toFixed(4)}],\n     [${state.M[1][0].toFixed(4)}, ${state.M[1][1].toFixed(4)}]]`;
        math.eigen.innerHTML = `λ1 = ${state.lambda1.toFixed(4)}, λ2 = ${state.lambda2.toFixed(4)}\nd_min,any = ${state.d_min_any.toFixed(2)} m\nd_min,all = ${state.d_min_all.toFixed(2)} m`;
    }
}

// Render the actual target plots in Range-Doppler signal space
function drawRangeDopplerMap(state) {
    if (!rdCanvas || !rdCtx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = rdCanvas.parentElement.getBoundingClientRect();
    rdCanvas.width = rect.width * dpr;
    rdCanvas.height = rect.height * dpr;
    rdCtx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    
    // Background clear
    rdCtx.fillStyle = '#0f172a';
    rdCtx.fillRect(0, 0, w, h);
    
    const d = state.d;
    const alpha = state.alpha;
    const tgt0 = state.tgt;
    
    // Target A: +d/2 along separation axis
    const tgtA = [
        tgt0[0] + (d / 2) * Math.cos(alpha),
        tgt0[1] + (d / 2) * Math.sin(alpha)
    ];
    
    // Target B: -d/2 along separation axis
    const tgtB = [
        tgt0[0] - (d / 2) * Math.cos(alpha),
        tgt0[1] - (d / 2) * Math.sin(alpha)
    ];
    
    const tx = state.tx;
    const rx = state.rx;
    
    // Target A range, unit vectors and Doppler shift
    const rT_A = Math.hypot(tgtA[0] - tx[0], tgtA[1] - tx[1]);
    const rR_A = Math.hypot(tgtA[0] - rx[0], tgtA[1] - rx[1]);
    const Rb_A = rT_A + rR_A;
    const uT_A = [(tgtA[0] - tx[0]) / rT_A, (tgtA[1] - tx[1]) / rT_A];
    const uR_A = [(tgtA[0] - rx[0]) / rR_A, (tgtA[1] - rx[1]) / rR_A];
    const fd_A = (1 / state.lambda) * (state.v[0] * (uT_A[0] + uR_A[0]) + state.v[1] * (uT_A[1] + uR_A[1]));
    
    // Target B range, unit vectors and Doppler shift
    const rT_B = Math.hypot(tgtB[0] - tx[0], tgtB[1] - tx[1]);
    const rR_B = Math.hypot(tgtB[0] - rx[0], tgtB[1] - rx[1]);
    const Rb_B = rT_B + rR_B;
    const uT_B = [(tgtB[0] - tx[0]) / rT_B, (tgtB[1] - tx[1]) / rT_B];
    const uR_B = [(tgtB[0] - rx[0]) / rR_B, (tgtB[1] - rx[1]) / rR_B];
    const fd_B = (1 / state.lambda) * (state.v[0] * (uT_B[0] + uR_B[0]) + state.v[1] * (uT_B[1] + uR_B[1]));
    
    const Rb_mid = (Rb_A + Rb_B) / 2;
    const fd_mid = (fd_A + fd_B) / 2;
    
    const deltaRb = Rb_A - Rb_B;
    const deltafd = fd_A - fd_B;
    
    const dR_min = state.dR_min;
    const df_min = state.df_min;
    
    const maxRangeDiff = Math.abs(deltaRb);
    const maxDopplerDiff = Math.abs(deltafd);
    
    // Scale viewports
    const rangeSpan = Math.max(1.8 * dR_min, 1.5 * maxRangeDiff);
    const dopplerSpan = Math.max(1.8 * df_min, 1.5 * maxDopplerDiff);
    
    const padLeft = 55;
    const padRight = 20;
    const padTop = 30;
    const padBottom = 40;
    
    const graphW = w - padLeft - padRight;
    const graphH = h - padTop - padBottom;
    
    function getXPixel(rangeVal) {
        const offset = rangeVal - Rb_mid;
        return padLeft + graphW / 2 + (offset / rangeSpan) * graphW;
    }
    
    function getYPixel(dopplerVal) {
        const offset = dopplerVal - fd_mid;
        return padTop + graphH / 2 - (offset / dopplerSpan) * graphH;
    }
    
    // 1. Grid lines
    rdCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    rdCtx.lineWidth = 1;
    
    // Range ticks
    const numRangeTicks = 5;
    rdCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    rdCtx.font = '9px monospace';
    rdCtx.textAlign = 'center';
    rdCtx.textBaseline = 'top';
    
    for (let i = 0; i < numRangeTicks; i++) {
        const fraction = (i / (numRangeTicks - 1)) - 0.5;
        const rVal = Rb_mid + fraction * rangeSpan;
        const px = getXPixel(rVal);
        
        rdCtx.beginPath();
        rdCtx.moveTo(px, padTop);
        rdCtx.lineTo(px, padTop + graphH);
        rdCtx.stroke();
        
        const relOffset = fraction * rangeSpan;
        rdCtx.fillText(`${relOffset >= 0 ? '+' : ''}${Math.round(relOffset)}m`, px, padTop + graphH + 4);
    }
    
    // Doppler ticks
    const numDopplerTicks = 5;
    rdCtx.textAlign = 'right';
    rdCtx.textBaseline = 'middle';
    
    for (let i = 0; i < numDopplerTicks; i++) {
        const fraction = (i / (numDopplerTicks - 1)) - 0.5;
        const fVal = fd_mid + fraction * dopplerSpan;
        const py = getYPixel(fVal);
        
        rdCtx.beginPath();
        rdCtx.moveTo(padLeft, py);
        rdCtx.lineTo(padLeft + graphW, py);
        rdCtx.stroke();
        
        const relOffset = fraction * dopplerSpan;
        rdCtx.fillText(`${relOffset >= 0 ? '+' : ''}${relOffset.toFixed(1)}Hz`, padLeft - 6, py);
    }
    
    // 2. Axis titles
    rdCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    rdCtx.font = 'bold 9px Inter';
    rdCtx.textAlign = 'center';
    rdCtx.fillText('Bistatic Range Offset (m)', padLeft + graphW / 2, padTop + graphH + 22);
    
    rdCtx.save();
    rdCtx.translate(14, padTop + graphH / 2);
    rdCtx.rotate(-Math.PI / 2);
    rdCtx.fillText('Doppler Frequency Offset (Hz)', 0, 0);
    rdCtx.restore();
    
    // Graph boundary box
    rdCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    rdCtx.lineWidth = 1;
    rdCtx.strokeRect(padLeft, padTop, graphW, graphH);
    
    // Clip target drawings inside graph box
    rdCtx.save();
    rdCtx.beginPath();
    rdCtx.rect(padLeft, padTop, graphW, graphH);
    rdCtx.clip();
    
    // Separability exact calculation check: (deltaRb / dR_min)^2 + (deltafd / df_min)^2 >= c^2
    const normDistA = Math.pow((Rb_B - Rb_A) / dR_min, 2) + Math.pow((fd_B - fd_A) / df_min, 2);
    const isExactResolved = normDistA >= Math.pow(state.c, 2);
    
    const cellFill = isExactResolved ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)';
    const cellStroke = isExactResolved ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
    
    // Pixel radii for the ellipses
    const rx_pixels = Math.max(0.1, (dR_min / rangeSpan) * graphW * state.c);
    const ry_pixels = Math.max(0.1, (df_min / dopplerSpan) * graphH * state.c);
    
    const pxA = getXPixel(Rb_A);
    const pyA = getYPixel(fd_A);
    const pxB = getXPixel(Rb_B);
    const pyB = getYPixel(fd_B);
    
    // Target A cell
    rdCtx.fillStyle = cellFill;
    rdCtx.strokeStyle = cellStroke;
    rdCtx.lineWidth = 1.5;
    rdCtx.setLineDash([4, 2]);
    rdCtx.beginPath();
    rdCtx.ellipse(pxA, pyA, rx_pixels, ry_pixels, 0, 0, Math.PI * 2);
    rdCtx.fill();
    rdCtx.stroke();
    
    // Target B cell
    rdCtx.beginPath();
    rdCtx.ellipse(pxB, pyB, rx_pixels, ry_pixels, 0, 0, Math.PI * 2);
    rdCtx.fill();
    rdCtx.stroke();
    rdCtx.setLineDash([]);
    
    // Connect separation line
    rdCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    rdCtx.lineWidth = 1;
    rdCtx.setLineDash([2, 3]);
    rdCtx.beginPath();
    rdCtx.moveTo(pxA, pyA);
    rdCtx.lineTo(pxB, pyB);
    rdCtx.stroke();
    rdCtx.setLineDash([]);
    
    // Draw Targets
    rdCtx.shadowBlur = 8;
    rdCtx.shadowColor = '#00F0FF';
    rdCtx.fillStyle = '#00F0FF';
    rdCtx.beginPath();
    rdCtx.arc(pxA, pyA, 4.5, 0, Math.PI * 2);
    rdCtx.fill();
    
    rdCtx.shadowColor = '#c084fc';
    rdCtx.fillStyle = '#c084fc';
    rdCtx.beginPath();
    rdCtx.arc(pxB, pyB, 4.5, 0, Math.PI * 2);
    rdCtx.fill();
    rdCtx.shadowBlur = 0;
    
    // Label targets
    rdCtx.fillStyle = '#FFF';
    rdCtx.font = 'bold 9px Inter';
    rdCtx.textAlign = 'left';
    rdCtx.fillText(' Target A', pxA + 6, pyA - 4);
    rdCtx.textAlign = 'right';
    rdCtx.fillText('Target B ', pxB - 6, pyB + 7);
    
    rdCtx.restore(); // end clip
    
    // Update labels
    document.getElementById('rd-val-dr').textContent = `${Math.abs(deltaRb).toFixed(1)} m (Res: ${dR_min} m)`;
    document.getElementById('rd-val-df').textContent = `${Math.abs(deltafd).toFixed(1)} Hz (Res: ${df_min} Hz)`;
    
    const exactText = isExactResolved ? 'RESOLVED' : 'UNRESOLVED';
    const gradText = state.isCurrentResolved ? 'RESOLVED' : 'UNRESOLVED';
    const matchText = exactText === gradText ? 'MATCH' : 'MISMATCH';
    const matchColor = exactText === gradText ? '#10B981' : '#F59E0B';
    
    const sepSpan = document.getElementById('rd-val-sep');
    if (sepSpan) {
        sepSpan.innerHTML = `<span style="color: ${isExactResolved ? '#10B981' : '#EF4444'}; font-weight: bold;">${exactText}</span> ` +
                           `<span style="color: var(--text-muted);">vs</span> ` +
                           `<span style="color: ${state.isCurrentResolved ? '#10B981' : '#EF4444'}; font-weight: bold;">${gradText}</span> ` +
                           `<span style="color: ${matchColor}; font-weight: bold; margin-left: 8px;">[${matchText}]</span>`;
    }
}

// Master computation and render call
function calculateAndRender() {
    const state = computeState();
    drawGeometry(state);
    drawRangeDopplerMap(state);
    updateCharts(state);
    updateUI(state);
}

// Initial draw on page load
window.addEventListener('load', () => {
    updateLabels();
    calculateAndRender();
});

// Resize canvas dynamically on window resize
window.addEventListener('resize', calculateAndRender);
