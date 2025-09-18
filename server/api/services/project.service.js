import projectRepository from '../repositories/project.repository.js';

class ProjectService {
    async getProjectById(projectId) {
        return await projectRepository.getProjectById(projectId);
    }

    async createProject(projectData) {
        return await projectRepository.createProject(projectData);
    }

    async upsertProject(projectId, projectData) {
        return await projectRepository.upsertProject(projectId, projectData);
    }

    async getAllProjects(queryParams) {
        const {
            page = 1,
            limit = 10,
            search,
            projectState,
            bountiesProcessed,
            sortBy = 'updatedAt',
            sortOrder = 'desc',
            hackathonId,
            winnersOnly,
        } = queryParams;

        const query = {};
        if (search) {
            query.projectName = { $regex: search, $options: "i" };
        }
        if (projectState) {
            query.projectState = projectState;
        }
        if (bountiesProcessed !== undefined) {
            query.bountiesProcessed = bountiesProcessed === 'true';
        }
        if (hackathonId) {
            query['hackathon.id'] = hackathonId;
        }
        // winnersOnly can be boolean or string
        const winnersOnlyBool = typeof winnersOnly === 'string' ? winnersOnly === 'true' : Boolean(winnersOnly);
        if (winnersOnlyBool) {
            if (hackathonId) {
                query.bountyPrize = { $elemMatch: { hackathonWonAtId: hackathonId } };
            } else {
                // Non-empty bountyPrize array
                query.bountyPrize = { $exists: true, $not: { $size: 0 } };
            }
        }

        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const { projects, total } = await projectRepository.getAllProjects(query, page, limit, sortOptions);

        return {
            data: projects,
            meta: {
                total,
                count: projects.length,
                limit: parseInt(limit, 10) || 10,
                page: parseInt(page, 10)
            }
        };
    }

    async updateProject(projectId, updateData) {
        // Enforce 'Winners' category based on bountyPrize
        if (Object.prototype.hasOwnProperty.call(updateData, 'categories')) {
            try {
                const existing = await projectRepository.getProjectById(projectId);
                const hasWon = Array.isArray(existing?.bountyPrize) && existing.bountyPrize.length > 0;
                let categories = Array.isArray(updateData.categories) ? updateData.categories.slice() : [];
                // Remove Winners if present; re-add if eligible
                categories = categories.filter(c => c !== 'Winners');
                if (hasWon) categories.push('Winners');
                updateData.categories = categories;
            } catch (e) {
                // If lookup fails, ignore enforcement and proceed
            }
        }
        return await projectRepository.updateProject(projectId, updateData);
    }
}

export default new ProjectService();