import { Accordion, Button, RadioButton, Select, TextField } from '../../../../interactors';
import eHoldingsTitles from './eHoldingsTitles';

const publicationTypeAccordion = Accordion({ id:'filter-titles-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-titles-selected' });

export default {
  switchToTitles: () => {
    cy.do(Button({ id: 'titles-tab' }).click());
  },
  bySubject: (subjectValue) => {
    const subject = 'Subject';
    cy.do(Select('Select a field to search').choose(subject));
    cy.expect(Select({ value:  subject.toLowerCase() }).exists());
    cy.do(TextField('Enter your search').fillIn(subjectValue));
    cy.do(Button('Search').click());
    eHoldingsTitles.waitLoading();
  },
  byPublicationType:(type) => {
    cy.do(publicationTypeAccordion.clickHeader());
    cy.do(publicationTypeAccordion
      .find(RadioButton(type)).click());
    eHoldingsTitles.waitLoading();
  },
  bySelectionStatus:(selectionStatus) => {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    eHoldingsTitles.waitLoading();
  }
};
