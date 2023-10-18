import { Button } from '../../../../../../interactors';

export default {
  selectCountry(countryName) {
    cy.do(Button(countryName).click());
  },
};
