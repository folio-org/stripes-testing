import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Refresh predefined lists', () => {
  const userData = {};

  before('Create a user', () => {
    cy.getAdminToken();
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

  it('C411820 Refresh list: Canned lists', { tags: ['criticalPath', 'corsair'] }, () => {
    cy.login(userData.username, userData.password);
    cy.visit(TopMenu.listsPath);
    Lists.waitLoading();
    Lists.expiredPatronLoan();
    Lists.actionButton();
    Lists.getViaApi().then((response) => {
      const filteredItem = response.body.content.find(
        (item) => item.name === 'Inactive patrons with open loans',
      );
      cy.intercept('GET', `lists/${filteredItem.id}`).as('getRecords');
    });
    Lists.refreshList();
    cy.wait(7000);
    cy.wait('@getRecords').then((interception) => {
      const totalRecords = interception.response.body.successRefresh.recordsCount;
      cy.contains(`Refresh complete with ${totalRecords} records: View updated list`).should(
        'be.visible',
      );
      cy.contains('View updated list').click();
      cy.contains(`${totalRecords} records found`).should('be.visible');
    });
  });
});
