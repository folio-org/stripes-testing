import { Pane, NavListItem } from '../../../../../interactors';
import FieldMappingProfiles from './fieldMappingProfile/fieldMappingProfiles';
import SettingsJobProfiles from './settingsJobProfiles';

const dataImportPane = Pane('Data import');

export const SETTINGS_TABS = {
  // profiles
  JOB_PROFILE: 'Job profiles',
  MATCH_PROFILE: 'Match profiles',
  ACTION_PROFILE: 'Action profiles',
  FIELD_MAPPING_PROFILE: 'Field mapping profiles',
  // other
  FILE_EXTENSIONS: 'File extensions',
  MARC_FIELD_PROTECTION: 'MARC field protection',
};

export default {
  waitLoading() {
    cy.expect(dataImportPane.exists());
  },
  selectSettingsTab(settingsTab) {
    cy.do(NavListItem(settingsTab).click());

    switch (settingsTab) {
      case SETTINGS_TABS.FIELD_MAPPING_PROFILE:
        return FieldMappingProfiles;
      case SETTINGS_TABS.JOB_PROFILE:
        return SettingsJobProfiles;
      default:
        return this;
    }
  },
  goToSettingsDataImport() {
    cy.do(NavListItem('Data import').click());
    cy.expect(dataImportPane.exists());
    Object.values(SETTINGS_TABS).forEach((settingsTab) => {
      cy.expect(dataImportPane.find(NavListItem(settingsTab)).exists());
    });
  },
};
