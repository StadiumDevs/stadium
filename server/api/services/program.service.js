import programRepository from '../repositories/program.repository.js';

class ProgramService {
  async list(queryParams = {}) {
    const { status } = queryParams;
    return await programRepository.list({ status });
  }

  async findById(id) {
    return await programRepository.findById(id);
  }

  async findBySlug(slug) {
    return await programRepository.findBySlug(slug);
  }

  async create(payload) {
    return await programRepository.create(payload);
  }

  async updateBySlug(slug, patch) {
    return await programRepository.updateBySlug(slug, patch);
  }
}

export default new ProgramService();
