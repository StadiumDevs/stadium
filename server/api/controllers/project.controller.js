import projectService from '../services/project.service.js';
import paymentService from '../services/payment.service.js';
import { ALLOWED_CATEGORIES } from '../constants/allowedTech.js';
import { validateSS58, validateM2Submission } from '../utils/validation.js';
import { canEditM2Agreement, isSubmissionWindowOpen, getCurrentWeek } from '../utils/dateHelpers.js';
import logger from '../utils/logger.js';
import { getAuthorizedAddresses } from '../../config/polkadot-config.js';

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

    async updateM2Agreement(req, res) {
        try {
            const { projectId } = req.params;
            const { agreedFeatures, documentation, successCriteria } = req.body;

            // Validate required fields
            if (!agreedFeatures || !Array.isArray(agreedFeatures) || agreedFeatures.length === 0) {
                return res.status(400).json({ 
                    status: "error", 
                    message: "agreedFeatures is required and must be a non-empty array" 
                });
            }

            if (!documentation || !Array.isArray(documentation) || documentation.length === 0) {
                return res.status(400).json({ 
                    status: "error", 
                    message: "documentation is required and must be a non-empty array" 
                });
            }

            if (!successCriteria || typeof successCriteria !== 'string' || !successCriteria.trim()) {
                return res.status(400).json({ 
                    status: "error", 
                    message: "successCriteria is required and must be a non-empty string" 
                });
            }

            const updated = await projectService.updateM2Agreement(projectId, {
                agreedFeatures,
                documentation,
                successCriteria
            });

            if (!updated) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }

            console.log(`✅ M2 Agreement updated for project ${projectId}`);
            res.status(200).json({ status: "success", data: updated });
        } catch (error) {
            console.error("❌ Error updating M2 agreement:", error);
            res.status(500).json({ status: "error", message: error.message || "Failed to update M2 agreement" });
        }
    }

    async updatePayoutAddress(req, res) {
        try {
            const { projectId } = req.params;
            const { donationAddress } = req.body;
            const userWallet = req.user?.address;

            // Validation
            if (!donationAddress || typeof donationAddress !== 'string') {
                return res.status(400).json({
                    status: "error",
                    message: "Payout address is required"
                });
            }

            // Validate SS58 format
            if (!validateSS58(donationAddress)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid SS58 address format. Must be a valid Polkadot/Substrate address (47-48 characters)."
                });
            }

            // Get current project to log the change
            const currentProject = await projectService.getProjectById(projectId);
            if (!currentProject) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }

            // Log the change for security audit
            logger.security(`Payout address change for project ${projectId}:`);
            logger.security(`  Old: ${currentProject.donationAddress || 'none'}`);
            logger.security(`  New: ${donationAddress}`);
            logger.security(`  By: ${userWallet}`);

            // Update payout address
            const updated = await projectService.updateProject(projectId, { donationAddress });

            if (!updated) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }

            logger.update(`Project ${projectId} - Payout address updated by ${userWallet}`);
            res.status(200).json({ 
                status: "success", 
                message: "Payout address updated successfully",
                data: updated 
            });
        } catch (error) {
            logger.error("Update payout address failed:", error);
            res.status(500).json({ 
                status: "error", 
                message: "Failed to update payout address",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    async submitM2Deliverables(req, res) {
        try {
            const { projectId } = req.params;
            const { repoUrl, demoUrl, docsUrl, summary } = req.body;
            const userWallet = req.user?.address;

            // Validate submission data
            const validation = validateM2Submission({ repoUrl, demoUrl, docsUrl, summary });
            if (!validation.valid) {
                return res.status(400).json({
                    status: "error",
                    message: validation.error
                });
            }

            // Get project
            const project = await projectService.getProjectById(projectId);
            if (!project) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }

            // Check if submission window is open (Week 5-6)
            if (project.hackathon?.endDate) {
                const currentWeek = getCurrentWeek(project.hackathon.endDate);
                
                if (currentWeek < 5) {
                    return res.status(400).json({
                        status: "error",
                        message: `Submission window opens in Week 5. Currently in Week ${currentWeek}.`
                    });
                }
                
                if (currentWeek > 6) {
                    return res.status(400).json({
                        status: "error",
                        message: "Submission deadline has passed (Week 6). Contact WebZero for an extension."
                    });
                }
            }

            // Check if already completed
            if (project.m2Status === 'completed') {
                return res.status(400).json({
                    status: "error",
                    message: "M2 has already been completed and approved"
                });
            }

            // Update submission
            const submissionData = {
                finalSubmission: {
                    repoUrl,
                    demoUrl,
                    docsUrl,
                    summary,
                    submittedDate: new Date(),
                    submittedBy: userWallet
                },
                m2Status: 'under_review',
                changesRequested: undefined // Clear any previous change requests
            };

            const updated = await projectService.updateProject(projectId, submissionData);

            if (!updated) {
                return res.status(404).json({ status: "error", message: "Project not found" });
            }

            logger.submission(`Project ${projectId} - M2 deliverables submitted by ${userWallet}`);
            logger.info(`  Repo: ${repoUrl}`);
            logger.info(`  Demo: ${demoUrl}`);
            logger.info(`  Docs: ${docsUrl}`);

            res.status(200).json({
                status: "success",
                message: "M2 deliverables submitted successfully. WebZero will review within 2-3 days.",
                data: updated
            });
        } catch (error) {
            logger.error("M2 submission failed:", error);
            res.status(500).json({
                status: "error",
                message: "Failed to submit M2 deliverables",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Confirm payment for M1 or M2 milestone
     * Admin only - records payment with transaction proof
     */
    async confirmPayment(req, res) {
        try {
            const { projectId } = req.params;
            const { milestone, amount, currency, transactionProof } = req.body;

            // Validation
            if (!milestone || !['M1', 'M2'].includes(milestone)) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Invalid milestone. Must be M1 or M2'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Invalid amount'
                });
            }

            if (!currency || !['USDC', 'DOT'].includes(currency)) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Invalid currency. Must be USDC or DOT'
                });
            }

            if (!transactionProof || !transactionProof.startsWith('http')) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Valid transaction proof URL is required'
                });
            }

            // Get project
            const project = await projectService.getProjectById(projectId);
            if (!project) {
                return res.status(404).json({
                    status: 'error',
                    error: 'Project not found'
                });
            }

            // Check if already paid
            const alreadyPaid = project.totalPaid?.some(p => p.milestone === milestone);
            if (alreadyPaid) {
                return res.status(400).json({
                    status: 'error',
                    error: `${milestone} has already been paid`
                });
            }

            // Prepare payment data
            const paymentData = {
                milestone,
                amount,
                currency,
                transactionProof
            };

            // Add payment to totalPaid array
            const updatedTotalPaid = [...(project.totalPaid || []), paymentData];

            // If M2 payment, mark project as completed
            const updateData = {
                totalPaid: updatedTotalPaid
            };

            if (milestone === 'M2') {
                updateData.m2Status = 'completed';
                updateData.completionDate = new Date().toISOString();
                logger.info(`[PAYMENT] M2 completed for project ${projectId}`);
            }

            // Update project
            const updatedProject = await projectService.updateProject(projectId, updateData);

            logger.info(`[PAYMENT] ${milestone} payment confirmed for project ${projectId}`);
            logger.info(`  Amount: ${amount} ${currency}`);
            logger.info(`  Transaction: ${transactionProof}`);

            res.json({
                status: 'success',
                message: `${milestone} payment confirmed successfully`,
                data: updatedProject
            });
        } catch (error) {
            logger.error('[ERROR] Confirm payment failed:', error);
            res.status(500).json({
                status: 'error',
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Test payment transfer
     * Constructs an unsigned transaction for the frontend to sign with browser wallet
     */
    async testPayment(req, res) {
        try {
            logger.info('[TEST PAYMENT] Constructing test transfer...');

            // Get authorized addresses (admin addresses that can receive test payments)
            const authorizedAddresses = getAuthorizedAddresses();

            if (authorizedAddresses.length < 2) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Need at least 2 authorized addresses for test payment'
                });
            }

            // Default to second admin address as recipient
            const defaultRecipient = authorizedAddresses[1];
            const { recipient = defaultRecipient, amount = 0.1 } = req.body;

            // Validate recipient
            if (!recipient || recipient.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Recipient address is required'
                });
            }

            // Validate amount
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0 || amountNum > 1) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Amount must be between 0 and 1 DOT for test transfers'
                });
            }

            // Convert amount to plancks (1 DOT = 10^10 plancks)
            const amountInPlancks = paymentService.parseBalance(amountNum);

            logger.info(`[TEST PAYMENT] Constructing transfer of ${amountNum} DOT to ${recipient}`);

            // Construct unsigned transaction
            const result = await paymentService.constructTransfer(
                recipient,
                amountInPlancks
            );

            logger.info('[TEST PAYMENT] Transaction constructed successfully');
            logger.info(`  Status: ${result.status}`);
            logger.info(`  Amount: ${result.amountFormatted} DOT`);
            logger.info(`  Network: ${result.network}`);
            logger.info(`  To: ${result.to}`);

            res.json({
                status: 'success',
                message: 'Transaction constructed successfully. Sign with your browser wallet to submit.',
                data: result
            });
        } catch (error) {
            logger.error('[ERROR] Test payment failed:', error);
            res.status(500).json({
                status: 'error',
                error: 'Test payment failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default new ProjectController();