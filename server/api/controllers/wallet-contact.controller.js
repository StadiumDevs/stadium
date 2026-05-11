import walletContactService from '../services/wallet-contact.service.js';
import { validateSS58, validateEmail } from '../utils/validation.js';

const getContact = async (req, res) => {
  const { address } = req.params;
  if (!validateSS58(address)) {
    return res.status(400).json({ status: 'error', message: 'Invalid wallet address' });
  }
  const data = await walletContactService.getPublicContact(address);
  return res.status(200).json({
    status: 'success',
    data: {
      email_set: data.emailSet,
      notifications_enabled: data.notificationsEnabled,
    },
  });
};

const updateContact = async (req, res) => {
  const { address } = req.params;

  const fields = {};

  if ('email' in req.body) {
    const { email } = req.body;
    if (email !== undefined && email !== null) {
      const result = validateEmail(email);
      if (!result.valid) {
        return res.status(422).json({ status: 'error', message: result.error });
      }
      fields.email = result.normalised;
    } else {
      fields.email = email; // null — pass through
    }
  }

  if ('notifications_enabled' in req.body) {
    const { notifications_enabled } = req.body;
    if (typeof notifications_enabled !== 'boolean') {
      return res.status(422).json({ status: 'error', message: 'notifications_enabled must be a boolean' });
    }
    fields.notificationsEnabled = notifications_enabled;
  }

  const data = await walletContactService.updateContact(address, fields);

  return res.status(200).json({
    status: 'success',
    data: {
      email_set: data.emailSet,
      notifications_enabled: data.notificationsEnabled,
    },
  });
};

export default { getContact, updateContact };
