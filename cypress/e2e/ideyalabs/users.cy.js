import ledgers from '../../support/fragments/finance/ledgers/ledgers';
import topMenu from '../../support/fragments/topMenu';
import users from '../../support/fragments/users/users';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';
import testTypes from '../../support/dictionary/testTypes';

const barcodeNumber = getRandomPostfix();

const userOne = {
  patronGroup: 'A1A1',
  barcode: barcodeNumber,
  userName: `AutotestUser_${getRandomPostfix()}`,
  personal: {
    lastName: 'User',
    firstName: 'Delete',
    email: `dan${randomFourDigitNumber}@yopmail.com`,
  },
};

const userTwo = {
  patronGroup: 'A1A1',
  barcode: barcodeNumber,
  userName: `AutotestUser_${getRandomPostfix()}`,
  personal: {
    lastName: 'User',
    firstName: 'Delete',
    email: `dan${randomFourDigitNumber}@yopmail.com`,
  },
};

const deleteData = {
  name: 'User Delete',
  selectName: 'User, Delete',
  lastName: 'Script',
  selectLastName: 'Script Test',
};

describe.skip('create a users', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.usersPath);
  });

  after(() => {
    usersSearchPane.searchByLastName(deleteData.lastName);
    usersSearchPane.selectUsersFromList(deleteData.selectLastName);
    users.deleteUser();
    users.checkZeroSearchResultsHeader();
  });

  it(
    'C421 Create: new user; required: contact info, email, phone, external system ID, address (Prokopovych)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      users.createViaUi(userOne);
      cy.visit(topMenu.usersPath);
      users.createViaUi(userTwo);
      users.assertion();
      ledgers.closeOpenedPage();
      users.closeWithoutSavingButton();
      usersSearchPane.searchByKeywords(deleteData.name);
      usersSearchPane.selectUsersFromList(deleteData.selectName);
      users.deleteUser();
      users.checkZeroSearchResultsHeader();
    },
  );
});
