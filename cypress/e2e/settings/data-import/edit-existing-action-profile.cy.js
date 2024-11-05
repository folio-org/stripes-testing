import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import { ActionProfiles as SettingsActionProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2348 autotest action profile ${getRandomPostfix()}`,
    };
    const calloutMessage = `The action profile "${actionProfile.name}" was successfully updated`;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });

        ActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
        InteractorsTools.closeCalloutMessage();
        ActionProfileView.closeViewModeForMatchProfile();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      });
    });

    it(
      'C2348 Edit an existing action profile without associated job profile (folijet)',
      { tags: ['criticalPath', 'folijet', 'C2348'] },
      () => {
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.search(actionProfile.name);
        ActionProfiles.verifyActionProfileOpened(actionProfile.name);
        ActionProfileView.edit();
        ActionProfileEdit.verifyScreenName(actionProfile.name);
        ActionProfileEdit.changeAction();
        ActionProfileEdit.save();
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.checkCalloutMessage(calloutMessage);
        ActionProfileView.verifyAction();
      },
    );
  });
});
