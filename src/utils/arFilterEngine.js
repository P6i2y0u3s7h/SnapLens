/**
 * SnapLens Professional AR Filter Engine
 * 10 Original, creative, interactive Snapchat-inspired AR filters
 * Procedural vector & particle canvas rendering with 60 FPS animation support.
 */

export const AR_FILTERS = [
  {
    id: 'none',
    name: 'No Lens',
    category: 'Trending',
    icon: '✨',
    color: '#64748B',
    description: 'Clean camera feed without AR overlays',
    tags: ['clean', 'natural', 'none'],
  },
  {
    id: 'cat',
    name: 'Cute Cat',
    category: 'Cute',
    icon: '🐱',
    color: '#F472B6',
    description: 'Animated twitching cat ears, pink button nose, whiskers & blush',
    tags: ['cute', 'cat', 'kitty', 'animals', 'ears', 'whiskers'],
  },
  {
    id: 'puppy',
    name: 'Puppy Dog',
    category: 'Animals',
    icon: '🐶',
    color: '#A16207',
    description: 'Floppy puppy ears, cute button nose and animated panting tongue',
    tags: ['puppy', 'dog', 'animals', 'cute', 'funny', 'tongue'],
  },
  {
    id: 'butterflies',
    name: 'Butterfly Dream',
    category: 'Fantasy',
    icon: '🦋',
    color: '#38BDF8',
    description: 'Animated iridescent butterflies fluttering and orbiting around face',
    tags: ['butterflies', 'fantasy', 'beauty', 'nature', 'magical'],
  },
  {
    id: 'crown',
    name: 'Royal Crown',
    category: 'Trending',
    icon: '👑',
    color: '#FFD700',
    description: '3D-shaded golden royal crown with jewels, velvet cushion and glints',
    tags: ['crown', 'royal', 'gold', 'trending', 'king', 'queen'],
  },
  {
    id: 'angel',
    name: 'Angel Glow',
    category: 'Beauty',
    icon: '😇',
    color: '#EAB308',
    description: 'Glowing golden halo, soft ethereal skin bloom and floating sparkles',
    tags: ['angel', 'halo', 'beauty', 'glow', 'sparkles', 'divine'],
  },
  {
    id: 'cyber',
    name: 'Cyber Face',
    category: 'Creative',
    icon: '🕶️',
    color: '#06B6D4',
    description: 'Futuristic neon cybernetic HUD, targeting eye reticle & scanlines',
    tags: ['cyber', 'neon', 'futuristic', 'hud', 'sci-fi', 'creative'],
  },
  {
    id: 'heart_eyes',
    name: 'Heart Eyes',
    category: 'Cute',
    icon: '💕',
    color: '#F43F5E',
    description: 'Pulsing 3D hearts over eyes, floating heart particles and rosy blush',
    tags: ['hearts', 'love', 'cute', 'eyes', 'blush', 'trending'],
  },
  {
    id: 'fire_eyes',
    name: 'Fire Eyes',
    category: 'Creative',
    icon: '🔥',
    color: '#EA580C',
    description: 'Flickering animated flames around eyes with floating ember sparks',
    tags: ['fire', 'flames', 'eyes', 'hot', 'creative', 'energy'],
  },
  {
    id: 'anime',
    name: 'Anime World',
    category: 'Anime',
    icon: '✨',
    color: '#EC4899',
    description: 'Manga-style starry eye reflections, comic blush and pastel sparkles',
    tags: ['anime', 'manga', 'kawaii', 'cute', 'sparkle', 'eyes'],
  },
  {
    id: 'rainbow',
    name: 'Rainbow Magic',
    category: 'Fantasy',
    icon: '🌈',
    color: '#8B5CF6',
    description: 'Animated glowing rainbow arch with fluffy clouds and spinning stars',
    tags: ['rainbow', 'fantasy', 'magic', 'colorful', 'stars', 'creative'],
  },
];

export const FILTER_CATEGORIES = [
  'All',
  'Trending',
  'Cute',
  'Animals',
  'Beauty',
  'Fantasy',
  'Creative',
  'Anime',
];

// ─────────────────────────────────────────────────────────────────
// INDIVIDUAL AR FILTER RENDERERS (Canvas 2D, 60 FPS Anim Support)
// ─────────────────────────────────────────────────────────────────

/**
 * 1. Cute Cat Filter
 */
function drawCuteCat(ctx, geom, animTime) {
  const { centerX, centerY, fx, fy, fw, fh } = geom;
  const earSize = fw * 0.46;
  const earY = fy - earSize * 0.65;

  // Twitch oscillation on left ear
  const twitchAngle = Math.sin(animTime * 4) > 0.85 ? Math.sin(animTime * 25) * 0.12 : 0;

  // Left Ear
  ctx.save();
  ctx.translate(centerX - fw * 0.42, earY + earSize * 0.5);
  ctx.rotate(twitchAngle - 0.15);
  ctx.translate(-(centerX - fw * 0.42), -(earY + earSize * 0.5));

  // Outer ear
  ctx.fillStyle = '#1E1B4B';
  ctx.beginPath();
  ctx.moveTo(centerX - fw * 0.62, earY + earSize);
  ctx.quadraticCurveTo(centerX - fw * 0.44, earY - earSize * 0.1, centerX - fw * 0.42, earY);
  ctx.quadraticCurveTo(centerX - fw * 0.38, earY + earSize * 0.3, centerX - fw * 0.22, earY + earSize);
  ctx.closePath();
  ctx.fill();

  // Inner pink ear
  ctx.fillStyle = '#F472B6';
  ctx.beginPath();
  ctx.moveTo(centerX - fw * 0.54, earY + earSize * 0.9);
  ctx.quadraticCurveTo(centerX - fw * 0.43, earY + earSize * 0.25, centerX - fw * 0.42, earY + earSize * 0.22);
  ctx.quadraticCurveTo(centerX - fw * 0.38, earY + earSize * 0.45, centerX - fw * 0.28, earY + earSize * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right Ear
  ctx.save();
  ctx.translate(centerX + fw * 0.42, earY + earSize * 0.5);
  ctx.rotate(0.15);
  ctx.translate(-(centerX + fw * 0.42), -(earY + earSize * 0.5));

  // Outer ear
  ctx.fillStyle = '#1E1B4B';
  ctx.beginPath();
  ctx.moveTo(centerX + fw * 0.62, earY + earSize);
  ctx.quadraticCurveTo(centerX + fw * 0.44, earY - earSize * 0.1, centerX + fw * 0.42, earY);
  ctx.quadraticCurveTo(centerX + fw * 0.38, earY + earSize * 0.3, centerX + fw * 0.22, earY + earSize);
  ctx.closePath();
  ctx.fill();

  // Inner pink ear
  ctx.fillStyle = '#F472B6';
  ctx.beginPath();
  ctx.moveTo(centerX + fw * 0.54, earY + earSize * 0.9);
  ctx.quadraticCurveTo(centerX + fw * 0.43, earY + earSize * 0.25, centerX + fw * 0.42, earY + earSize * 0.22);
  ctx.quadraticCurveTo(centerX + fw * 0.38, earY + earSize * 0.45, centerX + fw * 0.28, earY + earSize * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Soft pink cheek blush
  const blushY = centerY + fh * 0.12;
  const blushR = fw * 0.15;
  ctx.fillStyle = 'rgba(244, 114, 182, 0.32)';
  ctx.beginPath();
  ctx.arc(centerX - fw * 0.28, blushY, blushR, 0, Math.PI * 2);
  ctx.arc(centerX + fw * 0.28, blushY, blushR, 0, Math.PI * 2);
  ctx.fill();

  // Pink heart-shaped cat nose
  const noseY = centerY + fh * 0.11;
  const nw = fw * 0.07;
  ctx.fillStyle = '#FB7185';
  ctx.beginPath();
  ctx.moveTo(centerX, noseY + nw * 0.6);
  ctx.quadraticCurveTo(centerX - nw, noseY - nw * 0.6, centerX - nw * 0.5, noseY - nw);
  ctx.quadraticCurveTo(centerX, noseY - nw * 0.6, centerX, noseY - nw * 0.4);
  ctx.quadraticCurveTo(centerX, noseY - nw * 0.6, centerX + nw * 0.5, noseY - nw);
  ctx.quadraticCurveTo(centerX + nw, noseY - nw * 0.6, centerX, noseY + nw * 0.6);
  ctx.fill();

  // Whisker lines
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2.5, fw * 0.016);
  ctx.lineCap = 'round';
  [-1, 1].forEach((dir) => {
    for (let i = -1; i <= 1; i++) {
      const startX = centerX + dir * fw * 0.1;
      const startY = noseY + i * (fh * 0.035);
      const endX = centerX + dir * fw * 0.48;
      const endY = startY + i * (fh * 0.05) + Math.sin(animTime * 3) * 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(centerX + dir * fw * 0.28, startY + i * 2, endX, endY);
      ctx.stroke();
    }
  });
}

/**
 * 2. Puppy Filter
 */
function drawPuppy(ctx, geom, animTime) {
  const { centerX, centerY, fx, fy, fw, fh } = geom;
  const earW = fw * 0.38;
  const earH = fh * 0.65;
  const earY = fy + fh * 0.08;

  // Floppy ear swaying
  const leftSway = Math.sin(animTime * 4) * 0.08;
  const rightSway = Math.sin(animTime * 4 + 1) * 0.08;

  // Left Floppy Ear
  ctx.save();
  ctx.translate(centerX - fw * 0.45, earY);
  ctx.rotate(leftSway - 0.2);
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.ellipse(0, earH * 0.5, earW * 0.45, earH * 0.5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#92400E';
  ctx.beginPath();
  ctx.ellipse(0, earH * 0.52, earW * 0.28, earH * 0.38, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right Floppy Ear
  ctx.save();
  ctx.translate(centerX + fw * 0.45, earY);
  ctx.rotate(rightSway + 0.2);
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.ellipse(0, earH * 0.5, earW * 0.45, earH * 0.5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#92400E';
  ctx.beginPath();
  ctx.ellipse(0, earH * 0.52, earW * 0.28, earH * 0.38, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Big Puppy Nose
  const noseY = centerY + fh * 0.12;
  const nw = fw * 0.11;
  const nh = fh * 0.08;
  ctx.fillStyle = '#1C1917';
  ctx.beginPath();
  ctx.ellipse(centerX, noseY, nw, nh, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose reflection glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(centerX - nw * 0.35, noseY - nh * 0.25, nw * 0.28, nh * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Cute Panting Tongue
  const mouthY = centerY + fh * 0.26;
  const tongueBob = Math.sin(animTime * 6) * (fh * 0.035);
  const tongueW = fw * 0.16;
  const tongueH = fh * 0.22 + tongueBob;

  ctx.fillStyle = '#F43F5E';
  ctx.beginPath();
  ctx.moveTo(centerX - tongueW * 0.5, mouthY);
  ctx.lineTo(centerX - tongueW * 0.5, mouthY + tongueH * 0.7);
  ctx.quadraticCurveTo(centerX, mouthY + tongueH, centerX + tongueW * 0.5, mouthY + tongueH * 0.7);
  ctx.lineTo(centerX + tongueW * 0.5, mouthY);
  ctx.closePath();
  ctx.fill();

  // Tongue center crease
  ctx.strokeStyle = '#BE123C';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX, mouthY + 2);
  ctx.lineTo(centerX, mouthY + tongueH * 0.85);
  ctx.stroke();
}

/**
 * 3. Butterfly Dream Filter
 */
function drawButterflyDream(ctx, geom, animTime) {
  const { centerX, centerY, fw, fh } = geom;

  // 5 Orbiting butterflies
  const butterflies = [
    { color: '#38BDF8', size: fw * 0.18, orbitX: fw * 0.55, orbitY: fh * 0.45, speed: 1.8, phase: 0 },
    { color: '#C084FC', size: fw * 0.16, orbitX: fw * 0.48, orbitY: fh * 0.38, speed: 2.2, phase: 1.5 },
    { color: '#F472B6', size: fw * 0.15, orbitX: fw * 0.62, orbitY: fh * 0.5, speed: 1.4, phase: 3.0 },
    { color: '#FBBF24', size: fw * 0.14, orbitX: fw * 0.42, orbitY: fh * 0.3, speed: 2.5, phase: 4.2 },
    { color: '#34D399', size: fw * 0.17, orbitX: fw * 0.58, orbitY: fh * 0.42, speed: 1.6, phase: 5.4 },
  ];

  butterflies.forEach((b) => {
    const t = animTime * b.speed + b.phase;
    const bx = centerX + Math.cos(t) * b.orbitX;
    const by = centerY - fh * 0.15 + Math.sin(t * 1.5) * b.orbitY;
    const flap = Math.abs(Math.sin(animTime * 14 + b.phase));

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.sin(t) * 0.35);

    // Glow aura
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12;

    // Left Wing
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(-b.size * 0.4 * flap, -b.size * 0.2, b.size * 0.5 * flap, b.size * 0.35, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-b.size * 0.3 * flap, b.size * 0.2, b.size * 0.35 * flap, b.size * 0.25, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Right Wing
    ctx.beginPath();
    ctx.ellipse(b.size * 0.4 * flap, -b.size * 0.2, b.size * 0.5 * flap, b.size * 0.35, 0.4, 0, Math.PI * 2);
    ctx.ellipse(b.size * 0.3 * flap, b.size * 0.2, b.size * 0.35 * flap, b.size * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Butterfly body
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.5, b.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  // Floating sparkle dust around face
  for (let i = 0; i < 8; i++) {
    const st = animTime * 1.2 + i * 0.8;
    const sx = centerX + Math.sin(st * 2 + i) * fw * 0.45;
    const sy = centerY - fh * 0.2 + (Math.sin(st + i * 2) * fh * 0.4);
    const sOpacity = Math.max(0, Math.sin(st * 3));

    ctx.fillStyle = `rgba(255, 255, 255, ${sOpacity * 0.85})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + sOpacity * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 4. Royal Crown Filter
 */
function drawRoyalCrown(ctx, geom, animTime) {
  const { centerX, fy, fw, fh } = geom;
  const crownW = fw * 1.15;
  const crownH = fh * 0.56;
  const crownX = centerX - crownW / 2;
  const floatBob = Math.sin(animTime * 3) * 4;
  const crownY = fy - crownH * 0.88 + floatBob;

  // Velvet cap cushion (purple interior)
  ctx.fillStyle = '#581C87';
  ctx.beginPath();
  ctx.ellipse(centerX, crownY + crownH * 0.65, crownW * 0.44, crownH * 0.4, 0, Math.PI, 0);
  ctx.fill();

  // Golden Crown Body
  const goldGrad = ctx.createLinearGradient(crownX, crownY, crownX, crownY + crownH);
  goldGrad.addColorStop(0, '#FFF275');
  goldGrad.addColorStop(0.3, '#FFD700');
  goldGrad.addColorStop(0.7, '#D4AF37');
  goldGrad.addColorStop(1, '#996515');

  ctx.fillStyle = goldGrad;
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = Math.max(3, fw * 0.016);
  ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
  ctx.shadowBlur = 16;

  ctx.beginPath();
  ctx.moveTo(crownX, crownY + crownH);
  ctx.lineTo(crownX + crownW, crownY + crownH);
  ctx.lineTo(crownX + crownW, crownY + crownH * 0.4);
  ctx.lineTo(crownX + crownW * 0.78, crownY + crownH * 0.65);
  ctx.lineTo(crownX + crownW * 0.5, crownY);
  ctx.lineTo(crownX + crownW * 0.22, crownY + crownH * 0.65);
  ctx.lineTo(crownX, crownY + crownH * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jeweled Band at base
  ctx.fillStyle = '#B45309';
  ctx.fillRect(crownX, crownY + crownH - crownH * 0.18, crownW, crownH * 0.18);
  ctx.strokeRect(crownX, crownY + crownH - crownH * 0.18, crownW, crownH * 0.18);

  // Big center Ruby
  ctx.shadowColor = '#EF4444';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(centerX, crownY + crownH * 0.05, fw * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Sapphire and Emerald side gems
  const gems = [
    { x: crownX + crownW * 0.03, y: crownY + crownH * 0.42, color: '#3B82F6' },
    { x: crownX + crownW * 0.97, y: crownY + crownH * 0.42, color: '#3B82F6' },
    { x: crownX + crownW * 0.28, y: crownY + crownH - crownH * 0.09, color: '#10B981' },
    { x: crownX + crownW * 0.5, y: crownY + crownH - crownH * 0.09, color: '#EF4444' },
    { x: crownX + crownW * 0.72, y: crownY + crownH - crownH * 0.09, color: '#10B981' },
  ];

  gems.forEach((g) => {
    ctx.shadowColor = g.color;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, fw * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  // Cross finial on center peak
  ctx.strokeStyle = '#FFE853';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX, crownY - fw * 0.08);
  ctx.lineTo(centerX, crownY);
  ctx.moveTo(centerX - fw * 0.04, crownY - fw * 0.05);
  ctx.lineTo(centerX + fw * 0.04, crownY - fw * 0.05);
  ctx.stroke();

  ctx.shadowBlur = 0;
}

/**
 * 5. Angel Glow Filter
 */
function drawAngelGlow(ctx, geom, animTime) {
  const { centerX, centerY, fw, fh, fy } = geom;
  const haloW = fw * 0.88;
  const haloH = fh * 0.28;
  const haloY = fy - fh * 0.42 + Math.sin(animTime * 3) * 5;

  // Golden glowing Halo
  ctx.save();
  ctx.shadowColor = '#FFFC00';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = '#FFFC00';
  ctx.lineWidth = Math.max(7, fw * 0.042);

  ctx.beginPath();
  ctx.ellipse(centerX, haloY, haloW * 0.5, haloH * 0.5, -0.05, 0, Math.PI * 2);
  ctx.stroke();

  // Core white ring highlight
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2.5, fw * 0.016);
  ctx.beginPath();
  ctx.ellipse(centerX, haloY, haloW * 0.5, haloH * 0.5, -0.05, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Soft ethereal cheek bloom
  ctx.fillStyle = 'rgba(255, 252, 0, 0.12)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, fw * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Floating 8-point golden cross sparkles
  const sparkleOffsets = [
    { ox: -fw * 0.42, oy: -fh * 0.35, scale: 1.0, speed: 2.0 },
    { ox: fw * 0.45, oy: -fh * 0.28, scale: 0.8, speed: 2.5 },
    { ox: -fw * 0.3, oy: fh * 0.2, scale: 0.6, speed: 1.8 },
    { ox: fw * 0.35, oy: fh * 0.25, scale: 0.7, speed: 3.0 },
    { ox: 0, oy: -fh * 0.6, scale: 1.2, speed: 1.5 },
  ];

  sparkleOffsets.forEach((sp) => {
    const pulse = Math.abs(Math.sin(animTime * sp.speed)) * sp.scale;
    const sx = centerX + sp.ox;
    const sy = centerY + sp.oy + Math.sin(animTime * 2 + sp.scale) * 6;
    const size = fw * 0.08 * pulse;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(animTime * sp.speed * 0.5);
    ctx.fillStyle = '#FFF88A';
    ctx.shadowColor = '#FFFC00';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.25, -size * 0.25);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * 0.25, size * 0.25);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.25, size * 0.25);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.25, -size * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

/**
 * 6. Cyber Face Filter
 */
function drawCyberFace(ctx, geom, animTime) {
  const { centerX, centerY, fw, fh } = geom;

  ctx.save();
  ctx.shadowColor = '#06B6D4';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = Math.max(2, fw * 0.014);

  // Cyber cheek angular brackets
  [-1, 1].forEach((dir) => {
    const startX = centerX + dir * fw * 0.25;
    const cheekY = centerY + fh * 0.08;
    ctx.beginPath();
    ctx.moveTo(startX, cheekY);
    ctx.lineTo(startX + dir * fw * 0.18, cheekY + fh * 0.06);
    ctx.lineTo(startX + dir * fw * 0.28, cheekY + fh * 0.06);
    ctx.stroke();

    // Data dots
    ctx.fillStyle = '#06B6D4';
    ctx.beginPath();
    ctx.arc(startX + dir * fw * 0.28, cheekY + fh * 0.06, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Forehead HUD sensor bar
  const fhY = centerY - fh * 0.32;
  ctx.strokeStyle = '#F43F5E';
  ctx.shadowColor = '#F43F5E';
  ctx.beginPath();
  ctx.moveTo(centerX - fw * 0.28, fhY);
  ctx.lineTo(centerX + fw * 0.28, fhY);
  ctx.stroke();

  // Animated Eye Targeting Reticle (Right Eye)
  const eyeX = centerX + fw * 0.2;
  const eyeY = centerY - fh * 0.08;
  const reticleR = fw * 0.14;

  ctx.strokeStyle = '#06B6D4';
  ctx.shadowColor = '#06B6D4';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, reticleR, animTime * 3, animTime * 3 + Math.PI * 1.4);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(eyeX, eyeY, reticleR * 0.65, -animTime * 4, -animTime * 4 + Math.PI * 0.8);
  ctx.stroke();

  // Reticle crosshair tick marks
  ctx.beginPath();
  ctx.moveTo(eyeX - reticleR * 1.3, eyeY);
  ctx.lineTo(eyeX - reticleR * 0.8, eyeY);
  ctx.moveTo(eyeX + reticleR * 0.8, eyeY);
  ctx.lineTo(eyeX + reticleR * 1.3, eyeY);
  ctx.moveTo(eyeX, eyeY - reticleR * 1.3);
  ctx.lineTo(eyeX, eyeY - reticleR * 0.8);
  ctx.moveTo(eyeX, eyeY + reticleR * 0.8);
  ctx.lineTo(eyeX, eyeY + reticleR * 1.3);
  ctx.stroke();

  // Cyber HUD telemetry text
  ctx.font = `bold ${Math.round(fw * 0.055)}px monospace`;
  ctx.fillStyle = '#06B6D4';
  ctx.shadowBlur = 0;
  ctx.fillText('SYS_LOCK [99.4%]', eyeX - fw * 0.15, eyeY - reticleR * 1.4);
  ctx.fillText('TRK: OK', centerX - fw * 0.42, centerY - fh * 0.22);

  // Scanning laser beam
  const scanY = centerY - fh * 0.45 + (Math.sin(animTime * 3) * 0.5 + 0.5) * (fh * 0.9);
  const scanGrad = ctx.createLinearGradient(centerX - fw * 0.45, scanY, centerX + fw * 0.45, scanY);
  scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
  scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.7)');
  scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.strokeStyle = scanGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - fw * 0.45, scanY);
  ctx.lineTo(centerX + fw * 0.45, scanY);
  ctx.stroke();

  ctx.restore();
}

/**
 * 7. Heart Eyes Filter
 */
function drawHeartEyes(ctx, geom, animTime) {
  const { centerX, centerY, fw, fh } = geom;
  const eyeY = centerY - fh * 0.08;
  const leftEyeX = centerX - fw * 0.2;
  const rightEyeX = centerX + fw * 0.2;

  // Heartbeat pulse rhythm
  const pulse = 1 + Math.sin(animTime * 7) * 0.14;
  const heartSize = fw * 0.16 * pulse;

  // Cute rosy cheek blush
  const blushY = centerY + fh * 0.14;
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.arc(centerX - fw * 0.28, blushY, fw * 0.14, 0, Math.PI * 2);
  ctx.arc(centerX + fw * 0.28, blushY, fw * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Draw Heart shape helper
  const drawHeart = (x, y, s) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = '#F43F5E';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#F43F5E';

    ctx.beginPath();
    ctx.moveTo(0, s * 0.7);
    ctx.bezierCurveTo(-s, 0, -s, -s * 0.9, 0, -s * 0.3);
    ctx.bezierCurveTo(s, -s * 0.9, s, 0, 0, s * 0.7);
    ctx.closePath();
    ctx.fill();

    // White shine highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.38, -s * 0.45, s * 0.16, s * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Hearts over both eyes
  drawHeart(leftEyeX, eyeY, heartSize);
  drawHeart(rightEyeX, eyeY, heartSize);

  // Floating miniature hearts bubbling upwards
  for (let i = 0; i < 4; i++) {
    const ht = animTime * 1.5 + i * 1.2;
    const progress = (ht % 3) / 3;
    const hx = centerX + (i % 2 === 0 ? -1 : 1) * (fw * 0.35 + Math.sin(ht * 2) * 15);
    const hy = centerY - fh * 0.1 - progress * fh * 0.6;
    const hOpacity = 1 - progress;

    ctx.globalAlpha = hOpacity;
    drawHeart(hx, hy, fw * 0.08);
    ctx.globalAlpha = 1;
  }
}

/**
 * 8. Fire Eyes Filter
 */
function drawFireEyes(ctx, geom, animTime) {
  const { centerX, centerY, fw, fh } = geom;
  const eyeY = centerY - fh * 0.08;
  const leftEyeX = centerX - fw * 0.2;
  const rightEyeX = centerX + fw * 0.2;

  // Flame drawing function
  const drawFlames = (ox, oy) => {
    ctx.save();
    ctx.translate(ox, oy);

    // Multiple flickering flame layers
    const flameH = fh * 0.26;
    const flameW = fw * 0.18;

    // Outer Red flame
    const f1 = Math.sin(animTime * 18) * 8;
    const f2 = Math.cos(animTime * 22) * 6;

    ctx.shadowColor = '#EA580C';
    ctx.shadowBlur = 20;

    ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-flameW * 0.5, 0);
    ctx.quadraticCurveTo(-flameW * 0.6, -flameH * 0.5, -flameW * 0.2, -flameH - f1);
    ctx.quadraticCurveTo(0, -flameH * 0.7, 0, -flameH * 1.2 - f2);
    ctx.quadraticCurveTo(flameW * 0.2, -flameH * 0.7, flameW * 0.2, -flameH - f1);
    ctx.quadraticCurveTo(flameW * 0.6, -flameH * 0.5, flameW * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Middle Orange flame
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(-flameW * 0.35, 0);
    ctx.quadraticCurveTo(-flameW * 0.3, -flameH * 0.4, 0, -flameH * 0.9 - f1 * 0.5);
    ctx.quadraticCurveTo(flameW * 0.3, -flameH * 0.4, flameW * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // Core Yellow flame
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(-flameW * 0.2, 0);
    ctx.quadraticCurveTo(0, -flameH * 0.6, 0, -flameH * 0.6);
    ctx.quadraticCurveTo(0, -flameH * 0.6, flameW * 0.2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  drawFlames(leftEyeX, eyeY);
  drawFlames(rightEyeX, eyeY);

  // Floating spark embers
  for (let i = 0; i < 6; i++) {
    const et = animTime * 3 + i * 1.1;
    const ep = (et % 2) / 2;
    const ex = centerX + (i % 2 === 0 ? -1 : 1) * (fw * 0.22 + Math.sin(et * 4) * 12);
    const ey = eyeY - ep * fh * 0.45;
    ctx.fillStyle = i % 2 === 0 ? '#FDE047' : '#F97316';
    ctx.shadowColor = '#F97316';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(1, (1 - ep) * 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 9. Anime World Filter
 */
function drawAnimeWorld(ctx, geom, animTime) {
  const { centerX, centerY, fw, fh } = geom;
  const eyeY = centerY - fh * 0.08;
  const eyeR = fw * 0.14;

  // Starry anime eyes
  [-fw * 0.2, fw * 0.2].forEach((ox) => {
    const ex = centerX + ox;

    // Dark enlarged iris
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Purple lower crescent
    ctx.fillStyle = '#C084FC';
    ctx.beginPath();
    ctx.arc(ex, eyeY + eyeR * 0.3, eyeR * 0.65, 0, Math.PI);
    ctx.fill();

    // Main big white sparkle glint
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex - eyeR * 0.35, eyeY - eyeR * 0.32, eyeR * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Secondary smaller glint
    ctx.beginPath();
    ctx.arc(ex + eyeR * 0.32, eyeY + eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 4-Point twinkle star in pupil
    const starS = eyeR * 0.3;
    ctx.save();
    ctx.translate(ex + eyeR * 0.15, eyeY - eyeR * 0.2);
    ctx.rotate(animTime * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(0, -starS);
    ctx.lineTo(starS * 0.2, 0);
    ctx.lineTo(0, starS);
    ctx.lineTo(-starS * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // Manga cute diagonal blush marks
  const blushY = centerY + fh * 0.12;
  [-1, 1].forEach((dir) => {
    const bx = centerX + dir * fw * 0.3;
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * 8 - 4, blushY - 6);
      ctx.lineTo(bx + i * 8 + 4, blushY + 6);
      ctx.stroke();
    }
  });

  // Floating anime sparkles
  const sparkleCount = 4;
  for (let i = 0; i < sparkleCount; i++) {
    const st = animTime * 2 + i * 1.5;
    const sx = centerX + Math.cos(st) * fw * 0.42;
    const sy = centerY - fh * 0.15 + Math.sin(st * 2) * fh * 0.35;
    const pulse = Math.abs(Math.sin(st * 2.5));

    ctx.fillStyle = `rgba(254, 240, 138, ${pulse})`;
    ctx.font = `${Math.round(fw * 0.12 * pulse)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', sx, sy);
  }
}

/**
 * 10. Rainbow Magic Filter
 */
function drawRainbowMagic(ctx, geom, animTime) {
  const { centerX, centerY, fy, fw, fh } = geom;
  const rainbowR = fw * 0.52;
  const rainbowY = fy - fh * 0.08 + Math.sin(animTime * 2.5) * 4;

  const colors = ['#EF4444', '#F97316', '#EAB308', '#10B981', '#06B6D4', '#8B5CF6'];
  const bandThickness = Math.max(3.5, fw * 0.022);

  ctx.save();
  ctx.lineCap = 'round';

  // Rainbow arc bands
  colors.forEach((col, idx) => {
    const r = rainbowR - idx * bandThickness;
    ctx.strokeStyle = col;
    ctx.lineWidth = bandThickness;
    ctx.beginPath();
    ctx.arc(centerX, rainbowY, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  });

  // Cloud puffs at left and right base of rainbow
  const leftCloudX = centerX - rainbowR * Math.cos(Math.PI * 0.15);
  const rightCloudX = centerX + rainbowR * Math.cos(Math.PI * 0.15);
  const cloudY = rainbowY - rainbowR * Math.sin(Math.PI * 0.15);

  const drawCloud = (cx, cy) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx - 10, cy, 12, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy, 12, 0, Math.PI * 2);
    ctx.arc(cx, cy - 8, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  drawCloud(leftCloudX, cloudY);
  drawCloud(rightCloudX, cloudY);

  // Spinning colorful star sparkles
  const stars = [
    { x: centerX - fw * 0.35, y: rainbowY - fh * 0.15, color: '#FEF08A' },
    { x: centerX + fw * 0.38, y: rainbowY - fh * 0.1, color: '#F472B6' },
    { x: centerX, y: rainbowY - rainbowR - fh * 0.05, color: '#38BDF8' },
  ];

  stars.forEach((s, idx) => {
    const rot = animTime * 3 + idx;
    const sSize = fw * 0.06;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(rot);
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -sSize);
    ctx.lineTo(sSize * 0.3, -sSize * 0.3);
    ctx.lineTo(sSize, 0);
    ctx.lineTo(sSize * 0.3, sSize * 0.3);
    ctx.lineTo(0, sSize);
    ctx.lineTo(-sSize * 0.3, sSize * 0.3);
    ctx.lineTo(-sSize, 0);
    ctx.lineTo(-sSize * 0.3, -sSize * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// UNIFIED AR FILTER RENDERING DISPATCHER
// ─────────────────────────────────────────────────────────────────

/**
 * Renders the chosen AR filter on any 2D canvas context.
 * Identical execution for Live Preview, Photo Capture export, and Video recording frames.
 */
export function renderArFilterOnCanvas(
  ctx,
  filterId,
  faces,
  canvasWidth,
  canvasHeight,
  facingMode = 'user',
  animTime = performance.now() / 1000
) {
  if (!filterId || filterId === 'none') return;
  if (!faces || faces.length === 0) return; // Only render AR overlays when a face is present

  faces.forEach((face) => {
    // Coordinate mapping taking selfie mirroring into account
    const rawFx = facingMode === 'user' ? (1 - face.x - face.width) * canvasWidth : face.x * canvasWidth;
    const rawFy = face.y * canvasHeight;
    const rawFw = face.width * canvasWidth;
    const rawFh = face.height * canvasHeight;

    // Normalizing face proportions:
    // A natural human face's width is around 0.72 - 0.85 of its height.
    // On widescreen displays (e.g. 16:9 or 21:9), rawFw would stretch features horizontally across the entire screen.
    // We constrain the width to natural facial proportions centered on the detected face.
    const maxNaturalWidth = rawFh * 0.85;
    const fw = Math.min(rawFw, maxNaturalWidth);
    const fh = rawFh;
    const centerX = rawFx + rawFw / 2;
    const centerY = rawFy + rawFh / 2;
    const fx = centerX - fw / 2;
    const fy = rawFy;

    const geom = { centerX, centerY, fx, fy, fw, fh };

    ctx.save();

    switch (filterId) {
      case 'cat':
        drawCuteCat(ctx, geom, animTime);
        break;
      case 'puppy':
        drawPuppy(ctx, geom, animTime);
        break;
      case 'butterflies':
        drawButterflyDream(ctx, geom, animTime);
        break;
      case 'crown':
        drawRoyalCrown(ctx, geom, animTime);
        break;
      case 'angel':
        drawAngelGlow(ctx, geom, animTime);
        break;
      case 'cyber':
        drawCyberFace(ctx, geom, animTime);
        break;
      case 'heart_eyes':
        drawHeartEyes(ctx, geom, animTime);
        break;
      case 'fire_eyes':
        drawFireEyes(ctx, geom, animTime);
        break;
      case 'anime':
        drawAnimeWorld(ctx, geom, animTime);
        break;
      case 'rainbow':
        drawRainbowMagic(ctx, geom, animTime);
        break;
      default:
        break;
    }

    ctx.restore();
  });
}

