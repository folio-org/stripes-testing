import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { ActionProfiles as SettingsActionProfiles } from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2345 autotest action profile ${getRandomStringCode(8)}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };

    const calloutErrorMessage = `New record not created: Action profile '${actionProfile.name}' already exists`;
    const calloutMessage = `New record created:The action profile "${actionProfile.name}" was successfully created`;

    const duplicatedActionProfile = {
      name: `C2345 autotest duplicate action profile ${getRandomStringCode(8)}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };

    before('create user and profile', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
      ActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(duplicatedActionProfile.name);
      });
    });

    it(
      'C2345 Duplicate an existing action profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
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
