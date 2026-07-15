import { defineApp, useLocation, useNavigate } from '@umijs/max';
import './global.css'
import { AppProviderParent } from './hooks';
import { configureHttpClient } from './lib/api';
import { initializeClarity } from './lib/clarity';
import { registerPwaServiceWorker } from './lib/pwa';

configureHttpClient();
initializeClarity(process.env.UMI_APP_CLARITY_PROJECT_ID);
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
