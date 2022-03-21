import { Accordion, KeyValue } from '../../../../interactors';

export default {
  checkPermanentLocation: (location) => {
    cy.expect(Accordion({ label: 'Location' }).find(KeyValue('Effective location for item')).has({ value: location }));
  }
};
