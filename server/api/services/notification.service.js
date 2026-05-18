import walletContactRepository from '../repositories/wallet-contact.repository.js';
import notificationRepository from '../repositories/notification.repository.js';
import { getEmailTransport } from './email-transport.js';
import { renderEmail } from './notification-templates/index.js';
import projectService from './project.service.js';

class NotificationService {
  async notifyProjectTeam(projectId, eventType, sourceId, payload) {
    try {
      const project = await projectService.getProjectById(projectId);
      if (!project || !Array.isArray(project.teamMembers) || project.teamMembers.length === 0) {
        return [];
      }
      const enrichedPayload = { projectName: project.projectName, ...payload };
      const results = [];
      for (const member of project.teamMembers) {
        if (member.walletAddress) {
          const row = await this.notify(member.walletAddress, eventType, sourceId, enrichedPayload);
          results.push(row);
        }
      }
      return results;
    } catch {
      return [];
    }
  }

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

    const row = await notificationRepository.insertOrGetExisting({
      recipient: walletAddress,
      eventType,
      sourceId,
      payload,
      status,
      error,
    });

    if (row.status === 'queued') {
      return this._trySend(row, eventType, payload, contact.email);
    }

    return row;
  }

  async _trySend(row, eventType, payload, toEmail) {
    // A send failure must never throw to the caller — notify() is invoked from
    // admin controllers (P2-04) where a throw would break the admin action.
    // This outer guard catches transport/render/repository-write failures alike.
    try {
      const transport = await getEmailTransport();

      if (transport === null) {
        return await notificationRepository.markFailed(row.id, 'provider_not_configured');
      }

      try {
        const { subject, html, text } = renderEmail(eventType, payload);
        const result = await transport.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: toEmail,
          subject,
          html,
          text,
        });
        return await notificationRepository.markSent(row.id, result.id);
      } catch (err) {
        return await notificationRepository.markFailed(row.id, String(err?.message ?? err));
      }
    } catch {
      // Last resort: getEmailTransport or a markFailed write itself failed.
      // Return the unmodified queued row rather than throwing.
      return row;
    }
  }
}

export default new NotificationService();
