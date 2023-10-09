import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const instanceTitle = 'The distant sound / Susan Philipsz.';
    const itemBarcode = uuid();
    const quantityOfItems = '1';
    const filePathToUpload = 'marcFileForC17036.mrc';
    const editedMarcFileName = `C17036 autotestFile.${getRandomPostfix()}.mrc`;
    const marcFileNameForFirstUpdate = `C17036 autotestFile.${getRandomPostfix()}.mrc`;
    const marcFileNameForSecondUpdate = `C17036 autotestFile.${getRandomPostfix()}.mrc`;
    // profiles for create
    const collectionOfMappingAndActionProfilesForCreate = [
      {
        mappingProfile: {
          name: `C17036 instance create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C17036 instance create action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          name: `C17036 holdings create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          permanentLocation: `"${LOCATION_NAMES.MAIN_LIBRARY}"`,
          permanentLocationUI: LOCATION_NAMES.MAIN_LIBRARY_UI,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17036 holdings create action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          name: `C17036 item create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          barcode: '945$a',
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C17036 item create action profile_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17036 create job profile_${getRandomPostfix()}`,
    };
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C17036 FAIL match profile_${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '945',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.barcode,
        },
      },
      {
        matchProfile: {
          profileName: `C17036 SUCCEED match profile_${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '945',
            in1: '*',
            in2: '*',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.barcode,
        },
      },
    ];
    // profiles for update
    const collectionOfMappingAndActionProfilesForUpdate = [
      {
        mappingProfile: {
          name: `C17036 item update mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          itemIdentifier: `"${'SUCCEED'}"`,
          itemIdentifierUI: 'SUCCEED',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C17036 item update action profile_${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const jobProfileForUpdateWithFail = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17036 FAIL update job profile_${getRandomPostfix()}`,
    };
    const jobProfileForUpdateWithSucceed = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17036 SUCCEED update job profile_${getRandomPostfix()}`,
    };

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.getAdminToken();
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfileForCreate.profileName);
      JobProfiles.deleteJobProfile(jobProfileForUpdateWithFail.profileName);
      JobProfiles.deleteJobProfile(jobProfileForUpdateWithSucceed.profileName);
      collectionOfMatchProfiles.forEach((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
    });

    it(
      'C17036 Test Any versus All for MARC indicators in match profiles (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // change file for adding random barcode
        DataImport.editMarcFile(
          filePathToUpload,
          editedMarcFileName,
          ['testBarcode'],
          [itemBarcode],
        );

        // create mapping profiles for create
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForCreate[0].mappingProfile,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile,
        );
        NewFieldMappingProfile.fillBarcode(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.barcode,
        );
        NewFieldMappingProfile.fillMaterialType(
          `"${collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.materialType}"`,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.status,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.name,
        );

        // create action profiles for create
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile for create
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfile(
          collectionOfMappingAndActionProfilesForCreate[0].actionProfile,
        );
        NewJobProfile.linkActionProfile(
          collectionOfMappingAndActionProfilesForCreate[1].actionProfile,
        );
        NewJobProfile.linkActionProfile(
          collectionOfMappingAndActionProfilesForCreate[2].actionProfile,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload a marc file for creating
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(editedMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedMarcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, quantityOfItems);

        // check created instance
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.checkIsInstancePresented(
          instanceTitle,
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocationUI,
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.status,
        );

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create mapping profiles for update
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile,
        );
        NewFieldMappingProfile.fillItemIdentifier(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.itemIdentifier,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name,
        );

        // create action profile for update
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdateWithFail);
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdateWithSucceed);
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload a marc file for updating
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForFirstUpdate);
        JobProfiles.search(jobProfileForUpdateWithFail.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForFirstUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForFirstUpdate);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.item,
        );

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
        ItemRecordView.verifyItemIdentifier('-');

        // upload a marc file for updating
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForSecondUpdate);
        JobProfiles.search(jobProfileForUpdateWithSucceed.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForSecondUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForSecondUpdate);
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.item,
        );

        // check updated item
        FileDetails.openItemInInventory('Updated');
        ItemRecordView.verifyItemIdentifier(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.itemIdentifierUI,
        );
      },
    );
  });
});
