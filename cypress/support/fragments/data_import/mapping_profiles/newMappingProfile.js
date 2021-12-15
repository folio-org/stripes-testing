import { TextField, Button, Select, HTML, including } from '../../../../../interactors';
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

    static materialType = {
      materialType: '"book"',
    }

    static permanentLoanType = {
      type: '"Can circulate"',
    }

    static status = {
      status: '"In process"',
    }

    static #defaultMappingProfile = {
      name: 'autotest FAT-742: ' + this.#profileName.instanceName + ' mapping profile',
      typeValue: this.folioRecordTypeValue.instance,
      location: this.permanentLocation,
      material: this.materialType,
      loan: this.permanentLoanType,
      status: this.status,
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
      if (specialMappingProfile.typeValue === 'Holdings') {
        cy.do(TextField('Permanent').fillIn(specialMappingProfile.location));
        NewMappingProfile.clickSaveAndCloseButton();
      } else if (specialMappingProfile.typeValue === 'Item') {
        cy.do([
          TextField('Material type').fillIn(specialMappingProfile.material),
          // TODO create waiter
          // cy.wait(5000),
          TextField('Permanent loan type').fillIn(specialMappingProfile.loan),
          TextField('Status').fillIn(specialMappingProfile.status),
        ]);
        NewMappingProfile.clickSaveAndCloseButton();
      } else {
        NewMappingProfile.clickSaveAndCloseButton();
      }
    }

    static clickSaveAndCloseButton() {
      cy.do(Button('Save as profile & Close').click());
      FieldMappingProfiles.waitLoadingList();
    }
}
