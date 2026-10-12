/**
 * Safely dispatches an email notification to the recipient of a chat message.
 * Handled asynchronously with automatic cooldown buffer and deduplication on the backend.
 */
export async function triggerChatEmailNotification(params: {
  senderId: string;
  recipientId: string;
  messageContent: string;
  senderName?: string;
  packageTitle?: string;
  senderRole?: 'user' | 'agency';
}): Promise<{ success: boolean; delivered?: boolean; skipped?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/notifications/send-chat-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[Chat Email] Dispatch notice:', data?.error || res.statusText);
      return { success: false, error: data?.error };
    }

    return data;
  } catch (err: any) {
    console.warn('[Chat Email] Dispatch error:', err?.message || err);
    return { success: false, error: err?.message };
  }
}
