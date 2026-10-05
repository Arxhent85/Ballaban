# Ferienhaus Grundriss- & Bauplan-Planer CAD

Ein professionelles, intuitives und vollständiges CAD-Programm zum Zeichnen von Grundrissen, Bauplänen, 3D-Modellen, Schnitten und Auswertungen für Ferienhäuser.

Das Programm funktioniert **vollständig offline** ohne Internetverbindung und **ohne Installation** als eigenständige Einzeldatei.

---

## 🚀 Schnelle Bedienung (Sofortstart)

### Option 1: Einzeldatei per Doppelklick (Empfohlen)
Doppelklicke einfach auf die Datei **`HausPlaner.html`** oder **`Start-HausPlaner.bat`**.
Das Programm öffnet sich sofort in deinem Standard-Webbrowser (Chrome, Edge, Firefox, Safari) – ganz ohne Server, Node.js oder Internet!

### Option 2: Entwicklungsserver (für Entwickler)
Falls du den Quellcode weiter bearbeiten möchtest:
```bash
bun install
bun run dev
```
Das Programm ist dann unter `http://localhost:3000` erreichbar.

---

## 📐 Kernfunktionen

1. **Wände & Räume mit Paint-Einfachheit:**
   - Klick-für-Klick Wände zeichnen (`W`) oder mit zwei Klicks ganze Räume erstellen (`R`).
   - Direkte numerische Maßeingabe während des Zeichnens (Länge tippen + Enter).
   - Echte Wandstärken: Außenwände (30 cm) und Innenwände (11,5 cm) mit sauberer Gehrung.
   - Pult- und Giebelwände mit frei definierbaren Höhen für Wandstart und Wandende.
   - Automatische Erkennung geschlossener Räume mit Berechnung von Wohn- und Nutzfläche nach DIN 277.

2. **Bauelemente & Möbel:**
   - **Türen (`D`):** Einflügelig, zweiflügelig, Haustüren, Schiebetüren mit DIN-Aufschlagbogen.
   - **Fenster (`F`):** Dreh-Kipp, Festverglasung, Bodentief, Fenstertür, 3-fach Verglasung.
   - **Treppen (`T`):** Gerade, L-förmig, Wendeltreppe mit automatischer Schrittmaßprüfung (2s + a = 63 cm).
   - **Möbelkatalog (`M`):** Wohnen, Schlafen, Küche, Bad, Technik und Elektro-Installationssymbole.

3. **Grundstück & Baugrenzen (`G`):**
   - Grundstücksgrenzen frei per Polygon mit Linien ziehen.
   - 3-Meter-Abstandsflächen / Baugrenzen (Baufenster).
   - Live-Berechnung von GRZ (Grundflächenzahl) und GFZ (Geschossflächenzahl).

4. **3D-Visualisierung & Simulation:**
   - Echtzeit-3D-Ansicht mit Orbit-Steuerung und Ego-Perspektive (Walkthrough mit W/A/S/D).
   - Decken-/Dach-Schnittfunktion (Cutaway).
   - Sonnenstands- und Schattensimulation nach Uhrzeit (6:00 bis 20:00 Uhr).
   - WebGL-Kontextverlust-Sicherung und automatischer Wiederanlauf.

5. **Ansichten, Schnitte & Auswertungen:**
   - **2D-Grundriss:** Maßstäbe 1:20, 1:50, 1:100 umschaltbar, Raster-Fang, Ortho-Modus.
   - **Fassaden-Ansichten:** Automatische Nord-, Süd-, Ost- und Westansicht mit Höhenkoten.
   - **Schnitt A-A:** Architektonischer Querschnitt mit Bodenplatte, Dämmung und Dachstuhl.
   - **Mengen & Massen:** Wohnflächenberechnung nach DIN 277, BGF, BRI und Bauordnungs-Prüfer.

6. **Tablet- & Touch-Unterstützung:**
   - Flüssiges Pinch-to-Zoom (Zwei-Finger-Spreizen) sowohl im 2D-Grundriss als auch in der 3D-Ansicht.
   - Zwei-Finger-Verschieben (Pan) der Zeichenfläche.
   - Touch-freundliche Griffe und schwebende Aktionsleisten.

7. **Export & Druck:**
   - PDF-Bauplan-Export mit Plankopf (DIN A4 / A3).
   - DXF-Export für CAD-Programme (AutoCAD, LibreCAD).
   - OBJ-3D-Modellexport für Blender und Unreal Engine.
   - CSV-Mengenaufstellung und JSON-Projektspeicherung.

---

## ⌨️ Wichtige Tastenkürzel

| Taste | Funktion |
|---|---|
| `V` | Auswahl-Werkzeug (Pfeil) |
| `W` | Wand zeichnen |
| `R` | Rechteckraum erstellen |
| `D` | Tür in Wand einsetzen |
| `F` | Fenster in Wand einsetzen |
| `G` | Grundstücksgrenzen ziehen |
| `T` | Treppe platzieren |
| `M` | Möbel- und Symbolkatalog öffnen |
| `B` | Bemaßung / Maßkette setzen |
| `H` | Hand-Werkzeug (Zeichenfläche verschieben) |
| `Entf` / `Backspace` | Ausgewählte Elemente löschen |
| `Strg + D` | Ausgewählte Elemente duplizieren |
| `Strg + A` | Alles auswählen |
| `Strg + Z` | Rückgängig (Undo) |
| `Strg + Y` | Wiederholen (Redo) |
| `Pfeiltasten` | Feinschrittiges Verschieben (Shift für 10 cm Schritte) |
| `Esc` | Werkzeug beenden / Auswahl aufheben |
