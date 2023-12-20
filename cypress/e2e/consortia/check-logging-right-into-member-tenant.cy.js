import Permissions from '../../support/dictionary/permissions';
import Affiliations from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';

describe('Users -> Consortia', () => {
  let user;

  before('Create users, data', () => {
    cy.loginAsCollegeAdmin();

    cy.createTempUser([Permissions.uiUsersView.gui])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
        cy.getAdminToken();
        cy.assignAffiliationToUser('cs00000int', user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [Permissions.uiUsersView.gui]);
        cy.login(user.username, user.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
      });
  });

  //   after('Delete users, data', () => {
  //     cy.resetTenant();
  //     cy.getAdminToken();
  //     Users.deleteViaApi(user.userId);
  //     Users.deleteViaApi(testUser.id);
  //   });

  it(
    'C405520: Affiliation in central tenant is automatically added after creating user in the member tenant (consortia)(thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      cy.pause();
    },
  );
});
