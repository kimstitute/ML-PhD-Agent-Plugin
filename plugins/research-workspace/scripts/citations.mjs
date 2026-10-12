#!/usr/bin/env node
// DOI extraction adapted from pinshuai/literature-review-skill (MIT).
// See THIRD_PARTY_NOTICES.md and licenses/literature-review-skill.txt.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export function extractDois(text) {
  const matches = text.match(/10\.\d{4,}\/[^\s\]"}<>]+/g) || [];
  const cleaned = matches.map(value => {
    // Balanced parentheses are part of legitimate older Elsevier DOIs.
    value = value.replace(/[.,;:]+$/, '');
    while (value.endsWith(')') && (value.match(/\(/g) || []).length < (value.match(/\)/g) || []).length) value = value.slice(0, -1);
    return value.replace(/[.,;:]+$/, '');
  });
  const unique = new Map();
  for (const value of cleaned) if (!unique.has(value.toLowerCase())) unique.set(value.toLowerCase(), value);
  return [...unique.values()];
}
export async function verifyDoi(doi, fetcher = fetch) {
  if (!/^10\.\d{4,}\/\S+$/.test(doi)) throw new Error('Invalid DOI format');
  const report = { doi, resolution: 'unknown', metadataStatus: 'unknown', metadata: null, claimSupport: 'not-assessed' };
  const request = async url => {
    const response = await fetcher(url, { headers: { 'User-Agent': 'ResearchWorkspace/0.1 (DOI metadata verification)', Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    return response;
  };
  try {
    const response = await request(`https://doi.org/api/handles/${encodeURIComponent(doi)}`);
    if (response.status === 404) report.resolution = 'not-found';
    else if (response.ok) {
      const body = await response.json();
      if (body.responseCode === 1) report.resolution = 'resolved';
      else if (body.responseCode === 100) report.resolution = 'not-found';
      else report.resolutionError = `Handle responseCode ${body.responseCode}`;
    } else report.resolutionError = `HTTP ${response.status}`;
  } catch (error) { report.resolutionError = error.message; }
  try {
    const response = await request(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (response.status === 404) report.metadataStatus = 'not-in-crossref';
    else if (response.ok) {
      const body = await response.json();
      const message = body.message;
      if (message && typeof message === 'object' && typeof message.DOI === 'string' && message.DOI.toLowerCase() === doi.toLowerCase()) {
        report.metadataStatus = 'found';
        report.metadata = { doi: message.DOI, title: message.title?.[0] || '', authors: message.author || [], year: (message['published-print'] || message['published-online'] || message.published)?.['date-parts']?.[0]?.[0] || null, journal: message['container-title']?.[0] || '' };
      } else report.metadataError = 'Missing or mismatched Crossref DOI';
    } else report.metadataError = `HTTP ${response.status}`;
  } catch (error) { report.metadataError = error.message; }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { input: { type: 'string' }, doi: { type: 'string' } } });
    if (Boolean(values.input) === Boolean(values.doi)) throw new Error('Use exactly one of --input FILE or --doi DOI');
    const dois = values.doi ? [values.doi] : extractDois(fs.readFileSync(values.input, 'utf8'));
    const reports = [];
    for (const doi of dois) reports.push(await verifyDoi(doi));
    process.stdout.write(`${JSON.stringify({ checkedAt: new Date().toISOString(), reports, warning: 'Identifier metadata verification is NOT claim entailment verification.' }, null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
