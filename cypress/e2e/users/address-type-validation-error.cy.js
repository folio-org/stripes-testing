import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';

describe('Users', () => {
  const testData = {
    user: {},
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
    },
    newUser: {
      personal: {
        lastName: getTestEntityValue('TestUser'),
        email: 'test@folio.org',
        address: 'Home',
        newAddress: 'Work',
      },
      status: 'Active',
      preferredContact: 'Email',
    },
  };

  before('Create test data', () => {
    cy.getAdminToken();
    PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
      (patronGroupResponse) => {
        testData.patronGroup.id = patronGroupResponse;
        cy.createTempUser([Permissions.uiUsersCreate.gui, Permissions.uiUserEdit.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          },
        );
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
  });

  it(
    'C366100 Verify that notification is shown when address types field is empty (volaris)',
    { tags: ['extendedPath', 'volaris', 'C366100'] },
    () => {
      // Step 1: Navigate to Users app and open Create User mode
      UsersSearchResultsPane.openNewUser();

      // Step 2: Fill in required fields
      UserEdit.fillLastFirstNames(testData.newUser.personal.lastName);
      UserEdit.fillEmailAddress(testData.newUser.personal.email);
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.changeStatus(testData.newUser.status);
      UserEdit.setExpirationDate();
      UserEdit.changePreferredContact(testData.newUser.preferredContact);

      UserEdit.chooseUserType('Patron');

      // Step 3: Add empty address and verify error
      UserEdit.addAddressWithoutType();
      UserEdit.saveAndClose();
      UserEdit.verifyAddressTypeError();
      UserEdit.cancelAddressForm();

      // Step 4: Add valid address and save
      UserEdit.addAddress(testData.newUser.personal.address);
      UserEdit.saveAndClose();
      Users.verifyAddressOnUserDetailsPane(testData.newUser.personal.address);

      // Step 5-6: Open user for editing/delete existing address
      UserEdit.openEdit();
      UserEdit.cancelAddressForm();

      // Step 7: Add empty address and verify error again
      UserEdit.addAddressWithoutType();
      UserEdit.saveAndCloseStayOnEdit();
      UserEdit.verifyAddressTypeError();
      UserEdit.cancelAddressForm();

      // Step 8: Add valid address and save
      UserEdit.addAddress(testData.newUser.personal.newAddress);
      UserEdit.saveAndCloseStayOnEdit();
      Users.verifyAddressOnUserDetailsPane(testData.newUser.personal.newAddress);
    },
  );
});
