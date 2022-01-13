
/// <reference types="cypress" />

import { testType } from '../../support/utils/tagTools';
import getRandomPostfix from '../../support/utils/stringTools';
import dataImport from '../../support/fragments/data_import/dataImport';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import logs from '../../support/fragments/data_import/logs';
import createdRecord from '../../support/fragments/data_import/createdRecord';
import SearchInventory from '../../support/fragments/data_import/searchInventory';

describe('ui-data-import: MARC file upload with the update of instance, holding, and items', () => {
  const instanceMappingProfile = {
    id: '',
    name: `autotest_instance_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'INSTANCE',
  };

  const holdingsMappingProfile = {
    id: '',
    name: `autotest_holdings_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'HOLDINGS',
    mappingDetails: { name: 'holdings',
      recordType: 'HOLDINGS',
      mappingFields: [
        { name: 'permanentLocationId',
          enabled: true,
          path: 'holdings.permanentLocationId',
          value: '"Annex (KU/CC/DI/A)"' }] }
  };

  const itemMappingProfile = {
    id: '',
    name: `autotest_item_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'ITEM',
    mappingDetails: { name: 'item',
      recordType: 'ITEM',
      mappingFields: [
        { name: 'materialType.id',
          enabled: true,
          path: 'item.materialType.id',
          value: '"book"',
          acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': 'book' } },
        { name: 'permanentLoanType.id',
          enabled: true,
          path: 'item.permanentLoanType.id',
          value: '"Can circulate"',
          acceptedValues: { '2b94c631-fca9-4892-a730-03ee529ffe27': 'Can circulate' } },
        { name: 'status.name',
          enabled: true,
          path: 'item.status.name',
          value: '"In process"' }] }
  };

  const instanceActionProfile = {
    profile: {
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
    deletedRelations: []
  };

  const holdingsActionProfile = {
    profile: {
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
    deletedRelations: []
  };

  const itemActionProfile = {
    profile: {
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
    deletedRelations: []
  };

  const jobProfile = {
    profile: {
      id: '',
      name: `autotest_job_profile_${getRandomPostfix()}`,
      dataType: 'MARC'
    },
    addedRelations: [
      {
        detailProfileId: '',
        order: 0,
        masterProfileType: 'JOB_PROFILE',
        detailProfileType: 'ACTION_PROFILE'
      },
      {
        detailProfileId: '',
        order: 1,
        masterProfileType: 'JOB_PROFILE',
        detailProfileType: 'ACTION_PROFILE'
      }, {
        detailProfileId: '',
        order: 2,
        masterProfileType: 'JOB_PROFILE',
        detailProfileType: 'ACTION_PROFILE'
      }
    ],
    deletedRelations: []
  };

  const testData = {
    instanceMappingProfile,
    instanceActionProfile,
    holdingsMappingProfile,
    holdingsActionProfile,
    itemMappingProfile,
    itemActionProfile,
    jobProfile,
  };

  before('navigates to application', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    cy.createLinkedProfiles(testData);
  });

  it('C343335 MARC file upload with the update of instance, holding, and items', { tags: [testType.smoke] }, () => {
    dataImport.goToDataImport();
    dataImport.uploadFile();
    jobProfiles.searchJobProfileForImport(testData.jobProfile.profile.name);
    jobProfiles.runImportFile();
    logs.checkImportFile(testData.jobProfile.profile.name);
    logs.checkStatusOfJobProfile();
    logs.openJobProfile();
    createdRecord.checkCreatedItems();

    // open job profile and get Instance HRID using API
    logs.openJobProfile(fileName);
    SearchInventory.getInstanceHRID().then(id => {
      SearchInventory.gotoInventory();
      SearchInventory.searchInstanceByHRID(id);
      SearchInventory.checkInstanceDetails();
    });
  });
});
