import { Permissions } from '../../support/dictionary';
import TransferCriteria from '../../support/fragments/settings/users/transferCriteria';
import UsersSettingsGeneral from '../../support/fragments/settings/users/usersSettingsGeneral';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Export Manager', () => {
  let userWithTransferExports;
  let userWithoutTransferExports;

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.settingsUsersCRUD.gui,
      Permissions.transferExports.gui,
    ]).then((userProperties) => {
      userWithTransferExports = userProperties;
    });

    cy.createTempUser([Permissions.settingsUsersCRUD.gui]).then((userProperties) => {
      userWithoutTransferExports = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(userWithTransferExports.userId);
      Users.deleteViaApi(userWithoutTransferExports.userId);
    });
  });

  it(
    'C350638 Verify permissions to manage transfer criteria and other transfer settings (helios) (TaaS)',
    { tags: ['extendedPath', 'helios', 'C350638'] },
    () => {
      // #1 Go to Settings > Users > Fee/fine > Transfer criteria
      // Transfer criteria option is in the list of Fee/fine options
      cy.login(userWithTransferExports.username, userWithTransferExports.password, {
        path: TopMenu.transferCriteriaPath,
        waiter: TransferCriteria.waitLoading,
      });

      // #6 Re-login as user without Transfer exports permission
      // FOLIO landing page is displayed
      cy.login(userWithoutTransferExports.username, userWithoutTransferExports.password, {
        path: TopMenu.settingsUserPath,
        waiter: () => cy.wait(5000),
      });

      // #7 Go to Settings > Users > Fee/fine
      // Transfer criteria option is missing and unavailable in the list of Fee/fine options
      UsersSettingsGeneral.checkUserSectionOptionAbsent('Transfer criteria');
    },
  );
});
