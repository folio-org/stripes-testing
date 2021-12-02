import { TextField, Button, Select} from '../../../../interactors';

export default class NewMappingProfile {
    static #nameProfileField = TextField('Name*');
    static #nameIncomingRecordTypeSelect = Select({name: 'profile.incomingRecordType'});
    static #nameFolioRecordTypeSelect = Select({name: 'profile.existingRecordType'});

    static #saveButton = Button('Save as profile & Close');

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
        profileName: 'autotest FAT-742: ' + this.#profileName.instanceName + ' mapping profile',
        incomingRecordType: this.#incomingRecordTypeValue.marcBib,
        folioRecordType: this.#folioRecordTypeValue.instance,
    }

    static get defaultMappingProfile() {
        return this.#defaultMappingProfile;
    }

    static fill(specialMappingProfile = this.#defaultMappingProfile) {
        cy.do([this.#nameProfileField.fillIn(specialMappingProfile.profileName)]);
        cy.do(this.#nameIncomingRecordTypeSelect
        .choose(specialMappingProfile.incomingRecordType));
        cy.do(this.#nameFolioRecordTypeSelect
            .choose(specialMappingProfile.folioRecordType));
    }

    

    /*collectionOfMappingProfiles.add();
    collectionOfMappingProfiles.array.forEach(element => {
        static fill(specialMappingProfile = this.#defaultMappingProfile) {
            cy.do([this.#nameProfileField.fillIn(specialMappingProfile.profileName)]);
            cy.do(this.#nameIncomingRecordTypeSelect
            .choose(specialMappingProfile.incomingRecordType));
            cy.do(this.#nameFolioRecordTypeSelect
                .choose(specialMappingProfile.folioRecordType));
        }
    });*/


    static saveAndClose() {
        cy.do(this.#saveButton.click());
    }
}