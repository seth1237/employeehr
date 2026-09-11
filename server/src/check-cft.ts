import { getCftIngestStatus } from './services/cft/cftIngestScheduler';
import { runCftIngestCycle } from './services/cft/cftIngestScheduler';

async function main() {
    console.log("Status:", getCftIngestStatus());
}
main().catch(console.error);
