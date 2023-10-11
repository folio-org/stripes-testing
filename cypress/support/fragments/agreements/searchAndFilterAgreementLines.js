import { Button, TextField, Pane, Accordion } from '../../../../interactors';

const agreementFilterSection = Accordion({ id: 'filter-accordion-agreement' });
const agreementLineTypeFilterSection = Accordion({ id: 'filter-accordion-lineType' });
const activeFromFilterSection = Accordion({ id: 'clickable-activeFrom-filter' });
const activeToFilterSection = Accordion({ id: 'clickable-activeTo-filter' });
const POLineFilterSection = Accordion({ id: 'filter-accordion-po-lines' });
const tagsFilterSection = Accordion({ id: 'clickable-tags-filter' });

export default {
  search(name) {
    cy.do(TextField({ id: 'input-agreementLine-search' }).fillIn(name));
    cy.do(Pane({ id: 'agreements-tab-filter-pane' }).find(Button('Search')).click());
  },

  verifyFilterOptions() {
    cy.expect([
      agreementFilterSection.exists(),
      agreementLineTypeFilterSection.exists(),
      activeFromFilterSection.exists(),
      activeToFilterSection.exists(),
      POLineFilterSection.exists(),
      tagsFilterSection.exists(),
    ]);
  },
};
