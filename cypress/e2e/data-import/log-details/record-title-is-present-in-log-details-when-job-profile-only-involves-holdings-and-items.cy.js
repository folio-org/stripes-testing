import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import {
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
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
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    let firstInstanceHrid;
    let secondInstanceHrid;
    const instanceTitle =
      'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';
    const exportJobProfileName = `Testing titles for import.${getRandomPostfix()}`;
    const marcFileForCreateFirstRecord = `C375109 firstInstanceMarcFile.${getRandomPostfix()}.mrc`;
    const marcFileForCreateSecondRecord = `C375109 secondInstanceMarcFile.${getRandomPostfix()}.mrc`;
    const csvFileNameForFirstRecord = `C375109 firstautotestFile${getRandomPostfix()}.csv`;
    const csvFileNameForSecondRecord = `C375109 secondautotestFile${getRandomPostfix()}.csv`;
    const marcFileNameForUpdateFirstRecord = `C375109 firstmarcFile.${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdateSecondRecord = `C375109 secondmarcFile.${getRandomPostfix()}.mrc`;
    const firstRecord = {
      instanceMappingProfileName: `C375109 instance mapping profile.${getRandomPostfix()}`,
      holdingsMappingProfileName: `C375109 holdings mapping profile.${getRandomPostfix()}`,
      permanentLocation: LOCATION_NAMES.MAIN_LIBRARY,
      itemMappingProfileName: `C375109 item mapping profile.${getRandomPostfix()}`,
      instanceActionProfileName: `C375109 instance action profile.${getRandomPostfix()}`,
      holdingsActionProfileName: `C375109 holdings action profile.${getRandomPostfix()}`,
      itemActionProfileName: `C375109 item action profile.${getRandomPostfix()}`,
      jobProfileName: `C375109 job profile.${getRandomPostfix()}`,
    };
    const secondRecord = {
      instanceMappingProfileName: `C375109 instance mapping profile.${getRandomPostfix()}`,
      holdingsMappingProfileName: `C375109 holdings mapping profile.${getRandomPostfix()}`,
      permanentLocation: LOCATION_NAMES.ANNEX,
      itemMappingProfileName: `C375109 item mapping profile.${getRandomPostfix()}`,
      instanceActionProfileName: `C375109 instance action profile.${getRandomPostfix()}`,
      holdingsActionProfileName: `C375109 holdings action profile.${getRandomPostfix()}`,
      itemActionProfileName: `C375109 item action profile.${getRandomPostfix()}`,
      jobProfileName: `C375109 job profile.${getRandomPostfix()}`,
    };
    // profiles for creating the first record
    const firstInstanceMappingProfileForCreate =
      NewFieldMappingProfile.getDefaultInstanceMappingProfile(
        firstRecord.instanceMappingProfileName,
      );
    const firstHoldingsMappingProfileForCreate =
      NewFieldMappingProfile.getDefaultHoldingsMappingProfile(
        firstRecord.holdingsMappingProfileName,
        firstRecord.permanentLocation,
      );
    const firstItemMappingProfileForCreate = NewFieldMappingProfile.getDefaultItemMappingProfile(
      firstRecord.itemMappingProfileName,
    );
    const firstInstanceActionProfileForCreate = NewActionProfile.getDefaultInstanceActionProfile(
      firstRecord.instanceActionProfileName,
    );
    const firstHoldingsActionProfileForCreate = NewActionProfile.getDefaultHoldingsActionProfile(
      firstRecord.holdingsActionProfileName,
    );
    const firstItemActionProfileForCreate = NewActionProfile.getDefaultItemActionProfile(
      firstRecord.itemActionProfileName,
    );
    const firstJobProfileForCreate = NewJobProfile.getDefaultJobProfile(firstRecord.jobProfileName);
    const firstTestData = [
      {
        mappingProfile: firstInstanceMappingProfileForCreate,
        actionProfile: firstInstanceActionProfileForCreate,
      },
      {
        mappingProfile: firstHoldingsMappingProfileForCreate,
        actionProfile: firstHoldingsActionProfileForCreate,
      },
      {
        mappingProfile: firstItemMappingProfileForCreate,
        actionProfile: firstItemActionProfileForCreate,
      },
    ];
    // profiles for creating the second record
    const secondInstanceMappingProfileForCreate =
      NewFieldMappingProfile.getDefaultInstanceMappingProfile(
        secondRecord.instanceMappingProfileName,
      );
    const secondHoldingsMappingProfileForCreate =
      NewFieldMappingProfile.getDefaultHoldingsMappingProfile(
        secondRecord.holdingsMappingProfileName,
        secondRecord.permanentLocation,
      );
    const secondItemMappingProfileForCreate = NewFieldMappingProfile.getDefaultItemMappingProfile(
      secondRecord.itemMappingProfileName,
    );
    const secondInstanceActionProfileForCreate = NewActionProfile.getDefaultInstanceActionProfile(
      secondRecord.instanceActionProfileName,
    );
    const secondHoldingsActionProfileForCreate = NewActionProfile.getDefaultHoldingsActionProfile(
      secondRecord.holdingsActionProfileName,
    );
    const secondItemActionProfileForCreate = NewActionProfile.getDefaultItemActionProfile(
      secondRecord.itemActionProfileName,
    );
    const secondJobProfileForCreate = NewJobProfile.getDefaultJobProfile(
      secondRecord.jobProfileName,
    );
    const secondTestData = [
      {
        mappingProfile: secondInstanceMappingProfileForCreate,
        actionProfile: secondInstanceActionProfileForCreate,
      },
      {
        mappingProfile: secondHoldingsMappingProfileForCreate,
        actionProfile: secondHoldingsActionProfileForCreate,
      },
      {
        mappingProfile: secondItemMappingProfileForCreate,
        actionProfile: secondItemActionProfileForCreate,
      },
    ];
    const exportMappingProfile = {
      name: `Testing titles for import.${getRandomPostfix()}`,
      holdingsTransformation: 'Holdings - HRID',
      holdingsMarcField: '911',
      subfieldForHoldings: '$h',
      itemTransformation: 'Item - HRID',
      itemMarcField: '911',
      subfieldForItem: '$i',
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `WITH instance match item.${getRandomPostfix()}`,
          itemNote: 'Add this to existing',
          noteType: 'Provenance',
          note: 'Acquired in 2022 from the Arceneaux Trust for Cajun History',
          staffOnly: 'Unmark for all affected records',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `WITH instance match item.${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `WITHOUT instance match item.${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `WITHOUT instance match item.${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `WITH instance match holdings.${getRandomPostfix()}`,
          adminNote:
            'Purchased with grant funds for Cajun folklore materials; see item record for additional details',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `WITH instance match holdings.${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `WITHOUT instance match holdings.${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `WITHOUT instance match holdings.${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `WITH instance match instance.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        },
      },
      {
        matchProfile: {
          profileName: `WITH instance match holdings.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '911',
            subfield: 'h',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `WITH instance match item.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '911',
            subfield: 'i',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
      {
        matchProfile: {
          profileName: `WITHOUT instance match holdings.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '911',
            subfield: 'h',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `WITHOUT instance match item.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '911',
            subfield: 'i',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileWithMatch = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `WITH instance match.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const jobProfileWithoutMatch = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `WITHOUT instance match.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before(() => {
      cy.loginAsAdmin();
      // create the first instance
      firstTestData.jobProfileForCreate = firstJobProfileForCreate;

      cy.wrap(firstTestData).each((specialPair) => {
        cy.createOnePairMappingAndActionProfiles(
          specialPair.mappingProfile,
          specialPair.actionProfile,
        ).then((idActionProfile) => {
          cy.addJobProfileRelation(
            firstTestData.jobProfileForCreate.addedRelations,
            idActionProfile,
          );
        });
      });
      SettingsJobProfiles.createJobProfileApi(firstTestData.jobProfileForCreate).then(
        (bodyWithjobProfile) => {
          firstTestData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
        },
      );

      // upload a marc file for creating of the first new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('oneMarcBib.mrc', marcFileForCreateFirstRecord);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(firstTestData.jobProfileForCreate.profile.name);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileForCreateFirstRecord);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFileForCreateFirstRecord);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then((firstHrId) => {
        firstInstanceHrid = firstHrId;
      });

      // create the second instance
      secondTestData.jobProfileForCreate = secondJobProfileForCreate;

      cy.wrap(secondTestData).each((specialPair) => {
        cy.createOnePairMappingAndActionProfiles(
          specialPair.mappingProfile,
          specialPair.actionProfile,
        ).then((idActionProfile) => {
          cy.addJobProfileRelation(
            secondTestData.jobProfileForCreate.addedRelations,
            idActionProfile,
          );
        });
      });
      SettingsJobProfiles.createJobProfileApi(secondTestData.jobProfileForCreate).then(
        (bodyWithjobProfile) => {
          secondTestData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
        },
      );

      // upload a marc file for creating of the first new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('oneMarcBib.mrc', marcFileForCreateSecondRecord);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(secondTestData.jobProfileForCreate.profile.name);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileForCreateSecondRecord);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFileForCreateSecondRecord);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then((secondHrId) => {
        secondInstanceHrid = secondHrId;
      });
      cy.logout();

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportEnableSettings.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        // create Field mapping profile for export
        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

        // create job profile for export
        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(exportJobProfileName, exportMappingProfile.name);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      JobProfiles.deleteJobProfile(firstRecord.jobProfileName);
      ActionProfiles.deleteActionProfile(firstRecord.instanceActionProfileName);
      ActionProfiles.deleteActionProfile(firstRecord.holdingsActionProfileName);
      ActionProfiles.deleteActionProfile(firstRecord.itemActionProfileName);
      FieldMappingProfileView.deleteViaApi(firstRecord.instanceMappingProfileName);
      FieldMappingProfileView.deleteViaApi(firstRecord.holdingsMappingProfileName);
      FieldMappingProfileView.deleteViaApi(firstRecord.itemMappingProfileName);
      JobProfiles.deleteJobProfile(secondRecord.jobProfileName);
      ActionProfiles.deleteActionProfile(secondRecord.instanceActionProfileName);
      ActionProfiles.deleteActionProfile(secondRecord.holdingsActionProfileName);
      ActionProfiles.deleteActionProfile(secondRecord.itemActionProfileName);
      FieldMappingProfileView.deleteViaApi(secondRecord.instanceMappingProfileName);
      FieldMappingProfileView.deleteViaApi(secondRecord.holdingsMappingProfileName);
      FieldMappingProfileView.deleteViaApi(secondRecord.itemMappingProfileName);
      JobProfiles.deleteJobProfile(jobProfileWithMatch.profileName);
      JobProfiles.deleteJobProfile(jobProfileWithoutMatch.profileName);
      cy.wrap(collectionOfMatchProfiles).each((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      cy.wrap(collectionOfMappingAndActionProfiles).each((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      Users.deleteViaApi(user.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${firstInstanceHrid}"` }).then(
        (instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${secondInstanceHrid}"` }).then(
        (instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C375109 When MARC Bib job profile only involves holdings and items, verify that the record title is present in the log details (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[2].mappingProfile.adminNote,
          5,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addItemNotes(
          `"${collectionOfMappingAndActionProfiles[0].mappingProfile.noteType}"`,
          `"${collectionOfMappingAndActionProfiles[0].mappingProfile.note}"`,
          collectionOfMappingAndActionProfiles[0].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        // create action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(
          collectionOfMappingAndActionProfiles[0].actionProfile,
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        ActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        ActionProfiles.create(
          collectionOfMappingAndActionProfiles[2].actionProfile,
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );
        ActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[2].actionProfile.name,
        );

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[2].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileWithMatch);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[2].actionProfile.name,
          2,
        );
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[2].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          4,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileWithMatch.profileName);

        // update the first record
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(firstInstanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(csvFileNameForFirstRecord, 'SearchInstanceUUIDs*');

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
        JobProfiles.search(jobProfileWithMatch.profileName);
        JobProfiles.runImportFile();
        cy.wait(8000);
        JobProfiles.waitFileIsImported(marcFileNameForUpdateFirstRecord);
        Logs.openFileDetails(marcFileNameForUpdateFirstRecord);
        FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
        FileDetails.checkItemQuantityInSummaryTable('1', 1);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.dash, columnName);
        });
        [
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        FileDetails.verifyTitle(instanceTitle, FileDetails.columnNameInResultList.title);

        FileDetails.openHoldingsInInventory('Updated');
        HoldingsRecordView.checkAdministrativeNote(
          collectionOfMappingAndActionProfiles[2].mappingProfile.adminNote,
        );
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileNameForUpdateFirstRecord);
        FileDetails.openItemInInventory('Updated');
        ItemRecordView.checkItemNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.note,
          'No',
          collectionOfMappingAndActionProfiles[0].mappingProfile.noteType,
        );

        FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdateFirstRecord}`);
        FileManager.deleteFile(`cypress/fixtures/${csvFileNameForFirstRecord}`);
      },
    );

    it(
      'C375109 When MARC Bib job profile only involves holdings and items, verify that the record title is present in the log details (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(collectionOfMappingAndActionProfiles[2].mappingProfile.name);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.addName(collectionOfMappingAndActionProfiles[3].mappingProfile.name);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[3].mappingProfile.name,
        );
        FieldMappingProfiles.search(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(
          collectionOfMappingAndActionProfiles[1].actionProfile,
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        ActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        ActionProfiles.create(
          collectionOfMappingAndActionProfiles[3].actionProfile,
          collectionOfMappingAndActionProfiles[3].mappingProfile.name,
        );
        ActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[3].actionProfile.name,
        );

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[3].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[3].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[4].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[4].matchProfile.profileName,
        );

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileWithoutMatch);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[3].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[3].actionProfile.name,
        );
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[4].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileWithoutMatch.profileName);

        // update the second record
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(secondInstanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(csvFileNameForSecondRecord, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(csvFileNameForSecondRecord);
        ExportFile.exportWithCreatedJobProfile(csvFileNameForSecondRecord, exportJobProfileName);
        ExportFile.downloadExportedMarcFile(marcFileNameForUpdateSecondRecord);

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(marcFileNameForUpdateSecondRecord);
        JobProfiles.search(jobProfileWithoutMatch.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdateSecondRecord);
        Logs.openFileDetails(marcFileNameForUpdateSecondRecord);
        FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
        FileDetails.checkItemQuantityInSummaryTable('1', 1);
        FileDetails.checkStatusInColumn(
          FileDetails.status.dash,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.dash,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.holdings,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.item,
        );
        FileDetails.verifyTitle(instanceTitle, FileDetails.columnNameInResultList.title);
        FileDetails.openHoldingsInInventory('Updated');
        HoldingsRecordView.checkAdministrativeNote(
          collectionOfMappingAndActionProfiles[2].mappingProfile.adminNote,
        );
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileNameForUpdateSecondRecord);
        FileDetails.openItemInInventory('Updated');
        ItemRecordView.checkItemNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.note,
          'No',
          collectionOfMappingAndActionProfiles[0].mappingProfile.noteType,
        );

        FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdateSecondRecord}`);
        FileManager.deleteFile(`cypress/fixtures/${csvFileNameForSecondRecord}`);
      },
    );
  });
});
