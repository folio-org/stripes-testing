import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import UsersCard from '../../../../support/fragments/users/usersCard';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Users', () => {
  const { user, memberTenant } = parseSanityParameters();
  cy.setTenant(memberTenant.id);
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
  const user1 = createUserData();
  const userWithSameName = createUserData();
  userWithSameName.personal.firstName = user1.personal.firstName;
  const userWithSameBarcode = createUserData();
  userWithSameBarcode.barcode = user1.barcode;
  const userWithSameUsername = createUserData();
  userWithSameUsername.username = user1.username;

  before(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after(() => {
    cy.getUserToken(user.username, user.password, { log: false });
    Users.deleteViaApi(user1.id);
    Users.deleteViaApi(userWithSameName.id);
  });

  it(
    'C421 Create: new user; required: contact info, email, phone, external system ID, address (volaris)',
    { tags: ['criticalPath', 'volaris', 'C421', 'eurekaPhase1'] },
    () => {
      Users.createViaUi(user1).then((id) => {
        user1.id = id;
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
