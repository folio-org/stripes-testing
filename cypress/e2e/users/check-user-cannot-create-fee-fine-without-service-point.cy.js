import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import NewFeeFine from '../../support/fragments/users/newFeeFine';

describe('Check that User cannot create new fee/fine when the user is not logged into a service point', () => {
  let userData = {};

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        cy.createTempUser([Permissions.uiUsersView.gui, Permissions.uiUsersfeefinesCRUD.gui]);
      })
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C367958 Check that User cannot create new fee/fine when the user is not logged into a service point (vega)',
    { tags: ['extendedPath', 'vega', 'C367958'] },
    () => {
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();

      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.verifyAccessDeniedModal();
      NewFeeFine.closeAccessDeniedModal();
      UsersCard.waitLoading();
    },
  );
});
