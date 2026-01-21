import Permissions from '../../support/dictionary/permissions';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

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
        address: {
          type: 'Home',
          country: 'Australia',
        },
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
        cy.createTempUser([
          Permissions.uiUsersView.gui,
          Permissions.uiUsersCreate.gui,
          Permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
  });

  it(
    'C434139 Show country name in user detail screen (volaris)',
    { tags: ['extendedPath', 'volaris', 'C434139'] },
    () => {
      UsersSearchResultsPane.openNewUser();
      UserEdit.fillLastFirstNames(testData.newUser.personal.lastName);
      UserEdit.fillEmailAddress(testData.newUser.personal.email);
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.changeStatus(testData.newUser.status);
      UserEdit.chooseUserType('Patron');
      UserEdit.setExpirationDate();
      UserEdit.changePreferredContact(testData.newUser.preferredContact);
      UserEdit.addAddressWithCountry(
        testData.newUser.personal.address.type,
        testData.newUser.personal.address.country,
      );
      UserEdit.saveAndClose();

      // Verify country field in address table
      Users.verifyCountryOnUserDetailsPane(testData.newUser.personal.address.country);
    },
  );
});
