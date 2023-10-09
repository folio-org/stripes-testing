import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import newActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2345 autotest action profile ${getRandomStringCode(8)}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };

    const calloutErrorMessage = `Action profile '${actionProfile.name}' already exists`;
    const calloutMessage = `The action profile "${actionProfile.name}" was successfully created`;

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
      Users.deleteViaApi(user.userId);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      ActionProfiles.deleteActionProfile(duplicatedActionProfile.name);
    });

    it(
      'C2345 Duplicate an existing action profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        ActionProfileView.duplicate();
        newActionProfile.verifyPreviouslyCreatedDataIsDisplayed(actionProfile);
        newActionProfile.chooseAction(duplicatedActionProfile.action);
        newActionProfile.saveProfile();
        newActionProfile.checkCalloutMessage(calloutErrorMessage);
        newActionProfile.fillName(duplicatedActionProfile.name);
        newActionProfile.saveProfile();
        ActionProfiles.checkCalloutMessage(calloutMessage);
        ActionProfiles.checkActionProfilePresented(duplicatedActionProfile.name);
      },
    );
  });
});
