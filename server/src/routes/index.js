import contentAPIRoutes from './content-api.js';
import adminRoutes from './admin.js';

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
