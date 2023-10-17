import { including } from '@interactors/html';
import { TextField, Button, Select, Section, Pane } from '../../../../../interactors';
import SelectMappingProfile from './modals/selectMappingProfile';
import { FOLIO_RECORD_TYPE, PROFILE_TYPE_NAMES } from '../../../constants';

const action = 'Create (all record types except MARC Authority or MARC Holdings)';

const nameField = TextField({ name: 'profile.name' });
const actionSelect = Select({ name: 'profile.action' });
const recordTypeselect = Select({ name: 'profile.folioRecord' });
const profileLinkSection = Section({ id: 'actionProfileFormAssociatedMappingProfileAccordion' });
const profileLinkButton = Button('Link Profile');

const defaultActionProfile = {
  name: 'autotest action profile',
  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
};
const getDefaultInstanceActionProfile = (name) => {
  const defaultInstanceActionProfile = {
    profile: {
      name,
      action: 'CREATE',
      folioRecord: 'INSTANCE',
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
        detailProfileId: '',
        detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
      },
    ],
    deletedRelations: [],
  };
  return defaultInstanceActionProfile;
};
const getDefaultHoldingsActionProfile = (name) => {
  const defaultHoldingsActionProfile = {
    profile: {
      name,
      action: 'CREATE',
      folioRecord: 'HOLDINGS',
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
        detailProfileId: '',
        detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
      },
    ],
    deletedRelations: [],
  };
  return defaultHoldingsActionProfile;
};
const getDefaultItemActionProfile = (name) => {
  const defaultItemActionProfile = {
    profile: {
      name,
      action: 'CREATE',
      folioRecord: 'ITEM',
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
        detailProfileId: '',
        detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
      },
    ],
    deletedRelations: [],
  };
  return defaultItemActionProfile;
};

export default {
  getDefaultInstanceActionProfile,
  getDefaultHoldingsActionProfile,
  getDefaultItemActionProfile,
  fill: (specialActionProfile = defaultActionProfile) => {
    cy.do([
      nameField.fillIn(specialActionProfile.name),
      actionSelect.choose(specialActionProfile.action || action),
      recordTypeselect.choose(
        specialActionProfile.typeValue || FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      ),
    ]);
  },

  fillName: (profileName = defaultActionProfile.name) => cy.do(nameField.fillIn(profileName)),

  chooseAction: (profileAction = action) => cy.do(actionSelect.choose(profileAction)),

  saveProfile: () => cy.do(Button('Save as profile & Close').click()),

  linkMappingProfile: (specialMappingProfileName) => {
    cy.do(profileLinkButton.click());
    SelectMappingProfile.searchMappingProfileByName(specialMappingProfileName);
    SelectMappingProfile.selectMappingProfile(specialMappingProfileName);
    cy.expect(profileLinkSection.find(profileLinkButton).has({ disabled: true }));
    cy.do(Button('Save as profile & Close').click());
    cy.expect(Pane('Action profiles').find(Button('Actions')).exists());
  },

  createActionProfileViaApi: (nameMapProfile, mapProfileId, profileAction = 'CREATE') => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/actionProfiles',
        body: {
          profile: {
            name: nameMapProfile,
            action: profileAction,
            folioRecord: 'INSTANCE',
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
              detailProfileId: mapProfileId,
              detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
            },
          ],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createActionProfileViaApiMarc: (name, actionToCreate, folioRecordType, mapProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/actionProfiles',
        body: {
          profile: {
            name,
            actionToCreate,
            folioRecord: folioRecordType,
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
              detailProfileId: mapProfileId,
              detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
            },
          ],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  verifyPreviouslyCreatedDataIsDisplayed: (profile) => {
    cy.expect([
      Pane('New action profile').exists(),
      nameField.has({ value: profile.name }),
      actionSelect.has({ content: including(profile.action) }),
      recordTypeselect.has({ content: including(profile.typeValue) }),
    ]);
  },

  verifyPreviouslyPopulatedDataIsDisplayed(profile) {
    this.verifyPreviouslyCreatedDataIsDisplayed(profile);
    cy.expect(profileLinkSection.find(profileLinkButton).has({ disabled: true }));
  },
};
