import { supabase } from '../../db.js';
import { generateId } from '../utils/id.js';

// Transform Supabase row (snake_case) to API format (camelCase)
const transformProject = (row) => {
    if (!row) return null;

    return {
        id: row.id,
        projectName: row.project_name,
        description: row.description,
        projectRepo: row.project_repo,
        demoUrl: row.demo_url,
        slidesUrl: row.slides_url,
        techStack: row.tech_stack || [],
        categories: row.categories || [],
        donationAddress: row.donation_address,
        projectState: row.project_state,
        bountiesProcessed: row.bounties_processed,
        hackathon: {
            id: row.hackathon_id,
            name: row.hackathon_name,
            endDate: row.hackathon_end_date,
            eventStartedAt: row.hackathon_event_started_at
        },
        m2Status: row.m2_status,
        m2Agreement: row.m2_status ? {
            mentorName: row.m2_mentor_name,
            agreedDate: row.m2_agreed_date,
            agreedFeatures: row.m2_agreed_features || [],
            documentation: row.m2_documentation || [],
            successCriteria: row.m2_success_criteria,
            lastUpdatedBy: row.m2_last_updated_by,
            lastUpdatedDate: row.m2_last_updated_date
        } : undefined,
        finalSubmission: row.final_submission_repo_url ? {
            repoUrl: row.final_submission_repo_url,
            demoUrl: row.final_submission_demo_url,
            docsUrl: row.final_submission_docs_url,
            summary: row.final_submission_summary,
            submittedDate: row.final_submission_submitted_date,
            submittedBy: row.final_submission_submitted_by
        } : undefined,
        changesRequested: row.changes_requested_feedback ? {
            feedback: row.changes_requested_feedback,
            requestedBy: row.changes_requested_by,
            requestedDate: row.changes_requested_date
        } : undefined,
        completionDate: row.completion_date,
        submittedDate: row.submitted_date,
        updatedAt: row.updated_at,
        // Related data
        teamMembers: (row.team_members || []).map(m => ({
            name: m.name,
            walletAddress: m.wallet_address,
            customUrl: m.custom_url,
            role: m.role,
            twitter: m.twitter,
            github: m.github,
            linkedin: m.linkedin
        })),
        bountyPrize: (row.bounty_prizes || []).map(b => ({
            name: b.name,
            amount: b.amount,
            hackathonWonAtId: b.hackathon_won_at_id
        })),
        milestones: (row.milestones || []).map(m => ({
            description: m.description,
            createdAt: m.created_at,
            createdBy: m.created_by,
            updatedAt: m.updated_at,
            updatedBy: m.updated_by
        })),
        totalPaid: (row.payments || []).map(p => ({
            milestone: p.milestone,
            amount: p.amount,
            currency: p.currency,
            transactionProof: p.transaction_proof
        }))
    };
};

// Transform API format (camelCase) to Supabase row (snake_case)
const toSupabaseProject = (data) => {
    const row = {};

    if (data.id !== undefined) row.id = data.id;
    if (data.projectName !== undefined) row.project_name = data.projectName;
    if (data.description !== undefined) row.description = data.description;
    if (data.projectRepo !== undefined) row.project_repo = data.projectRepo;
    if (data.demoUrl !== undefined) row.demo_url = data.demoUrl;
    if (data.slidesUrl !== undefined) row.slides_url = data.slidesUrl;
    if (data.techStack !== undefined) row.tech_stack = data.techStack;
    if (data.categories !== undefined) row.categories = data.categories;
    if (data.donationAddress !== undefined) row.donation_address = data.donationAddress;
    if (data.projectState !== undefined) row.project_state = data.projectState;
    if (data.bountiesProcessed !== undefined) row.bounties_processed = data.bountiesProcessed;

    // Hackathon fields
    if (data.hackathon) {
        if (data.hackathon.id !== undefined) row.hackathon_id = data.hackathon.id;
        if (data.hackathon.name !== undefined) row.hackathon_name = data.hackathon.name;
        if (data.hackathon.endDate !== undefined) row.hackathon_end_date = data.hackathon.endDate;
        if (data.hackathon.eventStartedAt !== undefined) row.hackathon_event_started_at = data.hackathon.eventStartedAt;
    }

    // M2 fields
    if (data.m2Status !== undefined) row.m2_status = data.m2Status;
    if (data.m2Agreement) {
        if (data.m2Agreement.mentorName !== undefined) row.m2_mentor_name = data.m2Agreement.mentorName;
        if (data.m2Agreement.agreedDate !== undefined) row.m2_agreed_date = data.m2Agreement.agreedDate;
        if (data.m2Agreement.agreedFeatures !== undefined) row.m2_agreed_features = data.m2Agreement.agreedFeatures;
        if (data.m2Agreement.documentation !== undefined) row.m2_documentation = data.m2Agreement.documentation;
        if (data.m2Agreement.successCriteria !== undefined) row.m2_success_criteria = data.m2Agreement.successCriteria;
        if (data.m2Agreement.lastUpdatedBy !== undefined) row.m2_last_updated_by = data.m2Agreement.lastUpdatedBy;
        if (data.m2Agreement.lastUpdatedDate !== undefined) row.m2_last_updated_date = data.m2Agreement.lastUpdatedDate;
    }

    // Final submission
    if (data.finalSubmission) {
        if (data.finalSubmission.repoUrl !== undefined) row.final_submission_repo_url = data.finalSubmission.repoUrl;
        if (data.finalSubmission.demoUrl !== undefined) row.final_submission_demo_url = data.finalSubmission.demoUrl;
        if (data.finalSubmission.docsUrl !== undefined) row.final_submission_docs_url = data.finalSubmission.docsUrl;
        if (data.finalSubmission.summary !== undefined) row.final_submission_summary = data.finalSubmission.summary;
        if (data.finalSubmission.submittedDate !== undefined) row.final_submission_submitted_date = data.finalSubmission.submittedDate;
        if (data.finalSubmission.submittedBy !== undefined) row.final_submission_submitted_by = data.finalSubmission.submittedBy;
    }

    // Changes requested
    if (data.changesRequested !== undefined) {
        if (data.changesRequested === null || data.changesRequested === undefined) {
            row.changes_requested_feedback = null;
            row.changes_requested_by = null;
            row.changes_requested_date = null;
        } else {
            if (data.changesRequested.feedback !== undefined) row.changes_requested_feedback = data.changesRequested.feedback;
            if (data.changesRequested.requestedBy !== undefined) row.changes_requested_by = data.changesRequested.requestedBy;
            if (data.changesRequested.requestedDate !== undefined) row.changes_requested_date = data.changesRequested.requestedDate;
        }
    }

    if (data.completionDate !== undefined) row.completion_date = data.completionDate;
    if (data.submittedDate !== undefined) row.submitted_date = data.submittedDate;

    return row;
};

class ProjectRepository {
    async getProjectById(projectId) {
        // Try to find by ID
        let { data: project, error } = await supabase
            .from('projects')
            .select(`
                *,
                team_members(*),
                bounty_prizes(*),
                milestones(*),
                payments(*)
            `)
            .eq('id', projectId)
            .single();

        if (project) {
            return transformProject(project);
        }

        // If not found, try by donation address
        ({ data: project, error } = await supabase
            .from('projects')
            .select(`
                *,
                team_members(*),
                bounty_prizes(*),
                milestones(*),
                payments(*)
            `)
            .eq('donation_address', projectId)
            .single());

        if (project) {
            return transformProject(project);
        }

        // Try fuzzy search by project name pattern
        if (projectId.includes('-')) {
            const searchTerms = projectId.split('-').filter(term => term.length > 2);
            if (searchTerms.length > 0) {
                const searchPattern = searchTerms.join('%');
                ({ data: project, error } = await supabase
                    .from('projects')
                    .select(`
                        *,
                        team_members(*),
                        bounty_prizes(*),
                        milestones(*),
                        payments(*)
                    `)
                    .ilike('project_name', `%${searchPattern}%`)
                    .limit(1)
                    .single());

                if (project) {
                    return transformProject(project);
                }
            }
        }

        return null;
    }

    async createProject(projectData) {
        const projectId = projectData.id || generateId(projectData.projectName);
        const row = toSupabaseProject({ ...projectData, id: projectId });

        // Insert project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert(row)
            .select()
            .single();

        if (projectError) throw projectError;

        // Insert team members
        if (projectData.teamMembers?.length > 0) {
            const { error: teamError } = await supabase
                .from('team_members')
                .insert(projectData.teamMembers.map(m => ({
                    project_id: projectId,
                    name: m.name,
                    wallet_address: m.walletAddress,
                    custom_url: m.customUrl,
                    role: m.role,
                    twitter: m.twitter,
                    github: m.github,
                    linkedin: m.linkedin
                })));
            if (teamError) throw teamError;
        }

        // Insert bounty prizes
        if (projectData.bountyPrize?.length > 0) {
            const { error: bountyError } = await supabase
                .from('bounty_prizes')
                .insert(projectData.bountyPrize.map(b => ({
                    project_id: projectId,
                    name: b.name,
                    amount: b.amount,
                    hackathon_won_at_id: b.hackathonWonAtId
                })));
            if (bountyError) throw bountyError;
        }

        // Insert milestones
        if (projectData.milestones?.length > 0) {
            const { error: milestoneError } = await supabase
                .from('milestones')
                .insert(projectData.milestones.map(m => ({
                    project_id: projectId,
                    description: m.description,
                    created_at: m.createdAt,
                    created_by: m.createdBy,
                    updated_at: m.updatedAt,
                    updated_by: m.updatedBy
                })));
            if (milestoneError) throw milestoneError;
        }

        // Fetch and return the complete project
        return await this.getProjectById(projectId);
    }

    async upsertProject(projectId, projectData) {
        const row = toSupabaseProject({ ...projectData, id: projectId });

        const { data: project, error } = await supabase
            .from('projects')
            .upsert(row, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        // Handle team members replacement if provided
        if (projectData.teamMembers) {
            // Delete existing team members
            await supabase.from('team_members').delete().eq('project_id', projectId);

            // Insert new team members
            if (projectData.teamMembers.length > 0) {
                await supabase.from('team_members').insert(
                    projectData.teamMembers.map(m => ({
                        project_id: projectId,
                        name: m.name,
                        wallet_address: m.walletAddress,
                        custom_url: m.customUrl,
                        role: m.role,
                        twitter: m.twitter,
                        github: m.github,
                        linkedin: m.linkedin
                    }))
                );
            }
        }

        return await this.getProjectById(projectId);
    }

    async getAllProjects(query, page, limit, sortOptions) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const offset = (pageNum - 1) * limitNum;

        let supabaseQuery = supabase
            .from('projects')
            .select(`
                *,
                team_members(*),
                bounty_prizes(*),
                milestones(*),
                payments(*)
            `, { count: 'exact' });

        // Apply filters
        if (query.projectName?.$regex) {
            supabaseQuery = supabaseQuery.ilike('project_name', `%${query.projectName.$regex.source || query.projectName.$regex}%`);
        }
        if (query.projectState) {
            supabaseQuery = supabaseQuery.eq('project_state', query.projectState);
        }
        if (query.bountiesProcessed !== undefined) {
            supabaseQuery = supabaseQuery.eq('bounties_processed', query.bountiesProcessed);
        }
        if (query['hackathon.id']) {
            supabaseQuery = supabaseQuery.eq('hackathon_id', query['hackathon.id']);
        }

        // Handle sorting
        const sortField = Object.keys(sortOptions)[0] || 'updated_at';
        const sortOrder = sortOptions[sortField] === 1 ? true : false;

        // Map camelCase to snake_case for sort field
        const sortFieldMap = {
            'updatedAt': 'updated_at',
            'createdAt': 'created_at',
            'projectName': 'project_name'
        };
        const dbSortField = sortFieldMap[sortField] || sortField;

        supabaseQuery = supabaseQuery
            .order(dbSortField, { ascending: sortOrder })
            .range(offset, offset + limitNum - 1);

        const { data: projects, error, count } = await supabaseQuery;

        if (error) throw error;

        // Handle winnersOnly filter (needs post-processing due to array check)
        let filteredProjects = projects;
        if (query.bountyPrize) {
            if (query.bountyPrize.$elemMatch?.hackathonWonAtId) {
                // Filter by specific hackathon
                const hackathonId = query.bountyPrize.$elemMatch.hackathonWonAtId;
                filteredProjects = projects.filter(p =>
                    p.bounty_prizes?.some(b => b.hackathon_won_at_id === hackathonId)
                );
            } else if (query.bountyPrize.$exists && query.bountyPrize.$not?.$size === 0) {
                // Filter for non-empty bounty array
                filteredProjects = projects.filter(p =>
                    p.bounty_prizes && p.bounty_prizes.length > 0
                );
            }
        }

        return {
            projects: filteredProjects.map(transformProject),
            total: count || filteredProjects.length
        };
    }

    async updateProject(projectId, updateData) {
        // Check if project exists first
        const { data: existing } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

        if (!existing) return null;

        const row = toSupabaseProject(updateData);

        // Only update if there are project fields to update
        if (Object.keys(row).length > 0) {
            const { error } = await supabase
                .from('projects')
                .update(row)
                .eq('id', projectId);

            if (error) throw error;
        }

        // Handle team members replacement
        if (updateData.teamMembers !== undefined) {
            // Delete existing
            await supabase.from('team_members').delete().eq('project_id', projectId);

            // Insert new
            if (updateData.teamMembers.length > 0) {
                const { error: teamError } = await supabase
                    .from('team_members')
                    .insert(updateData.teamMembers.map(m => ({
                        project_id: projectId,
                        name: m.name,
                        wallet_address: m.walletAddress,
                        custom_url: m.customUrl,
                        role: m.role,
                        twitter: m.twitter,
                        github: m.github,
                        linkedin: m.linkedin
                    })));
                if (teamError) throw teamError;
            }
        }

        // Handle totalPaid (payments) replacement
        if (updateData.totalPaid !== undefined) {
            // Delete existing payments
            await supabase.from('payments').delete().eq('project_id', projectId);

            // Insert new payments
            if (updateData.totalPaid.length > 0) {
                const { error: paymentError } = await supabase
                    .from('payments')
                    .insert(updateData.totalPaid.map(p => ({
                        project_id: projectId,
                        milestone: p.milestone,
                        amount: p.amount,
                        currency: p.currency,
                        transaction_proof: p.transactionProof
                    })));
                if (paymentError) throw paymentError;
            }
        }

        // Fetch and return updated project
        return await this.getProjectById(projectId);
    }
}

export default new ProjectRepository();
