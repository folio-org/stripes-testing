import { APPLICATION_NAMES, EXPORT_MANAGER_SETTINGS_LABELS } from '../../../constants';
import settingsMenu from '../../settingsMenu';
import SettingsPane from '../settingsPane';

export default {
  path: settingsMenu.exportManagerPath,
  waitLoading() {
    SettingsPane.waitLoading();
    SettingsPane.checkPaneIsOpened(APPLICATION_NAMES.EXPORT_MANAGER);
  },
  selectExportManagerJobsSettings() {
    SettingsPane.selectSettingsTab(EXPORT_MANAGER_SETTINGS_LABELS.JOBS);
  },
};
