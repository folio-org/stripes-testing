import { Button, TextField } from '../../../../../interactors';

export default class OCLCWorldCatEdit {
    // check
    static #authenticationTextField = TextField({ id: 'input-targetprofile-authentication' });
    static #saveAndCloseButton = Button('Save & close');

    setAuthentication() {
      cy.do(this.#authenticationTextField.fillIn(Cypress.env('OCLCWorldCat_authentication')));
      cy.do(this.#saveAndCloseButton.click());
    }
}
