import { TextField, Button, Select } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import ModalSelectMappingProfile from './modalSelectMappingProfile';

const action = 'Create (all record types)';

const typeValue = 'MARC Bibliographic';

const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
};

const defaultActionProfile = {
  name: '',
  typeValue: folioRecordTypeValue.instance,
};

export default {
  folioRecordTypeValue,

  fillActionProfile: (specialActionProfile = defaultActionProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialActionProfile.name),
      Select({ name:'profile.action' }).choose(specialActionProfile.action || action),
      Select({ name:'profile.folioRecord' }).choose(specialActionProfile.typeValue || typeValue),
    ]);
  },

  linkMappingProfile: (specialMappingProfileName) => {
    cy.do(Button('Link Profile').click());
    ModalSelectMappingProfile.searchMappingProfileByName(specialMappingProfileName);
    ModalSelectMappingProfile.selectMappingProfile();
    cy.get('section[id=actionProfileFormAssociatedMappingProfileAccordion] div[class*=searchControl]>button[disabled]',
      getLongDelay()).should('be.visible');
    cy.do(Button('Save as profile & Close').click());
  }
};
