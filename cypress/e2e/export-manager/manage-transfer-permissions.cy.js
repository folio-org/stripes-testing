import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import TransferCriteria from '../../support/fragments/settings/users/transferCriteria';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSettingsGeneral from '../../support/fragments/settings/users/usersSettingsGeneral';

describe('Export Manager', () => {
  let user;

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.settingsUsersCRUD.gui,
      Permissions.transferExports.gui,
      Permissions.uiUsersPermissions.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350638 Verify permissions to manage transfer criteria and other transfer settings (bama) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.bama] },
    () => {
      // #1 Go to Settings > Users > Fee/fine > Transfer criteria
      // Transfer criteria option is in the list of Fee/fine options
      cy.login(user.username, user.password, {
        path: TopMenu.transferCriteriaPath,
        waiter: TransferCriteria.waitLoading,
      });

      // #2 Go to the Users app => Search for an current User => Select current User by clicking on the row with User's name
      // Pane with the User Information is appeared
      // Actions menu is enabled
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyUserDetailsPane();
      UsersSearchResultsPane.verifyActionsButtonEnabled();

      // #3 Click on Actions menu => Select Edit => click "Add permissions" on User Permissions accordion
      // A permissions selection box is opened

      // #4 Search for "Transfer exports: Transfer admin" => Uncheck "Transfer exports: Transfer admin" permissions => Click to "Save & close" button
      // "Transfer exports: Transfer admin" permissions is deleted from the User Permissions accordion
      UserEdit.addPermissions(['Transfer exports: Transfer admin']);
      UserEdit.verifyPermissionsNotExistInPermissionsAccordion([
        'Transfer exports: Transfer admin',
      ]);

      // #5 Click to "Save & close" button on the User editing mode
      // "Transfer exports: Transfer admin" permissions is unassigned
      UserEdit.saveAndClose();
      UsersCard.verifyPermissionsNotExist(['Transfer exports: Transfer admin']);

      // #6 Re-login into FOLIO with new set of permissions
      // FOLIO landing page is displayed
      cy.logout();
      cy.login(user.username, user.password);

      // #7 Go to Settings > Users > Fee/fine
      // Check that Transfer criteria option is missing and unavailable in the list of Fee/fine options now
      cy.visit(TopMenu.settingsUserPath);
      UsersSettingsGeneral.checkUserSectionOptionAbsent('Transfer criteria');
    },
  );
});
