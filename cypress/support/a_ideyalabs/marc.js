import {
  Button,
  Section,
  TextField
} from '../../../interactors';

const rootSection = Section({ id: 'marc-view-pane' });
const filterSection = Section({ id: 'pane-filter' });
const saveAndCloseBtn = Button('Save & close');
const closeButton = Button({ ariaLabel: 'Close The !!!Kung of Nyae Nyae / Lorna Marshall.' });
const linkHeadingsButton = Button('Link headings');
const searchButton = Button({ type: 'submit' });

export default {
  clickLinkheadings: () => {
    cy.do(linkHeadingsButton.click());
  },

  printButton: () => {
    cy.do(rootSection.find(Button('Actions')).click());
    cy.do(Button('Print').click());
  },

  searchByValue: (value) => {
    cy.do(
      filterSection
        .find(TextField({ id: 'input-inventory-search' }))
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
    cy.do(Button('Unlink').click());
  },

  keepLinkingButton: () => {
    cy.do(Button('Keep linking').click());
  },

  closeEditMarc: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  create006Tag: () => {
    cy.get('.quickMarcEditorAddField:last').click();
    cy.get('[class*="quickMarcEditorRow--"]:last-child')
      .find('input')
      .then(([tag]) => {
        cy.wrap(tag).type('006');
      });
    cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
    cy.get('[class*="quickMarcEditorRow--"]:last-child select').select('a');
  },

  create007Tag: () => {
    cy.get('.quickMarcEditorAddField:last').click();
    cy.get('[class*="quickMarcEditorRow--"]:last-child')
      .find('input')
      .then(([tag]) => {
        cy.wrap(tag).type('007');
      });
    cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
    cy.get('[class*="quickMarcEditorRow--"]:last-child select').select('a');
  },
};

