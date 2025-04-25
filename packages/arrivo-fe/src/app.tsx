import { defineApp, useLocation, useNavigate } from '@umijs/max';
import './global.css'
import { AppProviderParent } from './hooks';

export default defineApp({
    rootContainer: (oldContainer) => {
        return (
            <AppProviderParent>
                {oldContainer}
            </AppProviderParent>
        )
    }
})