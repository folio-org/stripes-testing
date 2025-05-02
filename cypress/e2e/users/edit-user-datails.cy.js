import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import Modals from '../../support/fragments/modals';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  const testData = {
    user: {},
    testUser: {},
    editUser: {
      barcode: 'No value set-',
      firstName: 'No value set-',
      username: getTestEntityValue('username'),
      middleName: getTestEntityValue('middleName'),
      lastName: getTestEntityValue('lastName'),
      userType: 'Patron',
      email: `test@${getRandomPostfix()}folio.org`,
      preferredFirstName: getTestEntityValue('preferredFirstName'),
      expirationDate: '11/11/2035',
      externalSystemId: uuid(),
      birthDate: '12/12/2000',
      phone: '1234567890',
      mobilePhone: '2345678901',
      preferredContact: 'Text Message',
      status: 'Inactive',
    },
  };

  beforeEach('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.wrap(true)
        .then(() => {
          cy.createTempUser([Permissions.uiUserEdit.gui]).then((userProperties) => {
            testData.user = userProperties;
          });
          cy.createTempUser([], 'staff').then((userProperties) => {
            testData.testUser = userProperties;
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
  });

  it('C427 Edit user details (volaris)', { tags: ['criticalPath', 'volaris', 'C427'] }, () => {
    UsersSearchPane.searchByUsername(testData.testUser.username);
    UserEdit.openEdit();
    UserEdit.editUserDetails(testData.editUser);
    Modals.confirmModalIfAny();
    UserEdit.saveAndClose();
    UsersCard.openExtendedInformationAccordion();
    UsersCard.openContactInformationAccordion();
    UsersCard.verifyUserDetails(testData.editUser);
  });
});
