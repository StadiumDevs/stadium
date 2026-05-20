import programApplicationRepository from '../repositories/program-application.repository.js';

class ProgramApplicationService {
  async getById(id) {
    return await programApplicationRepository.getById(id);
  }

  async listByProgram(programId) {
    return await programApplicationRepository.listByProgram(programId);
  }

  async listByProject(projectId) {
    return await programApplicationRepository.listByProject(projectId);
  }

  async findOne(payload) {
    return await programApplicationRepository.findOne(payload);
  }

  async create(payload) {
    return await programApplicationRepository.create(payload);
  }

  async updateStatus(payload) {
    return await programApplicationRepository.updateStatus(payload);
  }
}

export default new ProgramApplicationService();
