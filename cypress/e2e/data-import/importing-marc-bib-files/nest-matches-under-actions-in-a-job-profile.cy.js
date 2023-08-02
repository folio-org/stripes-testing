import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import {
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  PROFILE_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('ui-data-import', () => {
  let user = null;
  let holdingsHrId = null;
  let exportedFileName = null;
  let instanceHrid = null;
  const holdingsPermanentLocation = 'Online';
  const recordType = 'MARC_BIBLIOGRAPHIC';
  const filePathToUpload = 'oneMarcBib.mrc';
  const marcFileNameForCreate = `C347894 marcBibFile for create.${getRandomPostfix()}`;
  // profiles for creating instance, holdings, item
  const instanceMappingProfileForCreate = {
    profile:{
      name: `C347894 autotest instance mapping profile for create.${getRandomPostfix()}`,
      incomingRecordType: recordType,
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE
    }
  };
  const holdingsMappingProfileForCreate = {
    profile:{
      name: `C347894 autotest holdings mapping profile for create.${getRandomPostfix()}`,
      incomingRecordType: recordType,
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      mappingDetails: { name: 'holdings',
        recordType: 'HOLDINGS',
        mappingFields: [
          { name: 'permanentLocationId',
            enabled: true,
            path: 'holdings.permanentLocationId',
            value: `"${LOCATION_NAMES.ONLINE}"` }
        ] }
    }
  };
  const instanceActionProfileForCreate = {
    profile: {
      name: `C347894 autotest instance action profile for create.${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'INSTANCE'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
        detailProfileId: '',
        detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE
      }
    ],
    deletedRelations: []
  };
  const holdingsActionProfileForCreate = {
    profile: {
      name: `C347894 autotest holdings action profile for create.${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'HOLDINGS'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
        detailProfileId: '',
        detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE
      }
    ],
    deletedRelations: []
  };
  const testData = [
    { mappingProfile: instanceMappingProfileForCreate,
      actionProfile: instanceActionProfileForCreate },
    { mappingProfile: holdingsMappingProfileForCreate,
      actionProfile: holdingsActionProfileForCreate }
  ];
  const jobProfileForCreate = {
    profile: {
      name: `C347894 autotest job profile for create.${getRandomPostfix()}`,
      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC
    },
    addedRelations: [],
    deletedRelations: []
  };
  // profiles for updating item
  const instanceMatchProfile = {
    profileName: `C347894 autotest instance match profile.${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };
  const holdingsMatchProfile = {
    profileName: `C347894 autotest holdings match profile.${getRandomPostfix()}`,
    incomingStaticValue: 'Online',
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
    existingRecordOption: NewMatchProfile.optionsList.holdingsPermLoc
  };
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C347894 autotest instance mapping profile for update.${getRandomPostfix()}`,
        suppressFromDiscavery: 'Mark for all affected records' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C347894 autotest instance action profile.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C347894 autotest holdings mapping profile for update.${getRandomPostfix()}`,
        suppressFromDiscavery: 'Mark for all affected records' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C347894 autotest holdings action profile.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C347894 autotest job profile for update.${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileNameForCreate);
        JobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        FileDetails.openHoldingsInInventory('Created');
        HoldingsRecordView.getHoldingsHrId().then(initialHrId => {
          holdingsHrId = initialHrId;
        });
      });
    cy.logout();

    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.dataExportEnableSettings.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.dataExportEnableApp.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password,
          { path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading });
      });
  });

  after('delete test data', () => {
    // delete created files in fixtures
    FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
    JobProfiles.deleteJobProfile(jobProfileForCreate.profile.name);
    JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
    MatchProfiles.deleteMatchProfile(instanceMatchProfile.profileName);
    MatchProfiles.deleteMatchProfile(holdingsMatchProfile.profileName);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    ActionProfiles.deleteActionProfile(instanceActionProfileForCreate.profile.name);
    ActionProfiles.deleteActionProfile(holdingsActionProfileForCreate.profile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(instanceMappingProfileForCreate.profile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileForCreate.profile.name);
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C347894 Nest matches under actions in a job profile, and run the job profile successfully (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.filterHoldingsByPermanentLocation(holdingsPermanentLocation);
      InventorySearchAndFilter.searchHoldingsByHRID(holdingsHrId);
      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventorySearchAndFilter.exportInstanceAsMarc();

      // download exported marc file
      cy.visit(TopMenu.dataExportPath);
      ExportFile.getExportedFileNameViaApi()
        .then(name => {
          exportedFileName = name;

          ExportFile.downloadExportedMarcFile(exportedFileName);

          // create match profiles
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(instanceMatchProfile);
          MatchProfiles.checkMatchProfilePresented(instanceMatchProfile.profileName);
          MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
          MatchProfiles.checkMatchProfilePresented(holdingsMatchProfile.profileName);

          // create Field mapping profiles
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
          NewFieldMappingProfile.addSuppressFromDiscovery(collectionOfMappingAndActionProfiles[0].mappingProfile.suppressFromDiscavery);
          FieldMappingProfiles.saveProfile();
          FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[0].mappingProfile.name);

          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
          NewFieldMappingProfile.addSuppressFromDiscovery(collectionOfMappingAndActionProfiles[1].mappingProfile.suppressFromDiscavery);
          FieldMappingProfiles.saveProfile();
          FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[1].mappingProfile.name);

          collectionOfMappingAndActionProfiles.forEach(profile => {
            cy.visit(SettingsMenu.actionProfilePath);
            ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
            ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          });

          // create Job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfile(jobProfileForUpdate);
          NewJobProfile.linkMatchAndActionProfiles(instanceMatchProfile.profileName, collectionOfMappingAndActionProfiles[0].actionProfile.name);
          NewJobProfile.linkMatchProfileForMatches(holdingsMatchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(collectionOfMappingAndActionProfiles[1].actionProfile.name);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

          // upload the exported marc file
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(exportedFileName);
          JobProfiles.searchJobProfileForImport(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(exportedFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(exportedFileName);
          [FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
            FileDetails.columnNameInResultList.holdings
          ].forEach(columnName => {
            FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
          FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
          FileDetails.checkHoldingsQuantityInSummaryTable('1', '1');
          FileDetails.openInstanceInInventory('Updated');
          InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();
          InstanceRecordView.getAssignedHRID().then(initialInstanceHrId => { instanceHrid = initialInstanceHrId; });
          cy.go('back');
          FileDetails.openHoldingsInInventory('Updated');
          HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        });
    });
});
