import { NextResponse } from 'next/server';

export enum ResponseCode {
    SUCCESS = 200,
    BAD_REQUEST = 400,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500
}

export enum ResponseMessage {
    SUCCESS = 'success',
    INVALID_PARAMETERS = 'invalid parameters',
    NOT_FOUND = 'not found',
    INTERNAL_ERROR = 'internal error'
}

export interface APIResponse<T = string> {
    code: ResponseCode;
    msg: string;
    data: T;
}

export class APIResponse {
    static success<T>(data: T) {
        return NextResponse.json<APIResponse<T>>(
            {
                code: ResponseCode.SUCCESS,
                msg: ResponseMessage.SUCCESS,
                data
            },
            { status: 200 }
        );
    }

    static invalidParameters(message: string = '') {
        return NextResponse.json<APIResponse>(
            {
                code: ResponseCode.BAD_REQUEST,
                msg: ResponseMessage.INVALID_PARAMETERS,
                data: message
            },
            { status: 200 }
        );
    }

    static error(message: string = '') {
        return NextResponse.json<APIResponse>(
            {
                code: ResponseCode.INTERNAL_ERROR,
                msg: ResponseMessage.INTERNAL_ERROR,
                data: message
            },
            { status: 200 }
        );
    }
}