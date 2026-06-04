const path = require('path');
const { getSentryRelease, writeSentryReleaseFile } = require('./sentry-release-utils');

const releaseFilePath = path.join(__dirname, '..', 'src', 'environments', 'sentry-release.ts');
const sentryRelease = getSentryRelease();

writeSentryReleaseFile(releaseFilePath, sentryRelease);

if (sentryRelease) {
	console.log(`Wrote Sentry release: ${sentryRelease}`);
} else {
	console.log('No Sentry release found; wrote empty release value.');
}
