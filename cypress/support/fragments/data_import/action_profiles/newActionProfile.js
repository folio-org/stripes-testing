import { TextField, Button, Select, Section, Pane } from '../../../../../interactors';
import SelectMappingProfile from './modals/selectMappingProfile';

const action = 'Create (all record types except MARC Authority or MARC Holdings)';

const typeValue = 'MARC Bibliographic';

const folioRecordTypeValue = {
  instance: 'Instance',
  holdings: 'Holdings',
  item: 'Item',
  marcBib: 'MARC Bibliographic'
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
      Select({ name:'profile.action' }).choose(specialActionProfile.action || action),
      Select({ name:'profile.folioRecord' }).choose(specialActionProfile.typeValue || typeValue),
    ]);
  },

  linkMappingProfile: (specialMappingProfileName) => {
    cy.do(Button('Link Profile').click());
    SelectMappingProfile.searchMappingProfileByName(specialMappingProfileName);
    SelectMappingProfile.selectMappingProfile(specialMappingProfileName);
    cy.expect(Section({ id:'actionProfileFormAssociatedMappingProfileAccordion' }).find(Button('Link Profile')).has({ disabled : true }));
    cy.do(Button('Save as profile & Close').click());
    cy.expect(Pane('Action profiles').find(Button('Actions')).exists());
  }
};
