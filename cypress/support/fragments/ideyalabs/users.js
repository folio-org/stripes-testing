import {
  Accordion,
  Button,
  Checkbox,
  Link,
  Modal,
  MultiColumnListRow,
  PaneContent,
  RichEditor,
  TextField,
} from "../../../interactors";

import select from "../../../interactors/select";
import topMenu from "../fragments/topMenu";

const titleField = TextField({ name: "title" });
const detailsField = RichEditor("Details");
const submitButton = Button({ type: "submit" });
const newButton = Button("New");
const checkOutApp = Checkbox({ name: "popUpOnCheckOut" });
const userInfo = '//div[text()="Barcode"]/following-sibling::div';
const checkOut = TextField({ id: "input-patron-identifier" });
const PatronButton = Button({ id: "clickable-find-patron" });
const userNoteModal = Modal("User note");
const searchField = TextField({ id: "input-user-search" });
const searchButton = Button("Search");
const topRecord =
  '//div[@data-row-index="row-3"]//a[@data-test-text-link="true"]';
const editButton = '//div[@aria-rowindex="2"]//button';
const usersPane = PaneContent({ id: "users-search-results-pane-content" });
const openLoans = '//*[@id="patron-detail"]/div[3]/div/div[1]/div/div[2]//a';
const openLoansCheckBox =
  '//div[@data-row-index="row-0"]//input[@type="checkbox"]';
const renewButton = Button("Renew");

export default {
  createNote: (title, details) => {
    cy.do([
      Accordion({ id: "notesAccordion" }).clickHeader(),
      cy.wait(2000),
      newButton.click(),
      titleField.fillIn(title),
      detailsField.fillIn(details),
      checkOutApp.click(),
      submitButton.click(),
    ]);
  },

  editNote: (title, details) => {
    cy.do(Accordion({ id: "notesAccordion" }).clickHeader()),
      cy.wait(2000),
      cy.xpath(editButton).click(),
      cy.do(titleField.clear()),
      cy.do(titleField.fillIn(title)),
      cy.do(detailsField.fillIn(details)),
      cy.do(submitButton.click());
  },

  selectTopRecord: () => {
    cy.do(
      usersPane
        .find(
          MultiColumnListRow({ indexRow: "row-1" }).find(
            Link("123er, 234r (qwert) 23")
          )
        )
        .click()
    );
  },
  selectUserRecord: () => {
    cy.xpath(topRecord).click();
  },
  enterBardcodeCheckout: (barcode) => {
    cy.do([checkOut.fillIn(barcode), PatronButton.click()]);
  },
  clickOpenLoansCount: () => {
    cy.xpath(openLoans).click();
  },

  checkBoxOpenLoans: () => {
    cy.xpath(openLoansCheckBox).click();
    cy.do(renewButton.click());
  },
  getUserBarcode: () => {
    cy.xpath(userInfo).invoke("text").as("barcode");

    cy.visit(topMenu.checkOutPath).then(() => {
      cy.get("@barcode").then((barcode) => {
        cy.do(checkOut.fillIn(barcode)),
          cy.do(PatronButton.click()),
          cy.do(userNoteModal.find(Button("Close")).click()),
          cy.visit(topMenu.usersPath),
          cy.do(select({ id: "input-user-search-qindex" }).choose("Barcode")),
          cy.do(searchField.fillIn(barcode)),
          cy.do(searchButton.click());
      });
    });
  },
};
