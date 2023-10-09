import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  LOCATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
  HOLDINGS_TYPE_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import Helper from '../../../support/fragments/finance/financeHelper';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const quantityOfItems = '1';
    const marcFileNameForCreate = `C11110 autotestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C11110 editedMarcFile.${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C11110 autotestFile.${getRandomPostfix()}.mrc`;

    const instanceMappingProfileForCreate = {
      name: `C11110 autotest instance mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      actionForSuppress: 'Mark for all affected records',
      catalogedDate: '"2021-02-24"',
      catalogedDateUI: '2021-02-24',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
      natureOfContent: 'bibliography',
    };
    const holdingsMappingProfileForCreate = {
      name: `C11110 autotest holdings mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      formerHoldingsId: `autotestFormerHoldingsId.${getRandomPostfix()}`,
      holdingsType: HOLDINGS_TYPE_NAMES.MONOGRAPH,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
      adminNote: `autotestAdminNote.${getRandomPostfix()}`,
      permanentLocation: `"${LOCATION_NAMES.MAIN_LIBRARY}"`,
      permanentLocationUI: LOCATION_NAMES.MAIN_LIBRARY_UI,
      temporaryLocation: `"${LOCATION_NAMES.ONLINE}"`,
      temporaryLocationUI: LOCATION_NAMES.ONLINE_UI,
      shelvingTitle: `autotestShelvingTitle.${getRandomPostfix()}`,
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
      callNumber: Helper.getRandomBarcode(),
      holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
      illPolicy: 'Unknown lending policy',
      noteType: '"Binding"',
      holdingsNote: `autotestHoldingsNote.${getRandomPostfix()}`,
      staffOnly: 'Mark for all affected records',
    };
    const holdingsMappingProfileForUpdate = {
      name: `C11110 autotest holdings mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      formerHoldingsId: `autotestFormerHoldingsId.${getRandomPostfix()}`,
      holdingsType: 'Physical',
      statisticalCode: 'ARL (Collection stats): emusic - Music scores, electronic',
      statisticalCodeUI: 'Music scores, electronic',
      adminNote: `autotestAdminNote.${getRandomPostfix()}`,
      shelvingTitle: `autotestShelvingTitle.${getRandomPostfix()}`,
      callNumberType: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
      callNumber: Helper.getRandomBarcode(),
      holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
      illPolicy: 'Will lend',
    };
    const instanceActionProfileForCreate = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C11110 autotest instance action profile.${getRandomPostfix()}`,
    };
    const holdingsActionProfileForCreate = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C11110 autotest holdings action profile.${getRandomPostfix()}`,
    };
    const holdingsActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C11110 autotest holdings action profile.${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const instanceMatchProfile = {
      profileName: `C11110 autotest instance match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const holdingsMatchProfile = {
      profileName: `C11110 autotest holdings match profile.${getRandomPostfix()}`,
      incomingStaticValue: 'Main Library (KU/CC/DI/M)',
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      existingRecordOption: NewMatchProfile.optionsList.holdingsPermLoc,
    };
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11110 autotest job profile.${getRandomPostfix()}`,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11110 autotest job profile.${getRandomPostfix()}`,
    };

    before('create test data', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.getAdminToken();
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfileForCreate.profileName);
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      MatchProfiles.deleteMatchProfile(instanceMatchProfile.profileName);
      MatchProfiles.deleteMatchProfile(holdingsMatchProfile.profileName);
      ActionProfiles.deleteActionProfile(instanceActionProfileForCreate.name);
      ActionProfiles.deleteActionProfile(holdingsActionProfileForCreate.name);
      ActionProfiles.deleteActionProfile(holdingsActionProfileForUpdate.name);
      FieldMappingProfileView.deleteViaApi(instanceMappingProfileForCreate.name);
      FieldMappingProfileView.deleteViaApi(holdingsMappingProfileForCreate.name);
      FieldMappingProfileView.deleteViaApi(holdingsMappingProfileForUpdate.name);
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C11110 Update a holdings via a static value submatch (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // create mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfileForCreate);
        NewFieldMappingProfile.addStaffSuppress(instanceMappingProfileForCreate.actionForSuppress);
        NewFieldMappingProfile.addSuppressFromDiscovery(
          instanceMappingProfileForCreate.actionForSuppress,
        );
        NewFieldMappingProfile.addPreviouslyHeld(instanceMappingProfileForCreate.actionForSuppress);
        NewFieldMappingProfile.fillCatalogedDate(instanceMappingProfileForCreate.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfileForCreate.statusTerm);
        NewFieldMappingProfile.addStatisticalCode(
          instanceMappingProfileForCreate.statisticalCode,
          8,
        );
        NewFieldMappingProfile.addNatureOfContentTerms(
          instanceMappingProfileForCreate.natureOfContent,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(instanceMappingProfileForCreate.name);
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileForCreate.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForCreate);
        NewFieldMappingProfile.addFormerHoldings(holdingsMappingProfileForCreate.formerHoldingsId);
        NewFieldMappingProfile.fillHoldingsType(holdingsMappingProfileForCreate.holdingsType);
        NewFieldMappingProfile.addStatisticalCode(
          holdingsMappingProfileForCreate.statisticalCode,
          4,
        );
        NewFieldMappingProfile.addAdministrativeNote(holdingsMappingProfileForCreate.adminNote, 5);
        NewFieldMappingProfile.fillPermanentLocation(
          holdingsMappingProfileForCreate.permanentLocation,
        );
        NewFieldMappingProfile.fillTemporaryLocation(
          holdingsMappingProfileForCreate.temporaryLocation,
        );
        NewFieldMappingProfile.fillCallNumberType(
          `"${holdingsMappingProfileForCreate.callNumberType}"`,
        );
        NewFieldMappingProfile.fillCallNumber(`"${holdingsMappingProfileForCreate.callNumber}"`);
        NewFieldMappingProfile.addHoldingsStatements(
          holdingsMappingProfileForCreate.holdingsStatements,
        );
        NewFieldMappingProfile.fillIllPolicy(holdingsMappingProfileForCreate.illPolicy);
        NewFieldMappingProfile.addHoldingsNotes(
          holdingsMappingProfileForCreate.noteType,
          holdingsMappingProfileForCreate.holdingsNote,
          holdingsMappingProfileForCreate.staffOnly,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfileForCreate.name);
        FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileForCreate.name);

        // create action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(instanceActionProfileForCreate, instanceMappingProfileForCreate.name);
        ActionProfiles.checkActionProfilePresented(instanceActionProfileForCreate.name);
        ActionProfiles.create(holdingsActionProfileForCreate, holdingsMappingProfileForCreate.name);
        ActionProfiles.checkActionProfilePresented(holdingsActionProfileForCreate.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfile(instanceActionProfileForCreate);
        NewJobProfile.linkActionProfile(holdingsActionProfileForCreate);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload a marc file for creating
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', marcFileNameForCreate);
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems);

        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkFormerHoldingsId(
            holdingsMappingProfileForCreate.formerHoldingsId,
          );
          HoldingsRecordView.checkHoldingsType(holdingsMappingProfileForCreate.holdingsType);
          HoldingsRecordView.checkStatisticalCode(
            holdingsMappingProfileForCreate.statisticalCodeUI,
          );
          HoldingsRecordView.checkAdministrativeNote(holdingsMappingProfileForCreate.adminNote);
          HoldingsRecordView.checkPermanentLocation(
            holdingsMappingProfileForCreate.permanentLocationUI,
          );
          HoldingsRecordView.checkTemporaryLocation(
            holdingsMappingProfileForCreate.temporaryLocationUI,
          );
          HoldingsRecordView.checkCallNumberType(holdingsMappingProfileForCreate.callNumberType);
          HoldingsRecordView.checkCallNumber(holdingsMappingProfileForCreate.callNumber);
          HoldingsRecordView.checkHoldingsStatement(
            holdingsMappingProfileForCreate.holdingsStatements,
          );
          HoldingsRecordView.checkIllPolicy(holdingsMappingProfileForCreate.illPolicy);
          HoldingsRecordView.checkHoldingsNote(holdingsMappingProfileForCreate.holdingsNote);

          DataImport.editMarcFile(
            'oneMarcBib.mrc',
            editedMarcFileName,
            ['ocn962073864'],
            [instanceHrid],
          );

          // create mapping profile
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForUpdate);
          NewFieldMappingProfile.addFormerHoldings(
            holdingsMappingProfileForUpdate.formerHoldingsId,
            NewFieldMappingProfile.actions.deleteAllExistingAndAddThese,
          );
          NewFieldMappingProfile.fillHoldingsType(holdingsMappingProfileForUpdate.holdingsType);
          NewFieldMappingProfile.addStatisticalCode(
            holdingsMappingProfileForUpdate.statisticalCode,
            4,
            NewFieldMappingProfile.actions.deleteAllExistingAndAddThese,
          );
          NewFieldMappingProfile.addAdministrativeNote(
            holdingsMappingProfileForUpdate.adminNote,
            5,
            NewFieldMappingProfile.actions.deleteAllExistingAndAddThese,
          );
          NewFieldMappingProfile.fillCallNumberType(
            `"${holdingsMappingProfileForUpdate.callNumberType}"`,
          );
          NewFieldMappingProfile.fillCallNumber(`"${holdingsMappingProfileForUpdate.callNumber}"`);
          NewFieldMappingProfile.addHoldingsStatements(
            holdingsMappingProfileForUpdate.holdingsStatements,
            NewFieldMappingProfile.actions.deleteAllExistingAndAddThese,
          );
          NewFieldMappingProfile.fillIllPolicy(holdingsMappingProfileForUpdate.illPolicy);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(holdingsMappingProfileForUpdate.name);
          FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileForUpdate.name);

          // create action profile
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(
            holdingsActionProfileForUpdate,
            holdingsMappingProfileForUpdate.name,
          );
          ActionProfiles.checkActionProfilePresented(holdingsActionProfileForUpdate.name);

          // create match profiles
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(instanceMatchProfile);
          MatchProfiles.checkMatchProfilePresented(instanceMatchProfile.profileName);
          MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
          MatchProfiles.checkMatchProfilePresented(holdingsMatchProfile.profileName);

          // create job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfile(jobProfileForUpdate);
          NewJobProfile.linkMatchProfile(instanceMatchProfile.profileName);
          NewJobProfile.linkMatchProfileForMatches(holdingsMatchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(holdingsActionProfileForUpdate.name);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

          // upload .mrc file
          cy.visit(TopMenu.dataImportPath);
          DataImport.checkIsLandingPageOpened();
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
          JobProfiles.search(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFileNameForUpdate);
          Logs.checkStatusOfJobProfile();
          Logs.openFileDetails(marcFileNameForUpdate);
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.holdings,
          );
          FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkFormerHoldingsId(
            holdingsMappingProfileForUpdate.formerHoldingsId,
          );
          HoldingsRecordView.checkHoldingsType(holdingsMappingProfileForUpdate.holdingsType);
          HoldingsRecordView.checkStatisticalCode(
            holdingsMappingProfileForUpdate.statisticalCodeUI,
          );
          HoldingsRecordView.checkAdministrativeNote(holdingsMappingProfileForUpdate.adminNote);
          HoldingsRecordView.checkCallNumberType(holdingsMappingProfileForUpdate.callNumberType);
          HoldingsRecordView.checkCallNumber(holdingsMappingProfileForUpdate.callNumber);
          HoldingsRecordView.checkHoldingsStatement(
            holdingsMappingProfileForUpdate.holdingsStatements,
          );
          HoldingsRecordView.checkIllPolicy(holdingsMappingProfileForUpdate.illPolicy);
        });
      },
    );
  });
});
