import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('lists', () => {
  describe('Export query', () => {
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

    it('C411810 Export list: Canned lists', { tags: ['smoke', 'corsair'] }, () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.expiredPatronLoan();
      Lists.actionButton();
      Lists.exportList();
      cy.contains(
        'Export of Inactive patrons with open loans is being generated. This may take some time for larger lists.',
      );
      cy.contains('List Inactive patrons with open loans was successfully exported to CSV.');
    });
  });
});
