import ledgers from '../../support/fragments/finance/ledgers/ledgers';
import topMenu from '../../support/fragments/topMenu';
import users from '../../support/fragments/users/users';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getFourDigitRandomNumber } from '../../support/utils/stringTools';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const barcodeNumber = getRandomPostfix();

const userOne = {
  patronGroup: 'A1A1',
  barcode: barcodeNumber,
  userName: `AutotestUser_${getRandomPostfix()}`,
  personal: {
    lastName: 'User',
    firstName: 'Delete',
    email: `dan${getFourDigitRandomNumber}@yopmail.com`,
  },
};

const userTwo = {
  patronGroup: 'A1A1',
  barcode: barcodeNumber,
  userName: `AutotestUser_${getRandomPostfix()}`,
  personal: {
    lastName: 'User',
    firstName: 'Delete',
    email: `dan${getFourDigitRandomNumber}@yopmail.com`,
  },
};

const userThree = {
  patronGroup: 'A1A1',
  barcode: `678${getFourDigitRandomNumber}`,
  userName: `Mann${getFourDigitRandomNumber}`,
  personal: {
    lastName: 'Script',
    firstName: 'Auto',
    email: `dan${getFourDigitRandomNumber}@yopmail.com`,
    middleName: 'Test',
    preferredFirstName: 'Dan',
  },
};

const deleteData = {
  name: 'User Delete',
  selectName: 'User, Delete',
  lastName: 'Script',
  selectLastName: 'Script Test',
};

const verifyData = {
  verifyLastNameOnUserDetailsPane: 'Script',
  verifyPreferredfirstnameOnUserDetailsPane: 'Dan',
  verifyFirstNameOnUserDetailsPane: 'Auto',
  verifyMiddleNameOnUserDetailsPane: 'Test',
  verifyClearFirstNameDetailsPane: 'No value set-'
};

describe('create a users', () => {
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

  it('C421 Create: new user; required: contact info, email, phone, external system ID, address (Prokopovych)', { tags: [testTypes.criticalPath, devTeams.prokopovych] }, () => {
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
  });

  it('C11096 Add Preferred first name and confirm its display in the User record View and Edit screens (Volaris)', { tags: [testTypes.Extended, devTeams.volaris] }, () => {
    users.createData(userThree);
    users.verifyPreferredfirstnameOnUserDetailsPane(
      verifyData.verifyPreferredfirstnameOnUserDetailsPane
    );
    users.verifyLastNameOnUserDetailsPane(
      verifyData.verifyLastNameOnUserDetailsPane
    );
    users.verifyMiddleNameOnUserDetailsPane(
      verifyData.verifyMiddleNameOnUserDetailsPane
    );
    users.editButton();
    users.clearTextField();
    users.saveButton();
    users.verifyLastNameOnUserDetailsPane(
      verifyData.verifyLastNameOnUserDetailsPane
    );
    users.verifyMiddleNameOnUserDetailsPane(
      verifyData.verifyMiddleNameOnUserDetailsPane
    );
    users.verifyFirstNameOnUserDetailsPane(
      verifyData.verifyFirstNameOnUserDetailsPane
    );
    users.editButton();
    users.clearTextFieldFirstName();
    users.saveButton();
    users.verifyFirstNameOnUserDetailsPane(verifyData.verifyClearFirstNameDetailsPane);
  });
});
