import button from "../../../interactors/button";
import checkinitems from "../../support/a_ideyalabs/checkinitems";
import users from "../../support/a_ideyalabs/users";
import topMenu from "../../support/fragments/topMenu";
import usersSearchPane from "../../support/fragments/users/usersSearchPane";
import usersSearchResultsPane from "../../support/fragments/users/usersSearchResultsPane";
import getRandomPostfix from "../../support/utils/stringTools";

const testData = {
  patronBarcode: "0000074372",
  patronBarcode646: "322",
  status: "Active",
  name: "A2L 3, Holly",
  parameter:"Keyword (name, email, identifier)",
  note: {
    title: `Test Title ${getRandomPostfix()}`,
    details: `Test details ${getRandomPostfix()}`,
    editTitle: `Test Title ${getRandomPostfix()}`,
  },
};
const patronBarcode = 555555;
const searchitembarcode = 108204829;

describe("checkout item", () => {
  before("login", () => {
    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
  });

  it("C343243 Check out app: Display a pop-up note and Close note", () => {
    cy.visit(topMenu.usersPath);
    usersSearchResultsPane.waitLoading();
    usersSearchPane.searchByStatus(testData.status);
    usersSearchPane.searchByKeywords(testData.parameter, testData.value);
    usersSearchPane.searchByUsername(testData.name);
    users.createNote(testData.note.title, testData.note.details);
    users.getUserBarcode();
    users.editNote(testData.note.editTitle, testData.note.details);
  });

  it("C642 Cannot find the patron and item that meet circulation rule criteria", () => {
    cy.visit(topMenu.checkOutPath);
    users.enterBardcodeCheckout(testData.patronBarcode);
    users.clickOpenLoansCount();
    users.checkBoxOpenLoans();
  });
  it("C646 Cannot find the patron and item that meet circulation rule criteria", () => {
    cy.visit(topMenu.checkOutPath);
    users.enterBardcodeCheckout(testData.patronBarcode646);
    users.clickOpenLoansCount();
    users.dueDate();
  });

  it("C777 Check out: override non-circulating items", () => {
    cy.visit(topMenu.checkOutPath);
    checkinitems.enterpatronBardcodeCheckout(patronBarcode);
    cy.wait(5);
    checkinitems.enteritemBardcodeCheckout(searchitembarcode);
  });
});
