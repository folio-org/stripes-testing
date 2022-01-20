import { Accordion, RadioButton, TextField, Button } from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

const contentTypeAccordion = Accordion({ id:'filter-packages-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-packages-selected' });

export default {
  byContentType:(type) => {
    cy.do(contentTypeAccordion.clickHeader());
    cy.do(contentTypeAccordion
      .find(RadioButton(type)).click());
    eHoldingsPackages.waitLoading();
  },
  bySelectionStatus:(selectionStatus) => {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    eHoldingsPackages.waitLoading();
  },
  byName(name = '*') {
    cy.do(TextField({ id:'eholdings-search' }).fillIn(name));
    cy.do(Button('Search').click());
    eHoldingsPackages.waitLoading();
  }
};
