import { defineApp, useLocation, useNavigate } from '@umijs/max';
import './global.css'
import { AppProviderParent } from './hooks';
import { configureHttpClient } from './lib/api';

configureHttpClient();

export default defineApp({
    rootContainer: (oldContainer) => {
        return (
            <AppProviderParent>
                {oldContainer}
            </AppProviderParent>
        )
    }
})
