# AIDAY - UI Design System

Dokumentation des einheitlichen Design-Systems für alle AIDAY-Oberflächen.

---

## Inhaltsverzeichnis

1. [Design-Philosophie](#design-philosophie)
2. [Farbpalette](#farbpalette)
3. [CSS-Variablen](#css-variablen)
4. [Typografie](#typografie)
5. [Komponenten](#komponenten)
6. [SVG-Icons](#svg-icons)
7. [Animationen](#animationen)
8. [Swipe-Navigation](#swipe-navigation)
9. [Hintergrund-Effekte](#hintergrund-effekte)
10. [Screens](#screens)
11. [Responsive Design](#responsive-design)
12. [Mobile-Optimierung](#mobile-optimierung)
13. [PWA-Features](#pwa-features)

---

## Design-Philosophie

Das AIDAY Design-System folgt diesen Prinzipien:

- **Dark-First**: Dunkler Hintergrund für reduzierte Augenbelastung
- **Glassmorphism**: Transparente Cards mit Blur-Effekt
- **Ambient Motion**: Langsame, beruhigende Hintergrund-Animationen
- **SVG-Icons**: Konsistente, moderne Icons statt Emojis
- **Minimalistisch**: Klare Linien, viel Weißraum
- **Konsistenz**: Einheitliches Erscheinungsbild über alle Oberflächen

---

## Farbpalette

### Primärfarben

| Farbe | Hex | Verwendung |
|-------|-----|------------|
| Background | `#0a0a0f` | Haupthintergrund |
| Card | `rgba(255, 255, 255, 0.03)` | Card-Hintergrund |
| Card Hover | `rgba(255, 255, 255, 0.06)` | Card bei Hover |
| Text | `#ffffff` | Primärtext |
| Text Muted | `rgba(255, 255, 255, 0.5)` | Sekundärtext, Labels |

### Akzentfarben

| Farbe | Hex | Verwendung |
|-------|-----|------------|
| Accent (Indigo) | `#6366f1` | Primäre Akzentfarbe |
| Accent 2 (Cyan) | `#22d3ee` | Sekundäre Akzentfarbe |
| **Gradient Primary** | `linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)` | Buttons, Header |
| Success | `#10b981` | Erfolgsmeldungen |
| Warning | `#f59e0b` | Warnungen |
| Danger | `#ef4444` | Fehler, Löschaktionen |

### Glow-Farben

| Farbe | Wert | Verwendung |
|-------|------|------------|
| Accent Glow | `rgba(99, 102, 241, 0.4)` | Orb-Animationen, Schatten |
| Accent 2 Glow | `rgba(6, 182, 212, 0.4)` | Orb-Animationen |
| Purple Glow | `rgba(168, 85, 247, 0.3)` | Dritter Orb |

---

## CSS-Variablen

```css
:root {
  /* Hintergrund */
  --bg-dark: #0a0a0f;
  --bg-card: rgba(255, 255, 255, 0.03);
  --bg-card-hover: rgba(255, 255, 255, 0.06);
  --bg-input: rgba(255, 255, 255, 0.03);

  /* Text */
  --text: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.5);

  /* Akzente */
  --accent: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.4);
  --accent-2: #22d3ee;
  --accent-2-glow: rgba(34, 211, 238, 0.4);
  --gradient-primary: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);

  /* Status */
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;

  /* Borders */
  --glass-border: rgba(255, 255, 255, 0.08);
}
```

---

## Typografie

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
```

### Schriftgrößen

| Element | Größe | Gewicht |
|---------|-------|---------|
| Logo | 42px | 700 |
| H1 | 32px | 700 |
| H2 | 24px | 600 |
| H3 | 20px | 600 |
| Body | 15px | 400 |
| Label | 13px | 500 |
| Small | 12px | 400 |

### Gradient-Text

```css
.gradient-text {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Komponenten

### Cards

```css
.card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 28px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  background: var(--bg-card-hover);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
```

### Slider Cards (NEU)

Interaktive Cards mit Animation:

```css
.slider-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slider-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  background: var(--bg-card-hover);
}

.slider-card:active {
  transform: translateY(-1px) scale(0.98);
}
```

### Globaler Header (AKTUALISIERT)

Der Header ist auf **allen Screens sichtbar** (außer Loading-Screen) und hat einheitliche Abstände:

```css
.app-header {
  background: var(--bg-card);
  padding: 12px 28px;  /* 28px links/rechts für Bündigkeit mit Card-Inhalt */
  padding-top: max(12px, env(safe-area-inset-top));
  border-radius: 0 0 24px 24px;  /* Abgerundete untere Ecken */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.progress-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--gradient-primary);  /* Gradient-Button */
  border: none;
  border-radius: 25px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
```

**Wichtig:** Der Header wird per JavaScript beim Loading-Screen versteckt:
```javascript
globalHeader.style.display = (screenId === 'loadingScreen') ? 'none' : 'block';
```

### Buttons (AKTUALISIERT)

Alle Buttons verwenden jetzt 30px border-radius und Gradient:

```css
.btn {
  padding: 16px 28px;
  border: none;
  border-radius: 30px;  /* Stark abgerundet */
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary {
  background: var(--gradient-primary);
  color: #fff;
  border-radius: 30px;
  box-shadow: 0 4px 20px var(--accent-glow);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--glass-border);
  border-radius: 30px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px var(--accent-glow);
}
```

### Footer Back Button (AKTUALISIERT)

Einheitlicher Zurück-Button am unteren Rand aller Screens:

```css
.footer-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px 28px;
  margin-top: 24px;
  background: transparent;
  border: 2px solid var(--glass-border);
  border-radius: 30px;  /* Konsistent mit anderen Buttons */
  color: var(--text-muted);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.3px;
}

.footer-back-btn:hover {
  background: var(--bg-card);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15);
}

.footer-back-btn svg {
  width: 18px;
  height: 18px;
}
```

### Inputs

```css
input, select, textarea {
  width: 100%;
  padding: 16px 18px;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  transition: all 0.3s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
```

---

## SVG-Icons (NEU)

Alle Icons werden als inline SVG implementiert für:
- Konsistentes Aussehen
- Einfache Farbänderung via `currentColor`
- Skalierbarkeit ohne Qualitätsverlust

### Icon-Standards

```css
/* Standard Icon-Größe */
.icon {
  width: 24px;
  height: 24px;
}

/* Kleine Icons */
.icon-sm {
  width: 18px;
  height: 18px;
}

/* Große Icons */
.icon-lg {
  width: 32px;
  height: 32px;
}
```

### Icon-Attribute

Alle Icons verwenden:
- `stroke="currentColor"` - Farbe erbt vom Parent
- `stroke-width="2"` - Konsistente Linienstärke
- `fill="none"` - Outline-Style
- `stroke-linecap="round"` - Abgerundete Enden
- `stroke-linejoin="round"` - Abgerundete Ecken

### Beispiel-Icons

```html
<!-- Flame (Streak) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2c0 4-4 6-4 10a6 6 0 0012 0c0-4-4-6-4-10"/>
  <path d="M12 22a3 3 0 01-3-3c0-2 3-4 3-4s3 2 3 4a3 3 0 01-3 3z"/>
</svg>

<!-- Checkmark (Tasks) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M9 12l2 2 4-4"/>
  <circle cx="12" cy="12" r="10"/>
</svg>

<!-- Target (Goals) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
  <circle cx="12" cy="12" r="6"/>
  <circle cx="12" cy="12" r="2"/>
</svg>

<!-- Chart (Progress) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M18 20V10M12 20V4M6 20v-6"/>
</svg>

<!-- User (Profile) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="8" r="4"/>
  <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
</svg>

<!-- Arrow Left (Back) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M19 12H5M12 19l-7-7 7-7"/>
</svg>

<!-- Plus -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 5v14M5 12h14"/>
</svg>

<!-- Trash -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
</svg>
```

---

## Animationen

### Eingangs-Animationen

#### FadeInUp
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeInUp 0.6s ease-out backwards;
}
.card:nth-child(1) { animation-delay: 0.1s; }
.card:nth-child(2) { animation-delay: 0.2s; }
.card:nth-child(3) { animation-delay: 0.3s; }
```

### Timing Functions

| Name | Wert | Verwendung |
|------|------|------------|
| Smooth | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard-Übergänge |
| Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Notifications |
| Ease Out | `ease-out` | Eingangs-Animationen |

### Slide-Animationen (NEU)

Für Swipe-Navigation zwischen Screens:

```css
@keyframes slideOutLeft {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.screen.slide-out-left { animation: slideOutLeft 0.3s ease-out forwards; }
.screen.slide-out-right { animation: slideOutRight 0.3s ease-out forwards; }
.screen.slide-in-left { animation: slideInLeft 0.3s ease-out forwards; }
.screen.slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
```

---

## Swipe-Navigation

Touch-basierte Navigation zwischen Screens.

### Implementierung

```javascript
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function initSwipeNavigation() {
  const container = document.querySelector('.container');

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });
}
```

### Swipe-Richtungen

| Geste | Aktion | Beschreibung |
|-------|--------|--------------|
| Nach rechts wischen | `navigateBack()` | Zurück zur vorherigen Seite |
| Nach links wischen | `navigateForward()` | Vorwärts (wo sinnvoll) |

### Swipe-Erkennung

```javascript
function handleSwipe() {
  const swipeThreshold = 50;  // Mindest-Swipe-Distanz
  const verticalThreshold = 100;  // Max vertikale Bewegung

  const deltaX = touchEndX - touchStartX;
  const deltaY = Math.abs(touchEndY - touchStartY);

  // Nur horizontale Swipes (nicht wenn vertikal gescrollt wird)
  if (deltaY > verticalThreshold) return;

  if (deltaX > swipeThreshold) {
    navigateBack();    // Rechts = Zurück
  } else if (deltaX < -swipeThreshold) {
    navigateForward(); // Links = Vorwärts
  }
}
```

### Navigation-History

Die Navigation-History wird als Stack verwaltet:

```javascript
const navigationHistory = [];

function showScreen(screenId, direction = null) {
  // Bei "forward" Navigation: aktuellen Screen auf Stack
  if (direction === 'forward') {
    navigationHistory.push(currentScreen);
  }
  // Screen-Wechsel mit Animation basierend auf direction
}

function navigateBack() {
  if (navigationHistory.length > 0) {
    const previousScreen = navigationHistory.pop();
    showScreen(previousScreen, 'back');
  }
}
```

---

## Hintergrund-Effekte

### Ambient Orbs (AKTUALISIERT)

Fünf langsam schwebende Orbs im Hintergrund (start-ui.html):

```css
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(150px);  /* Weicherer Blur */
  animation: orb-float 120s infinite ease-in-out;  /* Langsamer */
}

.orb-1 {
  width: 900px;
  height: 900px;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
  top: -300px;
  left: -200px;
}

.orb-2 {
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, var(--accent-2-glow) 0%, transparent 70%);
  bottom: -250px;
  right: -200px;
}

.orb-3 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.orb-4 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  top: 20%;
  right: 10%;
}

.orb-5 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
  bottom: 30%;
  left: 5%;
  animation: orb-drift-1 80s infinite ease-in-out;
}
```

### Grid Pattern

```css
.grid-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
  background-size: 80px 80px;
  pointer-events: none;
  z-index: 1;
}
```

---

## Screens

### app.html Screens

| Screen | Beschreibung | Besondere Features |
|--------|--------------|-------------------|
| **Dashboard ("aiday")** | Tägliche Tasks, Goals-Übersicht (Startseite) | Task-Checkboxes, Klickbare Stat-Boxes |
| Check-in | Stimmung, Energie, Notizen | Emoji-Mood-Selector, Energy-Slider |
| **Review** | Aufgaben vom Vortag bewerten | Task-Bewertung, Blocker-Erfassung |
| Goals | Ziel mit Details eingeben | Form-Validation |
| Clarify | AI-Klarifizierungsfragen | Dynamic Questions, AI-Badge |
| Plan | AI-Plan mit Meilensteinen | Timeline-Darstellung, Accept/Reject |
| Progress | Heutige Aufgaben anzeigen | Task-Liste mit Checkboxen |
| **Goals Overview (NEU)** | Übersicht aller Ziele | Klickbare Goal-Cards, Fortschrittsanzeige |
| **Goal Detail** | Einzelnes Ziel mit Plan | Milestones, Tasks-Liste, Fortschritt |
| **Profile ("Mein Profil")** | Persönliche Daten bearbeiten | Form mit 8 Feldern |

### Layout-Änderungen (AKTUALISIERT)

- **Globaler Header**: Auf allen Screens sichtbar (außer Loading)
- **Dashboard-Titel**: "aiday" im Header
- **"Übersicht"**: Quick Actions umbenannt in "Übersicht"
- **Keine Bottom-Navigation**: Navigation über Buttons/Cards
- **Unified Back Button**: Innerhalb der Cards am unteren Rand
- **Slider-Cards**: Animierte Quick-Action Cards
- **Swipe-Navigation**: Finger-Gesten für Vor/Zurück
- **Abgerundeter Header**: 24px border-radius unten
- **Einheitliche Abstände**: 28px links/rechts auf allen Screens

### Review Screen (NEU)

Bewertung der Aufgaben vom Vortag:

```html
<div id="reviewScreen" class="screen">
  <div class="screen-header">
    <h1>Gestern Review</h1>
    <p class="text-muted">Wie lief es gestern?</p>
  </div>

  <div id="review-tasks-container">
    <!-- Dynamisch generierte Task-Reviews -->
    <div class="review-task-card">
      <div class="task-text">Aufgabentext hier</div>
      <div class="review-options">
        <button class="review-btn completed" onclick="markReview(id, true)">
          <svg>✓</svg> Erledigt
        </button>
        <button class="review-btn skipped" onclick="markReview(id, false)">
          <svg>✗</svg> Nicht geschafft
        </button>
      </div>
      <textarea placeholder="Blocker oder Notizen..."></textarea>
    </div>
  </div>

  <button class="btn btn-primary" onclick="submitReview()">
    Review abschließen
  </button>
</div>
```

### Goals Overview Screen (NEU)

Übersicht aller definierten Ziele, erreichbar über Klick auf "Aktive Ziele" Stat-Box:

```html
<div id="goalsOverviewScreen" class="screen">
  <div class="card">
    <h2 class="card-title">Deine Ziele</h2>
    <p class="card-subtitle">Übersicht aller aktiven Ziele</p>
  </div>

  <div id="goalsOverviewList" class="goals-overview-list">
    <!-- Dynamisch generierte Goal-Cards -->
    <div class="goal-overview-card" onclick="showGoalDetailFromOverview(idx)">
      <div class="goal-overview-header">
        <div class="goal-overview-title">Ziel-Titel</div>
        <div class="goal-overview-status">Aktiv</div>
      </div>
      <div class="goal-overview-progress">
        <div class="goal-overview-progress-bar">
          <div class="goal-overview-progress-fill" style="width: 45%"></div>
        </div>
        <span class="goal-overview-percent">45%</span>
      </div>
      <div class="goal-overview-meta">
        <span>Noch 30 Tage</span>
        <span>Ziel: 15. Apr</span>
      </div>
    </div>
  </div>

  <div class="card">
    <button class="footer-back-btn" onclick="closeGoalsOverview()">
      <svg>←</svg> Zurück
    </button>
  </div>
</div>
```

**CSS für Goal Overview Cards:**

```css
.goals-overview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-overview-card {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.goal-overview-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
}

.goal-overview-card:active {
  transform: translateY(0);
}
```

### Goal Detail Screen

Detailansicht eines einzelnen Ziels:

```html
<div id="goalDetailScreen" class="screen">
  <div class="screen-header">
    <h1 id="goal-detail-title">Ziel-Titel</h1>
    <span class="goal-status-badge">In Arbeit</span>
  </div>

  <!-- Fortschrittsanzeige -->
  <div class="goal-progress-section">
    <div class="progress-ring">
      <svg><!-- Circular Progress --></svg>
      <span class="progress-percent">45%</span>
    </div>
    <div class="progress-stats">
      <div>Erledigt: <strong>9/20</strong> Tasks</div>
      <div>Zieldatum: <strong>15.04.2024</strong></div>
    </div>
  </div>

  <!-- Meilensteine -->
  <div class="milestones-section">
    <h3>Meilensteine</h3>
    <div class="milestone-list">
      <div class="milestone completed">
        <svg>✓</svg>
        <span>Erste Woche abgeschlossen</span>
      </div>
      <div class="milestone active">
        <svg>○</svg>
        <span>Halbzeit erreicht</span>
      </div>
    </div>
  </div>

  <!-- Heutige Tasks für dieses Ziel -->
  <div class="goal-tasks-section">
    <h3>Heutige Aufgaben</h3>
    <div id="goal-today-tasks">
      <!-- Task-Liste -->
    </div>
  </div>

  <button class="footer-back-btn" onclick="navigateBack()">
    <svg>←</svg> Zurück
  </button>
</div>
```

### Profile Screen (NEU)

```html
<div id="profile-screen" class="screen">
  <div class="screen-header">
    <h1>Mein Profil</h1>
  </div>

  <div class="profile-form">
    <!-- Persönliche Daten -->
    <div class="form-group">
      <label>Alter</label>
      <input type="number" id="profile-age" placeholder="z.B. 35">
    </div>
    <div class="form-group">
      <label>Beruf</label>
      <input type="text" id="profile-job" placeholder="z.B. Softwareentwickler">
    </div>
    <div class="form-group">
      <label>Bildung</label>
      <input type="text" id="profile-education" placeholder="z.B. Master Informatik">
    </div>
    <div class="form-group">
      <label>Familienstand</label>
      <input type="text" id="profile-family" placeholder="z.B. Verheiratet, 2 Kinder">
    </div>

    <!-- Persönlichkeit -->
    <div class="form-group">
      <label>Hobbys & Interessen</label>
      <textarea id="profile-hobbies" placeholder="z.B. Wandern, Gaming, Lesen"></textarea>
    </div>
    <div class="form-group">
      <label>Persönliche Stärken</label>
      <textarea id="profile-strengths" placeholder="z.B. Analytisches Denken"></textarea>
    </div>
    <div class="form-group">
      <label>Größte Herausforderungen</label>
      <textarea id="profile-challenges" placeholder="z.B. Zeitmanagement"></textarea>
    </div>
    <div class="form-group">
      <label>Was treibt dich an?</label>
      <textarea id="profile-motivation" placeholder="z.B. Work-Life-Balance"></textarea>
    </div>

    <button class="btn btn-primary" onclick="saveProfile()">Speichern</button>

    <button class="footer-back-btn" onclick="closeProfileScreen()">
      <svg>...</svg> Zurück
    </button>
  </div>
</div>
```

---

## Responsive Design

### Layout-Werte (AKTUALISIERT)

| Element | Wert | Beschreibung |
|---------|------|--------------|
| Container (app.html) | `max-width: 100%` | Volle Breite |
| Container (start-ui.html) | `max-width: 500px` | Zentriert |
| **Header-Padding** | `12px 28px` | 28px links/rechts für Bündigkeit |
| **Screen-Padding** | `12px 28px` | 28px links/rechts für Bündigkeit |
| **App-body-Padding** | `12px 28px` | 28px links/rechts für Bündigkeit |
| **Card-Padding** | `16px` | Innerer Abstand für Text |

**Abstands-Logik:**
- Header, Screens und App-body haben 28px links/rechts Padding
- Cards haben 16px Padding
- "aiday" im Header ist bündig mit dem Card-Rand (beide 28px vom Bildschirmrand)
- Card-Inhalt (z.B. "Heutige Aufgaben") hat zusätzlich 16px Abstand zum Card-Rand

### Breakpoints

| Breakpoint | Beschreibung |
|------------|--------------|
| `768px` | Tablet/Mobile |

### Mobile Anpassungen

```css
/* app.html - Mobile-optimiert mit einheitlichen Abständen */
.container {
  max-width: 100%;
  padding-bottom: 100px;
}

.container > .screen:not(#dashboardScreen):not(#loadingScreen) {
  padding: 12px 28px;  /* 28px links/rechts für Bündigkeit */
}

.app-body {
  padding: 12px 28px;  /* 28px links/rechts für Bündigkeit */
}

.app-header {
  padding: 12px 28px;  /* 28px links/rechts für Bündigkeit */
}

.card, .dashboard-card {
  padding: 16px;  /* Innerer Abstand */
  margin-bottom: 12px;
}

/* "Übersicht" Titel bündig mit Card-Inhalt */
.quick-actions-title {
  padding-left: 16px;  /* Gleicher Abstand wie Card-Padding */
}

/* start-ui.html - Mobile-optimiert */
.container {
  max-width: 500px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .logo {
    font-size: 32px;
  }

  .slider-container {
    gap: 12px;
  }

  .slider-card {
    min-width: 140px;
    padding: 16px;
  }
}
```

---

## Auth-Features (start-ui.html)

### "Einlogdaten merken" Checkbox (NEU)

```css
.remember-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.remember-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.remember-label {
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
}
```

**Funktionsweise:**
- Checkbox im Login-Formular
- Bei Aktivierung werden E-Mail und Passwort in localStorage gespeichert (Base64-encoded)
- Beim nächsten Besuch automatisch ausgefüllt

---

## Best Practices

### Do's

- Verwende CSS-Variablen für alle Farben
- Halte Animation-Dauern lang (>60s) für Hintergrund-Effekte
- Nutze `backdrop-filter: blur()` für Glassmorphism
- Setze `pointer-events: none` auf Hintergrund-Elemente
- Verwende `cubic-bezier` für flüssige Übergänge
- **Verwende SVG-Icons statt Emojis**
- **Füge auf allen Screens einen Zurück-Button hinzu**
- **Verwende 30px border-radius für alle Buttons**
- **Reduziere Seitenränder für Mobile (12px padding)**

### Don'ts

- Keine hellen Hintergründe (#fff) verwenden
- Keine schnellen/ablenkenden Animationen
- Keine harten Schatten (immer rgba mit niedriger Opacity)
- Keine Border-Farben mit voller Opacity
- **Keine Emojis in System-UI (nur in User-Content)**
- **Keine Bottom-Navigation verwenden**
- **Keine Abmelden-Buttons im Profil (nur im Header)**

---

## Dateien

### UI-Oberflächen

| Datei | Beschreibung | Design-System |
|-------|--------------|---------------|
| `app.html` | **HAUPT-APP** - Täglicher Coaching-Flow | Light + Glassmorphism + SVG-Icons + 12px Padding |
| `start-ui.html` | Onboarding-Flow + Login | Dark + Bokeh Clocks + 5 Orbs + "Einlogdaten merken" |
| `test-api.html` | API-Test-Konsole | Dark + Grid + Method-Badges |

### Gemeinsame Elemente

Alle Dateien verwenden:
- Gleiche CSS-Variablen
- Gleiche Ambient-Orb-Animationen
- Gleiche Card/Button/Input-Styles
- Gleiche Typografie
- Responsive Grid-Layout
- SVG-Icons
- Zurück-Buttons auf allen Screens

---

## Mobile-Optimierung

### Horizontales Scrollen verhindern

Kritische CSS-Regeln für volle Bildschirmbreite ohne Overflow:

```css
html, body {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.container {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  padding-bottom: 20px;
}

.screen {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  padding-bottom: 16px;
}

.card, .dashboard-card {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}
```

### Runde Emoji-Buttons (Check-in)

Die Mood-Selector-Buttons müssen immer perfekt rund sein:

```css
.mood-btn {
  width: 56px;
  height: 56px;
  min-width: 56px;
  min-height: 56px;
  max-width: 56px;
  max-height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  transition: all 0.3s ease;
}

.mood-btn.active {
  background: var(--gradient-primary);
  border-color: var(--accent);
  transform: scale(1.1);
}

.mood-selector {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;  /* Wichtig: Verhindert Überlauf */
}
```

### Touch-Target-Mindestgröße

Alle interaktiven Elemente müssen mindestens 44x44px groß sein (Apple HIG):

```css
button, .btn, .slider-card, .mood-btn {
  min-height: 44px;
  min-width: 44px;
}

.mood-btn {
  min-width: 56px;
  min-height: 56px;
}
```

---

## PWA-Features

### Offline-Seite (offline.html)

Zeigt sich bei Verbindungsverlust:

```css
body {
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.offline-container {
  text-align: center;
  max-width: 400px;
}

.offline-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 32px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retry-btn {
  background: var(--gradient-primary);
  border-radius: 30px;
}
```

**Automatische Weiterleitung bei Verbindungswiederherstellung:**

```javascript
window.addEventListener('online', () => {
  setTimeout(() => {
    window.location.href = 'app.html';
  }, 1000);
});
```

### PWA Meta-Tags

Erforderliche Tags in `<head>`:

```html
<!-- PWA Meta Tags -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="AIDAY">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#6366f1">

<!-- PWA Manifest -->
<link rel="manifest" href="manifest.json">

<!-- iOS Icons -->
<link rel="apple-touch-icon" sizes="180x180" href="icons/icon-180.png">
```

### Installierbarkeit

Die App ist installierbar auf:
- **Android Chrome**: Menü → "App installieren"
- **iPhone Safari**: Teilen → "Zum Home-Bildschirm"
- **Desktop Chrome/Edge**: Install-Icon in Adressleiste

### Service Worker Integration

Registration im Frontend:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(registration => {
      console.log('SW registered:', registration.scope);
    });
}
```

### Offline-Banner

Zeigt sich bei Verbindungsverlust innerhalb der App:

```css
.offline-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
  z-index: 9999;
  animation: slideUp 0.3s ease;
}
```
