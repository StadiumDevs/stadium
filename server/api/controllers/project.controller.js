import projectService from '../services/project.service.js';
import { ALLOWED_CATEGORIES } from '../constants/allowedTech.js';

class ProjectController {
    async getProjectById(req, res) {
        try {
            const { projectId } = req.params;
            const project = await projectService.getProjectById(projectId);
            if (!project) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }
            res.status(200).json({ status: "success", data: project });
        } catch (error) {
            console.error("❌ Error fetching project:", error);
            res.status(500).json({ status: "error", message: "Server error" });
        }
    }

    async createProject(req, res) {
        try {
            const projectData = req.body || {};
            const created = await projectService.createProject(projectData);
            res.status(201).json({ status: "success", data: created });
        } catch (error) {
            console.error("❌ Error creating project:", error);
            res.status(500).json({ status: "error", message: "Failed to create project" });
        }
    }

    async getAllProjects(req, res) {
        try {
            const result = await projectService.getAllProjects(req.query);
            res.status(200).json({ status: "success", ...result });
        } catch (error) {
            console.error("❌ Error fetching projects:", error);
            res.status(500).json({ status: "error", message: "Failed to fetch projects" });
        }
    }

    async updateProject(req, res) {
        try {
            const { projectId } = req.params;
            const updateData = req.body;

            // Debug logging for incoming payload (safe fields only)
            try {
                const preview = JSON.stringify(updateData)?.slice(0, 500);
                console.log(`[ProjectController] updateProject payload for ${projectId}:`, preview);
            } catch {}

            if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
                return res.status(400).json({ status: "error", message: "Request body cannot be empty." });
            }

            // Basic shape validation for teamMembers replacement updates
            if (Object.prototype.hasOwnProperty.call(updateData, 'teamMembers')) {
                if (!Array.isArray(updateData.teamMembers)) {
                    return res.status(422).json({ status: "error", message: "teamMembers must be an array" });
                }
                const invalid = updateData.teamMembers.some(m => !m || typeof m !== 'object' || typeof (m.name || '') !== 'string');
                if (invalid) {
                    return res.status(422).json({ status: "error", message: "Each team member must be an object with at least a name string." });
                }
            }

            if (Object.prototype.hasOwnProperty.call(updateData, 'categories')) {
                if (!Array.isArray(updateData.categories)) {
                    return res.status(422).json({ status: "error", message: "categories must be an array" });
                }
                const bad = updateData.categories.filter(c => !ALLOWED_CATEGORIES.includes(String(c)));
                if (bad.length > 0) {
                    return res.status(422).json({ status: "error", message: `Invalid categories: ${bad.join(', ')}` });
                }
                // Prevent user from setting 'Winners' directly; backend will enforce derivation
                if (updateData.categories.includes('Winners')) {
                    return res.status(422).json({ status: "error", message: "'Winners' category is managed automatically and cannot be set manually." });
                }
            }

            const updatedProject = await projectService.updateProject(projectId, updateData);

            if (!updatedProject) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }

            res.status(200).json({ status: "success", data: updatedProject });
        } catch (error) {
            console.error("❌ Error updating project:", error);
            res.status(500).json({ status: "error", message: "Failed to update project" });
        }
    }

    async replaceTeamMembers(req, res) {
        try {
            const { projectId } = req.params;
            const { teamMembers } = req.body || {};

            if (!Array.isArray(teamMembers)) {
                return res.status(422).json({ status: "error", message: "teamMembers must be an array" });
            }
            const invalid = teamMembers.some(m => !m || typeof m !== 'object' || typeof (m.name || '') !== 'string');
            if (invalid) {
                return res.status(422).json({ status: "error", message: "Each team member must have a name (string)." });
            }

            const updated = await projectService.updateProject(projectId, { teamMembers });
            if (!updated) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }
            res.status(200).json({ status: "success", data: updated });
        } catch (error) {
            console.error("❌ Error replacing team members:", error);
            res.status(500).json({ status: "error", message: "Failed to replace team members" });
        }
    }
}

export default new ProjectController();