import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
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

describe('ui-data-import: Match on location', () => {
  const holdingsPermanentLocation = 'Annex (KU/CC/DI/A)';
  const itemPermanentLocation = 'Annex (KU/CC/DI/A)';
  const recordType = 'MARC_BIBLIOGRAPHIC';
  const instanceTitle = 'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';

  // unique profile names for creating
  const instanceMappingProfileName = `autotest_instance_mapping_profile_${getRandomPostfix()}`;
  const holdingsMappingProfileName = `autotest_holdings_mapping_profile_${getRandomPostfix()}`;
  const itemMappingProfileName = `autotest_item_mapping_profile_${getRandomPostfix()}`;
  const instanceActionProfileName = `autotest_instance_action_profile_${getRandomPostfix()}`;
  const holdingsActionProfileName = `autotest_holdings_action_profile_${getRandomPostfix()}`;
  const itemActionProfileName = `autotest_item_action_profile_${getRandomPostfix()}`;
  const jobProfileName = `autotest_job_profile_${getRandomPostfix()}`;

  // unique profile names for updating
  const instanceHridMatchProfile = `C17027 match profile Instance HRID or UUID.${getRandomPostfix()}`;
  const holdingsPermLocationMatchProfile = `C17027 match profile Holdings Permanent location.${getRandomPostfix()}`;
  const itemPermLocationMatchProfile = `C17027 match profile Item Permanent location.${getRandomPostfix()}`;
  const holdingsMappingProfile = `C17027 mapping profile update holdings.${getRandomPostfix()}`;
  const itemMappingProfile = `C17027 mapping profile update item.${getRandomPostfix()}`;
  const holdingsActionProfile = `C17027 action profile update holdings.${getRandomPostfix()}`;
  const itemActionProfile = `C17027 action profile update item.${getRandomPostfix()}`;
  const jobProfile = `C17027 job profile.${getRandomPostfix()}`;

  // notes for mapping profiles
  const noteForHoldingsMappingProfile = '"This note for holdings mapping profile"';
  const noteForItemMappingProfile = '"This note for item mapping profile"';

  // unique file name
  const marcFileForCreate = `C17027 autoTestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;
  const fileNameAfterUpdate = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;

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
            value: `"${holdingsPermanentLocation}"` }] }
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
            value: `"${itemPermanentLocation}"`,
            acceptedValues: { '53cf956f-c1df-410b-8bea-27f712cca7c0' : 'Annex (KU/CC/DI/A)' } }] }
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
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings
  };

  const itemUpdateMappingProfile = {
    name: itemMappingProfile,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.item
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

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();

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
    DataImport.uploadFile('matchOnLocation.mrc', marcFileForCreate);
    JobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
    JobProfiles.runImportFile(marcFileForCreate);
    Logs.openFileDetails(marcFileForCreate);
    FileDetails.checkItemsStatusesInResultList(0, [FileDetails.status.created, FileDetails.status.created, FileDetails.status.created, FileDetails.status.created]);
    // FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.created, FileDetails.status.created, FileDetails.status.created, FileDetails.status.created]);
    // FileDetails.checkItemsStatusesInResultList(2, [FileDetails.status.created, FileDetails.status.created, FileDetails.status.created, FileDetails.status.created]);
    //FileDetails.checkItemsQuantityInSummaryTable(0, '3');

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(hrId => {
        const instanceHrid = hrId[0];

        DataImport.editMarcFile('matchOnLocation.mrc', editedMarcFileName, 'ocn933596084', instanceHrid);
      });
  });

  // after(() => {
  //   // delete profiles
  //   JobProfiles.deleteJobProfile(jobProfileName);
  //   JobProfiles.deleteJobProfile(jobProfileNameForUpdate);
  //   MatchProfiles.deleteMatchProfile(instanceHridMatchProfileName);
  //   MatchProfiles.deleteMatchProfile(holdingsPermLocationMatchProfileName);
  //   MatchProfiles.deleteMatchProfile(itemPermLocationMatchProfileName);
  //   ActionProfiles.deleteActionProfile(instanceActionProfileName);
  //   ActionProfiles.deleteActionProfile(holdingsActionProfileName);
  //   ActionProfiles.deleteActionProfile(holdingsUpdatesActionProfile);
  //   ActionProfiles.deleteActionProfile(itemActionProfileName);
  //   ActionProfiles.deleteActionProfile(itemUpdatesActionProfile);
  //   FieldMappingProfiles.deleteFieldMappingProfile(instanceMappingProfileName);
  //   FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileName);
  //   FieldMappingProfiles.deleteFieldMappingProfile(holdingsUpdateMappingProfile);
  //   FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfileName);
  //   FieldMappingProfiles.deleteFieldMappingProfile(itemUpdateMappingProfile);

  //   cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` })
  //     .then((instance) => {
  //       cy.deleteItem(instance.items[0].id);
  //       cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
  //       InventoryInstance.deleteInstanceViaApi(instance.id);
  //     });
  // });

  it('C17027 Match on location (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create Field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createHoldingsMappingProfileWithNotes(holdingsUpdateMappingProfile, noteForHoldingsMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsUpdateMappingProfile.name);

    FieldMappingProfiles.createItemMappingProfileWithNotes(itemUpdateMappingProfile, noteForItemMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(itemUpdateMappingProfile.name);

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(holdingsUpdatesActionProfile, holdingsUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(holdingsUpdatesActionProfile.name);

    ActionProfiles.createActionProfile(itemUpdatesActionProfile, itemUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(itemUpdatesActionProfile.name);

    // create Job profiles
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

    // FileDetails.checkItemsQuantityInSummaryTable(0, '1');

    FileDetails.openInstanceInInventory();
  });
});
