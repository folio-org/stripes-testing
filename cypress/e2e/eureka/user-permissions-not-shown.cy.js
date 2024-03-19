import { Pane, including } from '../../../interactors';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('Creating user', () => {
  const testData = {
    lastName: 'TestC442842User' + generateItemBarcode(),
    userType: 'Patron',
    userEmail: 'test@folio.org',
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    cy.getUserGroups({ limit: 1 });
    cy.createTempUser([]).then((createdUserProperties) => {
      testData.tempUser = createdUserProperties;
    });
  });

  afterEach(() => {
    cy.getUsers({ query: `personal.lastName="${testData.lastName}"` }).then(() => {
      Cypress.env('users').forEach((user) => {
        Users.deleteViaApi(user.id);
      });
    });
    Users.deleteViaApi(testData.tempUser.userId);
  });

  it(
    'C442842 "User permissions" accordion is NOT shown when viewing/creating/editing user profile (eureka)',
    { tags: ['smoke', 'eureka'] },
    () => {
      const userGroupOption =
        Cypress.env('userGroups')[0].group + ' (' + Cypress.env('userGroups')[0].desc + ')';
      cy.visit('/users/create');
      Users.checkCreateUserPaneOpened();
      UserEdit.fillRequiredFields(
        testData.lastName,
        userGroupOption,
        'test@folio.org',
        testData.userType,
      );
      UserEdit.verifyUserPermissionsAccordion(false);
      Users.saveCreatedUser();
      Users.checkCreateUserPaneOpened(false);

      Users.verifyLastNameOnUserDetailsPane(testData.lastName);
      cy.expect(Pane(including(testData.lastName)).is({ visible: true, index: 2 }));
      UsersCard.verifyUserPermissionsAccordion(false);

      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();
      UserEdit.verifyUserPermissionsAccordion(false);
      UserEdit.closeUsingIcon();
      UserEdit.checkUserEditPaneOpened(false);

      UsersSearchPane.openUser(testData.tempUser.userId);
      Users.verifyLastNameOnUserDetailsPane(testData.tempUser.lastName);
      UsersCard.verifyUserPermissionsAccordion(false);
      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();
      UserEdit.verifyUserPermissionsAccordion(false);
    },
  );
});
