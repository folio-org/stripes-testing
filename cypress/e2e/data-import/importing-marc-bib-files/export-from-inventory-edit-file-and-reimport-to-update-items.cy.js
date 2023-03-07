import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';

describe('ui-data-import', () => {
  let instanceHrid;
  const permanentLocation = 'Main Library (KU/CC/DI/M)';
  const recordType = 'MARC_BIBLIOGRAPHIC';
  // unique file name
  const marcFileForCreate = `C11123 autoTestFile.${getRandomPostfix()}.mrc`;
  // unique profile names for creating
  const instanceMappingProfileNameForCreate = `autotest_instance_mapping_profile_${getRandomPostfix()}`;
  const holdingsMappingProfileNameForCreate = `autotest_holdings_mapping_profile_${getRandomPostfix()}`;
  const itemMappingProfileNameForCreate = `autotest_item_mapping_profile_${getRandomPostfix()}`;
  const instanceActionProfileNameForCreate = `autotest_instance_action_profile_${getRandomPostfix()}`;
  const holdingsActionProfileNameForCreate = `autotest_holdings_action_profile_${getRandomPostfix()}`;
  const itemActionProfileNameForCreate = `autotest_item_action_profile_${getRandomPostfix()}`;
  const jobProfileNameForCreate = `autotest_job_profile_${getRandomPostfix()}`;
  // profiles for creating instance, holdings, item
  const instanceMappingProfileForCreate = {
    profile:{
      name: instanceMappingProfileNameForCreate,
      incomingRecordType: recordType,
      existingRecordType: 'INSTANCE',
    }
  };
  const holdingsMappingProfileForCreate = {
    profile:{
      name: holdingsMappingProfileNameForCreate,
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
      name: itemMappingProfileNameForCreate,
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
      name: instanceActionProfileNameForCreate,
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
      name: holdingsActionProfileNameForCreate,
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
      name: itemActionProfileNameForCreate,
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
      name: jobProfileNameForCreate,
      dataType: 'MARC'
    },
    addedRelations: [],
    deletedRelations: []
  };
  // unique profile names for updating
  const itemMappingProfileNameForUpdate = `C11123 mapping profile update item.${getRandomPostfix()}`;
  const matchProfileName = `C11123 match profile.${getRandomPostfix()}`;
  const itemActionProfileNameForUpdate = `C11123 action profile update item.${getRandomPostfix()}`;
  const jobProfileNameForUpdate = `C11123 job profile.${getRandomPostfix()}`;
  // profiles for updating instance, holdings, item
  const matchProfile =
    {
      matchProfile: {
        profileName: matchProfileName,
        incomingRecordFields: {
          field: '001',
          subfield: 'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.itemHrid
      }
    };
  const itemMappingProfileForUpdate = {
    name: itemMappingProfileNameForUpdate,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.item
  };
  const itemActionProfileForUpdate = {
    typeValue: NewActionProfile.folioRecordTypeValue.item,
    name: itemActionProfileNameForUpdate,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForUpdate,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create test data', () => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        testData.jobProfileForCreate = jobProfileForCreate;

        testData.forEach(specialPair => {
          cy.createOnePairMappingAndActionProfiles(specialPair.mappingProfile, specialPair.actionProfile).then(idActionProfile => {
            cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
          });
        });
        SettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate)
          .then((bodyWithjobProfile) => {
            testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
          });
        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete code after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.clickDataImportNavButton();
        DataImport.uploadFile('***.mrc', marcFileForCreate);
        JobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileForCreate);
        Logs.openFileDetails(marcFileForCreate);
        [FileDetails.columnName.srsMarc,
          FileDetails.columnName.instance,
          FileDetails.columnName.holdings,
          FileDetails.columnName.item
        ].forEach(columnName => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
        // get Instance HRID through API for delete instance
        InventorySearchAndFilter.getInstanceHRID()
          .then(hrId => {
            instanceHrid = hrId[0];
          });
      });
  });

  it('C11123 Export from Inventory, edit file, and re-import to update items (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      FileDetails.openInstanceInInventory('Created');
      // step 4-10

      // create mapping profiles
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfileForUpdate);
      NewFieldMappingProfile.addAdministrativeNote(note, 9);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfileNameForUpdate);
      FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileNameForUpdate);

      // create Action profiles
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(itemActionProfileForUpdate, itemMappingProfileNameForUpdate);
      ActionProfiles.checkActionProfilePresented(itemActionProfileNameForUpdate);

      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfileName);

      // create job profile for update
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfileWithLinkingProfiles(jobProfileForUpdate, itemActionProfileNameForUpdate, matchProfileName);
      JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate);

      // step 16-24
    });
});
