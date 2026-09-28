import '@angular/compiler';
import { Observable } from 'rxjs';
import { ImportTransferFormPage } from '../src/app/pages/logged-in/transfer/import-transfer-form/import-transfer-form.page';
import { UploadFilePage } from '../src/app/pages/logged-in/company/upload-file/upload-file.page';
import { ImageUploadComponent } from '../src/app/components/image-upload/image-upload.component';
import { EXCEL_EXTENSIONS } from '../src/app/providers/upload-formats';
import { TEMP_UPLOAD_HOST, uploadTemporaryFile } from '../src/app/providers/temp-upload-session';

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

function alertCtrl(alerts: any[]) {
    return {
        create: async (options) => ({
            present: async () => {
                alerts.push(options);
            }
        })
    };
}

function excelFile(name: string) {
    return { name, type: 'application/vnd.ms-excel', size: 100 };
}

async function main() {
    await check('transfer stays busy through the abort handle and PUT progress', async () => {
        const navigated = [];
        const page = new ImportTransferFormPage(
            { navigateForward: (path, extras) => navigated.push({ path, extras }) } as any,
            {} as any,
            {} as any,
            { handleError() {} } as any,
            alertCtrl([]) as any
        );
        page.bank = 'KFH';
        page.fileInput = { nativeElement: { value: 'keep' } } as any;
        let observer: any;
        page.awsService = {
            uploadFile: () => new Observable((subscriber) => {
                observer = subscriber;
            })
        } as any;

        page.browserUpload({ target: { files: [excelFile('rates.xlsx')] } });
        assert(page.uploading === true, 'upload did not become busy');
        observer.next({ abort() {} });
        assert(page.uploading === true, 'abort handle cleared the busy state');
        assert(navigated.length === 0, 'abort handle navigated');
        observer.next({ type: 'progress', loaded: 10, total: 100 });
        assert(page.uploading === true, 'PUT progress cleared the busy state');
        assert(page.bank === 'KFH', 'bank selection changed during upload');
        observer.next({ Key: 'rates.xlsx', Location: 'https://example.test/rates.xlsx' });
        assert(page.uploading === false, 'successful completion left the form busy');
        assert(navigated.length === 1, 'completion did not navigate');
        assert(navigated[0].path[2] === 'KFH', 'navigation dropped the bank');
        assert(navigated[0].extras.state.bank === 'KFH', 'navigation state dropped the bank');
    });

    await check('unsupported transfer file shows formats, sends no request, and keeps the bank', async () => {
        const alerts = [];
        let posts = 0;
        const page = new ImportTransferFormPage(
            { navigateForward() {} } as any,
            {} as any,
            {} as any,
            { handleError() {} } as any,
            alertCtrl(alerts) as any
        );
        page.bank = 'KFH';
        page.fileInput = { nativeElement: { value: 'existing.xls' } } as any;
        page.awsService = {
            uploadFile: (file, allowedExtensions) => uploadTemporaryFile({
                file,
                maxBytes: 18874368,
                oversizedMessage: 'File size should not exceed 18MB!',
                presignUrl: 'https://admin.api.example.test/v1/temp-upload/url',
                token: 'synthetic-admin-bearer',
                uploadHost: TEMP_UPLOAD_HOST,
                allowedExtensions,
                post: () => {
                    posts += 1;
                    return { subscribe: () => ({ unsubscribe() {} }) };
                }
            })
        } as any;

        await page.browserUpload({ target: { files: [{ name: 'notes.txt', type: 'text/plain', size: 20 }] } });
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert(posts === 0, 'unsupported file requested an upload');
        assert(page.uploading === false, 'failed validation left the form busy');
        assert(page.bank === 'KFH', 'bank selection changed after rejection');
        assert(alerts.length === 1, 'format alert was not shown');
        assert(alerts[0].message.indexOf('Accepted formats:') !== -1, 'accepted formats were hidden');
        assert(alerts[0].message.indexOf('.xlsx') !== -1, 'excel formats were hidden');
        assert(EXCEL_EXTENSIONS.indexOf('xlsx') !== -1, 'excel allowlist changed');
    });

    await check('company document rejection shows formats and keeps the saved file', async () => {
        const alerts = [];
        let posts = 0;
        const page = new UploadFilePage(
            {} as any,
            {} as any,
            {} as any,
            alertCtrl(alerts) as any,
            {} as any,
            {} as any,
            { handleError() {} } as any,
            {} as any
        );
        page.fileModel = { file_s3_path: 'existing-licence.pdf' } as any;
        page.form = {
            controls: {
                file: { value: 'existing-licence.pdf' }
            }
        } as any;
        page.fileInput = { nativeElement: { value: 'picker' } } as any;
        page.awsService = {
            uploadFile: (file, allowedExtensions) => uploadTemporaryFile({
                file,
                maxBytes: 18874368,
                oversizedMessage: 'File size should not exceed 18MB!',
                presignUrl: 'https://admin.api.example.test/v1/temp-upload/url',
                token: 'synthetic-admin-bearer',
                uploadHost: TEMP_UPLOAD_HOST,
                allowedExtensions,
                post: () => {
                    posts += 1;
                    return { subscribe: () => ({ unsubscribe() {} }) };
                }
            })
        } as any;

        page.browserUpload({ target: { files: [{ name: 'notes.txt', type: 'text/plain', size: 20 }] } });
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert(posts === 0, 'unsupported company file requested an upload');
        assert(page.progress === null, 'busy indicator stayed visible');
        assert(page.fileModel.file_s3_path === 'existing-licence.pdf', 'existing file was replaced');
        assert(page.form.controls['file'].value === 'existing-licence.pdf', 'form value was replaced');
        assert(alerts.length === 1, 'format alert was not shown');
        assert(alerts[0].message.indexOf('Accepted formats:') !== -1, 'accepted formats were hidden');
        assert(alerts[0].message.indexOf('https://') === -1, 'alert included a URL');
    });

    await check('image upload shows the format message and keeps the current value', async () => {
        const alerts = [];
        const component = new ImageUploadComponent(
            {} as any,
            {} as any,
            {
                permanentBucketUrl: 'https://example.test/permanent/',
                bucketUrl: 'https://example.test/temp/'
            } as any,
            {} as any,
            {} as any,
            alertCtrl(alerts) as any
        );
        component.value = 'existing-photo.png';
        let posts = 0;
        const upload = uploadTemporaryFile({
            file: { name: 'diagram.svg', type: 'image/svg+xml', size: 20 },
            maxBytes: 18874368,
            oversizedMessage: 'File size should not exceed 18MB!',
            presignUrl: 'https://admin.api.example.test/v1/temp-upload/url',
            token: 'synthetic-admin-bearer',
            uploadHost: TEMP_UPLOAD_HOST,
            allowedExtensions: ['jpg', 'jpeg', 'png'],
            post: () => {
                posts += 1;
                return { subscribe: () => ({ unsubscribe() {} }) };
            }
        });
        component.processFileUpload(upload);
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert(posts === 0, 'unsupported image requested an upload');
        assert(component.isUploading === false, 'image busy indicator stayed visible');
        assert(component.value === 'existing-photo.png', 'existing image value was replaced');
        assert(alerts.length === 1, 'format alert was not shown');
        assert(alerts[0].message.indexOf('Accepted formats:') !== -1, 'accepted formats were hidden');
        assert(alerts[0].message.indexOf('.jpg') !== -1, 'image formats were hidden');
    });

    if (failures > 0) {
        console.error('ADMIN_UPLOAD_CORRECTION_TESTS_FAILED ' + failures);
        process.exit(1);
    }
    console.log('ADMIN_UPLOAD_CORRECTION_TESTS_OK');
}

main();
