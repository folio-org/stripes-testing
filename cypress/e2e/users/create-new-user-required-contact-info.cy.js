import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import testTypes from '../../support/dictionary/testTypes';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Users', () => {
  const createUserData = () => ({
    username: getTestEntityValue('username'),
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
    cy.getAdminToken();
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
    'C421 Create: new user; required: contact info, email, phone, external system ID, address (Prokopovych)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      Users.createViaUi(user).then((id) => {
        user.id = id;
      });
      UsersSearchPane.waitLoading();
      Users.createViaUi(userWithSameName).then((id) => {
        userWithSameName.id = id;
      });
      UsersSearchPane.waitLoading();
      Users.createViaUi(userWithSameBarcode);
      InteractorsTools.checkTextFieldError('Barcode', 'This barcode has already been taken');
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      Users.createViaUi(userWithSameUsername);
      InteractorsTools.checkTextFieldError('Username', 'This username already exists');
    },
  );
});
