import { Button, Label } from '../../../../../interactors';

export default class TargetProfiles {
    // check
    static #OCLCWorldCatButton = Button('✓ OCLC WorldCat');
    static #EditButton = Button('Edit');

    checkOCLCWorldCatAuthentication() {
      cy.do(this.#OCLCWorldCatButton.click());
      cy.do(this.#EditButton.click());
    }
}
