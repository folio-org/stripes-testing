import { TextField, Button, Select } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import ModalSelectMappingProfile from './modalSelectMappingProfile';

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
      name: 'autotest FAT-742: ' + this.#profileName.instanceName + ' action profile',
      typeValue: this.folioRecordTypeValue.instance,
    }

    static get defaultActionProfile() {
      return this.#defaultActionProfile;
    }

    static fillActionProfile(specialActionProfile = this.#defaultActionProfile) {
      cy.do([
        TextField({ name:'profile.name' }).fillIn(specialActionProfile.name),
        Select({ name:'profile.action' }).choose(this.#action.create),
        Select({ name:'profile.folioRecord' }).choose(specialActionProfile.typeValue),
      ]);
    }

    static linkMappingProfile(specialMappingProfile) {
      cy.do([
        Button('Link Profile').click(),
      ]);
      ModalSelectMappingProfile.searchMappingProfileByName(specialMappingProfile.name);
      ModalSelectMappingProfile.selectMappingProfile();
      NewActionProfile.waitUntilLinkingFinished();
      NewActionProfile.clickSaveAndClose();
    }

    static waitUntilLinkingFinished() {
      // TODO: redesign to interactors(Section)
      cy.get('section[id=actionProfileFormAssociatedMappingProfileAccordion] div[class*=searchControl]>button[disabled]',
        getLongDelay()).should('be.visible');
    }

    static clickSaveAndClose() {
      cy.do(Button('Save as profile & Close').click());
    }
}
