# SnapLens – Snapchat-Inspired Social & AR Camera Web App

SnapLens is a modern Snapchat-inspired camera web application featuring real-time camera access, photo and video capture, creative filters, AR face effects, photo editing, social features, and a responsive UI built with **React 18**, **Vite**, and **Tailwind CSS**.

---

## 🌟 Key Features

### 1. 📷 Real-Time Camera & AR Engine
- **Edge-to-Edge Camera Viewport**: Browser `MediaDevices.getUserMedia()` with strict concurrency tokenization, hardware release cooldowns, and automatic recovery from `NotReadableError` / in-use conditions.
- **10 Interactive AR Face Lenses** (60 FPS Vector & Particle Canvas Renderer):
  - 🐱 **Cute Cat**: Animated twitching pink ears, button nose, whiskers & blush
  - 🐶 **Puppy Dog**: Floppy swaying puppy ears, button nose & animated panting tongue
  - 🦋 **Butterfly Dream**: Iridescent fluttering & orbiting butterflies
  - 👑 **Royal Crown**: Shaded 3D-style golden crown with jewels & velvet cap
  - 😇 **Angel Glow**: Floating halo, soft skin bloom & rotating 8-point stars
  - 🕶️ **Cyber Face**: Cyberpunk neon HUD, rotating targeting reticle & sweep laser scanline
  - 💕 **Heart Eyes**: Pulsing 3D hearts over eyes with floating particles & blush
  - 🔥 **Fire Eyes**: Procedural flickering flame jets & rising ember sparks
  - ✨ **Anime World**: Manga starry eye specular highlights & diagonal blush lines
  - 🌈 **Rainbow Magic**: Vibrant 6-color arch, cloud puffs & spinning stars
- **Face Landmark Tracking**: Integration with MediaPipe Face Landmarker / Chrome FaceDetector with Exponential Moving Average (`alpha = 0.55`) coordinate smoothing.
- **10 GPU-Accelerated Color Shaders**: `Original`, `Vintage`, `Cinematic`, `Black & White`, `Warm`, `Cool`, `Retro`, `Soft Glow`, `Bright`, and `Dramatic`.
- **Beauty Mode & Tuning**: Real-time skin smoothing blur, brightness, contrast, and saturation sliders.
- **Audio Sound Effects**: Audio for camera open, photo mode, video mode, shutter click, record start/stop, camera flip, and filter pop with a sound toggle.
- **Photo & Video Capture**:
  - **Photos**: High-resolution snapshots with active AR filters baked directly onto the canvas.
  - **Videos**: 30 FPS composite video clips with embedded audio and AR lens overlays via `MediaRecorder`.

### 2. 🎨 Creative Photo & Video Studio Editor
- **Drawing Tools**: Freehand brush with color picker and stroke width slider.
- **Eraser**: Destination-out eraser for precision edits.
- **Text & Typography**: Draggable and stylizable captions.
- **Stickers & Emojis**: Add and position emojis and decorative stickers.
- **Transformations**: 90° rotation and flip controls.
- **History**: Full multi-step Undo and Redo stack.
- **Export**: Direct download and save to Memories.

### 3. 🔥 Social & Firebase Integration
- **Firebase Authentication**: User signup, sign-in, and profile state.
- **Cloud Firestore & Storage**: Automatic synchronization of snaps, videos, and captions.
- **Stories**: 24-hour circular stories with progress indicators and full-screen viewer.
- **Friends & Chat**: Add friends, exchange snaps, and send real-time direct messages with media attachments.
- **Memories Gallery**: Dual view modes (grid and list) with date sorting, favorites, and search.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Modern web browser with camera and microphone permissions enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/P6i2y0u3s7h/SnapLens.git
cd SnapLens

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

---

## 📜 License
MIT License
