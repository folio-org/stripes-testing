import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C404371 autotest mapping profile ${getRandomPostfix()}`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C404371 autotest action profile ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.CREATE,
    };
    const calloutMessage = `Mapping profile '${mappingProfile.name}' can not be linked to this Action profile. ExistingRecordType and FolioRecord types are different`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C404371 Verify the error message after attempting to link action and field mapping profiles with different record type (folijet)',
      { tags: ['extendedPath', 'folijet', 'C404371'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        NewActionProfile.verifyPreviouslyPopulatedDataIsDisplayed(actionProfile);
        ActionProfileView.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
