import {
  Accordion,
  Button,
  PaneHeader,
  Section,
  Spinner,
  TextField,
  including,
} from "../../../interactors";
import holdingsRecordView from "../fragments/inventory/holdingsRecordView";

const rootSection = Section({ id: "marc-view-pane" });
const filterSection = Section({ id: "pane-filter" });
const saveAndCloseBtn = Button("Save & close");
const closeButton = Button({
  ariaLabel: "Close The !!!Kung of Nyae Nyae / Lorna Marshall.",
});
const linkHeadingsButton = Button("Link headings");
const searchButton = Button({ type: "submit" });
const actionsButton = Button("Actions");
const deleteButton = Button("Delete");
const deleteButtonInConfirmation = Button({
  id: "clickable-delete-confirmation-modal-confirm",
});

export default {
  openCreatedHoldingView: () => {
    cy.get('[class^="button-"][id^="clickable-view-holdings-"]').last().click();
  },

  deleteHolding: () => {
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      deleteButtonInConfirmation.click(),
    ]);
  },

  clickLinkHeadings: () => {
    cy.do(linkHeadingsButton.click());
  },

  printButton: () => {
    cy.do(rootSection.find(Button("Actions")).click());
    cy.do(Button("Print").click());
  },

  searchByValue: (value) => {
    cy.do(
      filterSection
        .find(TextField({ id: "input-inventory-search" }))
        .fillIn(value)
    );
    searchButton.click();
  },

  saveAndClose() {
    cy.do(saveAndCloseBtn.click());
  },

  closeMark: () => {
    cy.do(closeButton.click());
  },

  popupUnlinkButton: () => {
    cy.do(Button("Unlink").click());
  },

  keepLinkingButton: () => {
    cy.do(Button("Keep linking").click());
  },

  closeEditMarc: () => {
    cy.do(Button({ icon: "times" }).click());
  },

  crossIcon: () => {
    cy.do(Button({ icon: "times" }).click());
  },

  create006Tag: () => {
    cy.get(".quickMarcEditorAddField:last").click();
    cy.get('[class*="quickMarcEditorRow--"]:last-child')
      .find("input")
      .then(([tag]) => {
        cy.wrap(tag).type("006");
      });
    cy.get('[class*="quickMarcEditorRow--"]:last-child').contains("Type");
    cy.get('[class*="quickMarcEditorRow--"]:last-child select').select("a");
  },

  create007Tag: () => {
    cy.get(".quickMarcEditorAddField:last").click();
    cy.get('[class*="quickMarcEditorRow--"]:last-child')
      .find("input")
      .then(([tag]) => {
        cy.wrap(tag).type("007");
      });
    cy.get('[class*="quickMarcEditorRow--"]:last-child').contains("Type");
    cy.get('[class*="quickMarcEditorRow--"]:last-child select').select("a");
  },

  recordLastUpdated: () => {
    cy.expect(Spinner().absent());
    cy.do(
      Accordion("Administrative data")
        .find(Button(including("Record last updated")))
        .click()
    );
  },

  checkFieldContentMatch() {
    cy.wrap(Accordion({ headline: "Update information" }).text()).as("message");
    cy.get("@message").then((val) => {
      const sourceRegex = /Source: [^\n]*/;
      const sourceLineMatch = val.match(sourceRegex);
      const sourceText = sourceLineMatch ? sourceLineMatch[0].slice(8) : "";
      const words = sourceText.split(", ");
      const swappedString = words.join(", ");
      holdingsRecordView.editInQuickMarc();
      cy.expect(
        PaneHeader({ id: "paneHeaderquick-marc-editor-pane" }).has({
          text: including(`Source: ${swappedString}`),
        })
      );
    });
  },
};
