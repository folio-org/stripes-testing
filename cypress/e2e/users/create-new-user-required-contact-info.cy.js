import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
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
  const user = createUserData();
  const userWithSameName = createUserData();
  userWithSameName.personal.firstName = user.personal.firstName;
  const userWithSameBarcode = createUserData();
  userWithSameBarcode.barcode = user.barcode;
  const userWithSameUsername = createUserData();
  userWithSameUsername.username = user.username;

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after(() => {
    Users.deleteViaApi(user.id);
    Users.deleteViaApi(userWithSameName.id);
  });

  it(
    'C421 Create: new user; required: contact info, email, phone, external system ID, address (volaris)',
    { tags: ['criticalPath', 'volaris', 'C421', 'eurekaPhase1'] },
    () => {
      Users.createViaUi(user).then((id) => {
        user.id = id;
      });
      UsersSearchPane.waitLoading();
      Users.createViaUi(userWithSameName).then((id) => {
        userWithSameName.id = id;
      });
      UsersSearchPane.waitLoading();
      UsersSearchPane.closeUserDetailsPane();
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
