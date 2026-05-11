import { supabase } from '../../db.js';

const transformNotification = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    recipientWallet: row.recipient_wallet,
    eventType: row.event_type,
    sourceId: row.source_id,
    payload: row.payload,
    status: row.status,
    providerMessageId: row.provider_message_id,
    error: row.error,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  };
};

class NotificationRepository {
  async insertOrGetExisting({ recipient, eventType, sourceId, payload, status, error = null }) {
    const { data, error: insertError } = await supabase
      .from('notifications')
      .insert({
        recipient_wallet: recipient,
        event_type: eventType,
        source_id: sourceId,
        payload,
        status,
        error,
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existing, error: selectError } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_wallet', recipient)
          .eq('event_type', eventType)
          .eq('source_id', sourceId)
          .single();
        if (selectError) throw selectError;
        return transformNotification(existing);
      }
      throw insertError;
    }

    return transformNotification(data);
  }

  async markSent(id, providerMessageId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        status: 'sent',
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transformNotification(data);
  }

  async markFailed(id, errorMessage) {
    const { data, error: updateError } = await supabase
      .from('notifications')
      .update({
        status: 'failed',
        error: errorMessage,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    return transformNotification(data);
  }
}

export default new NotificationRepository();
