import {
  Accordion,
  RadioButton,
  TextField,
  Button,
  Checkbox,
  ListItem,
  MultiSelect,
  MultiSelectOption,
  including,
  Section,
} from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

const contentTypeAccordion = Accordion({ id: 'filter-packages-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-packages-selected' });
const tagsAccordion = Accordion({ id: 'accordionTagFilter' });
const byTagCheckbox = Checkbox('Search by tags only');
const accessStatusTypesAccordion = Accordion('Access status types');
const byAccessStatusTypesCheckbox = Checkbox('Search by access status types only');
const resultSection = Section({ id: 'search-results' });

export default {
  byContentType: (type) => {
    cy.do(contentTypeAccordion.clickHeader());
    cy.do(contentTypeAccordion.find(RadioButton(type)).click());
    eHoldingsPackages.waitLoading();
  },
  bySelectionStatus: (selectionStatus) => {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    eHoldingsPackages.waitLoading();
  },
  byName(name = '*') {
    cy.do(TextField({ id: 'eholdings-search' }).fillIn(name));
    cy.do(Button('Search').click());
    eHoldingsPackages.waitLoading();
  },
  byTag: (specialTag) => {
    cy.do(tagsAccordion.clickHeader());
    cy.do(tagsAccordion.find(byTagCheckbox).click());
    cy.do(tagsAccordion.find(MultiSelect()).filter(specialTag));
    cy.do(tagsAccordion.find(MultiSelectOption(specialTag)).click());
    eHoldingsPackages.waitLoading();
  },
  verifyTagAbsent(specialTag) {
    cy.do([
      tagsAccordion.clickHeader(),
      tagsAccordion.find(byTagCheckbox).checkIfNotSelected(),
      tagsAccordion.find(byTagCheckbox).checkIfNotSelected(),
      tagsAccordion.find(Button({ ariaLabel: 'open menu' })).click(),
    ]);
    cy.expect(tagsAccordion.find(MultiSelectOption(including(specialTag))).absent());
  },
  resetTagFilter: () => {
    cy.do(tagsAccordion.find(Button({ icon: 'times-circle-solid' })).click());
  },

  openAccessStatusTypesDropdown() {
    cy.do(accessStatusTypesAccordion.clickHeader());
    // for unclear reasons, clicking the checkbox twice is required to set it to checked state
    cy.do(accessStatusTypesAccordion.find(byAccessStatusTypesCheckbox).checkIfNotSelected());
    cy.do(accessStatusTypesAccordion.find(byAccessStatusTypesCheckbox).checkIfNotSelected());
    cy.do(accessStatusTypesAccordion.find(MultiSelect()).open());
  },

  checkAccessStatusTypeOptionAvailable: (accessStatusType, isShown = true) => {
    const targetOption = accessStatusTypesAccordion.find(MultiSelectOption(accessStatusType));
    if (isShown) cy.expect(targetOption.exists());
    else cy.expect(targetOption.absent());
  },

  checkResultsListShown: (isShown = true) => {
    const result = resultSection.find(
      ListItem({ className: including('list-item-'), index: 0 }).find(Button()),
    );
    if (isShown) cy.expect(result.exists());
    else cy.expect(result.absent());
  },

  selectAccessStatusType(accessStatusType) {
    cy.do(accessStatusTypesAccordion.find(MultiSelectOption(accessStatusType)).clickSegment());
  },

  verifyResultsCount(expectedCount) {
    cy.expect([
      ListItem({ className: including('list-item-'), index: expectedCount - 1 }).exists(),
      ListItem({ className: including('list-item-'), index: expectedCount }).absent(),
    ]);
  },

  verifyTagPresentInFilter(tagValue, openDropdown = true) {
    if (openDropdown) {
      cy.do([
        tagsAccordion.clickHeader(),
        tagsAccordion.find(byTagCheckbox).checkIfNotSelected(),
        tagsAccordion.find(byTagCheckbox).checkIfNotSelected(),
        tagsAccordion.find(Button({ ariaLabel: 'open menu' })).click(),
      ]);
    }
    cy.do(tagsAccordion.find(MultiSelect()).filter(tagValue));
    cy.expect(tagsAccordion.find(MultiSelectOption(including(tagValue))).exists());
  },
};
