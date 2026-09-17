import { Request } from 'express';

export type ProcessorFn = (requestDesc: any, req: Request) => Promise<any>;

const processors: Record<string, ProcessorFn> = {};

export const registerProcessor = (classType: string, fn: ProcessorFn) => {
    processors[classType] = fn;
};

export const executeRequestProcessor = async (requestDesc: any, req: Request): Promise<any> => {
    const classType = requestDesc.__class;
    const processor = processors[classType];

    if (!processor) {
        throw new Error(`Unknown class type: ${classType}`);
    }

    return processor(requestDesc, req);
};

export const getProcessors = () => processors;