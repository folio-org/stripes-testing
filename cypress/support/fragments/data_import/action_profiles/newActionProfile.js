import { TextField, Button, Select } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';

export default class NewActionProfile {
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
      folioRecordTypeAction: this.folioRecordTypeValue.instance,
    }

    static get defaultActionProfile() {
      return this.#defaultActionProfile;
    }

    static fill(specialActionProfile = this.#defaultActionProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialActionProfile.profileName),
        Select({ name:'profile.action' }).choose(this.#action.create),
        Select({ name:'profile.folioRecord' }).choose(this.folioRecordTypeValue.instance),
      ]);
    }

    static linkMappingProfile() {
      cy.do([
        Button('Link Profile').click(),
      ]);
    }

    /* static linkedMappingProfilePresented(mappingProfileTitle) {
      cy.get('[data-row-index="row-0"]')
        .should('contains.text', mappingProfileTitle);
    } */
    static waitSelectingMappingProfile() {
      /* cy.get({ id:'actionProfileFormAssociatedMappingProfileAccordion' })
        .should('be.visible');
      cy.expect(Button('Close').exists());
      cy.get({ id:'actionProfileFormAssociatedMappingProfileAccordion' })
        .invoke('Link Profile', 'disabled'); */
      cy.get('[class="button---ZXtl+ interactionStyles---SDwDu default---SzGl0 marginBottom0---KlEVc"]').should('have.value', 'disabled');
    }

    static linkedMappingProfilePresented() {
      cy.get('[data-row-index="row-0"]')
        .contains({ title:'Unlink this profile' }).should('be.visible');
    }

    static saveAndClose() {
      cy.do(Button('Save as profile & Close').click());
    }
}
