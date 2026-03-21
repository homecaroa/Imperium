# IMPERIUM — Civilización, Poder y Consecuencias

> Juego de estrategia por turnos con política profunda, simulación sistémica y mapas procedurales.  
> Funciona directamente en el navegador. Sin instalación. Sin dependencias.

---

## 🎮 Jugar ahora

**GitHub Pages:** `https://TU_USUARIO.github.io/IMPERIUM/`

O localmente: descarga el repositorio y abre `index.html` en cualquier navegador moderno.

---

## 📁 Estructura de archivos

```
IMPERIUM/
├── index.html      # Estructura HTML + pantallas del juego
├── style.css       # Todos los estilos (tema oscuro tipo pergamino)
├── data.js         # Civilizaciones, eventos, unidades, facciones, IA
├── map.js          # Generador procedural de mapas (Simplex Noise)
├── systems.js      # Motor de simulación: economía, clima, facciones, ejército, espías, comercio
├── ai.js           # Inteligencia artificial de naciones rivales
├── ui.js           # Renderizado de todos los paneles
├── game.js         # Loop principal, estado central, acciones del jugador
└── README.md       # Este archivo
```

---

## 🗺 Mapa Procedural

- Grid **40×25 = 1.000 celdas = ~500 km²**
- Cada partida genera un mapa único mediante **Simplex Noise multicapa** (elevación + humedad + temperatura)
- **14 biomas** con efectos reales en producción de recursos
- **3–6 ríos** procedurales que fertilizan celdas adyacentes (+30% alimentos)
- **12–20 recursos especiales** colocados por bioma (minas, oasis, ruinas...)
- Naciones posicionadas en **esquinas opuestas garantizadas**
- Seed visible → comparte partidas exactas con otros jugadores

---

## ⚖ Sistemas principales

### Política interior
- 6 tipos de gobierno con modificadores distintos
- 5 facciones por civilización con satisfacción dinámica (0–100)
- Si la satisfacción ponderada cae bajo 35 durante 3 turnos → golpe de estado
- Sistema de leyes/políticas activas (una económica + una militar simultáneamente)

### Estaciones y Clima
- Ciclo de 16 turnos/año: Primavera 🌱 → Verano ☀ → Otoño 🍂 → Invierno ❄
- Eventos extremos con **encadenamiento**: Sequía → Hambruna → Revuelta
- El clima es condicionante, no protagonista. Su efecto cataliza los otros sistemas.

### Ejército multiunidad
- 9 tipos de unidades con fuerza, terreno y contras específicos
- Fuerza efectiva = `Σ(strength × count × terreno × moral/100 × (1−corrupción/200) × estación)`
- 8 **Unidades Legendarias** desbloqueables por condiciones únicas

### Motor de batalla
- Análisis de probabilidad de victoria con ratio y recomendación
- La incertidumbre es ±40% sin espías, dato exacto con inteligencia

### Espías
- 5 misiones: reconocimiento, sabotaje, intriga, robo de planos, asesinato
- Éxito y fracaso con consecuencias proporcionales al riesgo

### Comercio
- 5 tipos de rutas con requisito de relación mínima
- Mejoran relaciones automáticamente cada turno
- Se cierran si estalla la guerra

### Diplomacia con IA
- 4 personalidades: agresiva, diplomática, oportunista, aislacionista
- La IA evalúa tu debilidad y actúa en consecuencia
- La oportunista puede traicionar alianzas activas

---

## 🏆 Condiciones de victoria

| Tipo | Condición |
|---|---|
| **Dominio** | Controla el 60% del mapa |
| **Prosperidad** | Estabilidad >80 y Moral >80 durante 10 turnos seguidos |
| **Hegemonía Económica** | Acumula 5.000 unidades de oro |
| **Hegemonía Diplomática** | 3 alianzas + 3 rutas comerciales activas |

## 💀 Condiciones de derrota

| Tipo | Condición |
|---|---|
| **Hambruna** | Alimentos = 0 durante 3 turnos |
| **Revolución** | Moral ≤10 y Estabilidad ≤15 |
| **Colapso** | Estabilidad = 0 durante 2 turnos |
| **Conquista** | Todos los territorios perdidos |

---

## 🚀 Subir a GitHub Pages

```bash
# 1. Crear repositorio en github.com/nuevo
# 2. Clonar localmente
git clone https://github.com/TU_USUARIO/IMPERIUM.git

# 3. Copiar todos los archivos al repositorio
cp * IMPERIUM/

# 4. Subir
cd IMPERIUM
git add .
git commit -m "IMPERIUM v1.0"
git push origin main

# 5. En GitHub → Settings → Pages → Source: main branch → / (root)
# URL del juego: https://TU_USUARIO.github.io/IMPERIUM/
```

---

## 🛠 Tecnologías

- **Vanilla JavaScript** — sin frameworks, sin build tools
- **Canvas 2D** — renderizado del mapa
- **Simplex Noise** — generación procedural
- **CSS custom properties** — tema visual completo
- Google Fonts: Cinzel + Crimson Text + JetBrains Mono

---

## 📜 Licencia

MIT — libre para modificar, distribuir y expandir.
