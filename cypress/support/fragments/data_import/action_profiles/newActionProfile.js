import { TextField, Select, Button, Modal } from '@interactors/html';

export default class NewActionProfile {
    static #nameProfileField = TextField('Name*');
    static #nameActionSelect = Select({ name: 'profile.action' });
    static #nameFolioRecordTypeSelect = Select({ name: 'profile.folioRecord' });

    static #saveButton = Button('Save as profile & Close');
    static #linkProfileButton = Button('Link Profile');

    static #profileName = {
      instanceName: 'Instance',
      holdingsName: 'Holdings',
      itemName: 'Item',
    }

    static #action = {
      create: 'Create (all record types)',
    }

    static folioRecordTypeValue = {
      instance: 'Instance',
      holdings: 'Holdings',
      item: 'Item',
    }

    static #defaultActionProfile = {
      profileName: 'autotest FAT-742: ' + this.#profileName.instanceName + ' action profile',
      actionType: this.#action.create,
      folioRecordType: this.folioRecordTypeValue.instance,
    }

    static get defaultActionProfile() {
      return this.#defaultActionProfile;
    }

    static fill(specialActionProfile = this.#defaultActionProfile) {
      cy.do([this.#nameProfileField.fillIn(specialActionProfile.profileName)]);
      cy.do(this.#nameActionSelect
        .choose(specialActionProfile.actionType));
      cy.do(this.#nameFolioRecordTypeSelect
        .choose(specialActionProfile.folioRecordType));
    }

    static linkMappingProfile() {
      cy.do(this.#linkProfileButton.click());
    }

    static selectMappingProfile() {
      Modal('Field Mapping Profiles').find('').click();
    }



    static saveAndClose() {
      cy.do(this.#saveButton.click());
    }
}
