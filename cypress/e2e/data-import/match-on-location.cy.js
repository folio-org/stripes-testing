import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../support/fragments/data_import/logs/logs';
import DataImportSettingsJobProfiles from '../../support/fragments/settings/dataImport/dataImportSettingsJobProfiles';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import ItemVeiw from '../../support/fragments/inventory/inventoryItem/itemVeiw';
import FileManager from '../../support/utils/fileManager';

describe('ui-data-import: Match on location', () => {
  const permanentLocation = 'Main Library (KU/CC/DI/M)';
  const recordType = 'MARC_BIBLIOGRAPHIC';
  let instanceHrid = null;

  // unique profile names for creating
  const instanceMappingProfileName = `autotest_instance_mapping_profile_${getRandomPostfix()}`;
  const holdingsMappingProfileName = `autotest_holdings_mapping_profile_${getRandomPostfix()}`;
  const itemMappingProfileName = `autotest_item_mapping_profile_${getRandomPostfix()}`;
  const instanceActionProfileName = `autotest_instance_action_profile_${getRandomPostfix()}`;
  const holdingsActionProfileName = `autotest_holdings_action_profile_${getRandomPostfix()}`;
  const itemActionProfileName = `autotest_item_action_profile_${getRandomPostfix()}`;
  const jobProfileName = `autotest_job_profile_${getRandomPostfix()}`;

  // elements for update items
  const noteForHoldingsMappingProfile = 'This note for holdings mapping profile';
  const holdingsStatement = 'This is holdings statement';
  const holdingsType = '"Monograph"';
  const noteForItemMappingProfile = 'This note for item mapping profile';
  const materialType = '"sound recording"';
  const itemNote = '"Electronic bookplate"';

  // unique file name
  const marcFileForCreate = `C17027 autoTestFile.${getRandomPostfix()}.mrc`;

  // profiles for creating instance, holdings, item
  const instanceMappingProfileForCreate = {
    profile:{
      name: instanceMappingProfileName,
      incomingRecordType: recordType,
      existingRecordType: 'INSTANCE',
    }
  };

  const holdingsMappingProfileForCreate = {
    profile:{
      name: holdingsMappingProfileName,
      incomingRecordType: recordType,
      existingRecordType: 'HOLDINGS',
      mappingDetails: { name: 'holdings',
        recordType: 'HOLDINGS',
        mappingFields: [
          { name: 'permanentLocationId',
            enabled: true,
            path: 'holdings.permanentLocationId',
            value: `"${permanentLocation}"` }] }
    }
  };

  const itemMappingProfileForCreate = {
    profile:{
      name: itemMappingProfileName,
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
            value: '"Available"' },
          { name: 'permanentLocation.id',
            enabled: 'true',
            path: 'item.permanentLocation.id',
            value: `"${permanentLocation}"`,
            acceptedValues: { 'fcd64ce1-6995-48f0-840e-89ffa2288371' : 'Main Library (KU/CC/DI/M)' } }] }
    }
  };

  const instanceActionProfileForCreate = {
    profile: {
      name: instanceActionProfileName,
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

  const holdingsActionProfileForCreate = {
    profile: {
      name: holdingsActionProfileName,
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

  const itemActionProfileForCreate = {
    profile: {
      name: itemActionProfileName,
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

  const testData = [
    { mappingProfile: instanceMappingProfileForCreate,
      actionProfile: instanceActionProfileForCreate },
    { mappingProfile: holdingsMappingProfileForCreate,
      actionProfile: holdingsActionProfileForCreate },
    { mappingProfile: itemMappingProfileForCreate,
      actionProfile: itemActionProfileForCreate },
  ];

  const jobProfileForCreate = {
    profile: {
      name: jobProfileName,
      dataType: 'MARC'
    },
    addedRelations: [],
    deletedRelations: []
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        testData.jobProfileForCreate = jobProfileForCreate;

        testData.forEach(specialPair => {
          cy.createOnePairMappingAndActionProfiles(specialPair.mappingProfile, specialPair.actionProfile).then(idActionProfile => {
            cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
          });
        });
        DataImportSettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate)
          .then((bodyWithjobProfile) => {
            testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
          });

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile('marcFileForMatchOnLocation.mrc', marcFileForCreate);
        JobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile(marcFileForCreate);
        Logs.openFileDetails(marcFileForCreate);
        FileDetails.checkItemsStatusesInResultList(0, [FileDetails.status.created, FileDetails.status.created, FileDetails.status.created, FileDetails.status.created]);
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');

        // get Instance HRID through API
        SearchInventory.getInstanceHRID()
          .then(hrId => { instanceHrid = hrId[0]; });
      });
  });

  after(() => {
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(instanceActionProfileName);
    ActionProfiles.deleteActionProfile(holdingsActionProfileName);
    ActionProfiles.deleteActionProfile(itemActionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(instanceMappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfileName);

    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C17027 Match on location (name location) (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // unique profile names for updating
    const instanceHridMatchProfile = `C17027 match profile Instance HRID or UUID.${getRandomPostfix()}`;
    const holdingsPermLocationMatchProfile = `C17027 match profile Holdings Permanent location.${getRandomPostfix()}`;
    const itemPermLocationMatchProfile = `C17027 match profile Item Permanent location.${getRandomPostfix()}`;
    const holdingsMappingProfile = `C17027 mapping profile update holdings.${getRandomPostfix()}`;
    const itemMappingProfile = `C17027 mapping profile update item.${getRandomPostfix()}`;
    const holdingsActionProfile = `C17027 action profile update holdings.${getRandomPostfix()}`;
    const itemActionProfile = `C17027 action profile update item.${getRandomPostfix()}`;
    const jobProfile = `C17027 job profile.${getRandomPostfix()}`;

    // unique file name
    const editedMarcFileName = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;
    const fileNameAfterUpdate = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;

    // profiles for updating instance, holdings, item
    const collectionOfMatchProfiles = [
      {
        matchProfile: { profileName: instanceHridMatchProfile,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'MARC_BIBLIOGRAPHIC' }
      },
      {
        matchProfile: { profileName: holdingsPermLocationMatchProfile,
          incomingRecordFields: {
            field: '960',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'HOLDINGS',
          holdingsOption: NewMatchProfile.optionsList.holdingsPermLoc }
      },
      {
        matchProfile: { profileName: itemPermLocationMatchProfile,
          incomingRecordFields: {
            field: '960',
            subfield: 'b'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'ITEM',
          itemOption: NewMatchProfile.optionsList.itemPermLoc }
      },
    ];

    const holdingsUpdateMappingProfile = {
      name: holdingsMappingProfile,
      typeValue : NewMappingProfile.folioRecordTypeValue.holdings
    };

    const itemUpdateMappingProfile = {
      name: itemMappingProfile,
      typeValue : NewMappingProfile.folioRecordTypeValue.item
    };

    const holdingsUpdatesActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.holdings,
      name: holdingsActionProfile,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const itemUpdatesActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.item,
      name: itemActionProfile,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const jobProfileNameForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfile,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    // change Instance HRID in .mec file
    DataImport.editMarcFile('marcFileForMatchOnLocation.mrc', editedMarcFileName, 'ocn933596084', instanceHrid);

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create Field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(holdingsUpdateMappingProfile);
    NewMappingProfile.addAdministrativeNote(noteForHoldingsMappingProfile, 5);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsUpdateMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsUpdateMappingProfile.name);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(itemUpdateMappingProfile);
    NewMappingProfile.addAdministrativeNote(noteForItemMappingProfile, 7);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemUpdateMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(itemUpdateMappingProfile.name);

    // create Action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(holdingsUpdatesActionProfile, holdingsUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(holdingsUpdatesActionProfile.name);
    ActionProfiles.createActionProfile(itemUpdatesActionProfile, itemUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(itemUpdatesActionProfile.name);

    // create Job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfileNameForUpdate);
    NewJobProfile.linkMatchProfile(instanceHridMatchProfile);
    NewJobProfile.linkMatchProfileForMatches(holdingsPermLocationMatchProfile);
    NewJobProfile.linkActionProfileForMatches(holdingsUpdatesActionProfile.name);
    NewJobProfile.linkMatchProfileForMatches(itemPermLocationMatchProfile, 2);
    NewJobProfile.linkActionProfileForMatches(itemUpdatesActionProfile.name, 2);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate.profileName);

    // upload a marc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(editedMarcFileName, fileNameAfterUpdate);
    JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate.profileName);
    JobProfiles.runImportFile(fileNameAfterUpdate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameAfterUpdate);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.holdings);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.item);
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
    FileDetails.checkItemQuantityInSummaryTable('1', 1);

    // check updated items in Inventory
    FileDetails.openItemInInventory(4);
    HoldingsRecordView.checkAdministrativeNote(noteForHoldingsMappingProfile);
    HoldingsRecordView.close();
    InventoryInstance.openHoldingsAccordion('Main Library >');
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.checkItemAdministrativeNote(noteForItemMappingProfile);

    // delete profiles
    JobProfiles.deleteJobProfile(jobProfile);
    MatchProfiles.deleteMatchProfile(instanceHridMatchProfile);
    MatchProfiles.deleteMatchProfile(holdingsPermLocationMatchProfile);
    MatchProfiles.deleteMatchProfile(itemPermLocationMatchProfile);
    ActionProfiles.deleteActionProfile(holdingsActionProfile);
    ActionProfiles.deleteActionProfile(itemActionProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfile);

    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${fileNameAfterUpdate}`);
  });

  it('C17027 Match on location (code location) (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // unique file name
    const editedMarcFileName = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;
    const fileNameAfterUpdate = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;

    // change Instance HRID in .mec file
    DataImport.editMarcFile(
      'marcFileForMatchOnLocation.mrc',
      editedMarcFileName,
      ['ocn933596084', 'Main Library'],
      [instanceHrid, 'Main Library (KU/CC/DI/M)']
    );

    // unique profile names for updating
    const instanceHridMatchProfile = `C17027 match profile Instance HRID or UUID.${getRandomPostfix()}`;
    const holdingsPermLocationMatchProfile = `C17027 match profile Holdings Permanent location.${getRandomPostfix()}`;
    const itemPermLocationMatchProfile = `C17027 match profile Item Permanent location.${getRandomPostfix()}`;
    const holdingsMappingProfile = `C17027 mapping profile update holdings.${getRandomPostfix()}`;
    const itemMappingProfile = `C17027 mapping profile update item.${getRandomPostfix()}`;
    const holdingsActionProfile = `C17027 action profile update holdings.${getRandomPostfix()}`;
    const itemActionProfile = `C17027 action profile update item.${getRandomPostfix()}`;
    const jobProfile = `C17027 job profile.${getRandomPostfix()}`;

    // profiles for updating instance, holdings, item
    const collectionOfMatchProfiles = [
      {
        matchProfile: { profileName: instanceHridMatchProfile,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'MARC_BIBLIOGRAPHIC' }
      },
      {
        matchProfile: { profileName: holdingsPermLocationMatchProfile,
          incomingRecordFields: {
            field: '960',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'HOLDINGS',
          holdingsOption: NewMatchProfile.optionsList.holdingsPermLoc }
      },
      {
        matchProfile: { profileName: itemPermLocationMatchProfile,
          incomingRecordFields: {
            field: '960',
            subfield: 'b'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'ITEM',
          itemOption: NewMatchProfile.optionsList.itemPermLoc }
      },
    ];

    const holdingsUpdateMappingProfile = {
      name: holdingsMappingProfile,
      typeValue : NewMappingProfile.folioRecordTypeValue.holdings
    };

    const itemUpdateMappingProfile = {
      name: itemMappingProfile,
      typeValue : NewMappingProfile.folioRecordTypeValue.item
    };

    const holdingsUpdatesActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.holdings,
      name: holdingsActionProfile,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const itemUpdatesActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.item,
      name: itemActionProfile,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const jobProfileNameForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfile,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create Field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(holdingsUpdateMappingProfile);
    NewMappingProfile.addHoldingsStatements(holdingsStatement);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsUpdateMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsUpdateMappingProfile.name);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(itemUpdateMappingProfile);
    NewMappingProfile.fillMaterialType(materialType);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemUpdateMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(itemUpdateMappingProfile.name);

    // create Action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(holdingsUpdatesActionProfile, holdingsUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(holdingsUpdatesActionProfile.name);
    ActionProfiles.createActionProfile(itemUpdatesActionProfile, itemUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(itemUpdatesActionProfile.name);

    // create Job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfileNameForUpdate);
    NewJobProfile.linkMatchProfile(instanceHridMatchProfile);
    NewJobProfile.linkMatchProfileForMatches(holdingsPermLocationMatchProfile);
    NewJobProfile.linkActionProfileForMatches(holdingsUpdatesActionProfile.name);
    NewJobProfile.linkMatchProfileForMatches(itemPermLocationMatchProfile, 2);
    NewJobProfile.linkActionProfileForMatches(itemUpdatesActionProfile.name, 2);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate.profileName);

    // upload a marc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(editedMarcFileName, fileNameAfterUpdate);
    JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate.profileName);
    JobProfiles.runImportFile(fileNameAfterUpdate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameAfterUpdate);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.holdings);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.item);
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
    FileDetails.checkItemQuantityInSummaryTable('1', 1);

    // check updated items in Inventory
    FileDetails.openItemInInventory(4);
    HoldingsRecordView.checkHoldingsStatement(holdingsStatement);
    HoldingsRecordView.close();
    InventoryInstance.openHoldingsAccordion('Main Library >');
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.checkMaterialType(materialType);

    // delete profiles
    JobProfiles.deleteJobProfile(jobProfile);
    MatchProfiles.deleteMatchProfile(instanceHridMatchProfile);
    MatchProfiles.deleteMatchProfile(holdingsPermLocationMatchProfile);
    MatchProfiles.deleteMatchProfile(itemPermLocationMatchProfile);
    ActionProfiles.deleteActionProfile(holdingsActionProfile);
    ActionProfiles.deleteActionProfile(itemActionProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfile);

    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${fileNameAfterUpdate}`);
  });

  it('C17027 Match on location (name and code location) (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // unique file name
    const editedMarcFileName = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;
    const fileNameAfterUpdate = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;

    // change Instance HRID in .mec file
    DataImport.editMarcFile(
      'marcFileForMatchOnLocation.mrc',
      editedMarcFileName,
      ['ocn933596084', 'Main Library'],
      [instanceHrid, 'KU/CC/DI/M']
    );

    // unique profile names for updating
    const instanceHridMatchProfile = `C17027 match profile Instance HRID or UUID.${getRandomPostfix()}`;
    const holdingsPermLocationMatchProfile = `C17027 match profile Holdings Permanent location.${getRandomPostfix()}`;
    const itemPermLocationMatchProfile = `C17027 match profile Item Permanent location.${getRandomPostfix()}`;
    const holdingsMappingProfile = `C17027 mapping profile update holdings.${getRandomPostfix()}`;
    const itemMappingProfile = `C17027 mapping profile update item.${getRandomPostfix()}`;
    const holdingsActionProfile = `C17027 action profile update holdings.${getRandomPostfix()}`;
    const itemActionProfile = `C17027 action profile update item.${getRandomPostfix()}`;
    const jobProfile = `C17027 job profile.${getRandomPostfix()}`;

    // profiles for updating instance, holdings, item
    const collectionOfMatchProfiles = [
      {
        matchProfile: { profileName: instanceHridMatchProfile,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'MARC_BIBLIOGRAPHIC' }
      },
      {
        matchProfile: { profileName: holdingsPermLocationMatchProfile,
          incomingRecordFields: {
            field: '960',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'HOLDINGS',
          holdingsOption: NewMatchProfile.optionsList.holdingsPermLoc }
      },
      {
        matchProfile: { profileName: itemPermLocationMatchProfile,
          incomingRecordFields: {
            field: '960',
            subfield: 'b'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'ITEM',
          itemOption: NewMatchProfile.optionsList.itemPermLoc }
      },
    ];

    const holdingsUpdateMappingProfile = {
      name: holdingsMappingProfile,
      typeValue : NewMappingProfile.folioRecordTypeValue.holdings
    };

    const itemUpdateMappingProfile = {
      name: itemMappingProfile,
      typeValue : NewMappingProfile.folioRecordTypeValue.item
    };

    const holdingsUpdatesActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.holdings,
      name: holdingsActionProfile,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const itemUpdatesActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.item,
      name: itemActionProfile,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const jobProfileNameForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfile,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create Field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(holdingsUpdateMappingProfile);
    NewMappingProfile.fillHoldingsType(holdingsType);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsUpdateMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsUpdateMappingProfile.name);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(itemUpdateMappingProfile);
    NewMappingProfile.addItemNotes(itemNote, '"Smith Family Foundation"', 'Mark for all affected records');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemUpdateMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(itemUpdateMappingProfile.name);

    // create Action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(holdingsUpdatesActionProfile, holdingsUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(holdingsUpdatesActionProfile.name);
    ActionProfiles.createActionProfile(itemUpdatesActionProfile, itemUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(itemUpdatesActionProfile.name);

    // create Job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfileNameForUpdate);
    NewJobProfile.linkMatchProfile(instanceHridMatchProfile);
    NewJobProfile.linkMatchProfileForMatches(holdingsPermLocationMatchProfile);
    NewJobProfile.linkActionProfileForMatches(holdingsUpdatesActionProfile.name);
    NewJobProfile.linkMatchProfileForMatches(itemPermLocationMatchProfile, 2);
    NewJobProfile.linkActionProfileForMatches(itemUpdatesActionProfile.name, 2);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate.profileName);

    // upload a marc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(editedMarcFileName, fileNameAfterUpdate);
    JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate.profileName);
    JobProfiles.runImportFile(fileNameAfterUpdate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameAfterUpdate);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.holdings);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.item);
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
    FileDetails.checkItemQuantityInSummaryTable('1', 1);

    // check updated items in Inventory
    FileDetails.openItemInInventory(4);
    HoldingsRecordView.checkHoldingsType(holdingsType);
    HoldingsRecordView.close();
    InventoryInstance.openHoldingsAccordion('Main Library >');
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.checkItemNote(itemNote);

    // delete profiles
    JobProfiles.deleteJobProfile(jobProfile);
    MatchProfiles.deleteMatchProfile(instanceHridMatchProfile);
    MatchProfiles.deleteMatchProfile(holdingsPermLocationMatchProfile);
    MatchProfiles.deleteMatchProfile(itemPermLocationMatchProfile);
    ActionProfiles.deleteActionProfile(holdingsActionProfile);
    ActionProfiles.deleteActionProfile(itemActionProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfile);
    FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfile);
  });
});
