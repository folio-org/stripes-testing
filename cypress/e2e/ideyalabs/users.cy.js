import topMenu from "../../support/fragments/topMenu";
import users from "../../support/fragments/users/users";
import ledgers from "../../support/fragments/finance/ledgers/ledgers";
const RandomNumber = Math.floor(Math.random(9000) * 1000) + 1000;

const userOne = {
  patronGroup: "A1A1",
  barcode: `237${RandomNumber}`,
  username: `dan${RandomNumber}`,
  personal: {
    lastName: "somai",
    firstName: "king1",
    email: "dan@gmail.com",
  },
};
const userTwo = {
  patronGroup: "A1A1",
  barcode: `237${RandomNumber}`,
  username: `Son${RandomNumber}`,
  personal: {
    lastName: "somaid",
    firstName: "king3",
    email: "dan123@gmail.com",
  },
};
const UserThree = {
  patronGroup: "A1A1",
  barcode: `2988${RandomNumber}`,
  username: `Mann${RandomNumber}`,
  personal: {
    lastName: "Array",
    firstName: "king1",
    email: "dan@gmail.com",
    middleName: "chary",
    Preferredfirstname: "Dan basco1",
  },
};
const VerifyData = {
  verifyLastNameOnUserDetailsPane: "Array",
  verifyPreferredfirstnameOnUserDetailsPane: "Dan basco1",
  verifyFirstNameOnUserDetailsPane: "king1",
  verifyMiddleNameOnUserDetailsPane: "chary",
};

describe("creat a users", () => {
  it("C421-Create: new user; required: contact info, email, phone, external system ID, address", () => {
    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
    cy.visit(topMenu.usersPath);
    users.createViaUi(userOne);
    cy.visit(topMenu.usersPath);
    users.createViaUi(userTwo); //barcode
    users.Assertion();
    ledgers.closeOpenedPage();
    users.Closewithoutsavingbutton();
  });
  it("C11096-Add Preferred first name and confirm its display in the User record View and Edit screens", () => {
    cy.visit(topMenu.usersPath);
    users.createData(UserThree);
    users.verifyPreferredfirstnameOnUserDetailsPane(
      VerifyData.verifyPreferredfirstnameOnUserDetailsPane
    );
    users.verifyLastNameOnUserDetailsPane(
      VerifyData.verifyLastNameOnUserDetailsPane
    );
    users.verifyMiddleNameOnUserDetailsPane(
      VerifyData.verifyMiddleNameOnUserDetailsPane
    );
    users.editButton();
    users.clearTextfield();
    users.SaveBtn();
    users.verifyLastNameOnUserDetailsPane(
      VerifyData.verifyLastNameOnUserDetailsPane
    );
    users.verifyMiddleNameOnUserDetailsPane(
      VerifyData.verifyMiddleNameOnUserDetailsPane
    );
    users.verifyFirstNameOnUserDetailsPane(
      VerifyData.verifyFirstNameOnUserDetailsPane
    );
    users.editButton();
    users.clearTextfieldfirstName();
    users.SaveBtn();
  });
});
