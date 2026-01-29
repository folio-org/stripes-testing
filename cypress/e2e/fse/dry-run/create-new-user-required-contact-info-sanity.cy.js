import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import UsersCard from '../../../support/fragments/users/usersCard';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Users', () => {
  const { user, memberTenant } = parseSanityParameters();

  const createUserData = () => ({
    username: 'u' + getRandomPostfix(),
    barcode: getRandomPostfix(),
    personal: {
      firstName: getTestEntityValue('firstname'),
      preferredFirstName: getTestEntityValue('prefname'),
      middleName: getTestEntityValue('midname'),
      lastName: getTestEntityValue('lastname'),
      email: 'test@folio.org',
    },
    patronGroup: 'undergrad (Undergraduate Student)',
  });

  const testUser = createUserData();
  const userWithSameName = createUserData();
  userWithSameName.personal.firstName = testUser.personal.firstName;
  const userWithSameBarcode = createUserData();
  userWithSameBarcode.barcode = testUser.barcode;
  const userWithSameUsername = createUserData();
  userWithSameUsername.username = testUser.username;

  before('Setup', () => {
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

    if (testUser.id) {
      Users.deleteViaApi(testUser.id);
    }
    if (userWithSameName.id) {
      Users.deleteViaApi(userWithSameName.id);
    }
  });

  it(
    'C421 Create: new user; required: contact info, email, phone, external system ID, address (volaris)',
    { tags: ['dryRun', 'volaris', 'C421'] },
    () => {
      Users.createViaUi(testUser).then((id) => {
        testUser.id = id;
      });
      UsersSearchPane.waitLoading();
      Users.createViaUi(userWithSameName).then((id) => {
        userWithSameName.id = id;
      });
      UsersCard.waitLoading();
      UsersCard.close();
      Users.createViaUiIncomplete(userWithSameBarcode);
      cy.wait(10000);
      InteractorsTools.checkTextFieldError('Barcode', 'This barcode has already been taken');
      Users.cancel();
      Users.closeWithoutSavingButton();

      UsersSearchPane.waitLoading();
      Users.createViaUiIncomplete(userWithSameUsername);
      cy.wait(5000);
      InteractorsTools.checkTextFieldErrorIncludingName('Username', 'This username already exists');
    },
  );
});
