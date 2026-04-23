import fundingSignalRepository from '../repositories/funding-signal.repository.js';

class FundingSignalService {
  async getByProject(projectId) {
    return await fundingSignalRepository.getByProject(projectId);
  }

  async upsert(payload) {
    return await fundingSignalRepository.upsert(payload);
  }
}

export default new FundingSignalService();
