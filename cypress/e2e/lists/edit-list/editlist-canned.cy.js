import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Edit list', () => {
    const userData = {};

    before('Create a user', () => {
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;

        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
      });
    });

    after('Delete a user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411731 Edit list: Canned reports (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
      () => {
        Lists.expiredPatronLoan();
        Lists.actionButton();
        cy.contains('Edit list').should('be.disabled');
        Lists.closeListDetailsPane();
        Lists.waitLoading();
        Lists.clickOnCheckbox('Items');
        Lists.missingItems();
        Lists.actionButton();
        cy.contains('Edit list').should('be.disabled');
      },
    );
  });
});
