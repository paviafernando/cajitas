# Cajitas 📦👑

Juego familiar de empujar cajas (estilo Shove-it / Sokoban). Un solo `index.html`, sin dependencias.

- 42 niveles (1 a 5 cajas), todos verificados con un solucionador (`tools/`).
- Deshacer según dificultad: Fácil 3, Normal 2, Difícil 1. Ayuda ilimitada.
- Modo princesa, modo noche, efectos, 4 músicas y 5 ambientes (todo sintetizado). Guarda preferencias y progreso.
- Controles: flechas/WASD, deslizar, tocar un lugar, flechas en pantalla, control de la tele (OK = menú) o joystick.
- Con `?hub=CODE` muestra el botón para volver a PF Juegos.

## Regenerar niveles
```
node tools/gen.js <semilla> '<config json>' > levels.json
node tools/verify.js
```
