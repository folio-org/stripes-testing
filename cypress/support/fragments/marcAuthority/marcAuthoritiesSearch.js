import { Section, Button, SearchField } from '../../../../interactors';
import marcAuthorities from './marcAuthorities';

const rootSection = Section({ id: 'pane-authorities-filters' });

export default {
  searchBy: (parameter, value) => {
    cy.do(
      rootSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter),
    );
    cy.do(rootSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(rootSection.find(Button({ id: 'submit-authorities-search' })).click());
    marcAuthorities.waitLoading();
  },
};
