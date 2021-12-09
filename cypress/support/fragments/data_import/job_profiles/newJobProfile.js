

export default class NewActionProfile {
    static #saveButton = Button('Save as profile & Close');

    static #acceptedDataType {
      marc: 'MARC)',
    }

    static #defaultJobProfile = {
      profileName: 'autotest FAT-742: Job profile',
      acceptedDataType: this.#acceptedDataType,
    }

    static get defaultJobProfile() {
      return this.#defaultJobProfile;
    }

    static fill(specialJobProfile = this.#defaultJobProfile) {
      cy.do([
        TextField('Name*').fillIn(specialJobProfile.profileName),
        Select('Accepted data type*').choose(this.#action.create),
      ]);
    }
}