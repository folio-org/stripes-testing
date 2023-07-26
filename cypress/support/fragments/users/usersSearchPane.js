import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  Link,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  RadioButtonGroup,
  Section,
  Select,
  Spinner,
  TextArea,
  TextField
} from '../../../../interactors';

// Cypress clicks before the UI loads, use when there is no way to attach waiter to element
const waitClick = () => { cy.wait(1000); };
const openLoanSectionButton = Button({ id: 'accordion-toggle-button-loansSection' });
const actionButton = Section({ id: 'pane-userdetails' }).find(Button('Actions'));
const editButton = Button('Edit');
const AdditionalInfo = Button('Additional information');
const saveAndClose = Button('Save & close');


export default {
  waitLoading: () => cy.expect(PaneHeader('User search').exists()),

  searchByStatus(status) {
    waitClick();
    cy.do(Accordion({ id: 'users-filter-accordion-status' }).find(Checkbox(status)).click());
  },

  searchByKeywords(keywords) {
    return cy.do([
      TextField({ id: 'input-user-search' }).fillIn(keywords),
      Button({ id: 'submit-user-search' }).click()
    ]);
  },

  searchByLastName(lastName) {
    return cy.do([
      Select({ id: 'input-user-search-qindex' }).choose('Last name'),
      TextField({ id: 'input-user-search' }).fillIn(lastName),
      Button({ id: 'submit-user-search' }).click()
    ]);
  },

  searchByUsername(username) {
    cy.do([
      Select({ id: 'input-user-search-qindex' }).choose('Username'),
      TextField({ id: 'input-user-search' }).fillIn(username),
      Button({ id: 'submit-user-search' }).click()
    ]);
    waitClick();
  },

  EntertheBarcodeSearchFiled(Barcode) {
    cy.do([
      TextField({ id: 'input-item-barcode' }).fillIn(Barcode),
      Button({ id: 'clickable-add-item' }).click()
    ]);
  },

  selectFirstUser: (userName) => {
    cy.expect(Spinner().absent());
    cy.do(Pane({ id: 'users-search-results-pane' }).find(Link(userName)).click());
  },


  selectUserFromList: (userName) => {
    cy.do(Pane({ id: 'users-search-results-pane' }).find(MultiColumnListCell(userName)).click());
  },

  openUser(userId) {
    return cy.do(Link({ href: including(userId) }).click());
  },

  openUserLoanSection: () => {
    cy.do([openLoanSectionButton.click()]);
  },

  verifyTestField: (name) => {
    cy.do([actionButton.click(),
      editButton.click(),
    ]);
    cy.expect(TextField(name).exists());
  },

  verifyTestArea: (name) => {
    cy.do([actionButton.click(),
      editButton.click(),
    ]);
    cy.expect(TextArea(name).exists());
  },

  verifyCheckBox: (name) => {
    cy.do([actionButton.click(),
      editButton.click(),
    ]);
    cy.expect(Checkbox(name).exists());
  },

  verifyRadioButton: (name) => {
    cy.do([actionButton.click(),
      editButton.click(),
    ]);
    cy.expect(RadioButtonGroup(name).exists());
  },

  verifySingleSelect: (name, label) => {
    cy.do([actionButton.click(),
      editButton.click(),
      Select(name).choose(label),
      saveAndClose.click(),
      AdditionalInfo.click()
    ]);
  },

  dragAndDropCustomFields: () => {
    cy.get('[class^=FieldAccordionDraggableWrapper---]').then((elements) => {
      const draggableElement = elements[0];
      const targetElement = elements[1];
      if (targetElement) {
        cy.get(draggableElement).dragAndDrop(
          draggableElement,
          targetElement
        );
      }
    });
  },

  verifyDragItem() {
    cy.expect(AdditionalInfo.exists());
    cy.do(AdditionalInfo.click());
  }
};
