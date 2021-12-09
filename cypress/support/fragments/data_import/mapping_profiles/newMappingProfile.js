import { TextField, Button, Select } from '../../../../../interactors';

export default class NewMappingProfile {
    static #profileName = {
      instanceName: 'Instance',
      holdingsName: 'Holdings',
      itemName: 'Item',
    }

    static #incomingRecordTypeValue = {
      marcBib: 'MARC Bibliographic',
    }

    static folioRecordTypeValue = {
      instance: 'Instance',
      holdings: 'Holdings',
      item: 'Item',
    }

    // TODO: add to mapping profile for holdings
    static permanentLocation = {
      location: '"location name aeCWa (location code dIZbi)"',
    }



    static #defaultMappingProfile = {
      profileName: 'autotest FAT-742: ' + this.#profileName.instanceName + ' mapping profile',
      incomingRecordType: this.#incomingRecordTypeValue.marcBib,
      folioRecordTypeMapping: this.folioRecordTypeValue.instance,
    }

    static get defaultMappingProfile() {
      return this.#defaultMappingProfile;
    }

    static fill(specialMappingProfile = this.#defaultMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialMappingProfile.profileName),
        Select({ name:'profile.incomingRecordType' }).choose(specialMappingProfile.incomingRecordType),
        Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.folioRecordTypeMapping)
      ]);
    }

    static saveAndClose() {
      cy.do(Button('Save as profile & Close').click());
    }
}
