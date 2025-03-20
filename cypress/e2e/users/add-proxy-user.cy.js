import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    user: {},
    testUser: {},
    proxyUser: {},
  };

  beforeEach('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.wrap(true)
        .then(() => {
          cy.createTempUser([Permissions.uiUserProxies.gui]).then((userProperties) => {
            testData.user = userProperties;
          });
          cy.createTempUser([]).then((userProperties) => {
            testData.testUser = userProperties;
          });
          cy.createTempUser([]).then((userProperties) => {
            testData.proxyUser = userProperties;
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });
  });

  afterEach('Deleting created users', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.testUser.userId);
    Users.deleteViaApi(testData.proxyUser.userId);
  });

  it('C432 Add proxy user to user (volaris)', { tags: ['criticalPath', 'volaris', 'C432'] }, () => {
    UsersSearchPane.searchByUsername(testData.testUser.username);
    UserEdit.openEdit();

    // Open the "Proxy/sponsor" accordion and click "Add" under "Proxies" section
    UserEdit.openProxySponsorAccordion();
    UserEdit.clickAddProxy();

    // Perform search and select a user as proxy
    UserEdit.searchAndSelectProxyUser(testData.proxyUser.username);
    UserEdit.verifyUserProxyDetails(testData.proxyUser.username);

    // Save and close the user record
    UserEdit.saveAndClose();

    // Verify the proxy user is added
    UsersCard.openProxySponsorAccordion();
    UsersCard.verifyUserProxyDetails(testData.proxyUser.username);
  });
});
