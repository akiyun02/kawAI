import { Landmark3D, RecognitionEvaluation, FaceLandmarkData } from '../types';

// MediaPipe skeleton connectivity
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17]
];

export function renderHandMesh(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: Landmark3D[],
  evaluation: RecognitionEvaluation | null,
  showGuides: boolean = true,
  faceData?: FaceLandmarkData | null
) {
  ctx.clearRect(0, 0, width, height);

  // 0. Render Face Tracking Anchor if detected
  const activeFace = faceData || evaluation?.faceData;
  if (activeFace) {
    ctx.save();
    // Eyes, Nose, Mouth points
    const pts = [activeFace.rightEye, activeFace.leftEye, activeFace.noseTip, activeFace.mouthCenter];
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    for (const pt of pts) {
      if (!pt) continue;
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Forehead anchor line/crosshair
    const nose = activeFace.noseTip;
    const mouth = activeFace.mouthCenter;
    const dy = mouth.y - nose.y;
    const foreheadY = (nose.y - dy * 1.5) * height;
    const foreheadX = nose.x * width;

    // Subtle face tracker badge
    const zone = evaluation?.detectedFeatures?.locationZone || 'chest';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = zone === 'forehead' ? '#38BDF8' : (zone === 'chin' ? '#FBBF24' : '#94A3B8');
    ctx.fillText(`⌖ FACE TRACKER [${zone.toUpperCase()}]`, foreheadX - 42, Math.max(16, foreheadY - 8));
    ctx.restore();
  }

  // 1. Draw Forgiving, Comfortable Signing Area Guide
  if (showGuides) {
    const boxX = width * 0.08;
    const boxY = height * 0.06;
    const boxW = width * 0.84;
    const boxH = height * 0.88;

    ctx.save();
    // Subtle, unobtrusive border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Corner brackets
    const cLen = 16;
    ctx.setLineDash([]);
    ctx.strokeStyle = evaluation?.qualityGate?.isUsable 
      ? 'rgba(56, 189, 248, 0.45)' 
      : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2.5;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + cLen);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + cLen, boxY);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - cLen, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + cLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - cLen);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + cLen, boxY + boxH);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
    ctx.stroke();

    // Show subtle label only when hand is not yet detected
    if (!landmarks || landmarks.length < 21) {
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText('SIGNING AREA 🖐', boxX + boxW / 2, boxY + 16);
    }

    ctx.restore();
  }

  if (!landmarks || landmarks.length < 21) {
    return;
  }

  // Determine color scheme based on evaluation
  const isCorrect = evaluation?.isCorrect ?? false;
  const isOrientWarn = evaluation?.orientationStatus === 'warning';
  const isShapeErr = evaluation?.shapeStatus === 'error';

  let boneColor = 'rgba(6, 182, 212, 0.75)'; // cyan
  let jointColor = '#38BDF8';
  let tipColor = '#06B6D4';
  let haloColor = 'rgba(6, 182, 212, 0.25)';

  if (isCorrect) {
    boneColor = 'rgba(16, 185, 129, 0.85)'; // emerald
    jointColor = '#10B981';
    tipColor = '#34D399';
    haloColor = 'rgba(16, 185, 129, 0.3)';
  } else if (isOrientWarn) {
    boneColor = 'rgba(245, 158, 11, 0.75)'; // amber
    jointColor = '#F59E0B';
    tipColor = '#FBBF24';
    haloColor = 'rgba(245, 158, 11, 0.25)';
  } else if (isShapeErr) {
    boneColor = 'rgba(244, 63, 94, 0.75)'; // rose
    jointColor = '#F43F5E';
    tipColor = '#FB7185';
    haloColor = 'rgba(244, 63, 94, 0.25)';
  }

  // 2. Draw Bones / Connections (Fast Batch Drawing)
  ctx.save();
  ctx.strokeStyle = boneColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (let c = 0; c < HAND_CONNECTIONS.length; c++) {
    const [i, j] = HAND_CONNECTIONS[c];
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
  }
  ctx.stroke();
  ctx.restore();

  // 3. Draw Palm 3D Normal Vector Indicator
  if (evaluation?.palmNormal) {
    const palmCenter = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3 * width,
      y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3 * height
    };

    const norm = evaluation.palmNormal;
    const arrowLen = 45;
    const arrowEndX = palmCenter.x + (norm.x * arrowLen);
    const arrowEndY = palmCenter.y + (norm.y * arrowLen);

    ctx.save();
    ctx.strokeStyle = evaluation.orientationStatus === 'correct' ? '#10B981' : '#F59E0B';
    ctx.fillStyle = evaluation.orientationStatus === 'correct' ? '#10B981' : '#F59E0B';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(palmCenter.x, palmCenter.y);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(palmCenter.x, palmCenter.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.fillText(
      `Normal: [${norm.x.toFixed(1)}, ${norm.y.toFixed(1)}, ${norm.z.toFixed(1)}]`,
      palmCenter.x + 8,
      palmCenter.y - 8
    );
    ctx.restore();
  }

  // 4. Draw Landmark Points / Joints (NO EXPENSIVE SHADOWBLUR)
  const tipIndices = [4, 8, 12, 16, 20];

  // Draw fingertip halos fast
  ctx.save();
  ctx.fillStyle = haloColor;
  ctx.beginPath();
  for (let t = 0; t < tipIndices.length; t++) {
    const p = landmarks[tipIndices[t]];
    ctx.moveTo((p.x * width) + 9, p.y * height);
    ctx.arc(p.x * width, p.y * height, 9, 0, 2 * Math.PI);
  }
  ctx.fill();

  // Draw main joints
  ctx.fillStyle = jointColor;
  ctx.beginPath();
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    ctx.moveTo((p.x * width) + 4, p.y * height);
    ctx.arc(p.x * width, p.y * height, 4, 0, 2 * Math.PI);
  }
  ctx.fill();

  // Draw inner pips
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    ctx.moveTo((p.x * width) + 1.5, p.y * height);
    ctx.arc(p.x * width, p.y * height, 1.5, 0, 2 * Math.PI);
  }
  ctx.fill();

  // 4. Draw Motion Trajectory Trail (for dynamic letters J & Z)
  if (evaluation?.strokeTrail && evaluation.strokeTrail.length > 1) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const trail = evaluation.strokeTrail;
    for (let i = 1; i < trail.length; i++) {
      const alpha = Math.min(1.0, (i / trail.length) * 0.95);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x * width, trail[i - 1].y * height);
      ctx.lineTo(trail[i].x * width, trail[i].y * height);
      ctx.stroke();
    }

    // Glowing spark at head of the stroke
    const head = trail[trail.length - 1];
    ctx.fillStyle = '#A855F7';
    ctx.shadowColor = '#C084FC';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(head.x * width, head.y * height, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
