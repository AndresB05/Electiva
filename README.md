# Chat Andrés Blanco

Un proyecto de chat con IA construido con Next.js 14, TypeScript, Tailwind CSS y next-intl, integrado con n8n para el procesamiento de chat.

## Stack Tecnológico

- **Next.js 14** - Framework de React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework de CSS utilitario
- **next-intl** - Internacionalización
- **Playwright** - Testing E2E

## Características

- 🔄 **Server-Sent Events (SSE)** para streaming en tiempo real
- 🌐 **Integración con n8n** via webhooks
- 🎛️ **Configuración ajustable** (topK, temperature)
- 📱 **Diseño responsive** con Tailwind CSS
- 🌍 **Internacionalización** en español (es-ES)
- 🧪 **Tests E2E** con Playwright
- ⚡ **Chunking inteligente** de respuestas (600-800 caracteres)

## Configuración

### 1. Instalación de dependencias

```bash
pnpm install
```

### 2. Configuración de variables de entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Configura las siguientes variables:

```env
# N8N Configuration
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_PATH=/webhook/chat
```

### 3. Configuración de n8n

Asegúrate de que tu instancia de n8n esté ejecutándose y tenga configurado un webhook que:

**Recibe (Request):**
```json
{
  "chatInput": "string",
  "topK": "number (opcional, default: 5)",
  "temperature": "number (opcional, default: 0.7)"
}
```

**Responde (Response):**
```json
{
  "output": "string",
  "sources": "string[] (opcional)",
  "usage": {
    "promptTokens": "number",
    "completionTokens": "number", 
    "totalTokens": "number"
  }
}
```

## Desarrollo

### Ejecutar en modo desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

### Construir para producción

```bash
pnpm build
pnpm start
```

### Ejecutar tests

```bash
pnpm test:e2e
```

## Estructura del Proyecto

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx      # Layout principal con next-intl
│   │   └── page.tsx        # Página principal
│   ├── api/
│   │   └── chat/
│   │       └── send/
│   │           └── route.ts # API endpoint con SSE
│   └── globals.css         # Estilos globales
├── components/
│   └── ChatInterface.tsx   # Componente principal del chat
├── i18n.ts                 # Configuración de next-intl
└── middleware.ts           # Middleware de internacionalización

messages/
└── es-ES.json             # Traducciones en español

tests/
└── chat-flow.spec.ts      # Tests E2E del flujo de chat
```

## API Endpoints

### POST `/api/chat/send`

Endpoint principal para enviar mensajes al chat con soporte SSE.

**Request:**
```json
{
  "chatInput": "Tu mensaje aquí",
  "topK": 5,
  "temperature": 0.7
}
```

**Response (SSE):**
```
data: {"type": "status", "message": "Connecting to AI..."}
data: {"type": "chunk", "content": "Parte del mensaje..."}
data: {"type": "complete", "content": "Última parte", "sources": [...], "usage": {...}}
```

## Testing

Los tests E2E verifican:

- ✅ Carga correcta de la interfaz
- ✅ Envío de mensajes
- ✅ Recepción de respuestas streaming
- ✅ Configuración de parámetros (topK, temperature)
- ✅ Funcionalidad de limpiar chat

## Características Técnicas

### Server-Sent Events (SSE)
- Streaming de respuestas en tiempo real
- Chunking automático de respuestas largas (600-800 caracteres)
- Manejo de errores y reconexión

### Integración n8n
- Mapeo exacto de parámetros: `{chatInput, topK, temperature}`
- Respuesta estructurada: `{output, sources?, usage?}`
- Manejo de errores y timeouts

### Internacionalización
- Textos en español (es-ES)
- Configurado con next-intl
- Extensible a otros idiomas

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo `LICENSE` para más detalles.