import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2343 autotest action profile ${getRandomStringCode(160)}`,
    };
    const calloutMessage = `The action profile "${actionProfile.name}" was successfully created`;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      ActionProfiles.deleteActionProfile(actionProfile.name);
    });

    it(
      'C2343 Create a new action profile with name longer than 160 symbols (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        ActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
        ActionProfiles.verifyActionProfileOpened(actionProfile.name);
        ActionProfileView.verifyActionProfileTitleName(actionProfile.name);
        ActionProfiles.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
