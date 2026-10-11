/**
 * Social Safe-Zone Pro - Core Application Logic
 * High-performance HTML5 Canvas rendering for 9:16 vertical video safe zones.
 * TikTok, Instagram Reels, and YouTube Shorts UI overlays & Batch ZIP export.
 */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  const state = {
    images: [],             // Array of { id, name, img, dataUrl }
    currentIndex: 0,        // Active image index
    platform: 'tiktok',     // 'tiktok' | 'reels' | 'shorts'
    mode: 'danger',         // 'danger' | 'mockup' | 'combined' | 'clean'
    dangerOpacity: 0.6,     // 0.1 to 1.0
    mockupOpacity: 1.0,     // 0.1 to 1.0
    showFeedCrop: true,     // Instagram 4:5 Feed guide
    showThirds: false,      // Rule of thirds
    showLabels: true,       // Danger zone text labels
    zoom: 1.0,              // 0.5 to 1.5
    panX: 0,
    panY: 0,
    isExporting: false
  };

  // Canvas Native Resolution (Vertical 9:16 Standard)
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;

  // DOM Elements
  const canvas = document.getElementById('safeZoneCanvas');
  const ctx = canvas.getContext('2d');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const emptyLoadSampleBtn = document.getElementById('emptyLoadSampleBtn');
  const clearQueueBtn = document.getElementById('clearQueueBtn');
  const queueSection = document.getElementById('queueSection');
  const thumbnailStrip = document.getElementById('thumbnailStrip');
  const queueCountBadge = document.getElementById('queueCountBadge');
  const canvasEmptyState = document.getElementById('canvasEmptyState');
  const carouselCounter = document.getElementById('carouselCounter');
  const prevImageBtn = document.getElementById('prevImageBtn');
  const nextImageBtn = document.getElementById('nextImageBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const canvasViewport = document.getElementById('canvasViewport');
  const zoneInspector = document.getElementById('zoneInspector');
  const zoneInspectorText = document.getElementById('zoneInspectorText');
  const stagePlatformBadge = document.getElementById('stagePlatformBadge');

  // Sliders & Toggles
  const dangerOpacitySlider = document.getElementById('dangerOpacity');
  const dangerOpacityVal = document.getElementById('dangerOpacityVal');
  const mockupOpacitySlider = document.getElementById('mockupOpacity');
  const mockupOpacityVal = document.getElementById('mockupOpacityVal');
  const feedCropToggle = document.getElementById('feedCropToggle');
  const thirdsToggle = document.getElementById('thirdsToggle');
  const labelsToggle = document.getElementById('labelsToggle');
  const zoomSlider = document.getElementById('zoomSlider');
  const zoomVal = document.getElementById('zoomVal');
  const resetTransformBtn = document.getElementById('resetTransformBtn');

  // Export & Action Elements
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const downloadSingleBtn = document.getElementById('downloadSingleBtn');
  const copyClipboardBtn = document.getElementById('copyClipboardBtn');
  const zipScopeSelect = document.getElementById('zipScopeSelect');
  const exportModal = document.getElementById('exportModal');
  const exportProgressBar = document.getElementById('exportProgressBar');
  const exportProgressPct = document.getElementById('exportProgressPct');
  const exportProgressCount = document.getElementById('exportProgressCount');
  const exportCurrentFileName = document.getElementById('exportCurrentFileName');
  const exportModalStatus = document.getElementById('exportModalStatus');

  // Modal & Help Elements
  const helpBtn = document.getElementById('helpBtn');
  const cheatSheetModal = document.getElementById('cheatSheetModal');
  const closeCheatSheetBtn = document.getElementById('closeCheatSheetBtn');
  const closeCheatSheetBtn2 = document.getElementById('closeCheatSheetBtn2');

  // --- INITIALIZATION ---
  function init() {
    setupEventListeners();
    
    // Check URL parameters or window.DEFAULT_PLATFORM for deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const platParam = urlParams.get('platform') || window.DEFAULT_PLATFORM;
    if (platParam && ['tiktok', 'reels', 'shorts'].includes(platParam)) {
      setPlatform(platParam);
    }
    const modeParam = urlParams.get('mode') || window.DEFAULT_MODE;
    if (modeParam && ['danger', 'mockup', 'combined', 'clean'].includes(modeParam)) {
      setMode(modeParam);
    }

    loadDemoImage(); // Load default stylish frame so users see instant results
    render();
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // File Upload & Drag-and-Drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileInput);

    // Clipboard Paste Listener (Ctrl+V)
    window.addEventListener('paste', handlePaste);

    // Sample Loader & Queue Clearing
    loadSampleBtn.addEventListener('click', loadDemoImage);
    if (emptyLoadSampleBtn) emptyLoadSampleBtn.addEventListener('click', loadDemoImage);
    clearQueueBtn.addEventListener('click', clearQueue);

    // Platform Selector Buttons
    const platformBtns = document.querySelectorAll('.platform-btn');
    platformBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.getAttribute('data-platform');
        setPlatform(platform);
      });
    });

    // Mode Toggle Buttons
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        setMode(mode);
      });
    });

    // Controls & Sliders
    dangerOpacitySlider.addEventListener('input', (e) => {
      state.dangerOpacity = parseInt(e.target.value) / 100;
      dangerOpacityVal.textContent = `${e.target.value}%`;
      render();
    });

    mockupOpacitySlider.addEventListener('input', (e) => {
      state.mockupOpacity = parseInt(e.target.value) / 100;
      mockupOpacityVal.textContent = `${e.target.value}%`;
      render();
    });

    feedCropToggle.addEventListener('change', (e) => {
      state.showFeedCrop = e.target.checked;
      render();
    });

    thirdsToggle.addEventListener('change', (e) => {
      state.showThirds = e.target.checked;
      render();
    });

    labelsToggle.addEventListener('change', (e) => {
      state.showLabels = e.target.checked;
      render();
    });

    zoomSlider.addEventListener('input', (e) => {
      state.zoom = parseInt(e.target.value) / 100;
      zoomVal.textContent = `${e.target.value}%`;
      render();
    });

    resetTransformBtn.addEventListener('click', () => {
      state.zoom = 1.0;
      state.panX = 0;
      state.panY = 0;
      zoomSlider.value = 100;
      zoomVal.textContent = '100%';
      render();
      showToast('Zoom and position reset', 'info');
    });

    // Carousel Navigation
    prevImageBtn.addEventListener('click', prevImage);
    nextImageBtn.addEventListener('click', nextImage);

    // Fullscreen / Zoom Viewport
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Export Triggers
    downloadZipBtn.addEventListener('click', handleZipExport);
    downloadSingleBtn.addEventListener('click', downloadCurrentFrame);
    copyClipboardBtn.addEventListener('click', copyCanvasToClipboard);

    // Cheat Sheet Modal
    helpBtn.addEventListener('click', () => cheatSheetModal.classList.remove('hidden'));
    closeCheatSheetBtn.addEventListener('click', () => cheatSheetModal.classList.add('hidden'));
    closeCheatSheetBtn2.addEventListener('click', () => cheatSheetModal.classList.add('hidden'));
    cheatSheetModal.addEventListener('click', (e) => {
      if (e.target === cheatSheetModal) cheatSheetModal.classList.add('hidden');
    });

    // Canvas Interactive Hover Inspector
    canvas.addEventListener('mousemove', handleCanvasHover);
    canvas.addEventListener('mouseleave', () => {
      zoneInspector.classList.add('opacity-0');
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeyboardShortcuts);
  }

  // --- KEYBOARD SHORTCUTS ---
  function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === '1') setPlatform('tiktok');
    else if (e.key === '2') setPlatform('reels');
    else if (e.key === '3') setPlatform('shorts');
    else if (e.key === 'ArrowLeft') prevImage();
    else if (e.key === 'ArrowRight') nextImage();
    else if (e.key === 'z' || e.key === 'Z') {
      if (!e.ctrlKey && !e.metaKey) handleZipExport();
    }
  }

  // --- PLATFORM & MODE SWITCHING ---
  function setPlatform(platform) {
    state.platform = platform;
    const platformBtns = document.querySelectorAll('.platform-btn');
    platformBtns.forEach(btn => {
      const isSelected = btn.getAttribute('data-platform') === platform;
      btn.classList.toggle('active', isSelected);
      btn.classList.toggle('border-indigo-500', isSelected);
      const indicator = btn.querySelector('.platform-active-indicator');
      if (indicator) indicator.classList.toggle('hidden', !isSelected);
    });

    // Update Stage Platform Badge
    if (platform === 'tiktok') {
      stagePlatformBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30';
      stagePlatformBadge.innerHTML = '<i class="fa-brands fa-tiktok text-xs"></i><span>TikTok Safe Zone</span>';
      canvasViewport.style.boxShadow = '0 25px 50px -12px rgba(0, 242, 254, 0.25), 0 0 0 1px rgba(0, 242, 254, 0.3)';
    } else if (platform === 'reels') {
      stagePlatformBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-pink-950/80 text-pink-300 border border-pink-500/30';
      stagePlatformBadge.innerHTML = '<i class="fa-brands fa-instagram text-xs"></i><span>Instagram Reels Safe Zone</span>';
      canvasViewport.style.boxShadow = '0 25px 50px -12px rgba(225, 48, 108, 0.25), 0 0 0 1px rgba(225, 48, 108, 0.3)';
    } else {
      stagePlatformBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-500/30';
      stagePlatformBadge.innerHTML = '<i class="fa-brands fa-youtube text-xs"></i><span>YouTube Shorts Safe Zone</span>';
      canvasViewport.style.boxShadow = '0 25px 50px -12px rgba(255, 0, 0, 0.25), 0 0 0 1px rgba(255, 0, 0, 0.3)';
    }

    render();
  }

  function setMode(mode) {
    state.mode = mode;
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      const isSelected = btn.getAttribute('data-mode') === mode;
      btn.classList.toggle('active', isSelected);
      btn.classList.toggle('bg-indigo-600', isSelected);
      btn.classList.toggle('text-white', isSelected);
      btn.classList.toggle('text-slate-400', !isSelected);
    });

    const currentModeLabel = document.getElementById('currentModeLabel');
    const modeNames = {
      danger: 'Danger Zones',
      mockup: 'Native UI Mockup',
      combined: 'Combined View',
      clean: 'Clean Frame'
    };
    if (currentModeLabel) currentModeLabel.textContent = modeNames[mode] || mode;

    render();
  }

  // --- IMAGE MANAGEMENT ---
  function addImages(files) {
    let addedCount = 0;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          state.images.push({
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name.replace(/\.[^/.]+$/, ''),
            img: img,
            dataUrl: e.target.result,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          state.currentIndex = state.images.length - 1;
          updateQueueUI();
          render();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      addedCount++;
    });

    if (addedCount > 0) {
      showToast(`Added ${addedCount} frame${addedCount > 1 ? 's' : ''} to queue`, 'success');
    }
  }

  function clearQueue() {
    state.images = [];
    state.currentIndex = 0;
    updateQueueUI();
    render();
    showToast('Queue cleared', 'info');
  }

  function updateQueueUI() {
    const total = state.images.length;
    queueCountBadge.textContent = `${total} image${total === 1 ? '' : 's'} in queue`;
    carouselCounter.textContent = total > 0 ? `${state.currentIndex + 1} / ${total}` : '0 / 0';

    if (total === 0) {
      queueSection.classList.add('hidden');
      canvasEmptyState.classList.remove('hidden');
      thumbnailStrip.innerHTML = '';
      return;
    }

    queueSection.classList.remove('hidden');
    canvasEmptyState.classList.add('hidden');
    thumbnailStrip.innerHTML = '';

    state.images.forEach((item, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `relative flex-shrink-0 w-14 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
        idx === state.currentIndex ? 'border-indigo-500 ring-2 ring-indigo-500/40 scale-105' : 'border-slate-700/80 hover:border-slate-500 opacity-70 hover:opacity-100'
      }`;
      thumb.innerHTML = `
        <img src="${item.dataUrl}" class="w-full h-full object-cover">
        <span class="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-center text-white py-0.5 font-mono truncate px-1">${idx + 1}</span>
        <button data-remove-index="${idx}" class="absolute top-1 right-1 w-4 h-4 rounded bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center text-[9px] opacity-0 hover:opacity-100 transition-opacity">
          &times;
        </button>
      `;

      thumb.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove-index]');
        if (removeBtn) {
          e.stopPropagation();
          removeImageAt(parseInt(removeBtn.getAttribute('data-remove-index')));
          return;
        }
        state.currentIndex = idx;
        updateQueueUI();
        render();
      });

      thumbnailStrip.appendChild(thumb);
    });
  }

  function removeImageAt(index) {
    if (index >= 0 && index < state.images.length) {
      state.images.splice(index, 1);
      if (state.currentIndex >= state.images.length) {
        state.currentIndex = Math.max(0, state.images.length - 1);
      }
      updateQueueUI();
      render();
      showToast('Frame removed', 'info');
    }
  }

  function prevImage() {
    if (state.images.length <= 1) return;
    state.currentIndex = (state.currentIndex - 1 + state.images.length) % state.images.length;
    updateQueueUI();
    render();
  }

  function nextImage() {
    if (state.images.length <= 1) return;
    state.currentIndex = (state.currentIndex + 1) % state.images.length;
    updateQueueUI();
    render();
  }

  // --- DRAG AND DROP & CLIPBOARD ---
  function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dropzone-active');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dropzone-active');
  }

  function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dropzone-active');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files);
    }
  }

  function handleFileInput(e) {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files);
      fileInput.value = ''; // reset so same files can be re-added if desired
    }
  }

  function handlePaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      addImages(imageFiles);
      showToast('Pasted image from clipboard!', 'success');
    }
  }

  // --- GENERATE PROCEDURAL DEMO FRAME ---
  function loadDemoImage() {
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = CANVAS_WIDTH;
    demoCanvas.height = CANVAS_HEIGHT;
    const dCtx = demoCanvas.getContext('2d');

    // Rich Dark Gradient Backdrop
    const bgGrad = dCtx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.35, '#1e1b4b');
    bgGrad.addColorStop(0.7, '#311042');
    bgGrad.addColorStop(1, '#090d16');
    dCtx.fillStyle = bgGrad;
    dCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle Grid pattern
    dCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    dCtx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 60) {
      dCtx.beginPath();
      dCtx.moveTo(x, 0);
      dCtx.lineTo(x, CANVAS_HEIGHT);
      dCtx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 60) {
      dCtx.beginPath();
      dCtx.moveTo(0, y);
      dCtx.lineTo(CANVAS_WIDTH, y);
      dCtx.stroke();
    }

    // Glowing Neon Orbs in background
    const drawOrb = (cx, cy, r, color) => {
      const g = dCtx.createRadialGradient(cx, cy, 10, cx, cy, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      dCtx.fillStyle = g;
      dCtx.beginPath();
      dCtx.arc(cx, cy, r, 0, Math.PI * 2);
      dCtx.fill();
    };
    drawOrb(300, 500, 320, 'rgba(99, 102, 241, 0.35)');
    drawOrb(800, 1100, 360, 'rgba(236, 72, 153, 0.3)');
    drawOrb(400, 1500, 340, 'rgba(6, 182, 212, 0.25)');

    // Stylized Silhouette / Central Creative Subject
    dCtx.save();
    dCtx.fillStyle = '#ffffff';
    dCtx.shadowColor = 'rgba(99, 102, 241, 0.8)';
    dCtx.shadowBlur = 40;

    // Center Hero Card
    const cardX = 140, cardY = 620, cardW = 800, cardH = 580;
    dCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    dCtx.beginPath();
    dCtx.roundRect(cardX, cardY, cardW, cardH, 36);
    dCtx.fill();
    dCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    dCtx.lineWidth = 3;
    dCtx.stroke();

    // Subject Icon / Graphic
    dCtx.fillStyle = '#6366f1';
    dCtx.beginPath();
    dCtx.arc(540, 780, 70, 0, Math.PI * 2);
    dCtx.fill();

    // Camera play icon
    dCtx.fillStyle = '#ffffff';
    dCtx.beginPath();
    dCtx.moveTo(525, 750);
    dCtx.lineTo(565, 780);
    dCtx.lineTo(525, 810);
    dCtx.closePath();
    dCtx.fill();

    // Text Content inside Hero Card
    dCtx.textAlign = 'center';
    dCtx.fillStyle = '#ffffff';
    dCtx.font = '800 48px "Plus Jakarta Sans", sans-serif';
    dCtx.fillText('PRIMARY VIDEO HOOK', 540, 920);

    dCtx.font = '500 28px "Plus Jakarta Sans", sans-serif';
    dCtx.fillStyle = '#cbd5e1';
    dCtx.fillText('Place key titles & text in this center area', 540, 975);

    dCtx.font = '600 24px "JetBrains Mono", monospace';
    dCtx.fillStyle = '#34d399';
    dCtx.fillText('✓ 100% VISIBLE ON ALL PLATFORMS', 540, 1040);

    dCtx.restore();

    // Subtitle Callout Box
    dCtx.save();
    dCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    dCtx.beginPath();
    dCtx.roundRect(220, 1260, 640, 90, 20);
    dCtx.fill();
    dCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    dCtx.lineWidth = 1.5;
    dCtx.stroke();

    dCtx.textAlign = 'center';
    dCtx.font = '700 28px "Plus Jakarta Sans", sans-serif';
    dCtx.fillStyle = '#fde047';
    dCtx.fillText('⚡ SUBTITLES STAY SAFE HERE', 540, 1315);
    dCtx.restore();

    // Convert to Image and push to state
    const img = new Image();
    img.onload = () => {
      state.images.push({
        id: 'demo_' + Date.now(),
        name: 'sample_9x16_frame',
        img: img,
        dataUrl: demoCanvas.toDataURL('image/png'),
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
      });
      state.currentIndex = state.images.length - 1;
      updateQueueUI();
      render();
      showToast('Loaded demo 9:16 frame', 'success');
    };
    img.src = demoCanvas.toDataURL('image/png');
  }

  // --- RENDERING PIPELINE ---
  function render(targetCtx = ctx, targetPlatform = state.platform, targetMode = state.mode) {
    // Clear canvas
    targetCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Active Image (or fallback dark background)
    if (state.images.length > 0 && state.images[state.currentIndex]) {
      const activeItem = state.images[state.currentIndex];
      drawImageCover(targetCtx, activeItem.img, state.zoom, state.panX, state.panY);
    } else {
      // Sleek placeholder dark background
      targetCtx.fillStyle = '#090d16';
      targetCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 2. Draw 4:5 Feed Safe Crop Guides (if enabled or if Instagram Reels)
    if (state.showFeedCrop && (targetPlatform === 'reels' || state.showFeedCrop)) {
      drawFeedCropGuide(targetCtx);
    }

    // 3. Draw Rule of Thirds (if enabled)
    if (state.showThirds) {
      drawRuleOfThirds(targetCtx);
    }

    // 4. Draw Danger Zones (if enabled by mode)
    if (targetMode === 'danger' || targetMode === 'combined') {
      drawPlatformDangerZones(targetCtx, targetPlatform, state.dangerOpacity, state.showLabels);
    }

    // 5. Draw Realistic UI Mockup (if enabled by mode)
    if (targetMode === 'mockup' || targetMode === 'combined') {
      drawPlatformMockup(targetCtx, targetPlatform, state.mockupOpacity);
    }
  }

  // Image Cover Scaling
  function drawImageCover(c, img, zoom, panX, panY) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let renderW, renderH, renderX, renderY;

    if (imgRatio > canvasRatio) {
      renderH = CANVAS_HEIGHT * zoom;
      renderW = renderH * imgRatio;
    } else {
      renderW = CANVAS_WIDTH * zoom;
      renderH = renderW / imgRatio;
    }

    renderX = (CANVAS_WIDTH - renderW) / 2 + panX;
    renderY = (CANVAS_HEIGHT - renderH) / 2 + panY;

    c.drawImage(img, renderX, renderY, renderW, renderH);
  }

  // 4:5 Instagram Feed Safe Crop Guide
  // Instagram 9:16 reels are cropped to 4:5 (1080 x 1350) in explore/profile feed
  function drawFeedCropGuide(c) {
    const cropH = 1350;
    const topCrop = (CANVAS_HEIGHT - cropH) / 2; // 285px
    const bottomCrop = topCrop + cropH;          // 1635px

    c.save();
    // Darkened shaded bars for cropped regions
    c.fillStyle = 'rgba(0, 0, 0, 0.25)';
    c.fillRect(0, 0, CANVAS_WIDTH, topCrop);
    c.fillRect(0, bottomCrop, CANVAS_WIDTH, CANVAS_HEIGHT - bottomCrop);

    // Amber crop lines
    c.strokeStyle = '#f59e0b';
    c.lineWidth = 3;
    c.setLineDash([16, 12]);

    // Top crop line
    c.beginPath();
    c.moveTo(0, topCrop);
    c.lineTo(CANVAS_WIDTH, topCrop);
    c.stroke();

    // Bottom crop line
    c.beginPath();
    c.moveTo(0, bottomCrop);
    c.lineTo(CANVAS_WIDTH, bottomCrop);
    c.stroke();

    c.setLineDash([]);

    // Crop Badges
    if (state.showLabels) {
      drawPillBadge(c, 40, topCrop - 18, '4:5 FEED CROP (TOP - 285px)', '#f59e0b', '#000000');
      drawPillBadge(c, 40, bottomCrop + 10, '4:5 FEED CROP (BOTTOM - 1635px)', '#f59e0b', '#000000');
    }

    c.restore();
  }

  // Rule of Thirds Guide
  function drawRuleOfThirds(c) {
    c.save();
    c.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    c.lineWidth = 1.5;
    c.setLineDash([8, 8]);

    // Vertical lines (360, 720)
    c.beginPath();
    c.moveTo(CANVAS_WIDTH / 3, 0);
    c.lineTo(CANVAS_WIDTH / 3, CANVAS_HEIGHT);
    c.moveTo((CANVAS_WIDTH * 2) / 3, 0);
    c.lineTo((CANVAS_WIDTH * 2) / 3, CANVAS_HEIGHT);

    // Horizontal lines (640, 1280)
    c.moveTo(0, CANVAS_HEIGHT / 3);
    c.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 3);
    c.moveTo(0, (CANVAS_HEIGHT * 2) / 3);
    c.lineTo(CANVAS_WIDTH, (CANVAS_HEIGHT * 2) / 3);
    c.stroke();

    c.setLineDash([]);
    c.restore();
  }

  // Helper: Draw Pill Badge
  function drawPillBadge(c, x, y, text, bgColor = '#ef4444', textColor = '#ffffff') {
    c.save();
    c.font = '700 16px "JetBrains Mono", monospace';
    const metrics = c.measureText(text);
    const padX = 14;
    const padY = 8;
    const w = metrics.width + padX * 2;
    const h = 30;

    c.fillStyle = bgColor;
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();

    c.fillStyle = textColor;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, x + padX, y + h / 2);
    c.restore();
  }

  // Helper: Draw Danger Box with Red Tint and Glowing Dashed Stroke
  function drawDangerBox(c, x, y, w, h, label, opacity, showLabels = true) {
    c.save();
    // Semi-transparent red fill
    c.fillStyle = `rgba(239, 68, 68, ${opacity * 0.45})`;
    c.fillRect(x, y, w, h);

    // Dashed border
    c.strokeStyle = `rgba(248, 113, 113, ${opacity * 0.9})`;
    c.lineWidth = 2.5;
    c.setLineDash([10, 8]);
    c.strokeRect(x, y, w, h);
    c.setLineDash([]);

    // Diagonal hazard stripe accent in corners
    c.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.15})`;
    c.lineWidth = 2;
    for (let i = 0; i < Math.min(w, h, 60); i += 12) {
      c.beginPath();
      c.moveTo(x + i, y);
      c.lineTo(x, y + i);
      c.stroke();
    }

    if (showLabels && label) {
      drawPillBadge(c, x + 16, y + 16, label, `rgba(220, 38, 38, ${Math.max(0.7, opacity)})`, '#ffffff');
    }

    c.restore();
  }

  // --- DANGER ZONES DEFINITION & RENDERING ---
  function drawPlatformDangerZones(c, platform, opacity, showLabels) {
    c.save();

    if (platform === 'tiktok') {
      // 1. TikTok Top Header: 0 to 210px
      drawDangerBox(c, 0, 0, CANVAS_WIDTH, 210, '⚠️ TIKTOK HEADER (0 - 210px)', opacity, showLabels);

      // 2. TikTok Right Action Bar: x: 890 to 1080 (w: 190), y: 840 to 1740
      drawDangerBox(c, 890, 840, 190, 900, '⚠️ ACTIONS (w: 190px)', opacity, showLabels);

      // 3. TikTok Bottom Captions & Audio: x: 20 to 880, y: 1470 to 1780
      drawDangerBox(c, 20, 1470, 860, 310, '⚠️ CAPTION & AUDIO (h: 310px)', opacity, showLabels);

      // 4. TikTok Bottom Navigation: 1780 to 1920 (h: 140px)
      drawDangerBox(c, 0, 1780, CANVAS_WIDTH, 140, '⚠️ BOTTOM NAV & SEEKER (140px)', opacity, showLabels);

      // Draw Guaranteed Safe Zone outline (Green)
      drawSafeZoneOutline(c, 40, 230, 840, 1220, 'GUARANTEED TIKTOK SAFE ZONE');

    } else if (platform === 'reels') {
      // 1. Instagram Reels Top Header: 0 to 180px
      drawDangerBox(c, 0, 0, CANVAS_WIDTH, 180, '⚠️ REELS TOP BAR (0 - 180px)', opacity, showLabels);

      // 2. Reels Right Action Column: x: 910 to 1080, y: 1040 to 1740
      drawDangerBox(c, 910, 1040, 170, 700, '⚠️ ACTIONS (w: 170px)', opacity, showLabels);

      // 3. Reels Bottom Profile & Audio: x: 20 to 890, y: 1460 to 1780
      drawDangerBox(c, 20, 1460, 880, 320, '⚠️ PROFILE, CAPTION & AUDIO (320px)', opacity, showLabels);

      // 4. Reels Bottom Navigation: 1780 to 1920
      drawDangerBox(c, 0, 1780, CANVAS_WIDTH, 140, '⚠️ INSTAGRAM TAB BAR (140px)', opacity, showLabels);

      // Draw Guaranteed Safe Zone outline (Green)
      drawSafeZoneOutline(c, 40, 200, 860, 1240, 'GUARANTEED REELS SAFE ZONE');

    } else if (platform === 'shorts') {
      // 1. YouTube Shorts Top Header: 0 to 180px
      drawDangerBox(c, 0, 0, CANVAS_WIDTH, 180, '⚠️ SHORTS HEADER (0 - 180px)', opacity, showLabels);

      // 2. Shorts Right Action Bar: x: 890 to 1080, y: 840 to 1720
      drawDangerBox(c, 890, 840, 190, 880, '⚠️ SHORTS ACTIONS (w: 190px)', opacity, showLabels);

      // 3. Shorts Bottom Channel & Title: x: 20 to 880, y: 1480 to 1780
      drawDangerBox(c, 20, 1480, 860, 300, '⚠️ CHANNEL & TITLE (300px)', opacity, showLabels);

      // 4. Shorts Bottom Navigation & Scrubber: 1780 to 1920
      drawDangerBox(c, 0, 1780, CANVAS_WIDTH, 140, '⚠️ SCRUBBER & NAV (140px)', opacity, showLabels);

      // Draw Guaranteed Safe Zone outline (Green)
      drawSafeZoneOutline(c, 40, 200, 840, 1260, 'GUARANTEED SHORTS SAFE ZONE');
    }

    c.restore();
  }

  // Draw Green Guaranteed Safe Zone
  function drawSafeZoneOutline(c, x, y, w, h, label) {
    c.save();
    c.strokeStyle = '#10b981';
    c.lineWidth = 3;
    c.setLineDash([12, 8]);
    c.strokeRect(x, y, w, h);
    c.setLineDash([]);

    if (state.showLabels) {
      drawPillBadge(c, x + 16, y + h - 42, `✓ ${label}`, '#10b981', '#064e3b');
    }
    c.restore();
  }

  // --- NATIVE REALISTIC UI MOCKUPS RENDERING (VECTOR CANVAS) ---
  function drawPlatformMockup(c, platform, opacity) {
    c.save();
    c.globalAlpha = opacity;

    if (platform === 'tiktok') {
      renderTikTokMockup(c);
    } else if (platform === 'reels') {
      renderReelsMockup(c);
    } else if (platform === 'shorts') {
      renderShortsMockup(c);
    }

    c.restore();
  }

  // 1. TIKTOK NATIVE UI MOCKUP
  function renderTikTokMockup(c) {
    // TOP HEADER
    c.save();
    // Gradient overlay behind top
    const topGrad = c.createLinearGradient(0, 0, 0, 240);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    topGrad.addColorStop(1, 'transparent');
    c.fillStyle = topGrad;
    c.fillRect(0, 0, CANVAS_WIDTH, 240);

    // LIVE icon on left
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.strokeRect(60, 90, 48, 36);
    c.fillStyle = '#fe2c55';
    c.beginPath();
    c.arc(84, 108, 6, 0, Math.PI * 2);
    c.fill();

    // Center Tabs: "Friends" | "Following" | "For You"
    c.textAlign = 'center';
    c.font = '600 34px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = 'rgba(255, 255, 255, 0.6)';
    c.fillText('Friends', 340, 118);
    c.fillText('Following', 460, 118);

    c.fillStyle = '#ffffff';
    c.font = '800 38px "Plus Jakarta Sans", sans-serif';
    c.fillText('For You', 600, 118);

    // Active Tab white underline bar
    c.fillStyle = '#ffffff';
    c.fillRect(575, 140, 50, 6);

    // Search Icon on right
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(990, 110, 16, 0, Math.PI * 2);
    c.moveTo(1002, 122);
    c.lineTo(1020, 140);
    c.stroke();
    c.restore();

    // RIGHT SIDE ACTION BAR
    const actionX = 990;
    let currY = 920;

    // Profile Avatar with Red '+' badge
    c.save();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(actionX, currY, 52, 0, Math.PI * 2);
    c.fill();

    const avatarGrad = c.createLinearGradient(actionX - 48, currY - 48, actionX + 48, currY + 48);
    avatarGrad.addColorStop(0, '#6366f1');
    avatarGrad.addColorStop(1, '#ec4899');
    c.fillStyle = avatarGrad;
    c.beginPath();
    c.arc(actionX, currY, 48, 0, Math.PI * 2);
    c.fill();

    // Red Plus Badge
    c.fillStyle = '#fe2c55';
    c.beginPath();
    c.arc(actionX, currY + 48, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = '900 24px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('+', actionX, currY + 48);
    c.restore();

    currY += 130;

    // Like Heart
    drawVectorHeart(c, actionX, currY, 36, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '342.8K');

    currY += 130;

    // Comment Bubble
    drawVectorComment(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '4,812');

    currY += 130;

    // Bookmark / Favorite Ribbon
    drawVectorBookmark(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '28.9K');

    currY += 130;

    // Share Arrow
    drawVectorShare(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '12.4K');

    currY += 130;

    // Spinning Vinyl Record
    c.save();
    c.fillStyle = '#1e1e1e';
    c.beginPath();
    c.arc(actionX, currY, 46, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#333333';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(actionX, currY, 34, 0, Math.PI * 2);
    c.arc(actionX, currY, 22, 0, Math.PI * 2);
    c.stroke();
    // Center music cover thumbnail
    c.fillStyle = '#00f2fe';
    c.beginPath();
    c.arc(actionX, currY, 15, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // BOTTOM METADATA (Creator, Caption, Audio Ticker)
    c.save();
    // Dark gradient behind bottom
    const bottomGrad = c.createLinearGradient(0, 1380, 0, CANVAS_HEIGHT);
    bottomGrad.addColorStop(0, 'transparent');
    bottomGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.75)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    c.fillStyle = bottomGrad;
    c.fillRect(0, 1380, CANVAS_WIDTH, CANVAS_HEIGHT - 1380);

    // Creator Handle & Verified badge
    c.textAlign = 'left';
    c.font = '700 32px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('@creative_editor', 50, 1520);

    // Verified badge
    c.fillStyle = '#20d5ec';
    c.beginPath();
    c.arc(330, 1510, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#000000';
    c.font = '900 14px sans-serif';
    c.textAlign = 'center';
    c.fillText('✓', 330, 1515);

    // Caption lines
    c.textAlign = 'left';
    c.font = '500 27px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#f1f5f9';
    c.fillText('Essential 9:16 safe zone overlay test for video editors! 🚀', 50, 1575);
    c.fillStyle = '#cbd5e1';
    c.fillText('Keep hooks inside safe zones #viral #videoediting #reels', 50, 1620);

    // Music ticker
    c.font = '600 25px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('🎵  Original Sound - Trending Sound 2026 (Official)', 50, 1675);
    c.restore();

    // BOTTOM NAVIGATION BAR
    c.save();
    // Video scrubber line
    c.fillStyle = 'rgba(255, 255, 255, 0.3)';
    c.fillRect(0, 1780, CANVAS_WIDTH, 4);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 1780, 360, 4);
    c.beginPath();
    c.arc(360, 1782, 6, 0, Math.PI * 2);
    c.fill();

    // Tab Bar
    const tabY = 1850;
    c.font = '600 24px "Plus Jakarta Sans", sans-serif';
    c.textAlign = 'center';

    c.fillStyle = '#ffffff';
    c.fillText('Home', 110, tabY);

    c.fillStyle = 'rgba(255, 255, 255, 0.6)';
    c.fillText('Friends', 300, tabY);

    // Iconic TikTok [+] Button
    const plusX = 540;
    c.fillStyle = '#00f2fe';
    c.beginPath();
    c.roundRect(plusX - 44, tabY - 32, 70, 44, 12);
    c.fill();
    c.fillStyle = '#fe2c55';
    c.beginPath();
    c.roundRect(plusX - 26, tabY - 32, 70, 44, 12);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(plusX - 35, tabY - 32, 70, 44, 12);
    c.fill();
    c.fillStyle = '#000000';
    c.font = '900 30px sans-serif';
    c.fillText('+', plusX, tabY - 2);

    c.font = '600 24px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = 'rgba(255, 255, 255, 0.6)';
    c.fillText('Inbox', 780, tabY);
    c.fillText('Profile', 970, tabY);

    c.restore();
  }

  // 2. INSTAGRAM REELS NATIVE UI MOCKUP
  function renderReelsMockup(c) {
    // TOP HEADER
    c.save();
    const topGrad = c.createLinearGradient(0, 0, 0, 220);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    topGrad.addColorStop(1, 'transparent');
    c.fillStyle = topGrad;
    c.fillRect(0, 0, CANVAS_WIDTH, 220);

    // "Reels" Header with dropdown chevron
    c.textAlign = 'left';
    c.font = '800 42px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('Reels', 50, 115);
    c.font = '700 26px sans-serif';
    c.fillText('▾', 170, 110);

    // Camera icon on right
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(980, 85, 46, 36, 8);
    c.stroke();
    c.beginPath();
    c.arc(1003, 103, 10, 0, Math.PI * 2);
    c.stroke();
    c.restore();

    // RIGHT SIDE ACTION BAR
    const actionX = 990;
    let currY = 1120;

    // Heart Like
    drawVectorHeart(c, actionX, currY, 36, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '120K');

    currY += 135;

    // Comment
    drawVectorComment(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '2,490');

    currY += 135;

    // Paper Airplane / Share DM
    drawVectorAirplane(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '18.1K');

    currY += 125;

    // Three dots
    c.save();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(actionX, currY - 14, 5, 0, Math.PI * 2);
    c.arc(actionX, currY, 5, 0, Math.PI * 2);
    c.arc(actionX, currY + 14, 5, 0, Math.PI * 2);
    c.fill();
    c.restore();

    currY += 105;

    // Square Audio thumbnail
    c.save();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(actionX - 22, currY - 22, 44, 44, 10);
    c.stroke();
    c.fillStyle = 'rgba(255, 255, 255, 0.2)';
    c.fill();
    // Sound waves
    c.fillStyle = '#ffffff';
    c.fillRect(actionX - 10, currY - 8, 4, 16);
    c.fillRect(actionX - 2, currY - 14, 4, 28);
    c.fillRect(actionX + 6, currY - 6, 4, 12);
    c.restore();

    // BOTTOM METADATA
    c.save();
    const bottomGrad = c.createLinearGradient(0, 1380, 0, CANVAS_HEIGHT);
    bottomGrad.addColorStop(0, 'transparent');
    bottomGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    c.fillStyle = bottomGrad;
    c.fillRect(0, 1380, CANVAS_WIDTH, CANVAS_HEIGHT - 1380);

    // Profile Avatar
    const avaGrad = c.createLinearGradient(50, 1490, 110, 1550);
    avaGrad.addColorStop(0, '#f09433');
    avaGrad.addColorStop(0.5, '#e6683c');
    avaGrad.addColorStop(1, '#bc1888');
    c.fillStyle = avaGrad;
    c.beginPath();
    c.arc(80, 1520, 30, 0, Math.PI * 2);
    c.fill();

    // Username
    c.textAlign = 'left';
    c.font = '700 29px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('studio_motion', 130, 1530);

    // Follow Button Pill
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(360, 1506, 110, 36, 10);
    c.stroke();
    c.textAlign = 'center';
    c.font = '600 20px "Plus Jakarta Sans", sans-serif';
    c.fillText('Follow', 415, 1530);

    // Caption
    c.textAlign = 'left';
    c.font = '500 26px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#f1f5f9';
    c.fillText('Test your 9:16 vertical edits with Social Safe-Zone Pro!', 50, 1585);
    c.fillStyle = '#cbd5e1';
    c.fillText('Avoid getting your hooks cropped in feed... more', 50, 1628);

    // Audio Pill
    c.fillStyle = 'rgba(255, 255, 255, 0.2)';
    c.beginPath();
    c.roundRect(50, 1665, 420, 46, 23);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = '600 22px "Plus Jakarta Sans", sans-serif';
    c.fillText('🎵  Original Audio • studio_motion', 75, 1696);
    c.restore();

    // BOTTOM TAB BAR
    c.save();
    c.fillStyle = 'rgba(0, 0, 0, 0.9)';
    c.fillRect(0, 1780, CANVAS_WIDTH, 140);

    // 5 Tab Icons: Home, Search, Post, Reels, Profile
    const navY = 1850;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3.5;

    // Home
    c.beginPath();
    c.moveTo(110, navY - 20);
    c.lineTo(85, navY + 4);
    c.lineTo(135, navY + 4);
    c.closePath();
    c.stroke();

    // Search
    c.beginPath();
    c.arc(330, navY - 6, 12, 0, Math.PI * 2);
    c.moveTo(339, navY + 3);
    c.lineTo(348, navY + 12);
    c.stroke();

    // New Post (+)
    c.strokeRect(520, navY - 18, 36, 36);
    c.beginPath();
    c.moveTo(538, navY - 10);
    c.lineTo(538, navY + 10);
    c.moveTo(528, navY);
    c.lineTo(548, navY);
    c.stroke();

    // Reels (Active Icon)
    c.strokeRect(730, navY - 18, 38, 36);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(745, navY - 8);
    c.lineTo(757, navY);
    c.lineTo(745, navY + 8);
    c.closePath();
    c.fill();

    // Profile Avatar
    c.beginPath();
    c.arc(950, navY, 16, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // 3. YOUTUBE SHORTS NATIVE UI MOCKUP
  function renderShortsMockup(c) {
    // TOP HEADER
    c.save();
    const topGrad = c.createLinearGradient(0, 0, 0, 220);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    topGrad.addColorStop(1, 'transparent');
    c.fillStyle = topGrad;
    c.fillRect(0, 0, CANVAS_WIDTH, 220);

    // Search magnifying glass on right
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(880, 105, 14, 0, Math.PI * 2);
    c.moveTo(890, 115);
    c.lineTo(904, 129);
    c.stroke();

    // Camera icon
    c.roundRect(936, 88, 42, 34, 6);
    c.stroke();

    // Three dots
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(1020, 94, 4, 0, Math.PI * 2);
    c.arc(1020, 105, 4, 0, Math.PI * 2);
    c.arc(1020, 116, 4, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // RIGHT SIDE ACTION BAR
    const actionX = 990;
    let currY = 920;

    // Thumbs Up (Like)
    drawVectorThumbsUp(c, actionX, currY, 36, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '190K');

    currY += 135;

    // Thumbs Down (Dislike)
    drawVectorThumbsDown(c, actionX, currY, 36, '#ffffff');
    drawActionCount(c, actionX, currY + 50, 'Dislike');

    currY += 135;

    // Comment
    drawVectorComment(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, '3,210');

    currY += 135;

    // Share Curved Arrow
    drawVectorShare(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, 'Share');

    currY += 135;

    // Remix Icon
    drawVectorRemix(c, actionX, currY, 34, '#ffffff');
    drawActionCount(c, actionX, currY + 50, 'Remix');

    currY += 130;

    // Sound Square
    c.save();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.roundRect(actionX - 22, currY - 22, 44, 44, 8);
    c.stroke();
    c.fillStyle = '#ff0000';
    c.beginPath();
    c.arc(actionX, currY, 10, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // BOTTOM METADATA
    c.save();
    const bottomGrad = c.createLinearGradient(0, 1380, 0, CANVAS_HEIGHT);
    bottomGrad.addColorStop(0, 'transparent');
    bottomGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.75)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    c.fillStyle = bottomGrad;
    c.fillRect(0, 1380, CANVAS_WIDTH, CANVAS_HEIGHT - 1380);

    // Channel Avatar
    c.fillStyle = '#ff0000';
    c.beginPath();
    c.arc(80, 1515, 30, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = '800 24px sans-serif';
    c.textAlign = 'center';
    c.fillText('YT', 80, 1523);

    // Channel Title
    c.textAlign = 'left';
    c.font = '700 30px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('@CreatorHub', 130, 1525);

    // Subscribe Button (Red Pill)
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(380, 1500, 150, 42, 21);
    c.fill();
    c.fillStyle = '#0f0f0f';
    c.font = '700 22px "Plus Jakarta Sans", sans-serif';
    c.textAlign = 'center';
    c.fillText('Subscribe', 455, 1528);

    // Video Title
    c.textAlign = 'left';
    c.font = '600 28px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('Ultimate Safe Zone Overlay for YouTube Shorts 2026 🔥', 50, 1585);
    c.fillStyle = '#cbd5e1';
    c.font = '500 24px "Plus Jakarta Sans", sans-serif';
    c.fillText('Keep key elements clear of right action buttons and title', 50, 1630);

    // Audio Track
    c.font = '600 24px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.fillText('🎵  Original Sound - CreatorHub Audio', 50, 1680);
    c.restore();

    // BOTTOM PROGRESS SCRUBBER & SHORTS TAB
    c.save();
    // Red scrubber
    c.fillStyle = '#ff0000';
    c.fillRect(0, 1780, 420, 5);
    c.fillStyle = 'rgba(255, 255, 255, 0.2)';
    c.fillRect(420, 1780, CANVAS_WIDTH - 420, 5);

    // Bottom Navigation
    c.fillStyle = '#0f0f0f';
    c.fillRect(0, 1785, CANVAS_WIDTH, 135);

    const tabY = 1860;
    c.textAlign = 'center';
    c.font = '600 22px "Plus Jakarta Sans", sans-serif';

    c.fillStyle = 'rgba(255, 255, 255, 0.7)';
    c.fillText('Home', 110, tabY);

    // Active Shorts icon with red accent
    c.fillStyle = '#ffffff';
    c.font = '800 24px "Plus Jakarta Sans", sans-serif';
    c.fillText('Shorts', 320, tabY);
    c.fillStyle = '#ff0000';
    c.beginPath();
    c.arc(320, tabY - 32, 14, 0, Math.PI * 2);
    c.fill();

    // (+) Create
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(540, tabY - 14, 22, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.font = '700 28px sans-serif';
    c.fillText('+', 540, tabY - 6);

    c.font = '600 22px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = 'rgba(255, 255, 255, 0.7)';
    c.fillText('Subscriptions', 770, tabY);
    c.fillText('You', 970, tabY);

    c.restore();
  }

  // --- VECTOR DRAWING PRIMITIVES FOR HIGH-DPI CANVAS ---
  function drawActionCount(c, x, y, text) {
    c.save();
    c.textAlign = 'center';
    c.font = '700 22px "Plus Jakarta Sans", sans-serif';
    c.fillStyle = '#ffffff';
    c.shadowColor = 'rgba(0, 0, 0, 0.9)';
    c.shadowBlur = 6;
    c.fillText(text, x, y);
    c.restore();
  }

  function drawVectorHeart(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    const topCurveHeight = size * 0.3;
    c.moveTo(x, y + size * 0.3);
    c.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    c.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
    c.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    c.bezierCurveTo(x + size / 2, y, x, y, x, y + size * 0.3);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawVectorComment(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(x - size / 2, y - size / 2, size, size * 0.8, 12);
    c.fill();
    // Speech triangle tail
    c.beginPath();
    c.moveTo(x - size * 0.2, y + size * 0.3);
    c.lineTo(x - size * 0.45, y + size * 0.65);
    c.lineTo(x, y + size * 0.3);
    c.closePath();
    c.fill();
    // 3 inner dots
    c.fillStyle = '#000000';
    c.beginPath();
    c.arc(x - 9, y - 4, 3, 0, Math.PI * 2);
    c.arc(x, y - 4, 3, 0, Math.PI * 2);
    c.arc(x + 9, y - 4, 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawVectorBookmark(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(x - size * 0.4, y - size * 0.5);
    c.lineTo(x + size * 0.4, y - size * 0.5);
    c.lineTo(x + size * 0.4, y + size * 0.55);
    c.lineTo(x, y + size * 0.2);
    c.lineTo(x - size * 0.4, y + size * 0.55);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawVectorShare(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(x, y - size * 0.45);
    c.lineTo(x + size * 0.5, y - size * 0.05);
    c.lineTo(x + size * 0.18, y - size * 0.05);
    c.lineTo(x + size * 0.18, y + size * 0.45);
    c.lineTo(x - size * 0.1, y + size * 0.45);
    c.lineTo(x - size * 0.1, y + size * 0.1);
    c.quadraticCurveTo(x - size * 0.4, y + size * 0.35, x - size * 0.5, y + size * 0.45);
    c.quadraticCurveTo(x - size * 0.35, y - size * 0.05, x + size * 0.18, y - size * 0.05);
    c.lineTo(x + size * 0.18, y - size * 0.45);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawVectorAirplane(c, x, y, size, color) {
    c.save();
    c.strokeStyle = color;
    c.lineWidth = 3.5;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(x - size * 0.45, y);
    c.lineTo(x + size * 0.45, y - size * 0.45);
    c.lineTo(x, y + size * 0.45);
    c.lineTo(x - size * 0.1, y + size * 0.05);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(x - size * 0.1, y + size * 0.05);
    c.lineTo(x + size * 0.45, y - size * 0.45);
    c.stroke();
    c.restore();
  }

  function drawVectorThumbsUp(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(x - size * 0.4, y - size * 0.1, size * 0.7, size * 0.5, 6);
    c.fill();
    // Thumb
    c.beginPath();
    c.moveTo(x - size * 0.2, y - size * 0.1);
    c.lineTo(x - size * 0.3, y - size * 0.45);
    c.lineTo(x - size * 0.05, y - size * 0.45);
    c.lineTo(x + size * 0.05, y - size * 0.1);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawVectorThumbsDown(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(x - size * 0.4, y - size * 0.4, size * 0.7, size * 0.5, 6);
    c.fill();
    // Thumb pointing down
    c.beginPath();
    c.moveTo(x - size * 0.2, y + size * 0.1);
    c.lineTo(x - size * 0.3, y + size * 0.45);
    c.lineTo(x - size * 0.05, y + size * 0.45);
    c.lineTo(x + size * 0.05, y + size * 0.1);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawVectorRemix(c, x, y, size, color) {
    c.save();
    c.strokeStyle = color;
    c.lineWidth = 3.5;
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 8;
    // Circular arrows
    c.beginPath();
    c.arc(x, y, size * 0.4, 0.2, Math.PI - 0.2);
    c.stroke();
    c.beginPath();
    c.arc(x, y, size * 0.4, Math.PI + 0.2, Math.PI * 2 - 0.2);
    c.stroke();
    c.restore();
  }

  // --- INTERACTIVE HOVER COORDINATE & ZONE INSPECTOR ---
  function handleCanvasHover(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const mouseX = Math.round((e.clientX - rect.left) * scaleX);
    const mouseY = Math.round((e.clientY - rect.top) * scaleY);

    let zoneName = 'Guaranteed Safe Zone (100% Visible)';
    let zoneClass = 'text-emerald-400';

    if (state.platform === 'tiktok') {
      if (mouseY <= 210) {
        zoneName = 'TikTok Header Danger (LIVE / Search)';
        zoneClass = 'text-rose-400';
      } else if (mouseY >= 1780) {
        zoneName = 'TikTok Bottom Nav Bar Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseX >= 890 && mouseY >= 840) {
        zoneName = 'TikTok Action Buttons Danger (Like / Share)';
        zoneClass = 'text-rose-400';
      } else if (mouseX <= 880 && mouseY >= 1470) {
        zoneName = 'TikTok Captions & Sound Danger';
        zoneClass = 'text-rose-400';
      }
    } else if (state.platform === 'reels') {
      if (mouseY <= 180) {
        zoneName = 'Reels Top Header Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseY >= 1780) {
        zoneName = 'Instagram Bottom Tabs Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseX >= 910 && mouseY >= 1040) {
        zoneName = 'Reels Action Buttons Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseX <= 890 && mouseY >= 1460) {
        zoneName = 'Reels Profile & Audio Danger';
        zoneClass = 'text-rose-400';
      } else if (state.showFeedCrop && (mouseY < 285 || mouseY > 1635)) {
        zoneName = '4:5 Feed Thumbnail Crop Danger';
        zoneClass = 'text-amber-400';
      }
    } else if (state.platform === 'shorts') {
      if (mouseY <= 180) {
        zoneName = 'Shorts Top Header Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseY >= 1780) {
        zoneName = 'Shorts Scrubber & Nav Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseX >= 890 && mouseY >= 840) {
        zoneName = 'Shorts Action Bar Danger';
        zoneClass = 'text-rose-400';
      } else if (mouseX <= 880 && mouseY >= 1480) {
        zoneName = 'Shorts Title & Audio Danger';
        zoneClass = 'text-rose-400';
      }
    }

    zoneInspectorText.innerHTML = `<span class="${zoneClass}">● ${zoneName}</span> <span class="text-slate-400 ml-1.5">[${mouseX}, ${mouseY} px]</span>`;
    zoneInspector.classList.remove('opacity-0');
  }

  // --- FULLSCREEN / EXPAND VIEWPORT ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      canvasViewport.requestFullscreen().catch(() => {
        canvasViewport.classList.toggle('max-w-none');
      });
    } else {
      document.exitFullscreen();
    }
  }

  // --- EXPORT TOOLS (PNG & CLIPBOARD) ---
  function downloadCurrentFrame() {
    if (state.images.length === 0) {
      showToast('Please upload or load a frame first', 'error');
      return;
    }
    const filename = `SocialSafeZone_${state.platform.toUpperCase()}_${Date.now()}.png`;
    canvas.toBlob((blob) => {
      saveAs(blob, filename);
      showToast(`Exported ${filename}`, 'success');
    }, 'image/png');
  }

  function copyCanvasToClipboard() {
    if (state.images.length === 0) {
      showToast('No frame available to copy', 'error');
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('Failed to create image blob', 'error');
        return;
      }
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          showToast('Canvas image copied to clipboard!', 'success');
        }).catch((err) => {
          console.error(err);
          showToast('Clipboard write error. Use Export PNG instead.', 'error');
        });
      } catch (err) {
        console.error(err);
        showToast('Clipboard API unsupported on this browser.', 'error');
      }
    }, 'image/png');
  }

  // --- BATCH ZIP EXPORT ENGINE (JSZip + FileSaver.js) ---
  async function handleZipExport() {
    if (state.images.length === 0) {
      showToast('Upload at least one frame to export ZIP', 'error');
      return;
    }

    if (state.isExporting) return;
    state.isExporting = true;

    const scope = zipScopeSelect.value;
    const zip = new JSZip();

    // Prepare list of jobs to render
    const jobs = [];
    const platforms = ['tiktok', 'reels', 'shorts'];

    if (scope === 'current_platform_all') {
      // All frames with current active platform overlay
      state.images.forEach((imgItem, idx) => {
        jobs.push({
          imageIndex: idx,
          platform: state.platform,
          folder: state.platform.toUpperCase(),
          filename: `${imgItem.name}_${state.platform.toUpperCase()}_safezone.png`
        });
      });
    } else if (scope === 'all_platforms_current') {
      // Current frame across all 3 platforms
      const currItem = state.images[state.currentIndex];
      platforms.forEach(plat => {
        jobs.push({
          imageIndex: state.currentIndex,
          platform: plat,
          folder: plat.toUpperCase(),
          filename: `${currItem.name}_${plat.toUpperCase()}_safezone.png`
        });
      });
    } else if (scope === 'full_matrix') {
      // Full matrix: Every frame for Every platform
      state.images.forEach((imgItem, idx) => {
        platforms.forEach(plat => {
          jobs.push({
            imageIndex: idx,
            platform: plat,
            folder: plat.toUpperCase(),
            filename: `${imgItem.name}_${plat.toUpperCase()}_safezone.png`
          });
        });
      });
    }

    // Show Progress Modal
    exportModal.classList.remove('hidden');
    exportModalStatus.textContent = `Preparing ${jobs.length} preview renders...`;
    updateExportProgress(0, jobs.length, 'Starting rendering...');

    // Offscreen Canvas for background rendering
    const offCanvas = document.createElement('canvas');
    offCanvas.width = CANVAS_WIDTH;
    offCanvas.height = CANVAS_HEIGHT;
    const offCtx = offCanvas.getContext('2d');

    const originalIndex = state.currentIndex;

    try {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        state.currentIndex = job.imageIndex;

        updateExportProgress(i + 1, jobs.length, `Rendering ${job.filename}`);

        // Render job on offscreen canvas
        render(offCtx, job.platform, state.mode);

        // Convert offscreen canvas to Blob
        const blob = await new Promise((resolve) => offCanvas.toBlob(resolve, 'image/png'));
        zip.folder(job.folder).file(job.filename, blob);

        // Yield execution to keep UI responsive
        await new Promise(r => setTimeout(r, 40));
      }

      exportModalStatus.textContent = 'Compressing into ZIP archive...';

      // Generate ZIP with progress callback
      const zipContent = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
          exportProgressPct.textContent = `${Math.round(metadata.percent)}%`;
          exportProgressBar.style.width = `${metadata.percent}%`;
        }
      );

      // Download ZIP
      const zipFilename = `SocialSafeZone_Previews_${Date.now()}.zip`;
      saveAs(zipContent, zipFilename);

      showToast(`Downloaded ${zipFilename} with ${jobs.length} previews!`, 'success');
    } catch (err) {
      console.error('ZIP Export Error:', err);
      showToast('Error generating ZIP export: ' + err.message, 'error');
    } finally {
      state.currentIndex = originalIndex;
      state.isExporting = false;
      render();
      setTimeout(() => {
        exportModal.classList.add('hidden');
      }, 700);
    }
  }

  function updateExportProgress(current, total, statusText) {
    const pct = Math.round((current / total) * 100);
    exportProgressBar.style.width = `${pct}%`;
    exportProgressPct.textContent = `${pct}%`;
    exportProgressCount.textContent = `${current} / ${total}`;
    exportCurrentFileName.textContent = statusText;
  }

  // --- TOAST NOTIFICATIONS SYSTEM ---
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
      error: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
      info: 'bg-slate-900/90 border-slate-700/80 text-slate-200'
    };
    const icons = {
      success: '<i class="fa-solid fa-circle-check text-emerald-400"></i>',
      error: '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i>',
      info: '<i class="fa-solid fa-circle-info text-indigo-400"></i>'
    };

    toast.className = `toast-animate px-4 py-3 rounded-xl border text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2.5 max-w-sm ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span class="flex-grow">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // Boot app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
