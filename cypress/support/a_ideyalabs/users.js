import { link } from "fs-extra";
import {
  Accordion,
  Button,
  Checkbox,
  selectIndex,
  Select,
  Link,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneContent,
  RichEditor,
  TextField,
  including,
  Section,
} from "../../../interactors";
import select from "../../../interactors/select";
import topMenu from "../fragments/topMenu";
import accordion from "../../../interactors/accordion";

const titleField = TextField({ name: "title" });
const detailsField = RichEditor("Details");
const submitButton = Button({ type: "submit" });
const newButton = Button("New");
const checkOutApp = Checkbox({ name: "popUpOnCheckOut" });
const checkOut = TextField({ id: "input-patron-identifier" });
const PatronButton = Button({ id: "clickable-find-patron" });
const ItemButton = Button({ id: "clickable-add-item" });
const userNoteModal = Modal("User note");
const closeBtn = Button("Close");
const searchField = TextField({ id: "input-user-search" });
const searchButton = Button("Search");
const usersPane = PaneContent({ id: "users-search-results-pane-content" });
const loanHistoryPane = PaneContent({id:"pane-loanshistory-content"});
const renewButton = Button('Renew');
const userInfo = '//div[text()="Barcode"]/following-sibling::div';
const openLoansCheckBox = '//div[@data-row-index="row-0"]//input[@type="checkbox"]';
const openLoans = '//*[@id="patron-detail"]/div[3]/div/div[1]/div/div[2]//a';
const editButton = '//div[@aria-rowindex="2"]//button';

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
    cy.do(accordion({ id: "notesAccordion" }).clickHeader()),
      cy.wait(2000),
      cy.xpath(editButton).click(),
      // cy.do(Section({id:"pane-userdetails"}).find(MultiColumnListRow({index:0})).find(Button("Edit")).click());
      cy.do([
      titleField.clear(),
      titleField.fillIn(title),
      detailsField.fillIn(details),
      submitButton.click()]);
  },

  selectRecord: (userName) => {
    cy.do(usersPane.find(select(userName)).click());
  },

  selectUserRecord: (content) => {
    cy.do(usersPane.find((link(content))).click());  
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
  enterBardcodeCheckout:(barcode) => {
    cy.do([checkOut.fillIn(barcode),
    PatronButton.click()])
  },

  checkBoxOpenLoans:()=>{
    cy.xpath(openLoansCheckBox).click();
    cy.do(renewButton.click());
  },

  dueDate:()=>{
    cy.xpath('(//div[@data-row-index="row-0"]//div[@role="gridcell"])[4]').invoke('text').then((text) => {
      console.log(text);
    });
  },
  clickOpenLoansCount:()=>{
    cy.xpath(openLoans).click(); 
  },
};
