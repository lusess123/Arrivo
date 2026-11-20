import { defineApp } from '@umijs/max';
import './global.css'
import { LanguageProvider } from './components/language-provider';
import { localizedPageTitle } from './lib/locale';
import { AppProviderParent } from './hooks';
import { configureHttpClient } from './lib/api';
import { initializeClarity } from './lib/clarity';
import { registerPwaServiceWorker } from './lib/pwa';

configureHttpClient();
// Task text can be entered on the home page and in MindSwitch.
if (typeof window !== 'undefined') {
    const { pathname } = window.location;
    if (pathname !== '/' && !/^\/mind-switch(?:\/|$)/i.test(pathname)) {
        initializeClarity(process.env.UMI_APP_CLARITY_PROJECT_ID);
    }
}
void registerPwaServiceWorker();

export default defineApp({
    onRouteChange: ({ location }) => {
        document.title = localizedPageTitle(location.pathname);
    },
    rootContainer: (oldContainer) => {
        return (
            <LanguageProvider>
                <AppProviderParent>{oldContainer}</AppProviderParent>
            </LanguageProvider>
        )
    }
})
