import { TextField, Button, Select } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import ModalSelectMappingProfile from './modalSelectMappingProfile';

const action = 'Create (all record types)';

const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
};

const defaultActionProfile = {
  name: 'autotest action profile',
  typeValue: folioRecordTypeValue.instance,
};

export default {
  folioRecordTypeValue,

  fillActionProfile: (specialActionProfile = defaultActionProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialActionProfile.name),
      Select({ name:'profile.action' }).choose(action),
      Select({ name:'profile.folioRecord' }).choose(specialActionProfile.typeValue),
    ]);
  },

  linkMappingProfile: (specialMappingProfile) => {
    cy.do(Button('Link Profile').click());
    ModalSelectMappingProfile.searchMappingProfileByName(specialMappingProfile.name);
    ModalSelectMappingProfile.selectMappingProfile();
    cy.get('section[id=actionProfileFormAssociatedMappingProfileAccordion] div[class*=searchControl]>button[disabled]',
      getLongDelay()).should('be.visible');
    cy.do(Button('Save as profile & Close').click());
  }
};
