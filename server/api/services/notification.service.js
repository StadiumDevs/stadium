import walletContactRepository from '../repositories/wallet-contact.repository.js';
import notificationRepository from '../repositories/notification.repository.js';

class NotificationService {
  async notify(walletAddress, eventType, sourceId, payload) {
    const contact = await walletContactRepository.findByWallet(walletAddress);

    let status, error;
    if (!contact || !contact.email) {
      status = 'skipped';
      error = 'no_contact';
    } else if (contact.notificationsEnabled === false) {
      status = 'skipped';
      error = 'opted_out';
    } else {
      status = 'queued';
      error = null;
    }

    return notificationRepository.insertOrGetExisting({
      recipient: walletAddress,
      eventType,
      sourceId,
      payload,
      status,
      error,
    });
  }
}

export default new NotificationService();
