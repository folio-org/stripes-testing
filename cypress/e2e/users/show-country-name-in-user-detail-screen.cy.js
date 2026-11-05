import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    testUser: {},
    targetUser: {},
    address: {
      type: 'Home',
      country: 'Australia',
      countryId: 'AU',
    },
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      cy.wrap(true)
        .then(() => {
          cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
            testData.testUser = userProperties;
          });
          cy.createTempUser([]).then((userProperties) => {
            testData.targetUser = userProperties;
            cy.getUsers({ query: `username=${userProperties.username}` }).then(([user]) => {
              cy.getAddressTypesApi({ query: `addressType=="${testData.address.type}"` }).then(
                (addressTypes) => {
                  cy.updateUser({
                    ...user,
                    personal: {
                      ...user.personal,
                      addresses: [
                        {
                          addressTypeId: addressTypes[0].id,
                          countryId: testData.address.countryId,
                          primaryAddress: true,
                        },
                      ],
                    },
                  });
                },
              );
            });
          });
        })
        .then(() => {
          cy.login(testData.testUser.username, testData.testUser.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.testUser.userId);
    Users.deleteViaApi(testData.targetUser.userId);
  });

  it(
    'C434139 Show country name in user detail screen (vega)',
    { tags: ['extendedPath', 'vega', 'C434139'] },
    () => {
      // Step 1: Search for the user with address and open their detail view
      UsersSearchPane.searchByKeywords(testData.targetUser.lastName);
      UsersSearchPane.selectUserFromList(testData.targetUser.lastName);
      Users.verifyUserDetailsPane();

      // Step 2: Navigate to Contact information accordion and expand it
      // Step 3: Verify Country field is present with the correct value
      Users.verifyCountryOnUserDetailsPane(testData.address.country);
    },
  );
});
