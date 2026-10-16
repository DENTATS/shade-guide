/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { labToHex, VITA_CLASSICAL_REFERENCE_TABS } from './colourScience';

/**
 * Generates an ultra-realistic clinical tooth image on a canvas and returns DataURL.
 * Features natural enamel texture, cervical-to-incisal gradient, and realistic anatomical contour.
 */
export function generateClinicalToothImage(shadeLabel: string = 'A2'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const tab =
    VITA_CLASSICAL_REFERENCE_TABS.find((t) => t.shade === shadeLabel) ||
    VITA_CLASSICAL_REFERENCE_TABS[1]; // A2 default

  // Base hex color for the body of the tooth
  const bodyHex = labToHex(tab.L, tab.a, tab.b);
  // Cervical is warmer (+3 b*, -4 L*)
  const cervicalHex = labToHex(Math.max(50, tab.L - 4), tab.a + 1.2, tab.b + 3.5);
  // Incisal is more translucent and bluish (+3 L*, -1 a*, -3 b*)
  const incisalHex = labToHex(Math.min(92, tab.L + 3), Math.max(-2, tab.a - 1.0), Math.max(5, tab.b - 3.5));

  // 1. Dark clinical background (oral cavity / photo contrastor)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 600, 700);

  // Subtle operatory diffused background glow
  const bgGlow = ctx.createRadialGradient(300, 350, 50, 300, 350, 350);
  bgGlow.addColorStop(0, '#1e293b');
  bgGlow.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, 600, 700);

  // 2. Gingiva (gum tissue at the top)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(100, 160);
  ctx.bezierCurveTo(200, 100, 400, 100, 500, 160);
  ctx.lineTo(500, 0);
  ctx.lineTo(100, 0);
  ctx.closePath();
  const gumGrad = ctx.createLinearGradient(300, 0, 300, 180);
  gumGrad.addColorStop(0, '#b91c1c');
  gumGrad.addColorStop(0.7, '#e11d48');
  gumGrad.addColorStop(1, '#fda4af');
  ctx.fillStyle = gumGrad;
  ctx.fill();
  ctx.restore();

  // 3. Central Incisor Anatomical Contour
  ctx.save();
  ctx.beginPath();
  // Cervical margin (top arch)
  ctx.moveTo(210, 180);
  ctx.bezierCurveTo(260, 150, 340, 150, 390, 180);
  // Distal edge (right side)
  ctx.bezierCurveTo(420, 260, 410, 430, 385, 520);
  // Incisal edge (bottom)
  ctx.bezierCurveTo(340, 530, 260, 530, 215, 520);
  // Mesial edge (left side)
  ctx.bezierCurveTo(190, 430, 180, 260, 210, 180);
  ctx.closePath();

  // Vertical natural chromatic gradient (cervical warmer -> body -> incisal translucent)
  const toothGrad = ctx.createLinearGradient(300, 150, 300, 530);
  toothGrad.addColorStop(0, cervicalHex);
  toothGrad.addColorStop(0.25, cervicalHex);
  toothGrad.addColorStop(0.55, bodyHex);
  toothGrad.addColorStop(0.85, bodyHex);
  toothGrad.addColorStop(1.0, incisalHex);

  ctx.fillStyle = toothGrad;
  ctx.fill();

  // Subtle 3D curvature shading (shadows on proximal line angles)
  const shadowGrad = ctx.createRadialGradient(300, 340, 80, 300, 340, 150);
  shadowGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  shadowGrad.addColorStop(0.85, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(1.0, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // Incisal translucency halo and mamelon optical depth
  ctx.beginPath();
  ctx.moveTo(225, 510);
  ctx.bezierCurveTo(270, 520, 330, 520, 375, 510);
  ctx.bezierCurveTo(365, 485, 235, 485, 225, 510);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200, 220, 240, 0.25)';
  ctx.fill();

  // Cross-polarized diffused highlight (soft, without blinding specular flash reflection)
  ctx.beginPath();
  ctx.ellipse(260, 330, 18, 90, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(340, 330, 16, 85, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();

  // Natural enamel perikymata texture (micro-grooves)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1.2;
  for (let y = 220; y < 480; y += 14) {
    ctx.beginPath();
    ctx.moveTo(220, y);
    ctx.quadraticCurveTo(300, y + 5, 380, y);
    ctx.stroke();
  }

  ctx.restore();

  // 4. Clinical reference grey tab in bottom corner for verification
  ctx.fillStyle = '#777777'; // 18% neutral grey
  ctx.fillRect(40, 580, 80, 50);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 580, 80, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.fillText('18% GREY', 52, 610);

  // Label watermark
  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.fillText(`Calibrated Clinical Specimen - Shade ${shadeLabel}`, 40, 660);

  return canvas.toDataURL('image/jpeg', 0.95);
}
