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
}

export default new ProgramService();
