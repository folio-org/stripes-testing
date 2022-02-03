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
import settingsDataExport from '../../support/fragments/data-export/settingsDataExport';
import exportFieldMappingProfiles from '../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import exportJobProfiles from '../../support/fragments/data-export/exportJobProfile/exportJobProfiles';

describe('ui-data-import: MARC file upload with the update of instance, holding, and items', () => {
  // profile names for creating
  const nameMarcBibMappingProfile = `autotest_marcBib_mapping_profile_${getRandomPostfix()}`;
  const nameInstanceMappingProfile = `autotest_instance_mapping_profile_${getRandomPostfix()}`;
  const nameHoldingsMappingProfile = `autotest_holdings_mapping_profile_${getRandomPostfix()}`;
  const nameItemMappingProfile = `autotest_item_mapping_profile_${getRandomPostfix()}`;
  const nameMarcBibActionProfile = `autotest_marcBib_action_profile_${getRandomPostfix()}`;
  const nameInstanceActionProfile = `autotest_instance_action_profile_${getRandomPostfix()}`;
  const nameHoldingsActionProfile = `autotest_holdings_action_profile_${getRandomPostfix()}`;
  const nameItemActionProfile = `autotest_item_action_profile_${getRandomPostfix()}`;
  const jobProfileNameCreate = `autotest_job_profile_${getRandomPostfix()}`;

  const marcBibMappingProfile = {
    id: '',
    name: nameMarcBibMappingProfile,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'MARC_BIBLIOGRAPHIC',
    mappingDetails: { name: 'holdings',
      recordType: 'MARC_BIBLIOGRAPHIC',
      marcMappingDetails: [{
        order: 0,
        action: 'ADD',
        field: {
          field: '650',
          indicator2: '4',
          subfields: [{
            subfield: 'a',
            data: {
              text: 'Test update'
            }
          }]
        }
      }],
      marcMappingOption: 'MODIFY' }
  };

  const instanceMappingProfile = {
    id: '',
    name: nameInstanceMappingProfile,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'INSTANCE',
  };

  const holdingsMappingProfile = {
    id: '',
    name: nameHoldingsMappingProfile,
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
    name: nameItemMappingProfile,
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

  const marcBibActionProfile = {
    profile: {
      id: '',
      name: nameMarcBibActionProfile,
      action: 'MODIFY',
      folioRecord: 'MARC_BIBLIOGRAPHIC'
    },
    addedRelations: [
      {
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };

  const instanceActionProfile = {
    profile: {
      id: '',
      name: nameInstanceActionProfile,
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
      name: nameHoldingsActionProfile,
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
      name: nameItemActionProfile,
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

  // TODO redesine classes inherites
  const testData = [
    { mappingProfile: marcBibMappingProfile,
      actionProfile: marcBibActionProfile },
    { mappingProfile: instanceMappingProfile,
      actionProfile: instanceActionProfile },
    { mappingProfile: holdingsMappingProfile,
      actionProfile: holdingsActionProfile },
    { mappingProfile: itemMappingProfile,
      actionProfile: itemActionProfile },
  ];

  // file names
  const nameMarcFileForImportCreate = `autotestFile.${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
  const nameMarcFileForImportUpdate = `autotestFile${getRandomPostfix()}.mrc`;
  // profile names for updating
  const jobProfileNameUpdate = `autotestJobProf${getRandomPostfix()}`;
  const actionProfileNameForInstance = `autotestActionInstance${getRandomPostfix()}`;
  const actionProfileNameForHoldings = `autotestActionHoldings${getRandomPostfix()}`;
  const actionProfileNameForItem = `autotestActionItem${getRandomPostfix()}`;
  const matchProfileNameForInstance = `autotestMatchInstance${getRandomPostfix()}`;
  const matchProfileNameForHoldings = `autotestMatchHoldings${getRandomPostfix()}`;
  const matchProfileNameForItem = `autotestMatchItem${getRandomPostfix()}`;
  const mappingProfileNameForInstance = `autotestMappingInstance${getRandomPostfix()}`;
  const mappingProfileNameForHoldings = `autotestMappingHoldings${getRandomPostfix()}`;
  const mappingProfileNameForItem = `autotestMappingItem${getRandomPostfix()}`;
  const mappingProfileNameForExport = `autoTestMappingProf.${getRandomPostfix()}`;
  const jobProfileNameForExport = `autoTestJobProf.${getRandomPostfix()}`;

  before('navigates to Settings', () => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
  });

  beforeEach(() => {
    const jobProfile = {
      profile: {
        name: jobProfileNameCreate,
        dataType: 'MARC'
      },
      addedRelations: [],
      deletedRelations: []
    };

    testData.jobProfileForCreate = jobProfile;

    testData.forEach(specialPair => {
      cy.createOnePairMappingAndActionProfiles(specialPair.mappingProfile, specialPair.actionProfile).then(idActionProfile => {
        cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
      });
    });
    cy.createJobProfileApi(testData.jobProfileForCreate)
      .then((bodyWithjobProfile) => {
        testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
      });
  });

  it('C343335 MARC file upload with the update of instance, holding, and items', { tags: [testTypes.smoke] }, () => {
    // upload a marc file for creating of the new instance, holding and item
    cy.visit(topMenu.dataImportPath);
    dataImport.uploadFileWithout999Field(nameMarcFileForImportCreate);
    jobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
    jobProfiles.runImportFile(nameMarcFileForImportCreate);
    logs.openJobProfile(nameMarcFileForImportCreate);
    // logs.checkIsSrsUpdated();
    // logs.checkCreatedItems();

    // get Instance HRID through API
    searchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        searchInventory.gotoInventory();
        searchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        exportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        fileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });
    cy.visit(topMenu.dataExport);

    // create Field mapping profile for export
    const exportMappingProfile = {
      name: mappingProfileNameForExport,
    };

    settingsDataExport.goToMappingProfiles();
    exportFieldMappingProfiles.createMappingProfile(exportMappingProfile.name);

    settingsDataExport.goToJobProfiles();
    exportJobProfiles.createJobProfile(jobProfileNameForExport, mappingProfileNameForExport);

    // download exported marc file
    cy.visit(topMenu.dataExport);
    exportFile.uploadFile(nameForCSVFile);
    exportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
    exportMarcFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);

    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.instance,
          name: mappingProfileNameForInstance,
          fillProfile: newMappingProfile.fillInstanceMappingProfile },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.instance,
          name: actionProfileNameForInstance,
          action: 'Update (all record types except Orders)' }
      },
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.holdings,
          name: mappingProfileNameForHoldings,
          fillProfile: newMappingProfile.fillHoldingsMappingProfile },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.holdings,
          name: actionProfileNameForHoldings,
          action: 'Update (all record types except Orders)' }
      },
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.item,
          name: mappingProfileNameForItem,
          fillProfile: newMappingProfile.fillItemMappingProfile },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.item,
          name: actionProfileNameForItem,
          action: 'Update (all record types except Orders)' }
      }
    ];

    collectionOfMappingAndActionProfiles.forEach(profile => {
      settingsDataImport.goToMappingProfiles();
      fieldMappingProfiles.createMappingProfileForUpdate(profile.mappingProfile);
      fieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      settingsDataImport.goToActionProfiles();
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

    settingsDataImport.goToMatchProfiles();
    collectionOfMatchProfiles.forEach(profile => {
      matchProfiles.createMatchProfile(profile.matchProfile);
    });

    // create Job profile
    const jobProfileForUpdate = {
      ...newJobProfile.defaultJobProfile,
      profileName: jobProfileNameUpdate
    };

    settingsDataImport.goToJobProfiles();
    jobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
    newJobProfile.linkMatchAndActionProfilesForInstance(actionProfileNameForInstance, matchProfileNameForInstance, 0);
    newJobProfile.linkMatchAndActionProfilesForHoldings(actionProfileNameForHoldings, matchProfileNameForHoldings, 2);
    newJobProfile.linkMatchAndActionProfilesForItem(actionProfileNameForItem, matchProfileNameForItem, 4);
    newJobProfile.clickSaveAndCloseButton();

    // upload the exported marc file
    dataImport.goToDataImport();
    dataImport.uploadExportedFile(nameMarcFileForImportUpdate);
    jobProfiles.searchJobProfileForImport(jobProfileForUpdate.profileName);
    jobProfiles.runImportFile(nameMarcFileForImportUpdate);
    logs.openJobProfile(nameMarcFileForImportUpdate);
    logs.checkIsInstanceUpdated();

    // delete generated profiles
    jobProfiles.deleteJobProfile(jobProfileNameUpdate);
    collectionOfMatchProfiles.forEach(profile => {
      matchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
    });
    collectionOfMappingAndActionProfiles.forEach(profile => {
      actionProfiles.deleteActionProfile(profile.actionProfile.name);
      fieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    jobProfiles.deleteJobProfile(jobProfileNameCreate);
    actionProfiles.deleteActionProfile(nameMarcBibActionProfile);
    actionProfiles.deleteActionProfile(nameInstanceActionProfile);
    actionProfiles.deleteActionProfile(nameHoldingsActionProfile);
    actionProfiles.deleteActionProfile(nameItemActionProfile);
    fieldMappingProfiles.deleteFieldMappingProfile(nameMarcBibMappingProfile);
    fieldMappingProfiles.deleteFieldMappingProfile(nameInstanceMappingProfile);
    fieldMappingProfiles.deleteFieldMappingProfile(nameHoldingsMappingProfile);
    fieldMappingProfiles.deleteFieldMappingProfile(nameItemMappingProfile);

    // delete downloads folder and created files in fixtures
    fileManager.deleteFolder(Cypress.config('downloadsFolder'));
    fileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
    fileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });
});
