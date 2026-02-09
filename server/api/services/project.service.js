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
            mainTrackOnly,
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
        const mainTrackOnlyBool = typeof mainTrackOnly === 'string' ? mainTrackOnly === 'true' : Boolean(mainTrackOnly);
        const winnersOnlyBool = typeof winnersOnly === 'string' ? winnersOnly === 'true' : Boolean(winnersOnly);

        if (mainTrackOnlyBool) {
            // M2 program: only main track winners that are in the program (have m2Status)
            const mainTrackMatch = { name: { $regex: /main track/i } };
            if (hackathonId) {
                query.bountyPrize = { $elemMatch: { hackathonWonAtId: hackathonId, ...mainTrackMatch } };
            } else {
                query.bountyPrize = { $elemMatch: mainTrackMatch };
            }
            query.m2Status = { $in: ['building', 'under_review', 'completed'] };
        } else if (winnersOnlyBool) {
            if (hackathonId) {
                query.bountyPrize = { $elemMatch: { hackathonWonAtId: hackathonId } };
            } else {
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

    async updateM2Agreement(projectId, agreementData) {
        const { agreedFeatures, documentation, successCriteria } = agreementData;
        
        // Get existing project to preserve other m2Agreement fields
        const existing = await projectRepository.getProjectById(projectId);
        if (!existing) {
            throw new Error('Project not found');
        }

        // Update m2Agreement with new data while preserving existing fields
        const updatedAgreement = {
            ...existing.m2Agreement,
            agreedFeatures,
            documentation,
            successCriteria,
            lastUpdatedBy: 'team',
            lastUpdatedDate: new Date()
        };

        return await projectRepository.updateProject(projectId, {
            m2Agreement: updatedAgreement
        });
    }
}

export default new ProjectService();