// api/index.ts (entrypoint for Vercel)

import expressApp from '../app'; // your current express config

import { createServer } from 'http';
import { parse } from 'url';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = createServer(expressApp);
  server.emit('request', req, res);
}
