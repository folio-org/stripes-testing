import users from '../../support/ideyaLabs/users';
import testTypes from '../../support/dictionary/testTypes';
import topMenu from '../../support/fragments/topMenu';
import userLoans from '../../support/fragments/users/loans/userLoans';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

const testData = {
  loanBarcode: '81264459',
  patronBarcodeOne: '0000074372',
  patronBarcodeTwo: '322',
  itemBarcodeOne: '132431',
  status: 'Active',
  name: 'A2L 3, Holly',
  parameter: 'Keyword (name, email, identifier)',
  note: {
    details: `Test details ${getRandomPostfix()}`,
    editTitle: `Test Title ${getRandomPostfix()}`,
  },
  patronBarcode: '555555',
  itemBarcode: '108204829',
};

describe.skip('Checkout item', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Delete test data', () => {
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByStatus(testData.status);
    usersSearchPane.searchByKeywords(testData.name);
    users.openNote();
    users.deleteNote();
    users.verifyNoteAbsent();
  });

  it(
    'C343243 Check out app: Display a pop-up note and Close note',
    { tags: testTypes.ideaLabsTests },
    () => {
      cy.visit(topMenu.usersPath);
      usersSearchPane.searchByStatus(testData.status);
      usersSearchPane.searchByKeywords(testData.parameter, testData.name);
      users.createNote(testData.note.details);
      users.getUserBarcode();
      users.editNote(testData.note.editTitle, testData.note.details);
      users.verifyNoteExist();
    },
  );

  it(
    'C642 Cannot find the patron and item that meet circulation rule criteria (vega)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.checkOutPath);
      users.enterPatronBarcodeCheckOut(testData.patronBarcodeOne);
      users.clickOpenLoansCount();
      userLoans.checkOffLoanByBarcode(testData.loanBarcode);
      users.renewButton();
      users.checkRenewConfirmationModal();
    },
  );

  it(
    'C646 Cannot find the patron and item that meet circulation rule criteria (vega)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.checkOutPath);
      users.enterPatronBarcodeCheckOut(testData.patronBarcodeTwo);
      users.enterItemBarcodeCheckOut(testData.itemBarcodeOne);
      users.closeButton();
      users.clickOpenLoansCount();
      users.dueDate();
      users.verifyItemBarcode(testData.itemBarcodeOne);
    },
  );

  it(
    'C777 Check out: override non-circulating items (vega)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.checkOutPath);
      users.enterPatronBarcodeCheckOut(testData.patronBarcode);
      users.enterItemBarcodeCheckOut(testData.itemBarcode);
      users.closeButton();
      users.enterPatronBarcodeCheckOut(testData.patronBarcode);
      users.enterItemBarcodeCheckOut(testData.itemBarcode);
      users.patronOverride();
      users.cancelButton();
      users.enterPatronBarcodeCheckOut(testData.patronBarcode);
      users.enterItemBarcodeCheckOut(testData.itemBarcode);
      users.closeButton();
    },
  );
});
