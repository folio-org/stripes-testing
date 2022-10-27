import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import ExportFile from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import FileManager from '../../support/utils/fileManager';
import ExportFieldMappingProfiles from '../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import SettingsJobProfiles from '../../support/fragments/settings/dataImport/settingsJobProfiles';
import DevTeams from '../../support/dictionary/devTeams';

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
  const recordType = 'MARC_BIBLIOGRAPHIC';

  const marcBibMappingProfile = {
    profile:{
      id: '',
      name: nameMarcBibMappingProfile,
      incomingRecordType: recordType,
      existingRecordType: recordType,
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
    }
  };

  const instanceMappingProfile = {
    profile:{
      id: '',
      name: nameInstanceMappingProfile,
      incomingRecordType: recordType,
      existingRecordType: 'INSTANCE',
    }
  };

  const holdingsMappingProfile = {
    profile:{
      id: '',
      name: nameHoldingsMappingProfile,
      incomingRecordType: recordType,
      existingRecordType: 'HOLDINGS',
      mappingDetails: { name: 'holdings',
        recordType: 'HOLDINGS',
        mappingFields: [
          { name: 'permanentLocationId',
            enabled: true,
            path: 'holdings.permanentLocationId',
            value: '"Annex (KU/CC/DI/A)"' }] }
    }
  };

  const itemMappingProfile = {
    profile:{
      id: '',
      name: nameItemMappingProfile,
      incomingRecordType: recordType,
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
    }
  };

  const marcBibActionProfile = {
    profile: {
      id: '',
      name: nameMarcBibActionProfile,
      action: 'MODIFY',
      folioRecord: recordType
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
  const nameMarcFileForImportCreate = `C343335autotestFile.${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
  const nameMarcFileForImportUpdate = `C343335autotestFile${getRandomPostfix()}.mrc`;
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

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
        name: mappingProfileNameForInstance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: actionProfileNameForInstance,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForItem },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForItem,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];

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
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.holdingsHrid }
    },
    {
      matchProfile: {
        profileName: matchProfileNameForItem,
        incomingRecordFields: {
          field: '902',
          subfield: 'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.itemHrid
      }
    }
  ];

  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameUpdate,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();

    DataImport.checkUploadState();

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
    SettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate)
      .then((bodyWithjobProfile) => {
        testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
      });
  });

  afterEach(() => {
    DataImport.checkUploadState();

    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileNameUpdate);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
    });
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    JobProfiles.deleteJobProfile(jobProfileNameCreate);
    ActionProfiles.deleteActionProfile(nameMarcBibActionProfile);
    ActionProfiles.deleteActionProfile(nameInstanceActionProfile);
    ActionProfiles.deleteActionProfile(nameHoldingsActionProfile);
    ActionProfiles.deleteActionProfile(nameItemActionProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(nameMarcBibMappingProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(nameInstanceMappingProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(nameHoldingsMappingProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(nameItemMappingProfile);

    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });

  const createInstanceMappingProfile = (profile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
    NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
    NewFieldMappingProfile.fillInstanceStatusTerm();
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(profile.name);
  };

  const createHoldingsMappingProfile = (profile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
    NewFieldMappingProfile.fillHoldingsType('"Electronic"');
    NewFieldMappingProfile.fillPermanentLocation('"Online (E)"');
    NewFieldMappingProfile.fillCallNumberType('"Library of Congress classification"');
    NewFieldMappingProfile.fillCallNumber('050$a " " 050$b');
    NewFieldMappingProfile.addElectronicAccess('"Resource"', '856$u');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(profile.name);
  };

  const createItemMappingProfile = (profile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
    NewFieldMappingProfile.fillMaterialType('"electronic resource"');
    NewFieldMappingProfile.addItemNotes('"Electronic bookplate"', '"Smith Family Foundation"', 'Mark for all affected records');
    NewFieldMappingProfile.fillPermanentLoanType('"Can circulate"');
    NewFieldMappingProfile.fillStatus('"Available"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(profile.name);
  };

  // MODSOURMAN-819
  it('C343335 MARC file upload with the update of instance, holding, and items (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForImportCreate);
    JobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
    JobProfiles.runImportFile(nameMarcFileForImportCreate);
    Logs.openFileDetails(nameMarcFileForImportCreate);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.srsMarc);
    [FileDetails.columnName.instance,
      FileDetails.columnName.holdings,
      FileDetails.columnName.item].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkItemsQuantityInSummaryTable(0, '1');

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(hrId => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(hrId[1]);
        InventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });

    // create Field mapping profile for export
    const exportMappingProfile = {
      name: mappingProfileNameForExport,
    };

    cy.visit(SettingsMenu.exportMappingProfilePath);
    ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile.name);

    cy.visit(SettingsMenu.exportJobProfilePath);
    ExportJobProfiles.createJobProfile(jobProfileNameForExport, mappingProfileNameForExport);

    // download exported marc file
    cy.visit(TopMenu.dataExportPath);
    ExportFile.uploadFile(nameForCSVFile);
    ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
    ExportMarcFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);

    // create mapping and action profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
    createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[1].mappingProfile.name);
    createItemMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[2].mappingProfile.name);

    collectionOfMappingAndActionProfiles.forEach(profile => {
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create Job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
    NewJobProfile.linkMatchAndActionProfilesForInstance(actionProfileNameForInstance, matchProfileNameForInstance, 0);
    NewJobProfile.linkMatchAndActionProfilesForHoldings(actionProfileNameForHoldings, matchProfileNameForHoldings, 2);
    NewJobProfile.linkMatchAndActionProfilesForItem(actionProfileNameForItem, matchProfileNameForItem, 4);
    NewJobProfile.saveAndClose();

    // upload the exported marc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadExportedFile(nameMarcFileForImportUpdate);
    JobProfiles.searchJobProfileForImport(jobProfileForUpdate.profileName);
    JobProfiles.runImportFile(nameMarcFileForImportUpdate);
    Logs.openFileDetails(nameMarcFileForImportUpdate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
      FileDetails.columnName.holdings,
      FileDetails.columnName.item].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
    });
    FileDetails.checkItemsQuantityInSummaryTable(1, '1');
  });
});
