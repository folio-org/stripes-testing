import { including } from '@interactors/html';
import {
  Button,
  Callout,
  Option,
  Pane,
  Section,
  Select,
  TextField,
} from '../../../../../interactors';
import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  FOLIO_RECORD_TYPE,
  PROFILE_TYPE_NAMES,
} from '../../../constants';
import SelectMappingProfile from '../../settings/dataImport/modals/selectProfileModal';

const nameField = TextField({ name: 'profile.name' });
const actionSelect = Select({ name: 'profile.action' });
const recordTypeselect = Select({ name: 'profile.folioRecord' });
const profileLinkSection = Section({ id: 'actionProfileFormAssociatedMappingProfileAccordion' });
const profileLinkButton = Button('Link Profile');
const newActionProfile = Pane('New action profile');
const closeButton = Button('Close');

const action = ACTION_NAMES_IN_ACTION_PROFILE.CREATE;

const defaultActionProfile = {
  name: 'autotest action profile',
  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
};
const clickLinkProfileButton = () => {
  cy.do(profileLinkButton.click());
};

export default {
  clickLinkProfileButton,
  fill: (specialActionProfile = defaultActionProfile) => {
    cy.do([
      nameField.fillIn(specialActionProfile.name),
      actionSelect.choose(specialActionProfile.action || ACTION_NAMES_IN_ACTION_PROFILE.CREATE),
      recordTypeselect.choose(
        specialActionProfile.typeValue || FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      ),
    ]);
  },

  fillName: (profileName = defaultActionProfile.name) => cy.do(nameField.fillIn(profileName)),

  chooseAction: (profileAction = action) => cy.do(actionSelect.choose(profileAction)),

  saveProfile: () => cy.do(Button('Save as profile & Close').click()),

  linkMappingProfile: (specialMappingProfileName) => {
    clickLinkProfileButton();
    SelectMappingProfile.searchProfile(specialMappingProfileName);
    SelectMappingProfile.selectProfile(specialMappingProfileName);
    cy.expect(profileLinkSection.find(profileLinkButton).has({ disabled: true }));
    cy.do(Button('Save as profile & Close').click());
    cy.expect(Pane('Action profiles').find(Button('Actions')).exists());
  },

  createActionProfileViaApi: (profile, mappingProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/actionProfiles',
        body: {
          profile: {
            name: profile.name,
            action: profile.action,
            folioRecord: profile.folioRecordType,
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
              detailProfileId: mappingProfileId,
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

  // createActionProfileViaApi: (nameMapProfile, mapProfileId, profileAction = 'CREATE') => {
  //   return cy
  //     .okapiRequest({
  //       method: 'POST',
  //       path: 'data-import-profiles/actionProfiles',
  //       body: {
  //         profile: {
  //           name: nameMapProfile,
  //           action: profileAction,
  //           folioRecord: 'INSTANCE',
  //         },
  //         addedRelations: [
  //           {
  //             masterProfileId: null,
  //             masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
  //             detailProfileId: mapProfileId,
  //             detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
  //           },
  //         ],
  //         deletedRelations: [],
  //       },
  //       isDefaultSearchParamsRequired: false,
  //     })
  //     .then(({ response }) => {
  //       return response;
  //     });
  // },

  // createActionProfileViaApiMarc: (profile, mapProfileId) => {
  //   return cy
  //     .okapiRequest({
  //       method: 'POST',
  //       path: 'data-import-profiles/actionProfiles',
  //       body: {
  //         profile: {
  //           name: profile.name,
  //           action: profile.action,
  //           folioRecord: profile.folioRecordType,
  //         },
  //         addedRelations: [
  //           {
  //             masterProfileId: null,
  //             masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
  //             detailProfileId: mapProfileId,
  //             detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
  //           },
  //         ],
  //         deletedRelations: [],
  //       },
  //       isDefaultSearchParamsRequired: false,
  //     })
  //     .then(({ response }) => {
  //       return response;
  //     });
  // },

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

  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  verifyNewActionProfileExists: () => {
    cy.expect(newActionProfile.exists());
  },

  verifyFOLIORecordTypeOptionExists(type) {
    cy.expect(recordTypeselect.find(Option(type)).exists());
  },

  clickClose: () => cy.do(closeButton.click()),
};
