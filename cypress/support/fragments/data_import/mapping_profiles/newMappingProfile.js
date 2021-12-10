import { TextField, Button, Select } from '../../../../../interactors';
import FieldMappingProfiles from './fieldMappingProfiles';

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
    static #permanentLocation = {
      location: '"Annex (KU/CC/DI/A)"',
    }

    static #materialType = {
      materialType: 'book',
    }

    static #permanentLoanType = {
      type: 'permanent loan type name AYCai',
    }

    static #status = {
      status: 'In process',
    }

    /* static #defaultInstanceMappingProfile = {
      profileName: 'autotest FAT-742: ' + this.#profileName.instanceName + ' mapping profile',
      incomingRecordType: this.#incomingRecordTypeValue.marcBib,
      folioRecordTypeMapping: this.folioRecordTypeValue.instance,
    }

    static get defaultInstanceMappingProfile() {
      return this.#defaultInstanceMappingProfile;
    }

    static fillInstanceMappingProfile(specialInstanceMappingProfile = this.#defaultInstanceMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialInstanceMappingProfile.profileName),
        Select({ name:'profile.incomingRecordType' }).choose(specialInstanceMappingProfile.incomingRecordType),
        Select({ name:'profile.existingRecordType' }).choose(specialInstanceMappingProfile.folioRecordTypeMapping)
      ]);
    }

    // TODO create holdings mapping profile
    static #defaultHoldingsMappingProfile = {
      profileName: 'autotest FAT-742: ' + this.#profileName.holdingsName + ' mapping profile',
      incomingRecordType: this.#incomingRecordTypeValue.marcBib,
      folioRecordTypeMapping: this.folioRecordTypeValue.holdings,
      permanentLocation: this.#permanentLocation,
    }

    static get defaultHoldingsMappingProfile() {
      return this.#defaultHoldingsMappingProfile;
    }

    static fillHoldingsMappingProfile(specialHoldingsMappingProfile = this.#defaultHoldingsMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialHoldingsMappingProfile.profileName),
        Select({ name:'profile.incomingRecordType' }).choose(specialHoldingsMappingProfile.incomingRecordType),
        Select({ name:'profile.existingRecordType' }).choose(specialHoldingsMappingProfile.folioRecordTypeMapping),
        Button('Accepted values').click(),
        // Button(#permanentLocation.location).click()
      ]);
    } */

    // TODO create item mapping profile

    static #defaultMappingProfile = {
      name: 'autotest FAT-742: ' + this.#profileName.instanceName + ' mapping profile',
      typeValue: this.folioRecordTypeValue.instance,
    }

    static get defaultMappingProfile() {
      return this.#defaultMappingProfile;
    }

    static fill(specialMappingProfile = this.#defaultMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
        Select({ name:'profile.incomingRecordType' }).choose(this.#incomingRecordTypeValue.marcBib),
        Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
      ]);
    }

    static saveAndClose() {
      cy.do(Button('Save as profile & Close').click());
      FieldMappingProfiles.waitLoadingList();
    }
}
