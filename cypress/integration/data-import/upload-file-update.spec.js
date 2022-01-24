/// <reference types="cypress" />

import testTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import dataImport from '../../support/fragments/data_import/dataImport';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import logs from '../../support/fragments/data_import/logs';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import exportFile from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';

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
    jobProfileForCreate: jobProfile,
  };

  const nameMarcFileForImportCreate = `autotestFile.${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
  const nameForExportedMarcFile = `autotestFile${getRandomPostfix()}.mrc`;
  // profile names
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const actionProfileNameForInstance = `autotestActionInstance${getRandomPostfix()}`;
  const actionProfileNameForHoldings = `autotestActionHoldings${getRandomPostfix()}`;
  const actionProfileNameForItem = `autotestActionItem${getRandomPostfix()}`;
  const matchProfileNameForInstance = `autotestMatchInstance${getRandomPostfix()}`;
  const matchProfileNameForHoldings = `autotestMatchHoldings${getRandomPostfix()}`;
  const matchProfileNameForItem = `autotestMatchProf${getRandomPostfix()}`;
  const mappingProfileNameForInstance = `autotestMappingInstance${getRandomPostfix()}`;
  const mappingProfileNameForHoldings = `autotestMappingHoldings${getRandomPostfix()}`;
  const mappingProfileNameForItem = `autotestMappingItem${getRandomPostfix()}`;

  before('navigates to application', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    cy.createLinkedProfiles(testData);
  });

  it('C343335 MARC file upload with the update of instance, holding, and items', { tags: [testTypes.smoke] }, () => {
    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    dataImport.uploadFile(nameMarcFileForImportCreate);
    jobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
    jobProfiles.runImportFile(nameMarcFileForImportCreate);
    logs.openJobProfile(nameMarcFileForImportCreate);
    logs.checkCreatedItems();

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        SearchInventory.gotoInventory();
        SearchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        cy.visit(TopMenu.dataExport);

        // download exported marc file
        exportFile.uploadFile(nameForCSVFile);
        exportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
        ExportMarcFile.downloadExportedMarcFile(nameForExportedMarcFile);

        cy.log('#####End Of Export#####');
      });

    const collectionOfProfiles = [
      {
        mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.instance,
          name: mappingProfileNameForInstance },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance, name: actionProfileNameForInstance }
      },
      {
        mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.holdings,
          name: mappingProfileNameForHoldings },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings, name: actionProfileNameForHoldings }
      },
      {
        mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.item,
          name: mappingProfileNameForItem },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item, name: actionProfileNameForItem }
      }
    ];

    collectionOfProfiles.forEach(profile => {
      settingsDataImport.goToMappingProfile();
      FieldMappingProfiles.createMappingProfileForUpdate(profile.mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      settingsDataImport.goToActionProfile();
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    // create Match profile
    const collectionOfMatchProfiles = [
      {
        matchProfile: { profileName: matchProfileNameForInstance,
          incomingRecordFields: {
            field: '001'
          },
          existingRecordFields: {
            field: '001'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'MARC_BIBLIOGRAPHIC' }
      },
      {
        matchProfile: { profileName: matchProfileNameForHoldings,
          incomingRecordFields: {
            field: '901',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'HOLDINGS' }
      },
      {
        matchProfile: {
          profileName: matchProfileNameForItem,
          incomingRecordFields: {
            field: '902',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'ITEM'
        }
      }
    ];

    settingsDataImport.goToMatchProfile();
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
    });

    // create Job profile
    const jobProfileForUpload = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName
    };
    settingsDataImport.goToJobProfile();
    jobProfiles.openNewJobProfileForm();
    NewJobProfile.fillJobProfile(jobProfileForUpload);
    NewJobProfile.linkMatchAndActionProfiles(matchProfileNameForInstance, actionProfileNameForInstance);
    NewJobProfile.linkMatchAndActionProfiles(matchProfileNameForHoldings, actionProfileNameForHoldings);
    NewJobProfile.linkMatchAndActionProfiles(matchProfileNameForItem, actionProfileNameForItem);
    NewJobProfile.clickSaveAndCloseButton();
    jobProfiles.waitLoadingList();
    jobProfiles.checkJobProfilePresented(jobProfileName);

    // upload the exported marc file
    dataImport.goToDataImport();
    dataImport.uploadFile(nameForExportedMarcFile);
    jobProfiles.searchJobProfileForImport(jobProfileName);
    jobProfiles.runImportFile(nameForExportedMarcFile);
    logs.openJobProfile(nameForExportedMarcFile);
    logs.checkIsInstanceUpdated();

    // delete generated profiles
    jobProfiles.deleteJobProfile(jobProfileForUpload.profileName);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
    });
    collectionOfProfiles.forEach(profile => {
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.profileName);
      ActionProfiles.deleteActionProfile(profile.actionProfile.profileName);
    });
  });
});
