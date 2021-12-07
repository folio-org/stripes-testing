import { Button, SearchField } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import NewMappingProfile from './newMappingProfile';

export default class FieldMappingProfiles {
    static #actionsButton = Button('Actions');

    static clickActionButton() {
      cy.get('[class="paneHeaderButtonsArea---kidF+ last---Va9aW"]')
        .contains('Actions')
        .click();
    }

    static createNewMappingProfile() {
      cy.get('[class="DropdownMenu---x9lIp"]')
        .contains('New field mapping profile')
        .click();
    }

    static waitLoadingList() {
      cy.get('[id="mapping-profiles-list"]', getLongDelay())
        .should('be.visible');
      cy.expect(this.#actionsButton.exists());
    }

    static specialMappingProfilePresented(mappingProfileTitle) {
      cy.get('[id="pane-results-content"]')
        .should('contains.text', mappingProfileTitle);
    }

    static waitLoadingMappingProfile() {
      cy.get('[id="full-screen-view-content"]', getLongDelay())
        .should('be.visible');
      cy.expect(this.#actionsButton.exists());
    }

  /* static searchMappingProfile(mappingProfileTitle) {
      cy.do([
        SearchField({ id: 'input-search-mapping-profiles-field' }).fillIn(mappingProfileTitle),
        Button('Search').click(),
      ]);
    }

    Modal('Confirm multipiece check out').find(Button('Check out')).click(), */
}
