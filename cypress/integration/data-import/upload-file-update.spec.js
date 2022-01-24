/// <reference types="cypress" />

import testTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import dataImport from '../../support/fragments/data_import/dataImport';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import logs from '../../support/fragments/data_import/logs';
import searchInventory from '../../support/fragments/data_import/searchInventory';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import exportFile from '../../support/fragments/data-export/exportFile';
import topMenu from '../../support/fragments/topMenu';
import exportMarcFile from '../../support/fragments/data-export/export-marc-file';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import matchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import newMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import newActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import fieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import actionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import fileManager from '../../support/utils/fileManager';

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

  // const testData = {
  //   instancePair: { instanceMappingProfile,
  //     instanceActionProfile },
  //   holdingsPair: { holdingsMappingProfile,
  //     holdingsActionProfile },
  //   itemPair: { itemMappingProfile,
  //     itemActionProfile },
  // };

  const testData = [
    { instanceMappingProfile,
      instanceActionProfile },
    { holdingsMappingProfile,
      holdingsActionProfile },
    { itemMappingProfile,
      itemActionProfile },
  ];

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
    // cy.createLinkedProfiles(testData);

    const jobProfile = {
      profile: {
        name: `autotest_job_profile_${getRandomPostfix()}`,
        dataType: 'MARC'
      },
      addedRelations: [],
      deletedRelations: []
    };

    testData.jobProfileForCreate = jobProfile;

    testData.forEach(specialPair => {
      const jobId = cy.createOnePairMappingAndActionProfiles(specialPair.instanceMappingProfile, specialPair.instanceActionProfile);
      cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, jobId);
    });

    cy.createJobProfileApi(testData.jobProfileForCreate)
      .then((bodyWithjobProfile) => {
        testData.jobProfile.id = bodyWithjobProfile.body.id;
      });
  });

  it('C343335 MARC file upload with the update of instance, holding, and items', { tags: [testTypes.smoke] }, () => {
    // upload a marc file for creating of the new instance, holding and item
    cy.visit(topMenu.dataImportPath);
    dataImport.uploadFile(nameMarcFileForImportCreate);
    jobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
    jobProfiles.runImportFile(nameMarcFileForImportCreate);
    logs.openJobProfile(nameMarcFileForImportCreate);
    logs.checkCreatedItems();

    // get Instance HRID through API
    searchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        searchInventory.gotoInventory();
        searchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        exportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        cy.visit(topMenu.dataExport);

        // download exported marc file
        exportFile.uploadFile(nameForCSVFile);
        exportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
        exportMarcFile.downloadExportedMarcFile(nameForExportedMarcFile);
      });

    const collectionOfProfiles = [
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.instance,
          name: mappingProfileNameForInstance },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.instance, name: actionProfileNameForInstance }
      },
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.holdings,
          name: mappingProfileNameForHoldings },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.holdings, name: actionProfileNameForHoldings }
      },
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.item,
          name: mappingProfileNameForItem },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.item, name: actionProfileNameForItem }
      }
    ];

    collectionOfProfiles.forEach(profile => {
      settingsDataImport.goToMappingProfile();
      fieldMappingProfiles.createMappingProfileForUpdate(profile.mappingProfile);
      fieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      settingsDataImport.goToActionProfile();
      actionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile);
      actionProfiles.checkActionProfilePresented(profile.actionProfile.name);
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
      matchProfiles.createMatchProfile(profile.matchProfile);
    });

    // create Job profile
    const jobProfileForUpload = {
      ...newJobProfile.defaultJobProfile,
      profileName: jobProfileName
    };
    settingsDataImport.goToJobProfile();
    jobProfiles.openNewJobProfileForm();
    newJobProfile.fillJobProfile(jobProfileForUpload);
    newJobProfile.linkMatchAndActionProfiles(matchProfileNameForInstance, actionProfileNameForInstance);
    newJobProfile.linkMatchAndActionProfiles(matchProfileNameForHoldings, actionProfileNameForHoldings);
    newJobProfile.linkMatchAndActionProfiles(matchProfileNameForItem, actionProfileNameForItem);
    newJobProfile.clickSaveAndCloseButton();
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
      matchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
    });
    collectionOfProfiles.forEach(profile => {
      fieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.profileName);
      actionProfiles.deleteActionProfile(profile.actionProfile.profileName);
    });

    // delete downloads folder and created files in fixtures
    fileManager.deleteFolder(Cypress.config('downloadsFolder'));
    fileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
    fileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });
});
