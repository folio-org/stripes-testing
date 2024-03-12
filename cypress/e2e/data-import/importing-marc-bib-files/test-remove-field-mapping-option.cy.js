import uuid from 'uuid';
import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const itemBarcode = uuid();
    const quantityOfItems = '1';
    const marcFileNameForCreate = `C17033 autotestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `marcFileForC317033.${getRandomPostfix()}.mrc`;
    // profiles for creating
    const collectionOfMappingAndActionProfilesForCreate = [
      {
        mappingProfile: {
          name: `C17033 instance create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C17033 instance create action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          name: `C17033 holdings create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          permanentLocation: `"${LOCATION_NAMES.MAIN_LIBRARY}"`,
          permanentLocationUI: LOCATION_NAMES.MAIN_LIBRARY_UI,
          permanentLocationInHoldingsAccordion: `${LOCATION_NAMES.MAIN_LIBRARY_UI} >`,
          temporaryLocation: `"${LOCATION_NAMES.ONLINE}"`,
          temporaryLocationUI: LOCATION_NAMES.ONLINE_UI,
          illPolicy: 'Unknown lending policy',
          digitizationPolicy: '"Digitization policy"',
          digitizationPolicyUI: 'Digitization policy',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17033 holdings create action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          name: `C17033 item create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          barcode: '945$a',
          accessionNumber: '"12345"',
          accessionNumberUI: '12345',
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          numberOfPieces: '"25"',
          numberOfPiecesUI: '25',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          temporaryLoanType: `"${LOAN_TYPE_NAMES.COURSE_RESERVES}"`,
          temporaryLoanTypeUI: LOAN_TYPE_NAMES.COURSE_RESERVES,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C17033 item create action profile_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17033 create job profile_${getRandomPostfix()}`,
    };
    // profiles for updating
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `autotestMatchHoldings${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '901',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `autotestMatchItem${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '945',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.barcode,
        },
      },
    ];
    const collectionOfMappingAndActionProfilesForUpdate = [
      {
        mappingProfile: {
          name: `C17033 holdings update mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          temporaryLocation: '###REMOVE###',
          digitizationPolicy: '###REMOVE###',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17033 holdings update action profile_${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          name: `C17033 item update mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          accessionNumber: '###REMOVE###',
          numberOfPieces: '###REMOVE###',
          temporaryLoanType: '###REMOVE###',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C17033 item update action profile_${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17033 update job profile_${getRandomPostfix()}`,
    };

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
      });
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${marcFileNameForCreate}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    });

    it(
      'C17033 Test ###REMOVE### field mapping option (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // create mapping profiles
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
        NewFieldMappingProfile.fillTemporaryLocation(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.temporaryLocation,
        );
        NewFieldMappingProfile.fillIllPolicy(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.illPolicy,
        );
        NewFieldMappingProfile.fillDigitizationPolicy(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.digitizationPolicy,
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
        NewFieldMappingProfile.fillAccessionNumber(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.accessionNumber,
        );
        NewFieldMappingProfile.fillMaterialType(
          `"${collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.materialType}"`,
        );
        NewFieldMappingProfile.fillNumberOfPieces(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.numberOfPieces,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillTemporaryLoanType(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.temporaryLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
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

        // change file for adding random barcode
        DataImport.editMarcFile(
          'marcFileForC17033.mrc',
          marcFileNameForCreate,
          ['testBarcode'],
          [itemBarcode],
        );

        // upload a marc file for creating
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForCreate);
        Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, quantityOfItems);

        // check created instance
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          InventoryInstance.openHoldingView();
          HoldingsRecordView.getHoldingsHrId().then((holdingsHrId) => {
            HoldingsRecordView.checkPermanentLocation(
              collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocationUI,
            );
            HoldingsRecordView.checkTemporaryLocation(
              collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.temporaryLocationUI,
            );
            HoldingsRecordView.checkIllPolicy(
              collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.illPolicy,
            );
            HoldingsRecordView.checkDigitizationPolicy(
              collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.digitizationPolicyUI,
            );
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(
              collectionOfMappingAndActionProfilesForCreate[1].mappingProfile
                .permanentLocationInHoldingsAccordion,
            );
            InventoryInstance.openItemByBarcode(itemBarcode);
            ItemRecordView.checkBarcode(itemBarcode);
            ItemRecordView.verifyMaterialType(
              collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.materialType,
            );
            ItemRecordView.checkAccessionNumber(
              collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.accessionNumberUI,
            );
            ItemRecordView.verifyNumberOfPieces(
              collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.numberOfPiecesUI,
            );
            ItemRecordView.verifyPermanentLoanType(
              collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.permanentLoanType,
            );
            ItemRecordView.verifyTemporaryLoanType(
              collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.temporaryLoanTypeUI,
            );
            ItemRecordView.verifyItemStatus(
              collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.status,
            );

            // change file for adding random barcode and holdings hrid
            DataImport.editMarcFile(
              'marcFileForC17033_withHoldingsHrid.mrc',
              editedMarcFileName,
              ['testBarcode', 'holdingsHrid'],
              [itemBarcode, holdingsHrId],
            );

            // create match profiles
            cy.visit(SettingsMenu.matchProfilePath);
            collectionOfMatchProfiles.forEach((profile) => {
              MatchProfiles.createMatchProfile(profile.matchProfile);
              MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
            });

            // create mapping profiles
            cy.visit(SettingsMenu.mappingProfilePath);
            FieldMappingProfiles.openNewMappingProfileForm();
            NewFieldMappingProfile.fillSummaryInMappingProfile(
              collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile,
            );
            NewFieldMappingProfile.fillTemporaryLocation(
              collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.temporaryLocation,
            );
            NewFieldMappingProfile.fillDigitizationPolicy(
              collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.digitizationPolicy,
            );
            NewFieldMappingProfile.save();
            FieldMappingProfileView.closeViewMode(
              collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name,
            );

            FieldMappingProfiles.openNewMappingProfileForm();
            NewFieldMappingProfile.fillSummaryInMappingProfile(
              collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile,
            );
            NewFieldMappingProfile.fillAccessionNumber(
              collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.accessionNumber,
            );
            NewFieldMappingProfile.fillNumberOfPieces(
              collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.numberOfPieces,
            );
            NewFieldMappingProfile.fillTemporaryLoanType(
              collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.temporaryLoanType,
            );
            NewFieldMappingProfile.save();
            FieldMappingProfileView.closeViewMode(
              collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.name,
            );

            // create action profiles
            collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
              cy.visit(SettingsMenu.actionProfilePath);
              ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
              ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
            });

            // create Job profile
            cy.visit(SettingsMenu.jobProfilePath);
            JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
            NewJobProfile.linkMatchAndActionProfiles(
              collectionOfMatchProfiles[0].matchProfile.profileName,
              collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
            );
            NewJobProfile.linkMatchAndActionProfiles(
              collectionOfMatchProfiles[1].matchProfile.profileName,
              collectionOfMappingAndActionProfilesForUpdate[1].actionProfile.name,
              2,
            );
            NewJobProfile.saveAndClose();
            JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

            // upload a marc file for updating
            cy.visit(TopMenu.dataImportPath);
            DataImport.verifyUploadState();
            DataImport.uploadFile(editedMarcFileName);
            JobProfiles.waitFileIsUploaded();
            JobProfiles.search(jobProfileForUpdate.profileName);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(editedMarcFileName);
            Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(editedMarcFileName);
            [
              FileDetails.columnNameInResultList.holdings,
              FileDetails.columnNameInResultList.item,
            ].forEach((columnName) => {
              FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
            });
            FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);
            FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);

            cy.visit(TopMenu.inventoryPath);
            InventorySearchAndFilter.searchInstanceByHRID(initialInstanceHrId);
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkTemporaryLocation('-');
            HoldingsRecordView.checkDigitizationPolicy('-');
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(
              collectionOfMappingAndActionProfilesForCreate[1].mappingProfile
                .permanentLocationInHoldingsAccordion,
            );
            InventoryInstance.openItemByBarcode(itemBarcode);
            ItemRecordView.checkAccessionNumber('-');
            ItemRecordView.verifyNumberOfPieces('-');
            ItemRecordView.verifyTemporaryLoanType('-');
          });
        });
      },
    );
  });
});
