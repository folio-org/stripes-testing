import { Section, Button, SearchField, Checkbox, Accordion } from '../../../../interactors';
import marcAuthorities from './marcAuthorities';

const rootSection = Section({ id: 'pane-authorities-filters' });
const referencesFilterAccordion = Accordion('References');

export default {
  searchBy: (parameter, value) => {
    cy.do(
      rootSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter),
    );
    cy.do(rootSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(rootSection.find(Button({ id: 'submit-authorities-search' })).click());
    marcAuthorities.waitLoading();
  },

  selectExcludeReferencesFilter() {
    cy.do([
      referencesFilterAccordion.clickHeader(),
      referencesFilterAccordion.find(Checkbox({ label: 'Exclude see from' })).checkIfNotSelected(),
    ]);
  },
};
