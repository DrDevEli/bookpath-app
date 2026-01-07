import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface BookPathApiStackProps extends StackProps {
    readonly environmentName: 'dev' | 'stage' | 'prod';
}
export declare class BookPathApiStack extends Stack {
    constructor(scope: Construct, id: string, props: BookPathApiStackProps);
}
