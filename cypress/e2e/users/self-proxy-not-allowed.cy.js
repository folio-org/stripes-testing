import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    user: {},
  };

  beforeEach('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiUserProxies.gui]).then((userProperties) => {
        testData.user = userProperties;
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
  });

  it(
    'C436 Test that self-proxy is not allowed (volaris)',
    { tags: ['extendedPath', 'volaris', 'C436'] },
    () => {
      UsersSearchPane.searchByUsername(testData.user.username);
      UserEdit.openEdit();
      UserEdit.openProxySponsorAccordion();
      UserEdit.clickAddSponsor();
      UserEdit.searchAndSelectProxyUser(testData.user.username);

      UserEdit.verifyInvalidModal('Sponsor');
      UserEdit.closeInvalidModal('Sponsor');
      UserEdit.verifyNoRecordAdded('Sponsor');

      UserEdit.clickAddProxy();
      UserEdit.searchAndSelectProxyUser(testData.user.username);

      UserEdit.verifyInvalidModal('Proxy');
      UserEdit.closeInvalidModal('Proxy');
      UserEdit.verifyNoRecordAdded('Proxy');
    },
  );
});
