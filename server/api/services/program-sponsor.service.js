import sponsorRepository from '../repositories/program-sponsor.repository.js';

class ProgramSponsorService {
  async listByProgramId(programId) {
    return await sponsorRepository.listByProgramId(programId);
  }

  async findById(id) {
    return await sponsorRepository.findById(id);
  }

  async create(payload) {
    return await sponsorRepository.create(payload);
  }

  async update(id, patch) {
    return await sponsorRepository.update(id, patch);
  }

  async delete(id) {
    return await sponsorRepository.delete(id);
  }
}

export default new ProgramSponsorService();
