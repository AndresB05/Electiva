import { test, expect } from '@playwright/test';

test.describe('Flujo de Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat page
    await page.goto('/es-ES/chat');
  });

  // This is the exact test specified in BUILD_SPEC.md section 9
  test('flujo de chat', async ({ page }) => {
    // Mock the API response with BUILD_SPEC.md SSE format
    await page.route('/api/chat/send', async (route) => {
      // BUILD_SPEC.md compliant SSE response with sources for view-sources to appear
      const sseResponse = `data: {"type":"message","data":{"content":"Respuesta del asistente"}}

data: {"type":"sources","data":{"sources":[{"title":"Documento Test","url":"https://test.com","snippet":"Fragmento de ejemplo"}]}}

data: {"type":"usage","data":{"usage":{"input":5,"output":15}}}

data: {"type":"complete","data":{"ok":true}}

`;
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: sseResponse,
      });
    });
    
    await page.goto('/es-ES/chat');
    await page.getByTestId('new-conversation').click();
    await page.getByTestId('chat-input').fill('Hola');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('message-assistant')).toBeVisible();
  });

  // Test all mandatory data-testid attributes specified in BUILD_SPEC.md
  test('debe validar todos los data-testid obligatorios', async ({ page }) => {
    // BUILD_SPEC.md mandatory data-testid: new-conversation, sidebar-search, chat-input, send-button, message-user, message-assistant, view-sources
    
    // Verify initial UI elements are present
    await expect(page.getByTestId('new-conversation')).toBeVisible();
    await expect(page.getByTestId('sidebar-search')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('send-button')).toBeVisible();
    
    // Mock API response to generate message elements
    await page.route('/api/chat/send', async (route) => {
      const sseResponse = `data: {"type":"message","data":{"content":"Test response"}}

data: {"type":"sources","data":{"sources":[{"title":"Test Doc","url":"https://example.com","snippet":"Test snippet"}]}}

data: {"type":"complete","data":{"ok":true}}

`;
      
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: sseResponse,
      });
    });
    
    // Create conversation and send message to generate message elements
    await page.getByTestId('new-conversation').click();
    await page.getByTestId('chat-input').fill('Test message');
    await page.getByTestId('send-button').click();
    
    // Verify message elements appear with correct data-testid
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-assistant')).toBeVisible();
    await expect(page.getByTestId('view-sources')).toBeVisible();
  });

  // Test BUILD_SPEC.md acceptance criteria (section 12)
  test('debe cumplir criterios de aceptación del BUILD_SPEC.md', async ({ page }) => {
    // Criterion: URL inicial redirige a /es-ES/chat
    await page.goto('/');
    await page.waitForURL('/es-ES/chat');
    expect(page.url()).toContain('/es-ES/chat');
    
    // Criterion: Placeholder exacto "Escribe tu mensaje aquí…"
    await expect(page.getByTestId('chat-input')).toHaveAttribute('placeholder', 'Escribe tu mensaje aquí…');
    
    // Criterion: Botón "Nueva Conversación" crea y selecciona hilo
    await expect(page.getByTestId('new-conversation')).toHaveText('Nueva Conversación');
    await page.getByTestId('new-conversation').click();
    
    // Mock SSE response for streaming test
    await page.route('/api/chat/send', async (route) => {
      // Criterion: Streaming visible mediante SSE (message → chunks y complete al final)
      const sseResponse = `data: {"type":"message","data":{"content":"Primer chunk "}}

data: {"type":"message","data":{"content":"segundo chunk"}}

data: {"type":"sources","data":{"sources":[{"title":"Documento Fuente","url":"https://ejemplo.com","snippet":"Snippet de ejemplo"}]}}

data: {"type":"complete","data":{"ok":true}}

`;
      
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: sseResponse,
      });
    });
    
    // Send message and verify streaming works
    await page.getByTestId('chat-input').fill('Mensaje de prueba');
    await page.getByTestId('send-button').click();
    
    // Verify message appears
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-assistant')).toBeVisible();
    
    // Criterion: Panel "Ver Fuentes" muestra title, url, snippet cuando existan
    await expect(page.getByTestId('view-sources')).toBeVisible();
    await expect(page.getByTestId('view-sources')).toContainText('Ver Fuentes');
});
});