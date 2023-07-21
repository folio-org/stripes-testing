import ledgers from "../../support/fragments/finance/ledgers/ledgers";
import topMenu from "../../support/fragments/topMenu";
import users from "../../support/fragments/users/users";

const RandomNumber = Math.floor(Math.random(9000) * 1000) + 1000;

const userOne = {
  patronGroup: "A1A1",
  barcode: `237${RandomNumber}`,
  userName: `dan${RandomNumber}`,
  personal: {
    lastName: "somai",
    firstName: "king1",
    email: `dan${RandomNumber}@gmail.com`,
  },
};
const userTwo = {
  patronGroup: "A1A1",
  barcode: `237${RandomNumber}`,
  userName: `Son${RandomNumber}`,
  personal: {
    lastName: "somaid",
    firstName: "king3",
    email: `dan${RandomNumber}@gmail.com`,
  },
};
const userThree = {
  patronGroup: "A1A1",
  barcode: `2988${RandomNumber}`,
  userName: `Mann${RandomNumber}`,
  personal: {
    lastName: "Array",
    firstName: "king1",
    email: "dan@gmail.com",
    middleName: "chary",
    preferredFirstName: "Dan basco1",
  },
};
const verifyData = {
  verifyLastNameOnUserDetailsPane: "Array",
  verifyPreferredfirstnameOnUserDetailsPane: "Dan basco1",
  verifyFirstNameOnUserDetailsPane: "king1",
  verifyMiddleNameOnUserDetailsPane: "chary",
};

describe("create a users", () => {
  it("C421-Create: new user; required: contact info, email, phone, external system ID, address", () => {
    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
    cy.visit(topMenu.usersPath);
    users.createViaUi(userOne);
    cy.visit(topMenu.usersPath);
    users.createViaUi(userTwo);
    users.Assertion();
    ledgers.closeOpenedPage();
    users.Closewithoutsavingbutton();
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
  });
});
