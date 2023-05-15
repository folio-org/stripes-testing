import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import { FOLIO_RECORD_TYPE, LOCALION_NAMES } from '../../../support/constants';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';

describe('ui-data-import', () => {
  let user;
  const instanceHrids = [];
  const exportJobProfileName = `Testing titles for import.${getRandomPostfix()}`;
  const marcFileForCreateFirstRecord = `C375109 marcFile.${getRandomPostfix()}.mrc`;
  const marcFileForCreateSecondRecord = `C375109 marcFile.${getRandomPostfix()}.mrc`;
  const csvFileNameForFirstRecord = `C375109 autotestFile${getRandomPostfix()}.csv`;
  const marcFileNameForUpdateFirstRecord = `C375109 marcFile.${getRandomPostfix()}.mrc`;
  const marcFileNameForUpdateSecondRecord = `C375109 marcFile.${getRandomPostfix()}.mrc`;
  const firstRecord = {
    instanceMappingProfileName: `C375109 instance mapping profile.${getRandomPostfix()}`,
    holdingsMappingProfileName: `C375109 holdings mapping profile.${getRandomPostfix()}`,
    permanentLocation: LOCALION_NAMES.MAIN_LIBRARY,
    itemMappingProfileName: `C375109 item mapping profile.${getRandomPostfix()}`,
    instanceActionProfileName: `C375109 instance action profile.${getRandomPostfix()}`,
    holdingsActionProfileName: `C375109 holdings action profile.${getRandomPostfix()}`,
    itemActionProfileName: `C375109 item action profile.${getRandomPostfix()}`,
    jobProfileName: `C375109 job profile.${getRandomPostfix()}`
  };
  const secondRecord = {
    instanceMappingProfileName: `C375109 instance mapping profile.${getRandomPostfix()}`,
    holdingsMappingProfileName: `C375109 holdings mapping profile.${getRandomPostfix()}`,
    permanentLocation: LOCALION_NAMES.MAIN_LIBRARY,
    itemMappingProfileName: `C375109 item mapping profile.${getRandomPostfix()}`,
    instanceActionProfileName: `C375109 instance action profile.${getRandomPostfix()}`,
    holdingsActionProfileName: `C375109 holdings action profile.${getRandomPostfix()}`,
    itemActionProfileName: `C375109 item action profile.${getRandomPostfix()}`,
    jobProfileName: `C375109 job profile.${getRandomPostfix()}`
  };
  // profiles for creating the first record
  const firstInstanceMappingProfileForCreate = NewFieldMappingProfile.getDefaultInstanceMappingProfile(firstRecord.instanceMappingProfileName);
  const firstHoldingsMappingProfileForCreate = NewFieldMappingProfile.getDefaultHoldingsMappingProfile(firstRecord.holdingsMappingProfileName, firstRecord.permanentLocation);
  const firstItemMappingProfileForCreate = NewFieldMappingProfile.getDefaultItemMappingProfile(firstRecord.itemMappingProfileName);
  const firstInstanceActionProfileForCreate = NewActionProfile.getDefaultInstanceActionProfile(firstRecord.instanceActionProfileName);
  const firstHoldingsActionProfileForCreate = NewActionProfile.getDefaultHoldingsActionProfile(firstRecord.holdingsActionProfileName);
  const firstItemActionProfileForCreate = NewActionProfile.getDefaultItemActionProfile(firstRecord.itemActionProfileName);
  const firstJobProfileForCreate = NewJobProfile.getDefaultJobProfile(firstRecord.jobProfileName);
  const firstTestData = [
    { mappingProfile: firstInstanceMappingProfileForCreate,
      actionProfile: firstInstanceActionProfileForCreate },
    { mappingProfile: firstHoldingsMappingProfileForCreate,
      actionProfile: firstHoldingsActionProfileForCreate },
    { mappingProfile: firstItemMappingProfileForCreate,
      actionProfile: firstItemActionProfileForCreate },
  ];
  // profiles for creating the first record
  const secondInstanceMappingProfileForCreate = NewFieldMappingProfile.getDefaultInstanceMappingProfile(secondRecord.instanceMappingProfileName);
  const secondHoldingsMappingProfileForCreate = NewFieldMappingProfile.getDefaultHoldingsMappingProfile(secondRecord.holdingsMappingProfileName, firstRecord.permanentLocation);
  const secondItemMappingProfileForCreate = NewFieldMappingProfile.getDefaultItemMappingProfile(secondRecord.itemMappingProfileName);
  const secondInstanceActionProfileForCreate = NewActionProfile.getDefaultInstanceActionProfile(secondRecord.instanceActionProfileName);
  const secondHoldingsActionProfileForCreate = NewActionProfile.getDefaultHoldingsActionProfile(secondRecord.holdingsActionProfileName);
  const secondItemActionProfileForCreate = NewActionProfile.getDefaultItemActionProfile(secondRecord.itemActionProfileName);
  const secondJobProfileForCreate = NewJobProfile.getDefaultJobProfile(secondRecord.jobProfileName);
  const secondTestData = [
    { mappingProfile: secondInstanceMappingProfileForCreate,
      actionProfile: secondInstanceActionProfileForCreate },
    { mappingProfile: secondHoldingsMappingProfileForCreate,
      actionProfile: secondHoldingsActionProfileForCreate },
    { mappingProfile: secondItemMappingProfileForCreate,
      actionProfile: secondItemActionProfileForCreate },
  ];
  const exportMappingProfile = {
    name: `Testing titles for import.${getRandomPostfix()}`,
    holdingsTransformation: 'Holdings - HRID',
    holdingsMarcField: '911',
    subfieldForHoldings:'$h',
    itemTransformation: 'Item - ID',
    itemMarcField:'911',
    subfieldForItem:'$i'
  };
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `WITH instance match item.${getRandomPostfix()}`,
        itemNote: 'Add this to existing',
        noteType: '"Provenance"',
        note: '"Acquired in 2022 from the Arceneaux Trust for Cajun History"',
        staffOnly: 'Unmark for all affected records' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `WITH instance match item.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `WITHOUT instance match item.${getRandomPostfix()}` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `WITHOUT instance match item.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `WITH instance match holdings.${getRandomPostfix()}`,
        adminNote: 'Purchased with grant funds for Cajun folklore materials; see item record for additional details' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `WITH instance match holdings.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `WITHOUT instance match holdings.${getRandomPostfix()}` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `WITHOUT instance match holdings.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
  ];
  const collectionOfMatchProfiles = [
    {
      matchProfile: { profileName: `WITH instance match instance.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '001'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'INSTANCE',
        instanceOption: NewMatchProfile.optionsList.instanceHrid }
    },
    {
      matchProfile: { profileName: `WITH instance match holdings.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '911',
          subfield: 'h'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.holdingsHrid }
    },
    {
      matchProfile: { profileName: `WITH instance match item.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '911',
          subfield: 'i'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.itemHrid }
    },
    {
      matchProfile: { profileName: `WITHOUT instance match holdings.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '911',
          subfield: 'h'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.holdingsHrid }
    },
    {
      matchProfile: { profileName: `WITHOUT instance match item.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '911',
          subfield: 'i'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.itemHrid }
    }
  ];
  const jobProfileWithMatch = { ...NewJobProfile.defaultJobProfile,
    profileName: `WITH instance match.${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc };
  const jobProfileWithoutMatch = { ...NewJobProfile.defaultJobProfile,
    profileName: `WITHOUT instance match.${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        // create the first instance
        firstTestData.jobProfileForCreate = firstJobProfileForCreate;

        firstTestData.forEach(specialPair => {
          cy.createOnePairMappingAndActionProfiles(specialPair.mappingProfile, specialPair.actionProfile).then(idActionProfile => {
            cy.addJobProfileRelation(firstTestData.jobProfileForCreate.addedRelations, idActionProfile);
          });
        });
        SettingsJobProfiles.createJobProfileApi(firstTestData.jobProfileForCreate)
          .then((bodyWithjobProfile) => {
            firstTestData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
          });

        // upload a marc file for creating of the first new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', marcFileForCreateFirstRecord);
        JobProfiles.searchJobProfileForImport(firstTestData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileForCreateFirstRecord);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFileForCreateFirstRecord);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHrids.push(initialInstanceHrId);
        });

        // create the second instance
        secondTestData.jobProfileForCreate = secondJobProfileForCreate;

        secondTestData.forEach(specialPair => {
          cy.createOnePairMappingAndActionProfiles(specialPair.mappingProfile, specialPair.actionProfile).then(idActionProfile => {
            cy.addJobProfileRelation(secondTestData.jobProfileForCreate.addedRelations, idActionProfile);
          });
        });
        SettingsJobProfiles.createJobProfileApi(secondTestData.jobProfileForCreate)
          .then((bodyWithjobProfile) => {
            secondTestData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
          });

        // upload a marc file for creating of the first new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', marcFileForCreateSecondRecord);
        JobProfiles.searchJobProfileForImport(secondTestData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileForCreateFirstRecord);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFileForCreateFirstRecord);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHrids.push(initialInstanceHrId);
        });

        cy.createTempUser([
          permissions.moduleDataImportEnabled.gui,
          permissions.inventoryAll.gui,
          permissions.dataExportEnableSettings.gui,
          permissions.settingsDataImportEnabled.gui,
          permissions.dataExportEnableApp.gui
        ])
          .then(userProperties => {
            user = userProperties;

            cy.login(userProperties.username, userProperties.password);
          });
      });
  });

  it('C375109 When MARC Bib job profile only involves holdings and items, verify that the record title is present in the log details (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create Field mapping profile for export
      cy.visit(SettingsMenu.exportMappingProfilePath);
      ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

      // create job profile for export
      cy.visit(SettingsMenu.exportJobProfilePath);
      ExportJobProfiles.createJobProfile(exportJobProfileName, exportMappingProfile.name);

      // create mapping profiles
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      NewFieldMappingProfile.addItemNotes(
        collectionOfMappingAndActionProfiles[0].mappingProfile.noteType,
        collectionOfMappingAndActionProfiles[0].mappingProfile.note,
        collectionOfMappingAndActionProfiles[0].mappingProfile.staffOnly
      );
      FieldMappingProfiles.saveProfile();

      FieldMappingProfileView.duplicate();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      NewFieldMappingProfile.addAdministrativeNote(collectionOfMappingAndActionProfiles[2].mappingProfile.adminNote, 5);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfileView.duplicate();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[3].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[3].mappingProfile.name);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create match profiles
      cy.visit(SettingsMenu.matchProfilePath);
      collectionOfMatchProfiles.forEach(profile => {
        MatchProfiles.createMatchProfile(profile.matchProfile);
        MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
      });

      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfileWithMatch);
      NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
      NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(collectionOfMappingAndActionProfiles[2].actionProfile.name, 2);
      NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[2].matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(collectionOfMappingAndActionProfiles[0].actionProfile.name, 4);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileWithMatch.profileName);

      // need to wait until the first job profile will be created
      cy.wait(2500);
      JobProfiles.createJobProfile(jobProfileWithoutMatch);
      NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[3].matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(collectionOfMappingAndActionProfiles[3].actionProfile.name);
      NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[4].matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(collectionOfMappingAndActionProfiles[1].actionProfile.name, 2);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileWithoutMatch.profileName);

      // update the first record
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchInstanceByHRID(instanceHrids[0]);
      InventorySearchAndFilter.saveUUIDs();
      ExportFile.downloadCSVFile(csvFileNameForFirstRecord, 'SearchInstanceUUIDs*');
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));

      // download exported marc file
      cy.visit(TopMenu.dataExportPath);
      ExportFile.uploadFile(csvFileNameForFirstRecord);
      ExportFile.exportWithCreatedJobProfile(csvFileNameForFirstRecord, exportJobProfileName);
      ExportFile.downloadExportedMarcFile(marcFileNameForUpdateFirstRecord);

      // upload the exported marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadExportedFile(marcFileNameForUpdateFirstRecord);
      JobProfiles.searchJobProfileForImport(jobProfileWithMatch.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileNameForUpdateFirstRecord);
      Logs.openFileDetails(marcFileNameForUpdateFirstRecord);
      // FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
      // FileDetails.checkItemQuantityInSummaryTable('1', 1);
      // FileDetails.checkStatusInColumn(FileDetails.status.blank, FileDetails.columnNameInResultList.srsMarc);
      // FileDetails.checkStatusInColumn(FileDetails.status.blank, FileDetails.columnNameInResultList.instance);
      // FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.holdings);
      // FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.item);

      // update the second record
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchInstanceByHRID(instanceHrids[1]);
      InventorySearchAndFilter.saveUUIDs();
      ExportFile.downloadCSVFile(csvFileNameForFirstRecord, 'SearchInstanceUUIDs*');
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));

      // download exported marc file
      cy.visit(TopMenu.dataExportPath);
      ExportFile.uploadFile(csvFileNameForFirstRecord);
      ExportFile.exportWithCreatedJobProfile(csvFileNameForFirstRecord, exportJobProfileName);
      ExportFile.downloadExportedMarcFile(marcFileNameForUpdateSecondRecord);

      // upload the exported marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadExportedFile(marcFileNameForUpdateSecondRecord);
      JobProfiles.searchJobProfileForImport(jobProfileWithoutMatch.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileNameForUpdateSecondRecord);
      Logs.openFileDetails(marcFileNameForUpdateSecondRecord);
      // FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
      // FileDetails.checkItemQuantityInSummaryTable('1', 1);
      // FileDetails.checkStatusInColumn(FileDetails.status.blank, FileDetails.columnNameInResultList.srsMarc);
      // FileDetails.checkStatusInColumn(FileDetails.status.blank, FileDetails.columnNameInResultList.instance);
      // FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.holdings);
      // FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.item);
    });
});
