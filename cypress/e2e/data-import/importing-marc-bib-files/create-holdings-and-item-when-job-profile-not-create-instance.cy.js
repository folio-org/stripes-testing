import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FileManager from '../../../support/utils/fileManager';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    let exportedFileName;
    const quantityOfItems = '1';
    const fileName = `oneMarcBib.mrc${getRandomPostfix()}`;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C368009 Testing item for SRS MARC bib ${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C368009 Testing holding for SRS MARC bib ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C368009 Testing holding for SRS MARC bib ${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C368009 Testing holding for SRS MARC bib ${getRandomPostfix()}`,
        },
      },
    ];
    const matchProfile = {
      profileName: `C368009 001 to Instance HRID ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const jobProfile = {
      profileName: `C368009 Testing SRS MARC bib ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // create Instance with source = MARC
        DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
        // get hrid of created instance
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
      });
    });

    after('delete test data', () => {
      // delete generated profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      Users.deleteViaApi(user.userId);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    const createItemMappingProfile = (itemMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
      NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(itemMappingProfile.status);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(itemMappingProfile.name);
    };

    const createHoldingsMappingProfile = (holdingsMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfile.permanentLocation);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);
    };

    it(
      'C368009 Verify that no created SRS is present when job profile does not have create instance action: Case 2: Create holdings and item (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
      () => {
        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        createItemMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        const selectedRecords = 1;
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(selectedRecords);
        InventorySearchAndFilter.exportInstanceAsMarc();

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.getExportedFileNameViaApi().then((name) => {
          exportedFileName = name;

          ExportFile.downloadExportedMarcFile(exportedFileName);
          // upload the exported marc file
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(exportedFileName);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(exportedFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(exportedFileName);
          [
            FileDetails.columnNameInResultList.holdings,
            FileDetails.columnNameInResultList.item,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
          });
          FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 0);
          FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 0);

          // check created items
          FileDetails.openHoldingsInInventory('Created');
          HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ANNEX_UI);
          cy.wait(2000);
          cy.go('back');
          FileDetails.openItemInInventory('Created');
          ItemRecordView.verifyMaterialType(MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE);
          ItemRecordView.verifyPermanentLoanType(LOAN_TYPE_NAMES.CAN_CIRCULATE);
          ItemRecordView.verifyItemStatus(
            collectionOfMappingAndActionProfiles[0].mappingProfile.status,
          );
        });
      },
    );
  });
});
