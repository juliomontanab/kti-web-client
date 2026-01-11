# Narrative Engine - Diseño de Arquitectura

> **Documento de Diseño Técnico**
> Versión: 1.0
> Fecha: 2026-01-10
> Estado: Diseño (pre-implementación)

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [El Problema](#el-problema)
3. [La Solución: El Ejecutivo Virtual](#la-solución-el-ejecutivo-virtual)
4. [Arquitectura de Tres Capas](#arquitectura-de-tres-capas)
5. [Modelo de Datos](#modelo-de-datos)
6. [Motor de Coherencia](#motor-de-coherencia)
7. [Estados de Mercado](#estados-de-mercado)
8. [Sistema de Templates](#sistema-de-templates)
9. [Flujo de Procesamiento](#flujo-de-procesamiento)
10. [Integración con Dashboard](#integración-con-dashboard)
11. [Ejemplos de Narrativas](#ejemplos-de-narrativas)
12. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Visión General

### Objetivo

Transformar el sistema actual de análisis técnico automatizado en un **asesor virtual persistente** que:

- Habla como un ejecutivo de broker profesional
- Mantiene coherencia narrativa entre análisis
- Se adapta al nivel de experiencia del usuario
- Responde las 5 preguntas fundamentales del cliente

### Las 5 Preguntas del Cliente

| Pregunta | Lo que realmente pregunta | Campo de Respuesta |
|----------|---------------------------|-------------------|
| "¿Va a subir o bajar?" | Dame una dirección clara | Sesgo + Convicción |
| "¿Hasta dónde va a llegar?" | Cuantifica la oportunidad | Targets + Potencial |
| "¿Debería entrar?" | Dame permiso/validación | Señal de Acción |
| "¿Por qué las noticias afectan?" | Edúcame mientras invierto | Contexto Macro |
| "¿Cuál es la mejor estrategia?" | Dime exactamente qué hacer | Plan de Ejecución |

### Principios de Diseño

1. **Directo pero no irresponsable**: Guía clara sin cruzar líneas legales
2. **Coherencia temporal**: Cada análisis sabe qué dijo el anterior
3. **Capas de profundidad**: Del novato al experto, todos encuentran valor
4. **Voz humana**: No es un sistema escupiendo datos, es un asesor que acompaña

---

## El Problema

### Sistema Actual

```
Captura (2_) → Análisis IA (3_) → Monitoreo (5_)
```

**Produce:**
- JSON con ~50 campos técnicos (EMAs, RSI, MACD, Bollinger, Fear&Greed, DEFCON, etc.)
- Tracking de escenarios (entries, targets, stop-loss)
- Eventos (TARGET_REACHED, STOP_LOSS_HIT, etc.)

**Problemas:**
- Información fragmentada y cruda
- Cada análisis es "huérfano" (no sabe qué pasó antes)
- El cliente recibe números, no un relato de inversión
- No hay guía de acción clara

### Lo que el Cliente Ve vs Lo que Necesita

| Lo que muestra el dashboard | Lo que el cliente necesita |
|----------------------------|---------------------------|
| RSI 57.9, ADX 23.2 | "¿Es buen momento para entrar?" |
| EARLY MOMENTUM + GOOD | "¿Qué significa esto para mi dinero?" |
| Fear & Greed 44 | "¿Debo preocuparme?" |
| Confluencia 6 bullish / 4 bearish | "¿Es seguro?" |

---

## La Solución: El Ejecutivo Virtual

### Cambio de Paradigma

| Dashboard de Datos | Ejecutivo de Broker |
|-------------------|---------------------|
| "Aquí están los números" | "Esto es lo que yo haría" |
| Reactivo (muestra lo que pasó) | Proactivo (anticipa lo que viene) |
| El cliente interpreta | El ejecutivo interpreta por él |
| Información | **Guía** |
| Múltiples métricas | **Una voz clara** |
| "RSI está en 67" | "El momentum está fuerte, pero no te apures" |

### Características del Ejecutivo

1. **Te conoce y recuerda**: "La semana pasada te dije que esperaras. Llegó el momento."
2. **Habla con convicción**: "Me gusta el oro aquí. No es el setup perfecto, pero el riesgo está acotado."
3. **Te dice qué hacer**: "Si tienes posición, mantén. Si no, espera a 2,650."
4. **Te prepara para escenarios**: "Si rompe 2,680, acelera. Si pierde 2,620, salimos."
5. **Te da tranquilidad o te alerta**: "Todo va según el plan" vs "Ojo, esto se está complicando"
6. **No te abruma**: Filtra, no dice todo lo que sabe, dice lo que necesitas.

### El Tono: Directo pero No Irresponsable

```
❌ "Debes comprar Bitcoin ahora"
✅ "El setup favorece posiciones largas. Si decides entrar, este es el plan."

❌ "Vas a ganar 8%"
✅ "El objetivo está en $98k, eso representa un 8% desde aquí"

❌ "Es seguro"
✅ "El riesgo está acotado en $85k. Si ese nivel falla, el escenario cambia."

❌ "No puede bajar más"
✅ "Los niveles técnicos sugieren soporte fuerte aquí"
```

---

## Arquitectura de Tres Capas

### Resumen

| Capa | Nombre | Audiencia | Contenido |
|------|--------|-----------|-----------|
| 1 | `executive` | Todos | Voz humana, guía directa, continuidad narrativa |
| 2 | `investmentCard` | Intermedio | Estructura clara, contexto, escenarios |
| 3 | `technical` | Avanzado | Datos crudos, indicadores, métricas |

### Perfiles de Usuario

| Perfil | Quiere ver | Tono | Detalle |
|--------|-----------|------|---------|
| **Novato** | Solo ejecutivo | "Haz esto" | Mínimo |
| **Intermedio** | Ejecutivo + resumen técnico | "Haz esto porque..." | Moderado |
| **Avanzado** | Técnico completo + ejecutivo como referencia | "Los datos dicen..." | Máximo |

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                        INSTRUMENTO                               │
│                                                                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│   │  👔 Executive   │  │  📋 Investment  │  │  📊 Technical  │  │
│   │     (Capa 1)    │  │   Card (Capa 2) │  │    (Capa 3)    │  │
│   └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│            │                    │                    │           │
│            └────────────────────┴────────────────────┘           │
│                                 │                                │
│                                 ▼                                │
│            ┌─────────────────────────────────────────┐           │
│            │     Misma data subyacente,              │           │
│            │     diferente presentación              │           │
│            └─────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Arquitectura de Colecciones (MongoDB)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  COLECCIÓN 1: instrument_states (estado actual)                 │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  • Un documento por instrumento+timeframe                       │
│  • Se ACTUALIZA (no se crean nuevos)                            │
│  • Contiene: current, previous, activeScenario, timeline        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COLECCIÓN 2: analyses (historial completo)                     │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  • Un documento por cada análisis realizado                     │
│  • Se INSERTAN nuevos (nunca se modifican)                      │
│  • Sirve para: auditoría, backtesting, ML                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Estructura: instrument_states

```javascript
{
  _id: "BTC_1D",                    // clave compuesta
  code: "BTC",
  timeframe: "1D",
  updatedAt: 1704880800000,

  // Snapshot actual
  current: {
    price: 91139,
    signal: "BUY_PULLBACK",
    bias: "ALCISTA",
    confidence: 65,
    investmentCard: { /* ... */ },
    executive: { /* ... */ }
  },

  // Snapshot anterior (para detectar cambios)
  previous: {
    price: 89500,
    signal: "WAIT_PULLBACK",
    bias: "ALCISTA",
    confidence: 60
  },

  // Escenario activo
  activeScenario: {
    id: ObjectId("..."),
    createdAt: 1704448800000,
    direction: "LONG",
    entry: 89500,
    stopLoss: 85000,
    targets: [94500, 98000],
    status: "ACTIVE"               // ACTIVE, COMPLETED, INVALIDATED
  },

  // Timeline de eventos (últimos 50)
  timeline: [
    { date: "2024-01-10", event: "SIGNAL_CHANGE", from: "WAIT", to: "BUY" },
    { date: "2024-01-07", event: "TARGET_REACHED", target: "T1" },
    // ...
  ],

  // Métricas de coherencia
  coherence: {
    daysWithSameBias: 7,
    signalChangesLast30Days: 3,
    avgConfidence: 62,
    scenarioAge: 7
  }
}
```

### Estructura: Documento de Análisis Completo

```javascript
{
  // Identificación
  "instrument": {
    "code": "BTC",
    "symbol": "BTCUSD",
    "name": "Bitcoin / U.S. Dollar",
    "timeframe": "1D",
    "assetType": "CRYPTO"
  },

  // ═══════════════════════════════════════════════════════════════
  // CAPA 1: VOZ DEL EJECUTIVO
  // ═══════════════════════════════════════════════════════════════
  "executive": {
    "headline": "El pullback llegó. Buen momento para posicionarse.",
    "sentiment": "OPPORTUNISTIC",  // CALM, ALERT, OPPORTUNISTIC, CAUTIOUS, URGENT

    "guidance": "Si estabas esperando mejor precio, llegó. Entrada en zona de $89-90k con stop en $85k te da buen ratio.",

    "signal": {
      "action": "CONSIDER_ENTRY",
      "color": "green",
      "icon": "✅"
    },

    "actions": {
      "noPosition": {
        "do": "Considerar entrada larga",
        "entry": "89,000 - 90,500",
        "stop": "85,000",
        "target": "94,500 / 98,000",
        "size": "2-3% del capital"
      },
      "longPosition": {
        "do": "Mantener",
        "detail": "Escenario vigente. Stop en 85k."
      },
      "shortPosition": {
        "do": "Reconsiderar",
        "detail": "Sesgo no favorece cortos aquí."
      }
    },

    "watching": [
      "Rompe $94,500 → puede acelerar a $98k",
      "Pierde $85,000 → escenario invalidado",
      "F&G en 44 → mientras haya miedo, hay combustible"
    ],

    "conviction": {
      "level": "MODERATE_HIGH",  // LOW, MODERATE, MODERATE_HIGH, HIGH, VERY_HIGH
      "score": 72,
      "brief": "Setup sólido + sentimiento favorable. Falta volumen."
    },

    "context": "Rebote desde $81k formando doble piso. F&G en miedo favorece acumulación. DXY débil es viento a favor.",

    // Continuidad narrativa
    "continuity": {
      "previousHeadline": "Va bien, pero no es momento de entrar.",
      "daysSinceScenarioStart": 5,
      "narrativeThread": "El pullback que anticipamos hace 3 días llegó."
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CAPA 2: FICHA DE INVERSIÓN
  // ═══════════════════════════════════════════════════════════════
  "investmentCard": {
    "direction": {
      "bias": "ALCISTA",
      "confidence": 65,
      "narrative": "Bitcoin está en recuperación después de caer desde $108k hasta $81k."
    },

    "potential": {
      "targets": [
        { "level": 94500, "percent": 4.5, "label": "Resistencia inmediata", "probability": "high" },
        { "level": 98000, "percent": 8.3, "label": "Objetivo extendido", "probability": "medium" }
      ],
      "stopLoss": { "level": 85000, "percent": -6.0, "reason": "Quiebre invalida doble piso" },
      "riskReward": 1.9
    },

    "timing": {
      "phase": "EARLY_MOMENTUM",
      "quality": "GOOD",
      "percentFromLow": 25,
      "percentFromHigh": 75,
      "narrative": "25% del movimiento recorrido. Todavía temprano."
    },

    "marketContext": {
      "fearGreed": {
        "crypto": { "value": 44, "label": "Fear", "impact": "FAVORABLE" },
        "stocks": { "value": 52, "label": "Neutral", "impact": "NEUTRAL" }
      },
      "geopolitical": {
        "defcon": 4,
        "label": "Operaciones normales",
        "impact": "NEUTRAL"
      },
      "correlations": {
        "dxy": { "value": 99, "trend": "Débil", "impact": "FAVORABLE" },
        "vix": { "value": 14.85, "trend": "Bajo", "impact": "FAVORABLE" }
      }
    },

    "scenarios": {
      "main": {
        "direction": "LONG",
        "probability": 60,
        "entry": 89500,
        "stopLoss": 85000,
        "targets": [
          { "level": 94500, "rr": "1.1:1", "description": "Máximo reciente" },
          { "level": 98000, "rr": "1.9:1", "description": "Resistencia técnica" }
        ],
        "reasoning": "Recuperación desde mínimos con MACD alcista y precio sobre EMA21"
      },
      "alternative": {
        "direction": "SHORT",
        "probability": 40,
        "condition": "Ruptura bajo 89,000",
        "entry": 88500,
        "stopLoss": 92000,
        "targets": [
          { "level": 85000, "rr": "1:1", "description": "Soporte estructural" }
        ]
      }
    },

    "riskManagement": {
      "positionSize": "Moderada - 2-3% del capital",
      "reason": "Alta volatilidad crypto",
      "invalidationLong": "Cierre diario bajo 85,000",
      "invalidationShort": "Cierre diario sobre 95,000",
      "specialRisks": [
        "Alta volatilidad crypto",
        "Correlación con mercados tradicionales",
        "Riesgo regulatorio"
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CAPA 3: ANÁLISIS TÉCNICO COMPLETO
  // ═══════════════════════════════════════════════════════════════
  "technical": {
    "price": {
      "current": 91139.04,
      "open": 93876.00,
      "high": 94418.00,
      "low": 91221.00,
      "change": -2737,
      "changePercent": -2.92
    },

    "trend": {
      "multiTimeframe": {
        "superior": "Bajista",
        "actual": "Alcista",
        "inferior": "Alcista",
        "confluence": "Recuperación en timeframe menor dentro de tendencia bajista mayor"
      },
      "emas": {
        "ema9": { "value": 90557, "distance": 1.41 },
        "ema21": { "value": 89620, "distance": 2.47 },
        "ema50": { "value": 91629, "distance": -0.22 },
        "ema200": { "value": 100184, "distance": -8.3 },
        "alignment": "Precio sobre EMAs cortas pero bajo EMA200",
        "pricePosition": "Recuperación desde soporte EMA21"
      }
    },

    "levels": {
      "resistances": [
        { "level": 94500, "type": "Máximo reciente", "strength": "Fuerte" },
        { "level": 98000, "type": "Resistencia técnica", "strength": "Moderada" },
        { "level": 100184, "type": "EMA200", "strength": "Fuerte" }
      ],
      "supports": [
        { "level": 89620, "type": "EMA21", "strength": "Moderada" },
        { "level": 85000, "type": "Estructural", "strength": "Fuerte" },
        { "level": 81000, "type": "Mínimo reciente", "strength": "Fuerte" }
      ],
      "pivots": {
        "p": 93384, "r1": 95284, "r2": 96692,
        "s1": 91976, "s2": 90076
      }
    },

    "indicators": {
      "bollingerBands": {
        "upper": 92514, "middle": 88686, "lower": 84858,
        "position": 91.08,
        "signal": "Cerca del límite superior - posible resistencia"
      },
      "stochasticRsi": {
        "k": 88.2, "d": 96.0, "rsiBase": 57.9,
        "signal": "Sobrecompra en SRSI pero RSI neutral"
      },
      "macd": {
        "line": 433.52, "signal": -327.69, "histogram": 761.21,
        "trend": "Alcista"
      },
      "momentum": {
        "rsi": 57.9, "adx": 23.2, "atr": 2544, "atrPercent": 2.77,
        "trendStrength": "Moderado"
      },
      "volume": {
        "current": 1800, "average": 1900, "ratio": 0.92,
        "obv": 1790000,
        "signal": "Volumen ligeramente bajo"
      }
    },

    "patterns": {
      "candle": "Consolidación tras caída",
      "chart": [
        "Posible doble suelo en formación",
        "Recuperación desde soporte EMA21"
      ],
      "observations": [
        "Volumen en recuperación",
        "MACD girando alcista",
        "Precio defendiendo EMA21"
      ]
    },

    "swingAnalysis": {
      "phase": "EARLY_MOMENTUM",
      "entryQuality": "GOOD",
      "metrics": {
        "percentFromSwingLow": 25,
        "percentFromSwingHigh": 75,
        "swingRange": 37000,
        "positionInSwing": "Lower third"
      },
      "phaseIndicators": {
        "volumeTrend": "INCREASING",
        "momentumStrength": "MODERATE",
        "priceStructure": "CONSOLIDATING",
        "divergencePresent": false
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA Y TRACKING
  // ═══════════════════════════════════════════════════════════════
  "metadata": {
    "analysisId": "BTC_1D_2024-01-10T08:00:00Z",
    "created": 1704880800000,
    "session": "Asia",
    "version": "2.0",
    "previousAnalysisId": "BTC_1D_2024-01-09T08:00:00Z"
  },

  "tracking": {
    // ... datos de tracking existentes de 5_scenario_updater
  }
}
```

---

## Motor de Coherencia

### Propósito

Garantizar que cada análisis mantenga consistencia lógica con el anterior, evitando cambios bruscos sin justificación.

### Reglas de Coherencia

```javascript
const COHERENCE_RULES = {

  // Regla 1: No cambiar sesgo sin justificación fuerte
  biasChange: {
    minPriceMove: 5,           // % mínimo de movimiento para justificar
    minConfidenceDrop: 20,     // o caída de confianza del escenario
    requiresEvent: true,       // debe haber un evento (target/SL/ruptura)

    evaluate: (delta, currentState) => {
      if (!delta.biasChanged) return { allowed: true };

      const priceMove = Math.abs(delta.priceChangePercent);
      const hasJustification =
        priceMove >= 5 ||
        delta.targetReached ||
        delta.stopLossHit ||
        delta.keyLevelBroken;

      return {
        allowed: hasJustification,
        reason: hasJustification
          ? `Sesgo cambió por ${delta.justificationReason}`
          : `Sesgo mantenido (movimiento de ${priceMove}% insuficiente)`
      };
    }
  },

  // Regla 2: Señal no puede saltar estados
  signalProgression: {
    validTransitions: {
      "WAIT_CONFIRMATION": ["BUY", "SELL", "AVOID", "WAIT_CONFIRMATION"],
      "BUY_PULLBACK": ["BUY", "WAIT_CONFIRMATION", "AVOID"],
      "BUY": ["HOLD", "TAKE_PARTIAL", "CAUTION", "STOP_OUT"],
      "HOLD": ["TAKE_PARTIAL", "TAKE_PROFIT", "CAUTION", "STOP_OUT"],
      "TAKE_PARTIAL": ["TAKE_PROFIT", "HOLD", "STOP_OUT"],
      "CAUTION": ["HOLD", "STOP_OUT", "AVOID"]
    }
  },

  // Regla 3: Confianza no puede saltar más de 20 puntos sin evento
  confidenceChange: {
    maxJumpWithoutEvent: 20
  },

  // Regla 4: Escenario tiene vida útil máxima
  scenarioAge: {
    maxAgeDays: {
      "1D": 14,    // escenarios diarios válidos 2 semanas
      "4H": 5,     // escenarios 4H válidos 5 días
      "1H": 2      // escenarios 1H válidos 2 días
    }
  }
};
```

### Flujo de Validación

```
┌─────────────────────────────────────────────────────────────────┐
│  NUEVO ANÁLISIS LLEGA                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: Obtener estado actual del instrumento                  │
│  const currentState = await instrumentStates.findOne({...})     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: Calcular deltas y detectar cambios                     │
│  • ¿Cambió el sesgo?                                            │
│  • ¿Cambió la señal?                                            │
│  • ¿Se alcanzó un target?                                       │
│  • ¿Se acerca al stop loss?                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: Aplicar reglas de coherencia                           │
│  • Si el sesgo cambió, ¿hay justificación suficiente?           │
│  • Si no hay justificación, mantener sesgo anterior             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: Generar narrativa contextualizada                      │
│  • La narrativa SABE qué pasó antes                             │
│  • Ejemplo: "Ayer recomendamos esperar pullback..."             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: Persistir                                              │
│  • Insertar en analyses (historial)                             │
│  • Actualizar instrument_states (estado actual)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estados de Mercado

### Los 12 Estados

| Estado | Señal | Color | Cuándo aplica |
|--------|-------|-------|---------------|
| `STRONG_BUY` | Compra fuerte | 🟢 | Early momentum + alta confluencia + F&G favorable |
| `BUY` | Compra | 🟢 | Good entry quality + bias alcista |
| `BUY_PULLBACK` | Compra en retroceso | 🟡 | Mid swing + esperar mejor precio |
| `WAIT_CONFIRMATION` | Esperar confirmación | 🟡 | Señales mixtas, necesita romper nivel |
| `HOLD` | Mantener | 🟡 | Ya en posición, escenario vigente |
| `TAKE_PARTIAL` | Tomar parciales | 🟡 | Cerca de T1, asegurar ganancias |
| `TAKE_PROFIT` | Tomar ganancias | 🟢 | Targets alcanzados |
| `CAUTION` | Precaución | 🟠 | AT_RISK, cerca de SL |
| `AVOID` | No entrar | 🔴 | Late exhaustion + mala calidad |
| `SELL` | Venta | 🔴 | Bias bajista + buena confluencia |
| `STOP_OUT` | Salir | 🔴 | SL alcanzado |
| `NO_TRADE` | Sin operación | ⚪ | Sin setup claro |

### Sentimientos Emocionales

| Sentiment | Cuándo | Tono |
|-----------|--------|------|
| `CALM` | Todo va según el plan | Tranquilizador |
| `OPPORTUNISTIC` | Se presenta oportunidad | Entusiasta moderado |
| `CAUTIOUS` | Hay señales mixtas | Prudente |
| `ALERT` | Posición en riesgo | Atención |
| `URGENT` | Acción requerida | Directo |

---

## Sistema de Templates

### Estructura de Templates

```javascript
const TEMPLATES = {
  BUY_PULLBACK: {
    signal: {
      action: "ESPERAR PULLBACK",
      color: "yellow",
      icon: "⏳"
    },

    headline: {
      template: "{asset}: El pullback que esperábamos está cerca.",
      variables: ["asset"]
    },

    guidance: {
      template: "Si estabas esperando mejor precio, {idealEntry} es la zona. Con stop en {stopLoss}, el ratio es {rrRatio}.",
      variables: ["idealEntry", "stopLoss", "rrRatio"]
    },

    // ... más templates
  }
};
```

### Narrativas Contextuales por Situación

```javascript
const CONTEXTUAL_NARRATIVES = {

  // Cuando la señal cambia
  signalChanged: {
    "WAIT_PULLBACK→BUY": {
      template: "El pullback que esperábamos llegó. {asset} tocó ${triggerPrice} {timeAgo}. La entrada se activó según el plan.",
      tone: "confirmación"
    },
    "BUY→CAUTION": {
      template: "⚠️ Atención: {asset} se acerca a la zona de stop. Distancia actual: {distancePercent}%.",
      tone: "alerta"
    },
    "HOLD→TAKE_PARTIAL": {
      template: "🎯 {asset} alcanzó el primer objetivo. Recomendamos tomar 50% de ganancias.",
      tone: "celebración"
    }
  },

  // Cuando el sesgo se mantiene
  biasMaintained: {
    withProgress: {
      template: "Mantenemos nuestra visión {bias} en {asset}. Progreso: {progressPercent}% hacia el objetivo.",
      tone: "consistencia"
    },
    withPullback: {
      template: "Mantenemos nuestra visión {bias}. El retroceso actual ofrece mejor entrada.",
      tone: "oportunidad"
    }
  }
};
```

### Sub-Templates de Contexto (Educativos)

```javascript
const CONTEXT_NARRATIVES = {
  fearGreed: {
    extremeFear: {
      crypto: "📊 El mercado crypto está en pánico extremo (F&G: {value})\n→ Históricamente, el miedo extremo precede a rebotes importantes.",
    },
    fear: {
      crypto: "📊 El mercado crypto está temeroso (F&G: {value})\n→ Zona de acumulación histórica.",
    },
    neutral: {
      crypto: "📊 El sentimiento crypto es neutral (F&G: {value})\n→ El mercado puede moverse en cualquier dirección.",
    },
    greed: {
      crypto: "📊 El mercado crypto está codicioso (F&G: {value})\n→ Precaución, riesgo de corrección.",
    },
    extremeGreed: {
      crypto: "📊 El mercado crypto está en euforia extrema (F&G: {value})\n→ ⚠️ Alto riesgo de corrección.",
    }
  },

  geopolitical: {
    defcon5: "🌍 Sin tensiones geopolíticas relevantes.",
    defcon4: "🌍 No hay tensión geopolítica importante.",
    defcon3: "🌍 Tensión geopolítica moderada. Activos refugio pueden beneficiarse.",
    defcon2: "🌍 ⚠️ Alta tensión geopolítica. Prioriza activos refugio.",
    defcon1: "🌍 🚨 CRISIS GEOPOLÍTICA. Mercados en modo risk-off."
  },

  correlations: {
    dxyWeak: {
      crypto: "💵 El dólar está débil (DXY: {value})\n→ Favorable para Bitcoin.",
      gold: "💵 El dólar está débil (DXY: {value})\n→ Favorable para oro."
    },
    dxyStrong: {
      crypto: "💵 El dólar está fuerte (DXY: {value})\n→ Presión bajista para Bitcoin.",
      gold: "💵 El dólar está fuerte (DXY: {value})\n→ Presión bajista para oro."
    }
  }
};
```

---

## Flujo de Procesamiento

### Pipeline Completo

```
┌─────────────────────────────────────────────────────────────────┐
│  1. ANÁLISIS DE IMAGEN (Claude Vision)                          │
│     └─> Output: technical (JSON crudo)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. MOTOR DE REGLAS (Determinístico)                            │
│     └─> Input: technical                                        │
│     └─> Output: investmentCard (estructurado)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. MOTOR DE COHERENCIA                                         │
│     └─> Input: investmentCard + previousState                   │
│     └─> Output: investmentCard validado/ajustado                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. GENERADOR DE VOZ (Templates + Contexto)                     │
│     └─> Input: investmentCard + previousState + delta           │
│     └─> Output: executive (narrativo)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. PERSISTENCIA                                                │
│     └─> Insertar en analyses                                    │
│     └─> Actualizar instrument_states                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. DOCUMENTO FINAL                                             │
│     └─> { executive, investmentCard, technical, metadata }      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integración con Dashboard

### Sistema de Pestañas

```
┌─────────────────────────────────────────────────────────────────┐
│  🟠 BITCOIN                                    $91,139  +0.09%  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │ 👔 Ejecutivo │ 📋 Resumen   │ 📊 Técnico   │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
│                                                                  │
│  [Contenido según pestaña seleccionada]                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Queries Principales

```javascript
// Estado actual de un instrumento
const getInstrumentState = async (code, timeframe) => {
  return await instrumentStates.findOne({ _id: `${code}_${timeframe}` });
};

// Instrumentos con señal de compra
const getBuySignals = async () => {
  return await instrumentStates.find({
    "current.signal": { $in: ["STRONG_BUY", "BUY", "BUY_PULLBACK"] }
  }).toArray();
};

// Instrumentos en riesgo
const getAtRiskPositions = async () => {
  return await instrumentStates.find({
    "current.signal": { $in: ["CAUTION", "AT_RISK"] }
  }).toArray();
};

// Dashboard home: resumen de todos
const getDashboardSummary = async () => {
  return await instrumentStates.aggregate([
    {
      $group: {
        _id: "$current.signal",
        count: { $sum: 1 },
        instruments: { $push: { code: "$code", confidence: "$current.confidence" } }
      }
    }
  ]).toArray();
};
```

### Preferencias de Usuario (futuro)

```javascript
{
  "userId": "user_123",
  "preferences": {
    "defaultView": "executive",      // executive | summary | technical
    "showTechnicalDetails": true,
    "notificationLevel": "signals",  // all | signals | alerts | none
    "riskTolerance": "moderate",     // conservative | moderate | aggressive
    "experienceLevel": "intermediate" // beginner | intermediate | advanced
  }
}
```

---

## Ejemplos de Narrativas

### Situación 1: Oportunidad Clara

```
HEADLINE: "Oro: Setup de libro. Me gusta mucho este nivel."

GUIDANCE: "Pullback a EMA21 dentro de tendencia alcista, con Fear en mercados
tradicionales. Si hay un momento para estar largo en oro, es ahora."

IF_NO_POSITION: "Entrada ideal en $2,645-2,655. Stop en $2,615.
Primer objetivo $2,690."

WATCHING:
- "Si rompe $2,690 sin mi, no lo persigo. Espero nuevo pullback."
- "DEFCON 3 o menor aceleraría todo esto."

CONVICTION: HIGH (78%)
```

### Situación 2: Espera con Paciencia

```
HEADLINE: "Bitcoin: Va bien, pero no es momento de entrar."

GUIDANCE: "El movimiento ya avanzó 25% desde mínimos. Si no estás dentro,
esperar un retroceso te da mejor precio y menor riesgo."

IF_NO_POSITION: "No entres aquí. Espera $89,500 o confirmación sobre $94,500."

IF_LONG_POSITION: "Mantén. Stop en $85k. Considera parciales en $94,500."

CONVICTION: MODERATE (62%)
```

### Situación 3: Alerta de Riesgo

```
HEADLINE: "EUR/USD: ⚠️ Posición en riesgo. Atención."

GUIDANCE: "El precio se acerca al stop. No es momento de promediar.
Si cierra bajo $1.0820, el escenario largo queda invalidado."

IF_LONG_POSITION: "Mantén stop donde está. No lo muevas. Si salta, aceptamos
la pérdida y reevaluamos."

CONVICTION: LOW (38%)
```

### Situación 4: Toma de Ganancias

```
HEADLINE: "Plata: 🎯 Primer objetivo alcanzado. Hora de asegurar."

GUIDANCE: "Llegamos a $31.50. Buen momento para tomar la mitad y
dejar correr el resto con stop en breakeven."

IF_LONG_POSITION:
- "Vende 50% aquí"
- "Mueve stop a $30.20 (entrada original)"
- "Deja el resto apuntar a $32.80"

CONVICTION: HIGH (75%)
```

### Evolución Narrativa (Continuidad)

```
DÍA 1:
"Bitcoin: Veo formación de piso en $81k. Todavía no es momento,
pero estoy mirando."

DÍA 3:
"Bitcoin: El piso se confirma. Si retrocede a $89k, me interesa."

DÍA 5:
"Bitcoin: Llegó a $89,600 esta mañana. Buen punto de entrada
para los que esperaban."

DÍA 8:
"Bitcoin: Posición en verde. Primer objetivo a la vista.
Mantén, no tomes ganancias todavía."

DÍA 12:
"Bitcoin: 🎯 $94,500 alcanzado. Toma parcial. Bien jugado."
```

---

## Roadmap de Implementación

### Fase 1: Fundamentos (Estimación: Media)

1. **Crear colección `instrument_states`**
   - Migrar datos existentes
   - Implementar lógica de rotación previous/current

2. **Implementar motor de reglas básico**
   - Clasificación de estados de mercado
   - Generación de `investmentCard`

3. **Crear sistema de templates básico**
   - Templates para los 12 estados
   - Interpolación de variables

### Fase 2: Coherencia (Estimación: Media)

4. **Motor de coherencia**
   - Implementar las 4 reglas de coherencia
   - Sistema de justificación de cambios

5. **Sistema de eventos/timeline**
   - Tracking de cambios significativos
   - Almacenamiento en timeline

### Fase 3: Narrativa (Estimación: Media-Alta)

6. **Generador de voz ejecutiva**
   - Templates contextuales
   - Continuidad narrativa

7. **Sub-narrativas educativas**
   - Fear & Greed explicado
   - Geopolítica explicada
   - Correlaciones explicadas

### Fase 4: Integración (Estimación: Depende del frontend)

8. **Adaptar `3_process_images.js`**
   - Integrar motor de reglas
   - Integrar generador de narrativa

9. **Modificar dashboard**
   - Sistema de pestañas
   - Vista ejecutivo
   - Vista resumen
   - Vista técnico (existente)

### Fase 5: Refinamiento (Continuo)

10. **Ajuste de templates**
    - Basado en feedback de usuarios
    - A/B testing de narrativas

11. **Preferencias de usuario**
    - Vista por defecto
    - Nivel de detalle
    - Notificaciones

---

## Almacenamiento de Templates (MongoDB)

### Decisión de Diseño

Los templates se almacenan en **base de datos** (no en código) para permitir:

- Cambios sin deploy
- A/B testing de narrativas
- Múltiples idiomas
- Personalización por tipo de cliente (futuro)
- Versionado y rollback

### Colecciones de Templates

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  COLECCIÓN: narrative_templates                                 │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  Templates para los 12 estados de mercado                       │
│  (STRONG_BUY, BUY, BUY_PULLBACK, etc.)                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COLECCIÓN: context_templates                                   │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  Templates para contexto educativo                              │
│  (Fear&Greed, Geopolítico, Correlaciones)                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COLECCIÓN: continuity_templates                                │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  Templates para transiciones y continuidad narrativa            │
│  (Cambios de señal, sesgo mantenido, etc.)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Estructura: narrative_templates

```javascript
{
  _id: ObjectId("..."),

  // Identificación
  stateId: "BUY_PULLBACK",           // Uno de los 12 estados
  language: "es",                     // Idioma
  version: 3,                         // Versión del template
  active: true,                       // Si está activo

  // Configuración de señal
  signal: {
    action: "ESPERAR PULLBACK",       // Texto de la acción
    color: "yellow",                  // green | yellow | orange | red | gray
    icon: "⏳"                        // Emoji representativo
  },

  // Sentimiento emocional
  sentiment: "OPPORTUNISTIC",         // CALM | ALERT | OPPORTUNISTIC | CAUTIOUS | URGENT

  // Templates (con placeholders {variable})
  templates: {
    // Headline principal
    headline: "{asset}: El pullback que esperábamos está cerca.",

    // Guía principal
    guidance: "Si estabas esperando mejor precio, ${idealEntry} es la zona. Con stop en ${stopLoss}, el ratio es {rrRatio}:1.",

    // Acciones según posición actual
    actions: {
      noPosition: {
        do: "Considerar entrada {direction}",
        detail: "Zona de entrada: ${entryFrom} - ${entryTo}. Stop: ${stopLoss}. Objetivos: ${target1} / ${target2}.",
        size: "{positionSize} del capital"
      },
      longPosition: {
        do: "Mantener",
        detail: "Escenario vigente. Stop en ${stopLoss}."
      },
      shortPosition: {
        do: "Reconsiderar",
        detail: "El sesgo técnico no favorece {oppositeDirection} aquí."
      }
    },

    // Lo que el ejecutivo está mirando
    watching: [
      "Si rompe ${breakoutLevel} → puede acelerar hacia ${target2}",
      "Si pierde ${stopLoss} → escenario invalidado",
      "{contextWatching}"
    ],

    // Texto de convicción
    conviction: {
      brief: "Setup {setupQuality} + sentimiento {sentimentQuality}. {caveat}."
    }
  },

  // Variables requeridas (para validación)
  requiredVariables: [
    "asset",
    "idealEntry",
    "stopLoss",
    "rrRatio",
    "direction",
    "entryFrom",
    "entryTo",
    "target1",
    "target2",
    "positionSize",
    "breakoutLevel"
  ],

  // A/B Testing
  abTest: {
    enabled: false,
    testId: null,                     // ID del test activo
    variant: "A",                     // "A" | "B" | "C"
    weight: 100                       // % de usuarios que ven este
  },

  // Metadata
  createdAt: 1704880800000,
  updatedAt: 1704880800000,
  createdBy: "admin",
  notes: "Versión optimizada para crypto"
}
```

### Estructura: context_templates

```javascript
{
  _id: ObjectId("..."),

  // Identificación
  contextType: "fearGreed",           // fearGreed | geopolitical | correlations
  condition: "extremeFear",           // Condición específica
  assetType: "crypto",                // crypto | commodity | forex | stock | all
  language: "es",
  version: 1,
  active: true,

  // Template
  template: "📊 El mercado crypto está en pánico extremo (F&G: {value})\n→ Históricamente, el miedo extremo precede a rebotes importantes. 'Compra cuando hay sangre en las calles.'",

  // Variables requeridas
  requiredVariables: ["value"],

  // Metadata
  createdAt: 1704880800000,
  updatedAt: 1704880800000
}
```

### Catálogo de context_templates

#### Fear & Greed

| contextType | condition | assetType | Descripción |
|-------------|-----------|-----------|-------------|
| fearGreed | extremeFear | crypto | F&G 0-20 para crypto |
| fearGreed | extremeFear | commodity | F&G 0-20 para commodities |
| fearGreed | fear | crypto | F&G 21-40 para crypto |
| fearGreed | fear | commodity | F&G 21-40 para commodities |
| fearGreed | neutral | all | F&G 41-60 |
| fearGreed | greed | crypto | F&G 61-80 para crypto |
| fearGreed | greed | commodity | F&G 61-80 para commodities |
| fearGreed | extremeGreed | crypto | F&G 81-100 para crypto |
| fearGreed | extremeGreed | commodity | F&G 81-100 para commodities |

#### Geopolítico

| contextType | condition | assetType | Descripción |
|-------------|-----------|-----------|-------------|
| geopolitical | defcon5 | all | Sin tensiones |
| geopolitical | defcon4 | all | Normal con cautela |
| geopolitical | defcon3 | safeHaven | Tensión moderada - refugios |
| geopolitical | defcon3 | riskAsset | Tensión moderada - riesgo |
| geopolitical | defcon2 | safeHaven | Alta tensión - refugios |
| geopolitical | defcon2 | riskAsset | Alta tensión - riesgo |
| geopolitical | defcon1 | all | Crisis |

#### Correlaciones

| contextType | condition | assetType | Descripción |
|-------------|-----------|-----------|-------------|
| correlations | dxyWeak | crypto | DXY < 100 favorable crypto |
| correlations | dxyWeak | commodity | DXY < 100 favorable commodities |
| correlations | dxyStrong | crypto | DXY > 103 presión crypto |
| correlations | dxyStrong | commodity | DXY > 103 presión commodities |
| correlations | vixLow | all | VIX < 15 |
| correlations | vixModerate | all | VIX 15-25 |
| correlations | vixHigh | all | VIX > 25 |
| correlations | yieldsRising | commodity | Yields subiendo |
| correlations | yieldsFalling | commodity | Yields bajando |

### Estructura: continuity_templates

```javascript
{
  _id: ObjectId("..."),

  // Identificación
  transitionType: "signalChanged",    // signalChanged | biasMaintained | biasChanged | scenarioNew | scenarioExpired
  fromState: "WAIT_PULLBACK",         // Estado anterior (null si no aplica)
  toState: "BUY",                     // Estado nuevo (null si no aplica)
  language: "es",
  version: 1,
  active: true,

  // Template
  template: "El pullback que esperábamos llegó. {asset} tocó ${triggerPrice} {timeAgo}. La entrada se activó según el plan.",

  // Tono de la transición
  tone: "confirmación",               // confirmación | alerta | celebración | objetivo | cautela | transición

  // Variables requeridas
  requiredVariables: ["asset", "triggerPrice", "timeAgo"],

  // Metadata
  createdAt: 1704880800000,
  updatedAt: 1704880800000
}
```

### Catálogo de continuity_templates

#### Cambios de Señal

| fromState | toState | tone | Descripción |
|-----------|---------|------|-------------|
| WAIT_PULLBACK | BUY | confirmación | Pullback llegó, entrada activada |
| WAIT_CONFIRMATION | BUY | confirmación | Confirmación obtenida |
| BUY | HOLD | neutro | Posición activa, mantener |
| HOLD | TAKE_PARTIAL | celebración | Primer objetivo alcanzado |
| HOLD | TAKE_PROFIT | celebración | Objetivos alcanzados |
| HOLD | CAUTION | alerta | Acercándose a stop |
| CAUTION | STOP_OUT | objetivo | Stop loss ejecutado |
| BUY | CAUTION | alerta | Posición en riesgo |
| * | AVOID | cautela | Condiciones deterioradas |

#### Sesgo Mantenido

| transitionType | condition | tone | Descripción |
|----------------|-----------|------|-------------|
| biasMaintained | withProgress | consistencia | Avanzando hacia objetivo |
| biasMaintained | withPullback | oportunidad | Retroceso saludable |
| biasMaintained | stagnant | paciencia | Consolidando |
| biasMaintained | testing | cautela | Probando niveles clave |

#### Cambios de Sesgo

| transitionType | reason | tone | Descripción |
|----------------|--------|------|-------------|
| biasChanged | targetReached | transición | Escenario completado |
| biasChanged | stopLossHit | objetivo | Escenario invalidado |
| biasChanged | structureBreak | adaptación | Estructura rota |
| biasChanged | timeExpired | neutro | Escenario expirado |

### Queries de Templates

```javascript
// Obtener template de estado activo
async function getStateTemplate(stateId, language = 'es') {
  return await db.collection('narrative_templates').findOne({
    stateId,
    language,
    active: true
  });
}

// Obtener template de contexto
async function getContextTemplate(contextType, condition, assetType, language = 'es') {
  // Primero buscar específico para el asset
  let template = await db.collection('context_templates').findOne({
    contextType,
    condition,
    assetType,
    language,
    active: true
  });

  // Si no existe, buscar genérico (assetType: 'all')
  if (!template) {
    template = await db.collection('context_templates').findOne({
      contextType,
      condition,
      assetType: 'all',
      language,
      active: true
    });
  }

  return template;
}

// Obtener template de continuidad
async function getContinuityTemplate(transitionType, fromState, toState, language = 'es') {
  // Buscar transición específica
  let template = await db.collection('continuity_templates').findOne({
    transitionType,
    fromState,
    toState,
    language,
    active: true
  });

  // Si no existe, buscar con wildcard (fromState: null)
  if (!template) {
    template = await db.collection('continuity_templates').findOne({
      transitionType,
      fromState: null,
      toState,
      language,
      active: true
    });
  }

  return template;
}

// Obtener todos los templates para cachear al inicio
async function getAllActiveTemplates(language = 'es') {
  const [narrativeTemplates, contextTemplates, continuityTemplates] = await Promise.all([
    db.collection('narrative_templates').find({ language, active: true }).toArray(),
    db.collection('context_templates').find({ language, active: true }).toArray(),
    db.collection('continuity_templates').find({ language, active: true }).toArray()
  ]);

  return {
    narrative: narrativeTemplates.reduce((acc, t) => ({ ...acc, [t.stateId]: t }), {}),
    context: contextTemplates,
    continuity: continuityTemplates
  };
}
```

### Interpolación de Variables

```javascript
/**
 * Interpola variables en un template
 *
 * Soporta dos formatos:
 * - {variable} → para texto simple
 * - ${variable} → para valores numéricos/precios
 *
 * @param {string} template - Template con placeholders
 * @param {object} variables - Objeto con valores
 * @returns {string} - Template interpolado
 */
function interpolateTemplate(template, variables) {
  let result = template;

  // Reemplazar {variable}
  result = result.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });

  // Reemplazar ${variable} (con formato de precio)
  result = result.replace(/\$\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined) return match;

    // Formatear como precio
    if (typeof value === 'number') {
      return formatPrice(value);
    }
    return value;
  });

  return result;
}

/**
 * Formatea un número como precio
 */
function formatPrice(value) {
  if (value >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  return value.toFixed(2);
}
```

### Ejemplo de Uso Completo

```javascript
async function generateExecutiveView(analysis, previousState) {
  const { code, timeframe } = analysis.instrument;
  const assetType = analysis.instrument.assetType;

  // 1. Determinar estado de mercado
  const marketState = determineMarketState(analysis);  // "BUY_PULLBACK"

  // 2. Obtener template del estado
  const stateTemplate = await getStateTemplate(marketState);

  // 3. Preparar variables
  const variables = {
    asset: analysis.instrument.name,
    direction: analysis.analysis.mainScenario.direction === 'LONG' ? 'larga' : 'corta',
    oppositeDirection: analysis.analysis.mainScenario.direction === 'LONG' ? 'cortos' : 'largos',
    idealEntry: analysis.analysis.mainScenario.entry,
    entryFrom: analysis.analysis.mainScenario.entry * 0.995,
    entryTo: analysis.analysis.mainScenario.entry * 1.005,
    stopLoss: analysis.analysis.mainScenario.stopLoss,
    target1: analysis.analysis.mainScenario.targets[0]?.level,
    target2: analysis.analysis.mainScenario.targets[1]?.level,
    breakoutLevel: analysis.levels.resistances[0]?.level,
    rrRatio: calculateRR(analysis),
    positionSize: analysis.riskManagement.positionSize,
    setupQuality: analysis.swingAnalysis.entryQuality.toLowerCase(),
    sentimentQuality: getSentimentQuality(analysis.fearGreedContext),
    caveat: getCaveat(analysis)
  };

  // 4. Interpolar template principal
  const headline = interpolateTemplate(stateTemplate.templates.headline, variables);
  const guidance = interpolateTemplate(stateTemplate.templates.guidance, variables);

  // 5. Obtener templates de contexto
  const fgCondition = getFearGreedCondition(analysis.fearGreedContext);
  const fgTemplate = await getContextTemplate('fearGreed', fgCondition, assetType);
  const fgNarrative = interpolateTemplate(fgTemplate.template, {
    value: analysis.fearGreedContext.cryptoValue || analysis.fearGreedContext.stockValue
  });

  // 6. Generar continuidad narrativa
  let continuityNarrative = null;
  if (previousState) {
    const transition = determineTransition(previousState, marketState);
    const contTemplate = await getContinuityTemplate(
      transition.type,
      transition.fromState,
      transition.toState
    );
    if (contTemplate) {
      continuityNarrative = interpolateTemplate(contTemplate.template, {
        ...variables,
        timeAgo: getTimeAgo(previousState.updatedAt)
      });
    }
  }

  // 7. Construir objeto executive
  return {
    headline,
    sentiment: stateTemplate.sentiment,
    guidance,
    signal: stateTemplate.signal,
    actions: interpolateActions(stateTemplate.templates.actions, variables),
    watching: stateTemplate.templates.watching.map(w => interpolateTemplate(w, variables)),
    conviction: {
      level: getConvictionLevel(analysis.analysis.confidence),
      score: analysis.analysis.confidence,
      brief: interpolateTemplate(stateTemplate.templates.conviction.brief, variables)
    },
    context: fgNarrative,
    continuity: continuityNarrative ? {
      previousHeadline: previousState?.current?.executive?.headline,
      daysSinceScenarioStart: getDaysSince(previousState?.activeScenario?.createdAt),
      narrativeThread: continuityNarrative
    } : null
  };
}
```

### Índices Recomendados

```javascript
// narrative_templates
db.narrative_templates.createIndex({ stateId: 1, language: 1, active: 1 }, { unique: true });
db.narrative_templates.createIndex({ "abTest.testId": 1 }, { sparse: true });

// context_templates
db.context_templates.createIndex({ contextType: 1, condition: 1, assetType: 1, language: 1, active: 1 });

// continuity_templates
db.continuity_templates.createIndex({ transitionType: 1, fromState: 1, toState: 1, language: 1, active: 1 });
```

### Estrategia de Caching

```javascript
// Cache en memoria para evitar queries repetitivos
let templatesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getTemplatesWithCache(language = 'es') {
  const now = Date.now();

  // Si el cache es válido, usarlo
  if (templatesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return templatesCache;
  }

  // Recargar cache
  templatesCache = await getAllActiveTemplates(language);
  cacheTimestamp = now;

  console.log('📝 Templates cache actualizado');
  return templatesCache;
}

// Invalidar cache manualmente (después de editar templates)
function invalidateTemplatesCache() {
  templatesCache = null;
  cacheTimestamp = null;
}
```

---

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `2_1D_poc-automated-capture.js` | Captura de gráficos de TradingView |
| `3_process_images.js` | Análisis con Claude Vision + MongoDB |
| `5_scenario_updater.js` | Monitoreo y tracking de escenarios |
| `index_fear_greed.js` | Scraper de Fear & Greed Index |
| `index_pentagon_pizzas.js` | Scraper de Pentagon Pizza Index |

---

## Notas Finales

Este documento representa el diseño conceptual completo del Narrative Engine. La implementación debe seguir las fases descritas, priorizando la coherencia de datos y la calidad de las narrativas sobre la velocidad de desarrollo.

El objetivo final es que el cliente sienta que tiene **un ejecutivo de broker dedicado** que lo acompaña en sus decisiones de trading, no un sistema que escupe datos técnicos.

---

*Documento generado durante sesión de diseño - Enero 2026*
