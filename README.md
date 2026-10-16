# Digital Shade Guide: Smartphone-Based Dental Shade Classification

A research and prototype web application for dental shade classification using smartphone photographs, standardized CIELAB colour space extraction, and a trainable multiclass Support Vector Machine (SVM) classifier.

---

## 1. System Overview

Dental shade selection is notoriously vulnerable to human visual subjectivity, metamerism, and ambient operatory lighting variations. Digital Shade Guide implements a rigorous computer-vision and machine-learning pipeline:

1. **Smartphone Photographic Acquisition**: Prefers rear-facing cameras with macro distance (15–25 cm), cross-polarising filter verification, and 18% neutral-grey / multi-patch calibration chart tracking.
2. **Interactive ROI Cropping**: Allows manual rectangular cropping of the tooth or shade tab with clinical presets (Incisal, Body / Middle 1/3, Cervical).
3. **CIE Colour Science Engine**:
   - Converts non-linear sRGB pixel data to linear RGB using the IEC 61966-2-1 piecewise transfer function.
   - Converts linear RGB to CIE XYZ under CIE Standard Illuminant D65 ($2^\circ$ standard observer).
   - Maps CIE XYZ to perceptually uniform CIELAB ($L^*, a^*, b^*$).
   - Calculates region statistics: mean, median, standard deviation, percentiles (P10, P25, P75, P90), and Interquartile Range (IQR).
4. **Multiclass Support Vector Machine (SVM)**:
   - Uses genuine `libsvm-js` C-SVC multiclass solver.
   - Computes Z-score feature scaling parameters **exclusively** on the training partition.
   - Evaluates on held-out test partitions grouped by subject/specimen to prevent data leakage.
5. **Research Validation Dashboard**:
   - Heatmap confusion matrix ($K \times K$).
   - Overall Accuracy, Balanced Accuracy, Macro Precision, Macro Sensitivity/Recall, Macro Specificity (One-vs-Rest), Macro F1-Score.
   - Misclassified sample audit with CIEDE2000 ($\Delta E_{00}$) and CIE76 ($\Delta E^*_{ab}$) discrepancy metrics.
   - Concordance comparison against clinician visual baseline.

---

## 2. Directory Structure

```text
src/
├── types/
│   └── dental.ts                 # Full TypeScript schemas for checklists, colors, SVM models, metrics
├── services/
│   ├── colourScience.ts          # sRGB <-> XYZ <-> CIELAB, CIE76, and verified CIEDE2000 (Sharma et al.)
│   ├── imageProcessing.ts        # Canvas pixel extraction, specular glare filters, 12-D feature vector
│   ├── svmEngine.ts              # libsvm-js multiclass C-SVC training, Z-score scaling, OOD detection
│   ├── validationMetrics.ts      # Confusion matrix, per-class metrics, balanced accuracy calculation
│   ├── datasetStore.ts           # Local persistence, CSV export/import, demonstration benchmark generator
│   ├── sampleImages.ts           # Anatomically realistic clinical tooth specimen generator
│   └── unitTests.ts              # 100% automated test suite for color science, SVM, and metrics
├── components/
│   ├── RoiCropper.tsx            # Interactive drag/resize crop box with clinical zone presets
│   ├── ColourDistributionCard.tsx# ROI CIELAB stats table, swatches, and glare indicators
│   ├── StandardisationCard.tsx   # Dental photographic standardisation audit checklist
│   ├── ShadePredictionCard.tsx   # SVM classification result, visual baseline match, secondary ΔE00 table
│   ├── ValidationDashboard.tsx   # Confusion matrix heatmap, per-class metrics, misclassification audit
│   ├── DatasetManager.tsx        # Training repository with search, filter, CSV import/export
│   ├── ModelTrainerCard.tsx      # SVM hyperparameter configuration (C, gamma, kernel, test split)
│   ├── ResearchReportModal.tsx   # Printable research report with Print-to-PDF layout
│   └── UnitTestModal.tsx         # Live in-app unit test runner modal
├── App.tsx                       # Main application shell and tab router
├── main.tsx                      # React root entry point
└── index.css                     # Tailwind CSS v4 entry point
```

---

## 3. Data Schema

### 12-Dimensional Feature Vector
Each observation is characterized by a 12-dimensional vector extracted from the target tooth middle third:
`[L_mean, a_mean, b_mean, L_std, a_std, b_std, L_median, a_median, b_median, L_iqr, a_iqr, b_iqr]`

### Standard CSV Schema
Exported and imported dataset CSV files follow this schema:
```csv
sample_id,subject_id,shade_label,sample_type,device_model,distance_cm,lighting,cross_polarized,grey_card_present,exposure_locked,reference_method,visual_baseline,operator,acquisition_date,L_mean,a_mean,b_mean,L_std,a_std,b_std,L_median,a_median,b_median,L_iqr,a_iqr,b_iqr,pixel_count,glare_percent,notes
```

---

## 4. Colour Science Formulas

### Piecewise sRGB Transfer Function
$$\begin{cases} C_{\text{linear}} = \frac{C}{12.92} & \text{for } C \le 0.04045 \\ C_{\text{linear}} = \left(\frac{C + 0.055}{1.055}\right)^{2.4} & \text{for } C > 0.04045 \end{cases}$$

### sRGB to CIE XYZ under D65
$$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124564 & 0.3575761 & 0.1804375 \\ 0.2126729 & 0.7151522 & 0.0721750 \\ 0.0193339 & 0.1191920 & 0.9503041 \end{bmatrix} \begin{bmatrix} R_{\text{linear}} \\ G_{\text{linear}} \\ B_{\text{linear}} \end{bmatrix}$$
Reference white point for D65 ($2^\circ$ observer): $X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$.

### CIEDE2000 ($\Delta E_{00}$)
Implemented and verified against the 34 published test vectors of Gaurav Sharma, Wencheng Wu, and Edul N. Dalal (2005), *"The CIEDE2000 color-difference formula: Implementation notes, supplementary test data, and mathematical observations"*, Color Research & Application 30(1): 21–30.

---

## 5. Machine Learning Procedure

1. **Preprocessing**: Z-score standardization $\tilde{x} = (x - \mu) / \sigma$ is derived strictly from the training partition and saved in the model metadata.
2. **Multiclass SVM**: Uses `libsvm-js` C-SVC with Radial Basis Function (RBF) kernel:
   $$K(x_i, x_j) = \exp(-\gamma \|x_i - x_j\|^2)$$
3. **Partitioning**: Stratified train/test split grouped by subject ID to prevent repeated patient images from leaking across partitions.
4. **Out-of-Distribution Detection**: Calculates normalized Euclidean distance in standardized feature space to training class centroids. Distance $> 4.5 \sigma$ flags an out-of-distribution warning.

---

## 6. Testing Instructions

### Run In-App
Open the application and click **Unit Tests** in the top navigation bar to execute the automated suite in the browser.

### Run in Node / CLI
```bash
npx tsx -e "import { runAllUnitTests } from './src/services/unitTests.ts'; const res = runAllUnitTests(); console.log(res);"
```

The test suite covers:
- sRGB <-> XYZ <-> CIELAB roundtrip and known reference points (white, black, grey).
- CIE76 Euclidean distance.
- CIEDE2000 against published Sharma et al. (2005) reference test vectors.
- Feature schema dimensionality and ordering.
- Training-set-only Z-score scaling.
- Confusion matrix and balanced accuracy calculation.
- CSV dataset export and schema validation.
- Genuine multiclass SVM training and prediction sanity check.

---

## 7. Limitations & Ethical Disclosures

- **Research Decision Support**: This software is intended for research, prototype evaluation, and clinical decision support. It does not replace professional dental diagnosis or shade verification.
- **Physical Glare vs. Software**: A physical cross-polarising filter is an optical requirement. Software glare exclusion discards overexposed specularities but cannot reconstruct underlying dentin chroma.
- **Uncalibrated Sensor Gamut**: Smartphone camera sensors possess unique spectral responsivity curves and auto-white-balance algorithms. Traceable spectrophotometric accuracy requires calibrated lighting (5500 K, CRI &gt; 95) and multi-patch color calibration targets.
