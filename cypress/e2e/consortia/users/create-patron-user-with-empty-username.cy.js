import { NO_VALUE, USER_TYPES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import { getTestEntityValue } from '../../../support/utils/stringTools';

const testUser = {
  username: '', // leave empty
  barcode: getTestEntityValue('barcode'),
  personal: {
    firstName: getTestEntityValue('firstname'),
    preferredFirstName: getTestEntityValue('prefname'),
    middleName: getTestEntityValue('midname'),
    lastName: getTestEntityValue('lastname'),
    email: 'test@folio.org',
  },
  patronGroup: 'undergrad (Undergraduate Student)',
  userType: USER_TYPES.STAFF, // select staff
};
const newUsername = getTestEntityValue('username');

const RESOURCES = {
  ACTOR: 'actor',
  CREATED_USER: 'createdUser',
};

const NATIVE_VALIDATION_MESSAGE = 'Please fill out this field.';

describe('Users', () => {
  const flow = new ExecutionFlowManager();

  before('create test data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      permissions.uiUsersCreate.gui,
      permissions.uiUsersPermissionsView.gui,
      permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      flow.set(RESOURCES.ACTOR, userProperties, () => Users.deleteViaApi(userProperties.userId));

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C418647 Creating new patron user with empty "Username" field (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet', 'C418647'] },
    () => {
      cy.log('<----- STEP 1-2 ----->');
      Users.createViaUiIncomplete(testUser, { submit: false });
      Users.verifyUsernameMandatory();

      cy.log('<----- STEP 3 ----->');
      UserEdit.saveAndCloseStayOnEdit();
      UserEdit.assertUsernameFieldNativeValidationMessage(NATIVE_VALIDATION_MESSAGE);

      cy.log('<----- STEP 4 ----->');
      UserEdit.changeUserType(USER_TYPES.PATRON);
      Users.verifyUsernameMandatory(false);

      cy.log('<----- STEP 5 ----->');
      Users.saveCreatedUser().then(({ response }) => {
        flow.toCleanup(RESOURCES.CREATED_USER, () => Users.deleteViaApi(response.body.id));
      });

      cy.log('<----- STEP 6-7 ----->');
      Users.verifyUsernameOnUserDetailsPane(NO_VALUE);
      Users.verifyUserTypeOnUserDetailsPane(USER_TYPES.PATRON.toLocaleLowerCase());

      cy.log('<----- STEP 8 ----->');
      UserEdit.openEdit();

      cy.log('<----- STEP 9 ----->');
      UserEdit.changeUserType(USER_TYPES.STAFF);

      cy.log('<----- STEP 10 ----->');
      UserEdit.saveAndCloseStayOnEdit();
      UserEdit.assertUsernameFieldNativeValidationMessage(NATIVE_VALIDATION_MESSAGE);

      cy.log('<----- STEP 11 ----->');
      UserEdit.editUsername(newUsername);
      UserEdit.saveEditedUser();

      cy.log('<----- STEP 12 ----->');
      Users.verifyUserTypeOnUserDetailsPane(USER_TYPES.STAFF.toLocaleLowerCase());
      Users.verifyUsernameOnUserDetailsPane(newUsername);
    },
  );
});
