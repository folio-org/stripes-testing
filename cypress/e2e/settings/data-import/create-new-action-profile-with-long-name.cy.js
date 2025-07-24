import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { ActionProfiles as SettingsActionProfiles } from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2343 autotest action profile ${getRandomStringCode(160)}`,
    };
    const calloutMessage = `The action profile "${actionProfile.name}" was successfully created`;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: SettingsActionProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      });
    });

    it(
      'C2343 Create a new action profile with name longer than 160 symbols (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2343'] },
      () => {
        SettingsActionProfiles.createWithoutLinkedMappingProfile(actionProfile);
        SettingsActionProfiles.verifyActionProfileOpened(actionProfile.name);
        ActionProfileView.verifyActionProfileTitleName(actionProfile.name);
        SettingsActionProfiles.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
