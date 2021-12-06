import { Button } from '@interactors/html';

export default class FieldMappingProfile {
    static #actionsButton = Button('Actions');

    static clickActionButton() {
      cy.do(this.#actionsButton)
        .click();
    }

    static deleteMappingProfile() {
      cy.get('[class="DropdownMenu---x9lIp"]')
        .contains('Delete')
        .click();
    }
}
