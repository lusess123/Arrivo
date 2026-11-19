import { defineApp } from '@umijs/max';
import './global.css'
import { AppProviderParent } from './hooks';
import { configureHttpClient } from './lib/api';
import { initializeClarity } from './lib/clarity';
import { registerPwaServiceWorker } from './lib/pwa';

configureHttpClient();
// MindSwitch is opened in a separate navigation so private content stays outside session recordings.
if (typeof window !== 'undefined' && !/^\/mind-switch(?:\/|$)/i.test(window.location.pathname)) {
    initializeClarity(process.env.UMI_APP_CLARITY_PROJECT_ID);
}
void registerPwaServiceWorker();

export default defineApp({
    rootContainer: (oldContainer) => {
        return (
            <AppProviderParent>
                {oldContainer}
            </AppProviderParent>
        )
    }
})
