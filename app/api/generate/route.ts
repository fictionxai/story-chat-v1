import { NextRequest } from 'next/server';
import { generateStoryIndex, prepareDatasource } from './generate';
import { APIResponse } from '../response';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const job_id = 'job_id' in body ? body.job_id : null;
        const premise = 'premise' in body ? body.premise : null;
        const plan = 'plan' in body ? body.plan : null;
        const story = 'story' in body ? body.story : null;

        if (!job_id || !premise || !plan || !story) {
            return APIResponse.invalidParameters();
        }

        const success = await prepareDatasource(job_id, premise, plan, story);
        if (!success) {
            return APIResponse.error(`${job_id}, failed to prepare datasource`);
        }

        await generateStoryIndex(job_id);

        return APIResponse.success({ job_id });
    } catch (error) {
        console.error('[story generate for job]', error);
        return APIResponse.error((error as Error).message);
    }
}
