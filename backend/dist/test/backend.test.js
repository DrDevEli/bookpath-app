"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_cdk_lib_1 = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const bookpath_api_stack_1 = require("../src/stacks/bookpath-api-stack");
describe('BookPathApiStack', () => {
    it('renders without resources by default', () => {
        const app = new aws_cdk_lib_1.App();
        const stack = new bookpath_api_stack_1.BookPathApiStack(app, 'TestStack', {
            environmentName: 'dev',
        });
        const template = assertions_1.Template.fromStack(stack);
        expect(template.toJSON()).toMatchObject({});
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9iYWNrZW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2Q0FBa0M7QUFDbEMsdURBQWtEO0FBQ2xELHlFQUFvRTtBQUVwRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxpQkFBRyxFQUFFLENBQUM7UUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO1lBQ25ELGVBQWUsRUFBRSxLQUFLO1NBQ3ZCLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBCb29rUGF0aEFwaVN0YWNrIH0gZnJvbSAnLi4vc3JjL3N0YWNrcy9ib29rcGF0aC1hcGktc3RhY2snO1xuXG5kZXNjcmliZSgnQm9va1BhdGhBcGlTdGFjaycsICgpID0+IHtcbiAgaXQoJ3JlbmRlcnMgd2l0aG91dCByZXNvdXJjZXMgYnkgZGVmYXVsdCcsICgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgQm9va1BhdGhBcGlTdGFjayhhcHAsICdUZXN0U3RhY2snLCB7XG4gICAgICBlbnZpcm9ubWVudE5hbWU6ICdkZXYnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICAgIGV4cGVjdCh0ZW1wbGF0ZS50b0pTT04oKSkudG9NYXRjaE9iamVjdCh7fSk7XG4gIH0pO1xufSk7XG4iXX0=