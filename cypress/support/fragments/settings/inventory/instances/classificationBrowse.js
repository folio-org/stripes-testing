import {
  Button,
  IconButton,
  Pane,
  PaneContent,
  Popover,
  NavListItem,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiColumnListHeader,
  including,
} from '../../../../../../interactors';

const classificationBrowseSectionName = 'Classification browse';
const classificationBrowseItem = NavListItem(classificationBrowseSectionName);
const classificationBrowsePane = Pane(classificationBrowseSectionName);
const editButton = Button({ icon: 'edit' });
const defaultClassificationBrowseNames = [
  'Classification (all)',
  'Dewey Decimal classification',
  'Library of Congress classification',
];
const tableHeaderTexts = ['Name', 'Classification identifier types', 'Actions'];

export default {
  classificationBrowseSectionName,
  classificationBrowseItem,

  openClassificationBrowse() {
    cy.do(
      PaneContent({ id: 'app-settings-nav-pane-content' })
        .find(NavListItem(classificationBrowseSectionName))
        .click(),
    );
  },

  getTargetRowWithClassificationName(classificationName) {
    return classificationBrowsePane.find(
      MultiColumnListRow({ innerHTML: including(classificationName) }),
    );
  },

  checkClassificationBrowsePaneOpened() {
    cy.expect(classificationBrowsePane.exists());
  },

  checkPositionInNavigationList() {
    cy.do(
      classificationBrowseItem.perform(($element) => {
        cy.get($element).next().should('have.text', 'Classification identifier types');
      }),
    );
  },

  checkClassificationBrowseInTable(name, classificationIdentifierTypes) {
    const targetRow = this.getTargetRowWithClassificationName(name);

    cy.expect([
      targetRow.find(MultiColumnListCell(name)).exists(),
      targetRow.find(MultiColumnListCell(classificationIdentifierTypes)).exists(),
      targetRow.find(editButton).exists(),
    ]);
  },

  checkDefaultClassificationBrowseInTable() {
    defaultClassificationBrowseNames.forEach((defaultClassificationBrowseName) => {
      this.checkClassificationBrowseInTable(defaultClassificationBrowseName, '');
    });
  },

  checkTableHeaders() {
    tableHeaderTexts.forEach((headerText) => {
      cy.expect(classificationBrowsePane.find(MultiColumnListHeader(headerText)).exists());
    });
  },

  checkInfoIconExists() {
    cy.expect(
      classificationBrowsePane
        .find(MultiColumnListHeader('Classification identifier types'))
        .find(IconButton('info'))
        .exists(),
    );
  },

  clickInfoIcon() {
    cy.do(
      classificationBrowsePane
        .find(MultiColumnListHeader('Classification identifier types'))
        .find(IconButton('info'))
        .click(),
    );
  },

  checkPopoverMessage() {
    cy.expect(
      Popover({
        content:
          'Please note that if no classification identifier types are selected for a browse option, this option will display all classification identifier types.',
      }).exists(),
    );
  },
};
