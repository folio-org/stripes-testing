import {
  Accordion,
  RadioButton,
  TextField,
  Button,
  Checkbox,
  MultiSelect,
  MultiSelectOption,
  including,
} from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

const contentTypeAccordion = Accordion({ id: 'filter-packages-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-packages-selected' });
const tagsAccordion = Accordion({ id: 'accordionTagFilter' });
const byTagCheckbox = Checkbox('Search by tags only');

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
      tagsAccordion.find(byTagCheckbox).click(),
      tagsAccordion.find(byTagCheckbox).click(),
      tagsAccordion.find(Button({ ariaLabel: 'open menu' })).click()
    ]);
    cy.expect(
      tagsAccordion
        .find(MultiSelectOption(including(specialTag)))
        .absent() 
    );
  },
  resetTagFilter: () => {
    cy.do(tagsAccordion.find(Button({ icon: 'times-circle-solid' })).click());
  },
};
