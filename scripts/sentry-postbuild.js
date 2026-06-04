const { deleteSourceMaps, getProjectSlug, getSentryRelease, runSentryCli } = require('./sentry-release-utils');

const buildOutputPath = './www';
const sentryRelease = getSentryRelease();
const sentryOrg = (process.env.SENTRY_ORG || '').trim();
const sentryProject = getProjectSlug();
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || 'production';
const canUploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && sentryOrg && sentryProject && sentryRelease);

function createRelease() {
	try {
		runSentryCli(['releases', 'new', sentryRelease, '--org', sentryOrg, '--project', sentryProject]);
	} catch (error) {
		if (/already exists/i.test(error.message)) {
			console.warn(`Sentry release already exists: ${sentryRelease}`);
			return;
		}

		throw error;
	}
}

function runOptionalSentryCli(args, label) {
	try {
		runSentryCli(args);
	} catch (error) {
		console.warn(`${label} failed: ${error.message}`);
	}
}

try {
	if (!canUploadSourceMaps) {
		console.log('Skipping Sentry source map upload; missing SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, or release.');
	} else {
		console.log(`Uploading Sentry source maps for ${sentryRelease} to ${sentryOrg}/${sentryProject}.`);

		createRelease();
		runOptionalSentryCli(['releases', 'set-commits', sentryRelease, '--auto', '--org', sentryOrg, '--project', sentryProject], 'Sentry set-commits');
		runSentryCli(['sourcemaps', 'inject', buildOutputPath, '--org', sentryOrg, '--project', sentryProject]);
		runSentryCli(['sourcemaps', 'upload', buildOutputPath, '--release', sentryRelease, '--org', sentryOrg, '--project', sentryProject]);
		runSentryCli(['releases', 'finalize', sentryRelease, '--org', sentryOrg, '--project', sentryProject]);
		runOptionalSentryCli(['deploys', 'new', '--release', sentryRelease, '--env', sentryEnvironment, '--org', sentryOrg, '--project', sentryProject], 'Sentry deploy record');
	}
} finally {
	const deletedCount = deleteSourceMaps(buildOutputPath);
	console.log(`Deleted ${deletedCount} source map file(s) from ${buildOutputPath}.`);
}
