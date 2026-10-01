import '@angular/compiler';
import { AuthService } from '../src/app/providers/auth.service';

let failures = 0;

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    const windowRef = global as any;
    windowRef.window = windowRef;
    windowRef.analytics = { identify() {} };

    let releaseStoredAdmin: (value: { value: string }) => void;
    const storedAdmin = new Promise<{ value: string }>((resolve) => {
        releaseStoredAdmin = resolve;
    });

    const storageService = {
        get(key: string) {
            if (key === 'loggedInAdmin') {
                return storedAdmin;
            }
            return Promise.resolve({ value: null });
        },
        set() {
            return Promise.resolve();
        }
    };

    const auth = new AuthService(
        {} as any,
        storageService as any,
        {} as any,
        { createRenderer: () => ({}) } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {
            errorStorage$: { next() {} },
            userLogin$: { next() {} }
        } as any
    );

    let settled = false;
    const startup = auth.load().then(() => {
        settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert(settled === false, 'startup resolved before the stored token was assigned');
    assert((auth as any)._accessToken == null, 'token was assigned before storage returned');

    releaseStoredAdmin({
        value: JSON.stringify({
            token: 'stored-admin-token',
            id: 7,
            name: 'Stored Admin',
            email: 'stored-admin@example.test'
        })
    });

    await startup;
    assert(settled === true, 'startup stayed pending after the token was assigned');
    assert((auth as any)._accessToken === 'stored-admin-token', 'stored token was not assigned');
    console.log('PASS startup stays pending until the stored token is assigned');

    if (failures > 0) {
        console.error('ADMIN_STARTUP_TOKEN_TEST_FAILED');
        process.exit(1);
    }
    console.log('ADMIN_STARTUP_TOKEN_TEST_OK');
}

main().catch((err) => {
    failures += 1;
    console.error('FAIL startup stays pending until the stored token is assigned');
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
});
