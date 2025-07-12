// api/index.ts
import app from '../app';
import serverlessExpress from '@vendia/serverless-express';

export default serverlessExpress({ app });
