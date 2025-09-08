import { test, expect } from '@playwright/test';

test.describe('Flujo de Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat page
    await page.goto('/es-ES/chat');
  });

  test('debe redirigir desde la raíz a /es-ES/chat', async ({ page }) => {
    // Navigate to root path
    await page.goto('/');
    
    // Should redirect to chat page
    await page.waitForURL('/es-ES/chat');
    expect(page.url()).toContain('/es-ES/chat');
    
    // Verify chat interface is loaded
    await expect(page.getByTestId('chat-title')).toBeVisible();
  });

  test('debe cargar la interfaz del chat correctamente', async ({ page }) => {
    // Check that the title is displayed
    await expect(page.getByTestId('chat-title')).toBeVisible();
    await expect(page.getByTestId('chat-title')).toHaveText('Chat con IA');

    // Check that the input field is visible
    await expect(page.getByTestId('message-input')).toBeVisible();
    await expect(page.getByTestId('message-input')).toHaveAttribute('placeholder', 'Escribe tu mensaje aquí...');

    // Check that buttons are visible
    await expect(page.getByTestId('send-button')).toBeVisible();
    await expect(page.getByTestId('clear-button')).toBeVisible();

    // Check that configuration inputs are visible
    await expect(page.getByTestId('topk-input')).toBeVisible();
    await expect(page.getByTestId('temperature-input')).toBeVisible();

    // Check that messages container is visible
    await expect(page.getByTestId('messages-container')).toBeVisible();
  });

  test('debe mostrar configuración por defecto correcta', async ({ page }) => {
    // Check default topK value
    await expect(page.getByTestId('topk-input')).toHaveValue('5');
    
    // Check default temperature value
    await expect(page.getByTestId('temperature-input')).toHaveValue('0.7');
  });

  test('debe permitir cambiar la configuración', async ({ page }) => {
    // Change topK value
    await page.getByTestId('topk-input').fill('10');
    await expect(page.getByTestId('topk-input')).toHaveValue('10');

    // Change temperature value
    await page.getByTestId('temperature-input').fill('0.5');
    await expect(page.getByTestId('temperature-input')).toHaveValue('0.5');
  });

  test('debe deshabilitar el botón de envío cuando el input está vacío', async ({ page }) => {
    // Send button should be disabled when input is empty
    await expect(page.getByTestId('send-button')).toBeDisabled();

    // Type a message
    await page.getByTestId('message-input').fill('Hola');
    
    // Send button should be enabled
    await expect(page.getByTestId('send-button')).toBeEnabled();

    // Clear the input
    await page.getByTestId('message-input').fill('');
    
    // Send button should be disabled again
    await expect(page.getByTestId('send-button')).toBeDisabled();
  });

  test('debe mostrar mensaje del usuario al enviarlo', async ({ page }) => {
    const testMessage = 'Este es un mensaje de prueba';
    
    // Fill the input and send message
    await page.getByTestId('message-input').fill(testMessage);
    await page.getByTestId('send-button').click();

    // Check that user message appears
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-user')).toContainText(testMessage);

    // Check that input is cleared
    await expect(page.getByTestId('message-input')).toHaveValue('');
  });

  test('debe mostrar indicador de carga al enviar mensaje', async ({ page }) => {
    // Mock the API to delay response
    await page.route('/api/chat/send', async (route) => {
      // Delay the response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock SSE response
      const sseResponse = `data: {"type": "chunk", "content": "Respuesta de prueba"}\n\ndata: {"type": "complete", "content": " desde n8n", "sources": ["test"], "usage": {"promptTokens": 10, "completionTokens": 15, "totalTokens": 25}}\n\n`;
      
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

    // Fill and send message
    await page.getByTestId('message-input').fill('Test message');
    await page.getByTestId('send-button').click();

    // Check loading indicator appears
    await expect(page.getByTestId('loading-indicator')).toBeVisible();
    await expect(page.getByTestId('loading-indicator')).toHaveText('Cargando...');

    // Check stop button appears during loading
    await expect(page.getByTestId('stop-button')).toBeVisible();
    await expect(page.getByTestId('stop-button')).toHaveText('Detener');

    // Wait for loading to finish
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('stop-button')).not.toBeVisible();
  });

  test('debe limpiar el chat al presionar el botón limpiar', async ({ page }) => {
    // Mock the API response
    await page.route('/api/chat/send', async (route) => {
      const sseResponse = `data: {"type": "complete", "content": "Respuesta de prueba", "sources": [], "usage": {"promptTokens": 5, "completionTokens": 10, "totalTokens": 15}}\n\n`;
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: sseResponse,
      });
    });

    // Send a message first
    await page.getByTestId('message-input').fill('Mensaje de prueba');
    await page.getByTestId('send-button').click();

    // Wait for messages to appear
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-assistant')).toBeVisible();

    // Clear the chat
    await page.getByTestId('clear-button').click();

    // Check that messages are cleared
    await expect(page.getByTestId('message-user')).not.toBeVisible();
    await expect(page.getByTestId('message-assistant')).not.toBeVisible();
  });

  test('debe manejar errores de la API correctamente', async ({ page }) => {
    // Mock API error
    await page.route('/api/chat/send', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Send a message
    await page.getByTestId('message-input').fill('Test error message');
    await page.getByTestId('send-button').click();

    // Check that error message appears in assistant message
    await expect(page.getByTestId('message-assistant')).toBeVisible();
    await expect(page.getByTestId('message-assistant')).toContainText('Error al enviar mensaje');
  });

  test('debe permitir enviar mensaje con Enter', async ({ page }) => {
    // Mock the API response
    await page.route('/api/chat/send', async (route) => {
      const sseResponse = `data: {"type": "complete", "content": "Respuesta enviada con Enter", "sources": [], "usage": {"promptTokens": 5, "completionTokens": 10, "totalTokens": 15}}\n\n`;
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: sseResponse,
      });
    });

    const testMessage = 'Mensaje enviado con Enter';
    
    // Fill input and press Enter
    await page.getByTestId('message-input').fill(testMessage);
    await page.getByTestId('message-input').press('Enter');

    // Check that message was sent
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-user')).toContainText(testMessage);
  });

  test('debe mostrar fuentes y usage cuando están disponibles', async ({ page }) => {
    // Mock API response with sources and usage
    await page.route('/api/chat/send', async (route) => {
      const sseResponse = `data: {"type": "complete", "content": "Respuesta con fuentes", "sources": ["Fuente 1", "Fuente 2"], "usage": {"promptTokens": 10, "completionTokens": 20, "totalTokens": 30}}\n\n`;
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: sseResponse,
      });
    });

    // Send message
    await page.getByTestId('message-input').fill('Mensaje con fuentes');
    await page.getByTestId('send-button').click();

    // Wait for assistant message
    await expect(page.getByTestId('message-assistant')).toBeVisible();
    
    // Check that sources are displayed
    const assistantMessage = page.getByTestId('message-assistant');
    await expect(assistantMessage).toContainText('Fuentes:');
    await expect(assistantMessage).toContainText('Fuente 1');
    await expect(assistantMessage).toContainText('Fuente 2');
    
    // Check that usage is displayed
    await expect(assistantMessage).toContainText('Tokens: 30 (10+20)');
  });
});