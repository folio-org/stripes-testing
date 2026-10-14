import { v4 as uuidv4 } from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    patronUser: {},
    staffUser: {},
    existingSponsor: {},
    existingProxy: {},
    newSponsor: {},
    newProxy: {},
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testData.patronUser = userProperties;
        });
        cy.createTempUser([Permissions.uiUsersEdit.gui, Permissions.uiUserProxies.gui]).then(
          (userProperties) => {
            testData.staffUser = userProperties;
          },
        );
        cy.createTempUser([]).then((userProperties) => {
          testData.existingSponsor = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          testData.existingProxy = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          testData.newSponsor = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          testData.newProxy = userProperties;
        });
      })
      .then(() => {
        // existingProxy can borrow on behalf of patronUser
        cy.createProxyApi({
          userId: testData.patronUser.userId,
          proxyUserId: testData.existingProxy.userId,
          id: uuidv4(),
          requestForSponsor: 'Yes',
          notificationsTo: 'Sponsor',
          accrueTo: 'Sponsor',
          status: 'Active',
        });
        // patronUser can borrow on behalf of existingSponsor
        cy.createProxyApi({
          userId: testData.existingSponsor.userId,
          proxyUserId: testData.patronUser.userId,
          id: uuidv4(),
          requestForSponsor: 'Yes',
          notificationsTo: 'Sponsor',
          accrueTo: 'Sponsor',
          status: 'Active',
        });
      })
      .then(() => {
        cy.login(testData.staffUser.username, testData.staffUser.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.getProxyApi({ query: `userId=${testData.patronUser.userId}` }).then((proxies) => {
      cy.wrap(proxies).each((proxy) => {
        cy.deleteProxyApi(proxy.id);
      });
    });
    cy.getProxyApi({ query: `proxyUserId=${testData.patronUser.userId}` }).then((proxies) => {
      cy.wrap(proxies).each((proxy) => {
        cy.deleteProxyApi(proxy.id);
      });
    });
    Users.deleteViaApi(testData.patronUser.userId);
    Users.deleteViaApi(testData.staffUser.userId);
    Users.deleteViaApi(testData.existingSponsor.userId);
    Users.deleteViaApi(testData.existingProxy.userId);
    Users.deleteViaApi(testData.newSponsor.userId);
    Users.deleteViaApi(testData.newProxy.userId);
  });

  it(
    'C1504466 Selected values from dropdowns for added and existed sponsors and proxies are displayed in appropriate fields (vega)',
    { tags: ['extendedPath', 'vega', 'C1504466'] },
    () => {
      // Step 1: Navigate to patron details, open Edit, expand Proxy/sponsor accordion, add new sponsor
      UsersSearchPane.searchByUsername(testData.patronUser.username);
      UserEdit.openEdit();
      UserEdit.openProxySponsorAccordion();
      UserEdit.clickAddSponsor();
      UserEdit.searchAndSelectSponsorUser(testData.newSponsor.username);
      UserEdit.verifyNewProxySponsorCardExists(testData.newSponsor.username);

      // Step 2: Set dropdown values on new sponsor card
      UserEdit.setAndVerifyProxySponsorCardDropdownValues(testData.newSponsor.username);

      // Step 3: Set same dropdown values on existing sponsor card
      UserEdit.setAndVerifyProxySponsorCardDropdownValues(testData.existingSponsor.username);

      // Step 4: Add new proxy
      UserEdit.clickAddProxy();
      UserEdit.searchAndSelectProxyUser(testData.newProxy.username);
      UserEdit.verifyNewProxySponsorCardExists(testData.newProxy.username);

      // Step 5: Set dropdown values on new proxy card
      UserEdit.setAndVerifyProxySponsorCardDropdownValues(testData.newProxy.username);

      // Step 6: Set same dropdown values on existing proxy card
      UserEdit.setAndVerifyProxySponsorCardDropdownValues(testData.existingProxy.username);

      // Step 7: Save & close
      UserEdit.saveAndClose();

      // Step 8: Expand Proxy/sponsor accordion and verify all changes are persisted
      UsersCard.openProxySponsorAccordion();
      UsersCard.verifyProxySponsorUpdatedRelationship(testData.newSponsor.username);
      UsersCard.verifyProxySponsorUpdatedRelationship(testData.existingSponsor.username);
      UsersCard.verifyProxySponsorUpdatedRelationship(testData.newProxy.username);
      UsersCard.verifyProxySponsorUpdatedRelationship(testData.existingProxy.username);
    },
  );
});
