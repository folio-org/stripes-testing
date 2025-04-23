import { ACTION_NAMES_IN_ACTION_PROFILE, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import { ActionProfiles as SettingsActionProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2345 autotest action profile ${getRandomStringCode(8)}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.CREATE,
    };

    const calloutErrorMessage = `New record not created: Action profile '${actionProfile.name}' already exists`;
    const calloutMessage = `New record created:The action profile "${actionProfile.name}" was successfully created`;

    const duplicatedActionProfile = {
      name: `C2345 autotest duplicate action profile ${getRandomStringCode(8)}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
      ActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(duplicatedActionProfile.name);
      });
    });

    it(
      'C2345 Duplicate an existing action profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2345'] },
      () => {
        ActionProfileView.duplicate();
        NewActionProfile.verifyPreviouslyCreatedDataIsDisplayed(actionProfile);
        NewActionProfile.chooseAction(duplicatedActionProfile.action);
        NewActionProfile.saveProfile();
        InteractorsTools.checkCalloutErrorMessage(calloutErrorMessage);
        NewActionProfile.fillName(duplicatedActionProfile.name);
        NewActionProfile.saveProfile();
        InteractorsTools.checkCalloutMessage(calloutMessage);
        ActionProfiles.checkActionProfilePresented(duplicatedActionProfile.name);
      },
    );
  });
});
