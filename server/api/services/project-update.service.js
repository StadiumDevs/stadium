import projectUpdateRepository from '../repositories/project-update.repository.js';

class ProjectUpdateService {
  async listByProject(projectId, opts) {
    return await projectUpdateRepository.listByProject(projectId, opts);
  }

  async create(payload) {
    return await projectUpdateRepository.create(payload);
  }
}

export default new ProjectUpdateService();
