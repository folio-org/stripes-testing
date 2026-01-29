import uuid from 'uuid';
import Modals from '../../../support/fragments/modals';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';
import Users from '../../../support/fragments/users/users';

describe('Users', () => {
  const { user, memberTenant } = parseSanityParameters();
  let testUser = {};
  const testData = {
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

  before('Setup', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password)
      .then(() => {
        // Fetch user details (REQUIRED)
        cy.getUserDetailsByUsername(user.username).then((details) => {
          user.id = details.id;
          user.personal = details.personal;
          user.barcode = details.barcode;
        });
      })
      .then(() => {
        // Create temporary test user for editing
        cy.createTempUser([], 'staff').then((userProperties) => {
          testUser = userProperties;
        });
      });
    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  after('Cleanup', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password);
    if (testUser.userId) {
      Users.deleteViaApi(testUser.userId);
    }
  });

  it('C427 Edit user details (volaris)', { tags: ['dryRun', 'volaris', 'C427'] }, () => {
    UsersSearchPane.searchByUsername(testUser.username);
    UserEdit.openEdit();
    UserEdit.editUserDetails(testData.editUser);
    Modals.confirmModalIfAny();
    UserEdit.saveAndClose();
    UsersCard.openExtendedInformationAccordion();
    UsersCard.openContactInformationAccordion();
    UsersCard.verifyUserDetails(testData.editUser);
  });
});
