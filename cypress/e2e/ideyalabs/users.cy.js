import ledgers from "../../support/fragments/finance/ledgers/ledgers";
import topMenu from "../../support/fragments/topMenu";
import users from "../../support/fragments/users/users";
import getRandomPostfix, { getFourDigitRandomNumber } from "../../support/utils/stringTools";

const barcodeNumber = getRandomPostfix();

const userOne = {
  patronGroup: "A1A1",
  barcode: barcodeNumber,
  userName: `AutotestUser_${getRandomPostfix()}`,
  personal: {
    lastName: "User",
    firstName: "Delete",
    email: `dan${getFourDigitRandomNumber}@gmail.com`,
  },
};

const userTwo = {
  patronGroup: "A1A1",
  barcode: barcodeNumber,
  userName: `AutotestUser_${getRandomPostfix()}`,
  personal: {
    lastName: "User",
    firstName: "Delete",
    email: `dan${getFourDigitRandomNumber}@gmail.com`,
  },
};

const userThree = {
  patronGroup: "A1A1",
  barcode: `678${getFourDigitRandomNumber}`,
  userName: `Mann${getFourDigitRandomNumber}`,
  personal: {
    lastName: "Code",
    firstName: "Auto",
    email: "dan@gmail.com",
    middleName: "Test",
    preferredFirstName: "Dan",
  },
};

const verifyData = {
  verifyLastNameOnUserDetailsPane: "Code",
  verifyPreferredfirstnameOnUserDetailsPane: "Dan",
  verifyFirstNameOnUserDetailsPane: "Auto",
  verifyMiddleNameOnUserDetailsPane: "Test",
  verifyClearFirstNameDetailsPane: 'No value set-'
};

describe("create a users", () => {
  it("C421-Create: new user; required: contact info, email, phone, external system ID, address", () => {
    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
    cy.visit(topMenu.usersPath);
    users.createViaUi(userOne);
    cy.visit(topMenu.usersPath);
    users.createViaUi(userTwo);
    users.assertion();
    ledgers.closeOpenedPage();
    users.closeWithoutSavingButton();
  });

  it("C11096-Add Preferred first name and confirm its display in the User record View and Edit screens", () => {
    cy.visit(topMenu.usersPath);
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
    users.clearTextfield();
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
    users.clearTextfieldfirstName();
    users.saveButton();
    users.verifyFirstNameOnUserDetailsPane(verifyData.verifyClearFirstNameDetailsPane);
  });

});
