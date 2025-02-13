import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Delete list', () => {
    const userData = {};

    before('Create a user', () => {
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    after('Delete a user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411769 Delete list: Canned reports (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.expiredPatronLoan();
        Lists.actionButton();
        cy.contains('Edit list').should('be.disabled');
        Lists.closeListDetailsPane();
        cy.wait(2000);
        Lists.missingItems();
        cy.contains('Edit list').should('be.disabled');
      },
    );
  });
});
