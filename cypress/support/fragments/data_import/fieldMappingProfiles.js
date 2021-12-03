import { Button } from '../../../../interactors';

export default class fieldMappingProfiles {
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
}
