# Bistatic Target Resolvability Analyzer on Range-Doppler Map

This repository contains an interactive visualization dashboard and analytical engine for evaluating the spatial resolvability of two target nodes moving with identical velocity vectors on a single bistatic Range-Doppler (RV) resolution grid.

---

## 1. Problem Overview

In a bistatic radar system, a transmitter (Tx) is spatially separated from a receiver (Rx). When two closely spaced targets share the **exact same velocity vector**, they cannot be resolved via velocity differences alone. Instead, their separability on the Range-Doppler map depends purely on:
1. The spatial separation distance $d$ between the targets.
2. The aspect orientation angle $\alpha$ of their separation vector relative to the bistatic frame.
3. The radar system's range bin resolution $\Delta R_{min}$ and Doppler frequency bin resolution $\Delta f_{d,min}$.

This tool calculates the critical aspect angles $\alpha_{crit}$ and minimum separation bounds $d_{min}$ that dictate whether the two targets appear as a single merged plot or as two distinct resolved targets.

---

## 2. Mathematical Formulations & Derivations

### A. Bistatic Range Gradient Vector ($\mathbf{g}_R$)
For a target located at position $\mathbf{x} = [x, y]^T$, the bistatic range is the sum of the transmitter-to-target and receiver-to-target distances:
$$R_b(\mathbf{x}) = \|\mathbf{x} - \mathbf{x}_T\| + \|\mathbf{x} - \mathbf{x}_R\| = R_T + R_R$$

The spatial gradient of $R_b$ with respect to $\mathbf{x}$ is:

$$\mathbf{g}_R = \nabla_{\mathbf{x}} R_b = \frac{\mathbf{x} - \mathbf{x}_T}{\|\mathbf{x} - \mathbf{x}_T\|} + \frac{\mathbf{x} - \mathbf{x}_R}{\|\mathbf{x} - \mathbf{x}_R\|} = \mathbf{u}_T + \mathbf{u}_R$$

where $\mathbf{u}_T$ and $\mathbf{u}_R$ are unit vectors pointing from Tx to target, and Rx to target respectively. 

The range separation $\delta R_b$ for a small displacement vector $\boldsymbol{\Delta x}$ is given by the projection:

$$\delta R_b \approx \mathbf{g}_R^T \boldsymbol{\Delta x} = (\mathbf{u}_T + \mathbf{u}_R)^T \boldsymbol{\Delta x}$$

---

### B. Bistatic Doppler Gradient Vector ($\mathbf{g}_f$)
The bistatic Doppler shift for a target moving with velocity $\mathbf{v}$ is:
$$f_d(\mathbf{x}) = \frac{1}{\lambda} \mathbf{v}^T (\mathbf{u}_T + \mathbf{u}_R)$$

Since both targets share the exact same velocity vector $\mathbf{v}$, the difference in Doppler shift $\delta f_d$ arises purely from the spatial offset $\boldsymbol{\Delta x}$, which alters the unit vectors $\mathbf{u}_T$ and $\mathbf{u}_R$:

$$\delta f_d \approx \nabla_{\mathbf{x}} f_d^T \boldsymbol{\Delta x} = \mathbf{g}_f^T \boldsymbol{\Delta x}$$

To compute the Doppler gradient vector $\mathbf{g}_f$:

$$\mathbf{g}_f = \nabla_{\mathbf{x}} f_d = \frac{1}{\lambda} \nabla_{\mathbf{x}} \left[ \mathbf{v}^T (\mathbf{u}_T + \mathbf{u}_R) \right]$$

Using the spatial gradient of a unit vector $\mathbf{u} = \frac{\mathbf{r}}{r}$:

$$\nabla_{\mathbf{x}} \mathbf{u} = \frac{1}{r} (\mathbf{I} - \mathbf{u}\mathbf{u}^T)$$

We obtain the Doppler gradient:
$$\mathbf{g}_f = \frac{1}{\lambda} \left[ \frac{\mathbf{I} - \mathbf{u}_T\mathbf{u}_T^T}{R_T} + \frac{\mathbf{I} - \mathbf{u}_R\mathbf{u}_R^T}{R_R} \right] \mathbf{v}$$

---

### C. Resolution Metric Tensor ($\mathbf{M}$)
We model the Range-Doppler map resolution bin boundaries as an ellipse. The two targets are resolvable if their normalized distance on the Range-Doppler plane exceeds a strict threshold factor $c$:

$$\left( \frac{\delta R_b}{\Delta R_{min}} \right)^2 + \left( \frac{\delta f_d}{\Delta f_{d,min}} \right)^2 \ge c^2$$

Substituting $\delta R_b = \mathbf{g}_R^T \boldsymbol{\Delta x}$ and $\delta f_d = \mathbf{g}_f^T \boldsymbol{\Delta x}$:

$$\left( \frac{\mathbf{g}_R^T \boldsymbol{\Delta x}}{\Delta R_{min}} \right)^2 + \left( \frac{\mathbf{g}_f^T \boldsymbol{\Delta x}}{\Delta f_{d,min}} \right)^2 \ge c^2$$

$$\boldsymbol{\Delta x}^T \left[ \frac{\mathbf{g}_R \mathbf{g}_R^T}{\Delta R_{min}^2} + \frac{\mathbf{g}_f \mathbf{g}_f^T}{\Delta f_{d,min}^2} \right] \boldsymbol{\Delta x} \ge c^2$$

Defining the symmetric, positive semi-definite **Resolution Metric Tensor $\mathbf{M}$**:

$$\mathbf{M} = \frac{\mathbf{g}_R \mathbf{g}_R^T}{\Delta R_{min}^2} + \frac{\mathbf{g}_f \mathbf{g}_f^T}{\Delta f_{d,min}^2} = \begin{bmatrix} M_{xx} & M_{xy} \\ M_{xy} & M_{yy} \end{bmatrix}$$

We can express the resolvability condition in quadratic form:
$$\boldsymbol{\Delta x}^T \mathbf{M} \boldsymbol{\Delta x} \ge c^2$$

---

### D. Analytical Solution for Critical Angles ($\alpha_{crit}$)
Let the spatial displacement vector be $\boldsymbol{\Delta x} = d \, \mathbf{a}$, where $\mathbf{a} = [\cos\alpha, \sin\alpha]^T$ and $\alpha$ is the aspect angle. The boundary condition where targets transition between resolved and unresolved is:
$$d^2 \mathbf{a}^T \mathbf{M} \mathbf{a} = c^2 \implies \mathbf{a}^T \mathbf{M} \mathbf{a} = \frac{c^2}{d^2}$$

Expanding the quadratic form:
$$M_{xx}\cos^2\alpha + 2M_{xy}\cos\alpha\sin\alpha + M_{yy}\sin^2\alpha = \frac{c^2}{d^2}$$

Using double-angle trigonometric identities:
$$\frac{M_{xx} + M_{yy}}{2} + \frac{M_{xx} - M_{yy}}{2}\cos(2\alpha) + M_{xy}\sin(2\alpha) = \frac{c^2}{d^2}$$

Letting:
$$C_0 = \frac{\text{Tr}(\mathbf{M})}{2} = \frac{M_{xx} + M_{yy}}{2}$$
$$C_c = \frac{M_{xx} - M_{yy}}{2}$$
$$C_s = M_{xy}$$

The equation simplifies to:
$$C_c\cos(2\alpha) + C_s\sin(2\alpha) = \frac{c^2}{d^2} - C_0$$

We combine the cosine and sine terms:
$$D\cos(2\alpha - \psi) = \frac{c^2}{d^2} - C_0$$
where $D = \sqrt{C_c^2 + C_s^2}$ and $\psi = \text{atan2}(C_s, C_c)$.

Solving for $\alpha$ yields the exact closed-form critical boundary angles:
$$\alpha_{crit} = \frac{\psi}{2} \pm \frac{1}{2}\arccos\left(\frac{c^2/d^2 - C_0}{D}\right) \pmod{\pi}$$

---

### E. Eigenvalue Bounds & Resolving Regimes
The eigenvalues of the metric tensor $\mathbf{M}$ represent the principal curvatures of the resolution ellipse and are given by:
$$\lambda_1 = C_0 + D \quad (\text{Maximum Eigenvalue})$$
$$\lambda_2 = C_0 - D \quad (\text{Minimum Eigenvalue})$$

This defines three distinct physical regimes:
1. **Fully Resolved ($d > c/\sqrt{\lambda_2}$)**: The separation distance is large enough that the targets are resolved at **every** aspect separation angle $\alpha$.
2. **Never Resolved ($d < c/\sqrt{\lambda_1}$)**: The separation distance is so small that the targets remain merged at **every** aspect separation angle $\alpha$.
3. **Partially Resolved ($c/\sqrt{\lambda_1} \le d \le c/\sqrt{\lambda_2}$)**: Resolvability depends on the aspect angle $\alpha$. The targets are resolved when $\alpha$ lies within the angular sectors bounded by the critical angles $\alpha_{crit}$.

---

## 3. Physical Interpretations

### Why are the elements of $\mathbf{M}$ so small?
With a frequency scale of $500\text{ MHz}$ and range resolutions in hundreds of meters, $\mathbf{M}$ elements are typically on the order of $10^{-6}$. This is because the gradients represent the fractional change in resolution bin per meter of target separation. Because the radar bins are large, you need a substantial separation distance $d$ (on the order of hundreds or thousands of meters) to achieve a normalized resolvability metric of $1.0$.

### Why is the worst-case separation distance ($d_{min,all}$) so large?
The minimum eigenvalue $\lambda_2$ represents the "weakest" axis of resolution. In directions orthogonal to the range and Doppler gradients (where the geometric sensitivities cancel out), the radar has almost zero capacity to distinguish target differences. To resolve targets along this "blind" direction, they must be separated by a massive distance (sometimes up to several kilometers) to register as distinct plots.

---

## 4. Repository Structure & Launch Instructions

* **`index.html`**: The UI skeleton containing input sliders for Carrier Frequency, Range Resolution, Doppler Resolution, Target Speed, Heading, Separation, and coordinates, alongside the KaTeX math renderer.
* **`styles.css`**: Styling sheets configuring the premium glassmorphism dark-mode look and layout.
* **`app.js`**: Core script containing the mathematical engine, canvas visualizer, and Chart.js plots.
* **`verify.py`**: A python console script to run local numerical validation checks of the calculations.
* **`verify_layout.py`**: An automated layout and assets testing suite.

### How to Run Locally:
1. Open PowerShell or Terminal in this folder.
2. Launch a local web server:
   ```bash
   python -m http.server 8080 --bind 127.0.0.1
   ```
3. Open your web browser and navigate to: [http://localhost:8080](http://localhost:8080)
