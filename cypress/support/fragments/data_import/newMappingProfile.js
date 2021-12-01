import { Button } from "@interactors/html";

export default class NewFieldMappingProfile {
    static #saveButton = Button('Save & close');

    static #profileName = {
        instanceName: 'Instance',
        holdingsName: 'Holdings',
        itemName: 'Item',
    }

    static #incomingRecordTypeValue = {
        marcBib: 'MARC Bibliographic',
        edifactInvoice: 'EDIFACT invoice',
    }

    static #folioRecordTypeValue = {
        instance: 'Instance',
        holdings: 'Holdings',
        item: 'Item',
        invoice: 'Invoice',
        marcBib: 'MARC Bibliographic',
    }

    static #defaultMappingProfile = {
        profileName: 'autotest FAT-742: Mapping profile for' + this.#profileName.instanceName,
        incomingRecordType: this.#incomingRecordTypeValue.marcBib,
        folioRecordType: this.#folioRecordTypeValue.instance,
    }

    static get defaultMappingProfile() {
        return this.#defaultMappingProfile;
    }

    static fill(specialMappingProfile = this.#defaultMappingProfile) {
        cy.get('input[name="profile.name"]').type(this.#profileName.instanceName)
        
        /*.should('have.value', profileName.instanceName);
        cy.get('input[name="profile.incomingRecordType"]')
            .select(specialMappingProfile.incomingRecordType)
            .should('have.value', specialMappingProfile.incomingRecordType);
        cy.get('input[name="profile.existingRecordType"]')
            .select(specialMappingProfil.folioRecordType)
            .should('have.value', specialMappingProfile.folioRecordType);*/
    }

    static saveAndClose() {
        cy.code(this.#saveButton.click());
    }


}