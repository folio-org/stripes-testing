import { Pane, NavListItem } from '../../../../../interactors';
import JobProfiles from './jobProfiles/jobProfiles';
import MatchProfiles from './matchProfiles/matchProfiles';
import ActionProfiles from './actionProfiles/actionProfiles';
import FieldMappingProfiles from './fieldMappingProfile/fieldMappingProfiles';

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
      case SETTINGS_TABS.JOB_PROFILE:
        return JobProfiles;
      case SETTINGS_TABS.MATCH_PROFILE:
        return MatchProfiles;
      case SETTINGS_TABS.ACTION_PROFILE:
        return ActionProfiles;
      case SETTINGS_TABS.FIELD_MAPPING_PROFILE:
        return FieldMappingProfiles;
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
