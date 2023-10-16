import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Settings', () => {
    let user;

    before('create user', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
    });

    it(
      'C2328 Create a file extension for a blocked file type and ensure that file type cannot be uploaded (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {},
    );
  });
});
