import CapabilitySets from '../../support/dictionary/capabilitySets';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import TopMenu from '../../support/fragments/topMenu';

describe('Users', () => {
  const testData = {
    patronUser: {},
    staffUser: {},
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testData.patronUser = userProperties;
        });
      })
      .then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testData.staffUser = userProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.staffUser.userId,
            [],
            [CapabilitySets.uiUsersCreate, CapabilitySets.uiUsersEdit],
          );
        });
      })
      .then(() => {
        cy.login(testData.staffUser.username, testData.staffUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.patronUser.userId);
    Users.deleteViaApi(testData.staffUser.userId);
  });

  it(
    'C1434664 "No addresses found" is displayed on User view and edit pages when no addresses exist (vega)',
    { tags: ['extendedPath', 'vega', 'C1434664'] },
    () => {
      // Step 1: Search for User A and open user details page
      UsersSearchPane.searchByUsername(testData.patronUser.username);
      UsersSearchPane.selectUserFromList(testData.patronUser.username);
      UsersCard.waitLoading();

      // Step 2: Expand Contact information accordion, verify "No addresses found"
      UsersCard.openContactInformationAccordion();
      UsersCard.verifyNoAddressesFound();

      // Step 3: Click Actions → Edit
      UserEdit.openEdit();

      // Step 4: Verify "No addresses found" in edit page
      UserEdit.verifyNoAddressesFound();

      // Step 5: Return to search results, click Actions → New
      UserEdit.cancelEdit();
      UsersSearchResultsPane.openNewUser();

      // Step 6: Verify "No addresses found" in create user page
      UserEdit.verifyNoAddressesFound();
    },
  );
});
