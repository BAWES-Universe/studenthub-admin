import * as fs from 'fs';
import * as path from 'path';
import { TEMP_UPLOAD_HOST, uploadTemporaryFile } from '../src/app/providers/temp-upload-session';
import { redactPresignedUploadBreadcrumb } from '../src/app/providers/sentry-presign-redaction';

const ADMIN_MAX = 18874368;
const SIGNATURE = 'synthetic-signature-value';
const CREDENTIAL = 'AKIATEMPUPLOADTEST01/20260101/eu-west-2/s3/aws4_request';
const SIGNED_URL = 'https://' + TEMP_UPLOAD_HOST
    + '/photo-1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential='
    + encodeURIComponent(CREDENTIAL)
    + '&X-Amz-Date=20260101T000000Z&X-Amz-Expires=600&X-Amz-Signature='
    + SIGNATURE
    + '&X-Amz-SignedHeaders=host%3Bx-amz-acl';

const root = process.env.ADMIN_ROOT || path.resolve(__dirname, '..');
let failures = 0;

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function check(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
        .then(fn)
        .then(() => console.log('PASS ' + name))
        .catch((err) => {
            failures += 1;
            console.error('FAIL ' + name);
            console.error(err instanceof Error ? err.stack : err);
        });
}

function presignBody() {
    return {
        method: 'PUT',
        upload_url: SIGNED_URL,
        key: 'photo-1.png',
        bucket: 'studenthub-public-anyone-can-upload-24hr-expiry',
        public_url: 'https://' + TEMP_UPLOAD_HOST + '/photo-1.png',
        headers: {
            'Content-Type': 'application/pdf',
            'x-amz-acl': 'public-read'
        },
        expires_in: 600
    };
}

function fakeXhr(status: number) {
    return {
        status,
        upload: {} as any,
        open() {},
        setRequestHeader() {},
        send() {
            if (this.upload.onprogress) {
                this.upload.onprogress({ lengthComputable: true, loaded: 10, total: 100 });
            }
            this.onload();
        },
        abort() {}
    } as any;
}

async function main() {
    await check('18 MB file presigns and completes without changing the signed URL', async () => {
        const events = [];
        let posted = false;
        const uploadUrl = SIGNED_URL;
        await new Promise<void>((resolve, reject) => {
            uploadTemporaryFile({
                file: { name: 'document.pdf', type: 'application/pdf', size: ADMIN_MAX },
                maxBytes: ADMIN_MAX,
                oversizedMessage: 'File size should not exceed 18MB!',
                presignUrl: 'https://admin.api.example.test/v1/temp-upload/url',
                token: 'synthetic-admin-bearer',
                uploadHost: TEMP_UPLOAD_HOST,
                allowedExtensions: ['pdf'],
                post: (url, body, headers) => {
                    posted = true;
                    assert(url.indexOf('/temp-upload/url') !== -1, 'presign path changed');
                    assert(headers.Authorization === 'Bearer synthetic-admin-bearer', 'bearer header missing');
                    assert(body.file_size === ADMIN_MAX, 'declared size changed');
                    return {
                        subscribe: (next) => {
                            next(presignBody());
                            return { unsubscribe() {} };
                        }
                    };
                },
                createRequest: () => fakeXhr(200)
            }).subscribe((event) => {
                events.push(event);
            }, reject, resolve);
        });
        assert(posted, 'presign was not requested');
        assert(uploadUrl === SIGNED_URL, 'signed upload URL was mutated');
        assert(typeof events[0].abort === 'function', 'abort handle was not emitted');
        assert(events.some((event) => event.type === 'progress' && event.loaded === 10), 'progress was dropped');
        assert(events.some((event) => event.Key === 'photo-1.png' && event.Location.indexOf(TEMP_UPLOAD_HOST) !== -1), 'save fields were dropped');
    });

    await check('a file above 18 MB fails before presign', async () => {
        let posted = false;
        let message = '';
        await new Promise<void>((resolve) => {
            uploadTemporaryFile({
                file: { name: 'document.pdf', type: 'application/pdf', size: ADMIN_MAX + 1 },
                maxBytes: ADMIN_MAX,
                oversizedMessage: 'File size should not exceed 18MB!',
                presignUrl: 'https://admin.api.example.test/v1/temp-upload/url',
                token: 'synthetic-admin-bearer',
                uploadHost: TEMP_UPLOAD_HOST,
                post: () => {
                    posted = true;
                    return { subscribe: () => ({ unsubscribe() {} }) };
                }
            }).subscribe(() => {}, (err) => {
                message = err.message;
                resolve();
            }, resolve);
        });
        assert(!posted, 'oversized file requested a presign');
        assert(message === 'File size should not exceed 18MB!', 'size failure message changed');
    });

    await check('presign failure does not expose the signed URL', async () => {
        let message = '';
        await new Promise<void>((resolve) => {
            uploadTemporaryFile({
                file: { name: 'document.pdf', type: 'application/pdf', size: 100 },
                maxBytes: ADMIN_MAX,
                oversizedMessage: 'File size should not exceed 18MB!',
                presignUrl: 'https://admin.api.example.test/v1/temp-upload/url',
                token: 'synthetic-admin-bearer',
                uploadHost: TEMP_UPLOAD_HOST,
                post: () => ({
                    subscribe: (_next, error) => {
                        error(new Error(SIGNED_URL));
                        return { unsubscribe() {} };
                    }
                })
            }).subscribe(() => {}, (err) => {
                message = err.message;
                resolve();
            }, resolve);
        });
        assert(message === 'Temporary upload is unavailable.', 'presign failure was not sanitized');
        assert(message.indexOf(SIGNATURE) === -1, 'signature leaked in the error');
    });

    await check('repeated object breadcrumb is dropped', () => {
        const detail = { upload: SIGNED_URL };
        const redacted = redactPresignedUploadBreadcrumb({
            category: 'console',
            message: 'upload failed: ' + SIGNED_URL,
            data: {
                arguments: [detail, detail],
                logger: 'console'
            }
        });
        assert(redacted === null, 'repeated signed object was kept');
        assert(detail.upload === SIGNED_URL, 'original object was mutated');
    });

    await check('Admin service keeps 18 MB and does not load browser credentials', () => {
        const aws = fs.readFileSync(path.join(root, 'src/app/providers/aws.service.ts'), 'utf8');
        const moduleSource = fs.readFileSync(path.join(root, 'src/app/app.module.ts'), 'utf8');
        assert(aws.indexOf('18874368') !== -1, 'Admin 18 MB limit is missing');
        assert(aws.indexOf('5242880') === -1, 'Staff 5 MB limit was copied into Admin');
        assert(aws.indexOf('aws-sdk') === -1, 'browser AWS SDK remains');
        assert(aws.indexOf('/aws/config') === -1, 'credential config fallback remains');
        assert(aws.indexOf('/temp-upload/url') !== -1, 'presign endpoint missing');
        assert(moduleSource.indexOf('setConfig') === -1, 'startup still loads AWS config');
    });

    if (failures > 0) {
        console.error('ADMIN_PRESIGN_TESTS_FAILED ' + failures);
        process.exit(1);
    }
    console.log('ADMIN_PRESIGN_TESTS_OK');
}

main();
