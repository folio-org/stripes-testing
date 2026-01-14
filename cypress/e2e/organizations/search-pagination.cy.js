import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  let user;

  before('Create user', () => {
    cy.getAdminToken();
    cy.createTempUser([permissions.uiOrganizationsView.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });
  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C353532 Organizations search style and position of pagination (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C353532'] },
    () => {
      Organizations.verifySearchAndFilterPane();
      Organizations.selectActiveStatus();
      Organizations.verifyPagination(50);
      Organizations.clickNextPaginationButton();
      Organizations.clickPreviousPaginationButton();
    },
  );
});
