import { Pane, NavListItem } from '../../../../../interactors';
import JobProfiles from './jobProfiles/jobProfiles';
import MatchProfiles from './matchProfiles/matchProfiles';
import ActionProfiles from './actionProfiles/actionProfiles';
import FieldMappingProfiles from './fieldMappingProfile/fieldMappingProfiles';

const dataImportPane = Pane('Data import');

export const SETTINGS_TABS = {
  // profiles
  JOB_PROFILES: 'Job profiles',
  MATCH_PROFILES: 'Match profiles',
  ACTION_PROFILES: 'Action profiles',
  FIELD_MAPPING_PROFILES: 'Field mapping profiles',
  // other
  FILE_EXTENSIONS: 'File extensions',
  MARC_FIELD_PROTECTION: 'MARC field protection',
};

export default {
  waitLoading() {
    cy.expect(dataImportPane.exists());
  },
  selectSettingsTab(settingsTab) {
    cy.wait(1000);
    cy.do(NavListItem(settingsTab).click());

    switch (settingsTab) {
      case SETTINGS_TABS.JOB_PROFILES:
        return JobProfiles;
      case SETTINGS_TABS.MATCH_PROFILES:
        return MatchProfiles;
      case SETTINGS_TABS.ACTION_PROFILES:
        return ActionProfiles;
      case SETTINGS_TABS.FIELD_MAPPING_PROFILES:
        return FieldMappingProfiles;
      default:
        return this;
    }
  },
  goToSettingsDataImport() {
    cy.do(NavListItem('Data import').click());
    cy.expect(dataImportPane.exists());
  },
};
