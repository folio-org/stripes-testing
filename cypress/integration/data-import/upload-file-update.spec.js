
/// <reference types="cypress" />

import { testType } from '../../support/utils/tagTools';
import getRandomPostfix from '../../support/utils/stringTools';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';

describe('ui-data-import: MARC file upload with the update of instance, holding, and items', () => {
  const collectionOfMappingProfiles = [{
    id: '',
    name: `autotest_instance_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'INSTANCE',
  },
  {
    id: '',
    name: `autotest_holdings_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'HOLDINGS',
    mappingDetails: { mappingFields: [{ name: 'permanentLocationId',
      path: 'holdings.permanentLocationId',
      value: '"Annex (KU/CC/DI/A)"' }] }
  },
  {
    id: '',
    name: `autotest_item_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'ITEM',
    mappingDetails: { mappingFields: [
      { name: 'materialType.id',
        path: 'item.materialType.id',
        value: '"book"' },
      { name: 'permanentLoanType.id',
        path: 'item.permanentLoanType.id',
        value: '"Can circulate"' },
      { name: 'status.name',
        path: 'item.status.name',
        value: '"In process"' }] }
  }];

  const collectionOfActionProfiles = [
    { profile: {
      id: '',
      name: `autotest_instance_action_profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'INSTANCE'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: [] },
    { profile: {
      id: '',
      name: `autotest_holdings_action_profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'HOLDINGS'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: [] },
    { profile: {
      id: '',
      name: `autotest_item_action_profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'ITEM'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: [] }];

  before('navigates to application', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    collectionOfMappingProfiles.forEach(mappingProfile => {
      cy.createMappingProfileApi({
        ...mappingProfile,
      }).then(({ body }) => {
        collectionOfActionProfiles.forEach(actionProfile => {
          actionProfile.addedRelations[0].detailProfileId = body.id;
          cy.createActionProfileApi({
            ...actionProfile
          });
        });
      });
    });
  });

  it('C343335 ', { tags: [testType.smoke] }, () => {
    const specialJobProfile = { ...newJobProfile.defaultJobProfile };
    specialJobProfile.acceptedDataType = newJobProfile.acceptedDataType.dataType;

    settingsDataImport.goToJobProfile();
    jobProfiles.createNewJobProfile();
    newJobProfile.fillJobProfile(specialJobProfile);
    collectionOfActionProfiles.map(element => element.actionProfile).forEach(actionProfile => {
      newJobProfile.selectActionProfile(actionProfile);
    });
  });
});
