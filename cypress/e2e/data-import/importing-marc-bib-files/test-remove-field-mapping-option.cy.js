import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/itemRecordView';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-data-import', () => {
  const itemBarcode = uuid();
  const quantityOfItems = '1';
  // unique profile names
  const instanceMappingProfileNameForCreate = `C17033 instance create mapping profile_${getRandomPostfix()}`;
  const holdingsMappingProfileNameForCreate = `C17033 holdings create mapping profile_${getRandomPostfix()}`;
  const itemMappingProfileNameForCreate = `C17033 item create mapping profile_${getRandomPostfix()}`;
  const instanceActionProfileNameForCreate = `C17033 instance create action profile_${getRandomPostfix()}`;
  const holdingsActionProfileNameForCreate = `C17033 holdings create action profile_${getRandomPostfix()}`;
  const itemActionProfileNameForCreate = `C17033 item create action profile_${getRandomPostfix()}`;
  const jobProfileNameForCreate = `C17033 create job profile_${getRandomPostfix()}`;
  const matchProfileNameForHoldings = `autotestMatchHoldings${getRandomPostfix()}`;
  const matchProfileNameForItem = `autotestMatchItem${getRandomPostfix()}`;
  const holdingsActionProfileNameForUpdate = `C17033 holdings update action profile_${getRandomPostfix()}`;
  const itemActionProfileNameForUpdate = `C17033 item update action profile_${getRandomPostfix()}`;
  const holdingsMappingProfileNameForUpdate = `C17033 holdings update mapping profile_${getRandomPostfix()}`;
  const itemMappingProfileNameForUpdate = `C17033 item update mapping profile_${getRandomPostfix()}`;
  const jobProfileNameForUpdate = `C17033 update job profile_${getRandomPostfix()}`;
  // unique file names
  const marcFileNameForCreate = `C17033 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `marcFileForC317033.${getRandomPostfix()}.mrc`;
  // profiles for creating
  const collectionOfMappingAndActionProfilesForCreate = [
    {
      mappingProfile: { name: instanceMappingProfileNameForCreate,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: instanceActionProfileNameForCreate }
    },
    {
      mappingProfile: { name: holdingsMappingProfileNameForCreate,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
        permanentLocation: '"Main Library (KU/CC/DI/M)"',
        permanentLocationUI:'Main Library',
        permanentLocationInHoldingsAccordion: 'Main Library >',
        temporaryLocation: '"Online (E)"',
        temporaryLocationUI: 'Online',
        illPolicy: 'Unknown lending policy',
        digitizationPolicy: '"Digitization policy"',
        digitizationPolicyUI: 'Digitization policy' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: holdingsActionProfileNameForCreate }
    },
    {
      mappingProfile: { name: itemMappingProfileNameForCreate,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
        barcode: '945$a',
        accessionNumber: '"12345"',
        accessionNumberUI: '12345',
        materialType:'book',
        numberOfPieces: '"25"',
        numberOfPiecesUI: '25',
        permanentLoanType: 'Can circulate',
        temporaryLoanType:'"Course reserves"',
        temporaryLoanTypeUI:'Course reserves',
        status: 'Available' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: itemActionProfileNameForCreate }
    },
  ];
  const jobProfileForCreate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForCreate
  };
  // profiles for updating
  const collectionOfMatchProfiles = [
    {
      matchProfile: { profileName: matchProfileNameForHoldings,
        incomingRecordFields: {
          field: '901',
          subfield: 'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.holdingsHrid }
    },
    {
      matchProfile: {
        profileName: matchProfileNameForItem,
        incomingRecordFields: {
          field: '945',
          subfield: 'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.barcode
      }
    }
  ];
  const collectionOfMappingAndActionProfilesForUpdate = [
    {
      mappingProfile: { name: holdingsMappingProfileNameForUpdate,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
        temporaryLocation: '###REMOVE###',
        digitizationPolicy: '###REMOVE###' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: holdingsActionProfileNameForUpdate,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { name: itemMappingProfileNameForUpdate,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
        accessionNumber: '###REMOVE###',
        numberOfPieces: '###REMOVE###',
        temporaryLoanType:'###REMOVE###' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: itemActionProfileNameForUpdate,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
  ];
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForUpdate
  };

  before('login', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
  });

  after('delete test data', () => {
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileNameForUpdate);
    JobProfiles.deleteJobProfile(jobProfileNameForCreate);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
    });
    collectionOfMappingAndActionProfilesForCreate.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    collectionOfMappingAndActionProfilesForUpdate.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${marcFileNameForCreate}`);
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
  });

  it('C17033 Test ###REMOVE### field mapping option (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForCreate[0].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfileNameForCreate);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocation);
      NewFieldMappingProfile.fillTemporaryLocation(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.temporaryLocation);
      NewFieldMappingProfile.fillIllPolicy(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.illPolicy);
      NewFieldMappingProfile.fillDigitizationPolicy(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.digitizationPolicy);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForCreate);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile);
      NewFieldMappingProfile.fillBarcode(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.barcode);
      NewFieldMappingProfile.fillAccessionNumber(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.accessionNumber);
      NewFieldMappingProfile.fillMaterialType(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.materialType);
      NewFieldMappingProfile.fillNumberOfPieces(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.numberOfPieces);
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillTemporaryLoanType(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.temporaryLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfileNameForCreate);

      // create action profiles
      collectionOfMappingAndActionProfilesForCreate.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfileForCreate);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfilesForCreate[0].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfilesForCreate[1].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfilesForCreate[2].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileNameForCreate);

      // change file for adding random barcode
      DataImport.editMarcFile('marcFileForC17033.mrc', marcFileNameForCreate, ['testBarcode'], [itemBarcode]);

      // upload a marc file for creating
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile(marcFileNameForCreate);
      JobProfiles.searchJobProfileForImport(jobProfileNameForCreate);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileNameForCreate);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFileNameForCreate);
      [FileDetails.columnName.srsMarc,
        FileDetails.columnName.instance,
        FileDetails.columnName.holdings,
        FileDetails.columnName.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkItemsQuantityInSummaryTable(0, quantityOfItems);

      // check created instance
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.openHoldingView();
        HoldingsRecordView.getHoldingsHrId().then(holdingsHrId => {
          HoldingsRecordView.checkPermanentLocation(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocationUI);
          HoldingsRecordView.checkTemporaryLocation(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.temporaryLocationUI);
          HoldingsRecordView.checkIllPolicy(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.illPolicy);
          HoldingsRecordView.checkDigitizationPolicy(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.digitizationPolicyUI);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocationInHoldingsAccordion);
          InventoryInstance.openItemByBarcode(itemBarcode);
          ItemRecordView.checkBarcode(itemBarcode);
          ItemRecordView.verifyMaterialType(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.materialType);
          ItemRecordView.checkAccessionNumber(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.accessionNumberUI);
          ItemRecordView.checkNumberOfPieces(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.numberOfPiecesUI);
          ItemRecordView.verifyPermanentLoanType(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.permanentLoanType);
          ItemRecordView.verifyTemporaryLoanType(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.temporaryLoanTypeUI);
          ItemRecordView.checkStatus(collectionOfMappingAndActionProfilesForCreate[2].mappingProfile.status);

          // change file for adding random barcode and holdings hrid
          DataImport.editMarcFile('marcFileForC17033_withHoldingsHrid.mrc', editedMarcFileName, ['testBarcode', 'holdingsHrid'], [itemBarcode, holdingsHrId]);

          // create match profiles
          cy.visit(SettingsMenu.matchProfilePath);
          collectionOfMatchProfiles.forEach(profile => {
            MatchProfiles.createMatchProfile(profile.matchProfile);
            MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
          });

          // create mapping profiles
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile);
          NewFieldMappingProfile.fillTemporaryLocation(collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.temporaryLocation);
          NewFieldMappingProfile.fillDigitizationPolicy(collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.digitizationPolicy);
          FieldMappingProfiles.saveProfile();
          FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForUpdate);

          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile);
          NewFieldMappingProfile.fillAccessionNumber(collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.accessionNumber);
          NewFieldMappingProfile.fillNumberOfPieces(collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.numberOfPieces);
          NewFieldMappingProfile.fillTemporaryLoanType(collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.temporaryLoanType);
          FieldMappingProfiles.saveProfile();
          FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfileNameForUpdate);

          // create action profiles
          collectionOfMappingAndActionProfilesForUpdate.forEach(profile => {
            cy.visit(SettingsMenu.actionProfilePath);
            ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
            ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          });

          // create Job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
          NewJobProfile.linkMatchAndActionProfilesForHoldings(holdingsActionProfileNameForUpdate, matchProfileNameForHoldings, 0);
          NewJobProfile.linkMatchAndActionProfilesForItem(itemActionProfileNameForUpdate, matchProfileNameForItem, 2);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate);

          // upload a marc file for updating
          cy.visit(TopMenu.dataImportPath);
          // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
          cy.reload();
          DataImport.uploadFile(editedMarcFileName);
          JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(editedMarcFileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(editedMarcFileName);
          [FileDetails.columnName.holdings,
            FileDetails.columnName.item
          ].forEach(columnName => {
            FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
          });
          FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);
          FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(initialInstanceHrId);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkTemporaryLocation('-');
          HoldingsRecordView.checkDigitizationPolicy('-');
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocationInHoldingsAccordion);
          InventoryInstance.openItemByBarcode(itemBarcode);
          ItemRecordView.checkAccessionNumber('-');
          ItemRecordView.checkNumberOfPieces('-');
          ItemRecordView.verifyTemporaryLoanType('-');
        });
      });
    });
});
