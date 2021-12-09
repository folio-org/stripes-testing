import { TextField, Select, Button } from '../../../../../interactors';

export default class NewJobProfile {
    static acceptedDatatype = {
      dataType: 'MARC',
    }

    static #defaultJobProfile = {
      profileName: 'autotest FAT-742: Job profile',
      acceptedDataType: this.acceptedDatatype.dataType,
    }

    static get defaultJobProfile() {
      return this.#defaultJobProfile;
    }

    static fill(specialJobProfile = this.#defaultJobProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialJobProfile.profileName),
        Select({ name:'profile.dataType' }).choose(specialJobProfile.acceptedDataType),
      ]);
    }

    /* static selectActionProfile() {
      cy.do([
        cy.get('div[id="type-selector-dropdown-linker-root"]').click()
      ]);
      cy.do([
      Button('Click here to get started').click()
    } */

    static clickSaveAndClose() {
      cy.do(Button('Save as profile & Close').click());
    }
}
