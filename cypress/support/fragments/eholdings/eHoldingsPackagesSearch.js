import {
  Accordion,
  RadioButton,
  TextField,
  Button,
  Checkbox,
  MultiSelect,
  MultiSelectOption,
} from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

const contentTypeAccordion = Accordion({ id: 'filter-packages-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-packages-selected' });
const tagsAccordion = Accordion({ id: 'accordionTagFilter' });

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
    cy.do(tagsAccordion.find(Checkbox('Search by tags only')).click());
    cy.do(tagsAccordion.find(MultiSelect()).filter(specialTag));
    cy.do(tagsAccordion.find(MultiSelectOption(specialTag)).click());
    eHoldingsPackages.waitLoading();
  },
  resetTagFilter: () => {
    cy.do(tagsAccordion.find(Button({ icon: 'times-circle-solid' })).click());
  },
};
