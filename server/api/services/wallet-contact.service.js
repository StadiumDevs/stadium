import walletContactRepository from '../repositories/wallet-contact.repository.js';

const toPublic = (contact) => ({
  emailSet: contact !== null && contact.email !== null && contact.email !== undefined,
  notificationsEnabled: contact !== null ? contact.notificationsEnabled : true,
});

class WalletContactService {
  async getPublicContact(address, chain = 'substrate') {
    const contact = await walletContactRepository.findByWallet(address, chain);
    if (!contact) {
      return { emailSet: false, notificationsEnabled: true };
    }
    return toPublic(contact);
  }

  async updateContact(address, fields, chain = 'substrate') {
    const contact = await walletContactRepository.upsertByWallet(address, fields, chain);
    return toPublic(contact);
  }
}

export default new WalletContactService();
