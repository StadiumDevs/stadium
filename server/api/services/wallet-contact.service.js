import walletContactRepository from '../repositories/wallet-contact.repository.js';

const toPublic = (contact) => ({
  emailSet: contact !== null && contact.email !== null && contact.email !== undefined,
  notificationsEnabled: contact !== null ? contact.notificationsEnabled : true,
});

class WalletContactService {
  async getPublicContact(address) {
    const contact = await walletContactRepository.findByWallet(address);
    if (!contact) {
      return { emailSet: false, notificationsEnabled: true };
    }
    return toPublic(contact);
  }

  async updateContact(address, { email, notificationsEnabled }) {
    const contact = await walletContactRepository.upsertByWallet(address, {
      email,
      notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
    });
    return toPublic(contact);
  }
}

export default new WalletContactService();
