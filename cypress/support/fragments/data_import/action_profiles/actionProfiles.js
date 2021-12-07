import { Button } from '@interactors/html';
import { getLongDelay } from '../../../utils/cypressTools';

export default class ActionProfiles {
    static #actionsButton = Button('Actions');

    static clickActionButton() {
      cy.do([Button('Actions')
        .click()]);
    }

    static createNewActionProfile() {
      cy.get('[class="DropdownMenu---x9lIp"]')
        .contains('New action profile')
        .click();
    }

    static waitLoadingList() {
      cy.get('[id="mapping-profiles-list"]', getLongDelay())
        .should('be.visible');
      cy.expect(this.#actionsButton.exists());
    }
}
