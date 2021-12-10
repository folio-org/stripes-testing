import { TextField, Button, Select, Accordion, HTML, including, Dropdown } from '../../../../../interactors';
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

    static permanentLocation = {
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

    // Instance mapping profile
    static #defaultMappingProfile = {
      name: 'autotest FAT-742: ' + this.#profileName.instanceName + ' mapping profile',
      typeValue: this.folioRecordTypeValue.instance,
    }

    static get defaultMappingProfile() {
      return this.#defaultMappingProfile;
    }

    static fillMappingProfile(specialMappingProfile = this.#defaultMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialMappingProfile.name),
        Select({ name:'profile.incomingRecordType' }).choose(this.#incomingRecordTypeValue.marcBib),
        Select({ name:'profile.existingRecordType' }).choose(specialMappingProfile.typeValue)
      ]);
    }

    // Holdings mapping profile
    static #defaultHoldingsMappingProfile = {
      profileName: 'autotest FAT-742: ' + this.#profileName.holdingsName + ' mapping profile',
      incomingRecordType: this.#incomingRecordTypeValue.marcBib,
      folioRecordTypeMapping: this.folioRecordTypeValue.holdings,
      permanentLocation: this.permanentLocation,
    }

    static get defaultHoldingsMappingProfile() {
      return this.#defaultHoldingsMappingProfile;
    }

    static fillHoldingsMappingProfile(specialHoldingsMappingProfile = this.#defaultHoldingsMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialHoldingsMappingProfile.name),
        Select({ name:'profile.incomingRecordType' }).choose(this.#incomingRecordTypeValue.marcBib),
        Select({ name:'profile.existingRecordType' }).choose(specialHoldingsMappingProfile.typeValue),
      ]);
      NewMappingProfile.clickButtonForSelectOption();
    }

    static clickButtonForSelectOption() {
      cy.do(Accordion('Location').find(HTML(including('Permanent'))));
      cy.do(Dropdown('Accepted values').choose('Annex (KU/CC/DI/A)'));
      // .find(HTML(including('Annex (KU/CC/DI/A)'))).click());
      // cy.do(Button('Accepted values').click());
      cy.do(Button('Annex (KU/CC/DI/A)').click());
    }

    // Item mapping profile
    static #defaultItemMappingProfile = {
      profileName: 'autotest FAT-742: ' + this.#profileName.itemName + ' mapping profile',
      incomingRecordType: this.#incomingRecordTypeValue.marcBib,
      folioRecordTypeMapping: this.folioRecordTypeValue.item,
      material: this.#materialType,
      loan: this.#permanentLoanType,
      status: this.#status,
    }

    static get defaultItemMappingProfile() {
      return this.#defaultItemMappingProfile;
    }

    static fillItemMappingProfile(specialItemMappingProfile = this.#defaultItemMappingProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialItemMappingProfile.profileName),
        Select({ name:'profile.incomingRecordType' }).choose(specialItemMappingProfile.incomingRecordType),
        Select({ name:'profile.existingRecordType' }).choose(specialItemMappingProfile.folioRecordTypeMapping),
        Button('Accepted values').click(),
        // Button(#permanentLocation.location).click()
      ]);
    }

    static clickSaveAndCloseButton() {
      cy.do(Button('Save as profile & Close').click());
      FieldMappingProfiles.waitLoadingList();
    }
}
