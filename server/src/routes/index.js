import contentAPIRoutes from './content-api';
import adminRoutes from './admin';

const routes = {
  'content-api': {
    type: 'content-api',
    routes: contentAPIRoutes,
  },
  admin: {
    type: 'admin',
    routes: adminRoutes,
  },
};

export default routes;
