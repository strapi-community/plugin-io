import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';
import { MonitoringPage } from './MonitoringPage';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="monitoring" element={<MonitoringPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
