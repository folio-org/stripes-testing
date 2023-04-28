import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Helper from '../../../support/fragments/finance/financeHelper';
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
import ItemRecordView from '../../../support/fragments/inventory/itemRecordView';
import FileManager from '../../../support/utils/fileManager';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  let exportedFileName;
  const quantityOfItems = '1';
  const fileName = `oneMarcBib.mrc${Helper.getRandomBarcode()}`;
  const holdingsPermanentLocation = 'Annex (KU/CC/DI/A)';
  const itemMaterialType = 'electronic resource';
  const itemPermanentLoanType = 'Can circulate';
  // unique profile names
  const jobProfileName = `C368009 Testing SRS MARC bib ${Helper.getRandomBarcode()}`;
  const matchProfileName = `C368009 001 to Instance HRID ${Helper.getRandomBarcode()}`;
  const holdingsActionProfileName = `C368009 Testing holding for SRS MARC bib ${Helper.getRandomBarcode()}`;
  const itemActionProfileName = `C368009 Testing holding for SRS MARC bib ${Helper.getRandomBarcode()}`;
  const holdingsMappingProfileName = `C368009 Testing holding for SRS MARC bib ${Helper.getRandomBarcode()}`;
  const itemMappingProfileName = `C368009 Testing item for SRS MARC bib ${Helper.getRandomBarcode()}`;
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: itemMappingProfileName,
        materialType: itemMaterialType,
        permanentLoanType:itemPermanentLoanType,
        status: 'Available' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: itemActionProfileName,
        action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: holdingsMappingProfileName,
        permanentLocation: `"${holdingsPermanentLocation}"` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: holdingsActionProfileName,
        action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    }
  ];
  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };
  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.dataExportEnableApp.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
        // create Instance with source = MARC
        DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
        // get hrid of created instance
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => { instanceHrid = initialInstanceHrId; });
      });
  });

  after('delete test data', () => {
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(holdingsActionProfileName);
    ActionProfiles.deleteActionProfile(itemActionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfileName);
    Users.deleteViaApi(user.userId);
    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  const createItemMappingProfile = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
    NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
    NewFieldMappingProfile.fillStatus(itemMappingProfile.status);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  const createHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfile.permanentLocation);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  it('C368009 Verify that no created SRS is present when job profile does not have create instance action: Case 2: Create holdings and item (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profiles
      cy.visit(SettingsMenu.mappingProfilePath);
      createItemMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileName);
      createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileName);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfileName);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchProfile(matchProfileName);
      NewJobProfile.linkActionProfileForMatches(holdingsActionProfileName);
      NewJobProfile.linkActionProfileForMatches(itemActionProfileName);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileName);

      const selectedRecords = 1;
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.bySource('MARC');
      InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
      InventorySearchAndFilter.closeInstanceDetailPane();
      InventorySearchAndFilter.selectResultCheckboxes(selectedRecords);
      InventorySearchAndFilter.exportInstanceAsMarc();

      // download exported marc file
      cy.visit(TopMenu.dataExportPath);
      ExportFile.getExportedFileNameViaApi()
        .then(name => {
          exportedFileName = name;

          ExportFile.downloadExportedMarcFile(exportedFileName);
          // upload the exported marc file
          cy.visit(TopMenu.dataImportPath);
          // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
          cy.reload();
          DataImport.uploadExportedFile(exportedFileName);
          JobProfiles.searchJobProfileForImport(jobProfileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(exportedFileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(exportedFileName);
          [FileDetails.columnName.holdings,
            FileDetails.columnName.item].forEach(columnName => {
            FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
          });
          FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 0);
          FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 0);

          // check created items
          FileDetails.openHoldingsInInventory('Created');
          HoldingsRecordView.checkPermanentLocation('Annex');
          cy.go('back');
          FileDetails.openItemInInventory('Created');
          ItemRecordView.verifyMaterialType(itemMaterialType);
          ItemRecordView.verifyPermanentLoanType(itemPermanentLoanType);
          ItemRecordView.verifyItemStatus(collectionOfMappingAndActionProfiles[0].mappingProfile.status);
        });
    });
});
