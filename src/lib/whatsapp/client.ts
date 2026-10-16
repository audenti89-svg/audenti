export async function sendWhatsAppMessage(phoneNumberId: string, recipientPhone: string, messageText: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: { body: messageText },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`WhatsApp API Dispatch Failed: ${JSON.stringify(errorData)}`);
  }
}
