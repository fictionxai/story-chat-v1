import { NextRequest, NextResponse } from 'next/server';
import { generateStoryIndex } from './generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const job_id = searchParams.get('job_id');

        if (!job_id) {
            return NextResponse.json(
                {
                    code: 400,
                    msg: 'invalid parameters',
                    data: 'job_id is required as a query parameter'
                },
                { status: 200 }
            );
        }

        await generateStoryIndex(job_id);

        return NextResponse.json(
            {
                code: 200,
                msg: 'success',
                data: `${job_id}`
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[story generate for job]', error);
        return NextResponse.json(
            {
                code: 500,
                msg: 'internal_error',
                data: (error as Error).message
            },
            {
                status: 200,
            }
        );
    }
}
