import { TextField, Button, Select, Section, Pane } from '../../../../../interactors';
import SelectMappingProfile from './modals/selectMappingProfile';
import { FOLIO_RECORD_TYPE } from '../../../constants';

const action = 'Create (all record types except MARC Authority or MARC Holdings)';

const defaultActionProfile = {
  name: 'autotest action profile',
  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
};

export default {
  fill: (specialActionProfile = defaultActionProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialActionProfile.name),
      Select({ name:'profile.action' }).choose(specialActionProfile.action || action),
      Select({ name:'profile.folioRecord' }).choose(specialActionProfile.typeValue || FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC),
    ]);
  },

  linkMappingProfile: (specialMappingProfileName) => {
    cy.do(Button('Link Profile').click());
    SelectMappingProfile.searchMappingProfileByName(specialMappingProfileName);
    SelectMappingProfile.selectMappingProfile(specialMappingProfileName);
    cy.expect(Section({ id:'actionProfileFormAssociatedMappingProfileAccordion' }).find(Button('Link Profile')).has({ disabled : true }));
    cy.do(Button('Save as profile & Close').click());
    cy.expect(Pane('Action profiles').find(Button('Actions')).exists());
  },

  createActionProfileViaApi:(nameMapProfile, mapProfileId, profileAction = 'CREATE') => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/actionProfiles',
        body: {
          profile: {
            name: nameMapProfile,
            action: profileAction,
            folioRecord: 'INSTANCE'
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterProfileType: 'ACTION_PROFILE',
              detailProfileId: mapProfileId,
              detailProfileType: 'MAPPING_PROFILE'
            }
          ],
          deletedRelations: []
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  }
};
