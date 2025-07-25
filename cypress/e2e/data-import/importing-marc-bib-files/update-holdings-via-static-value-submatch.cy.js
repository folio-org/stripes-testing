import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Helper from '../../../support/fragments/finance/financeHelper';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    let user;
    const quantityOfItems = '1';
    const marcFileNameForCreate = `C11110 autotestFile${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C11110 editedMarcFile${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C11110 autotestFile${getRandomPostfix()}.mrc`;

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
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const instanceMatchProfile = {
      profileName: `C11110 autotest instance match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const holdingsMatchProfile = {
      profileName: `C11110 autotest holdings match profile.${getRandomPostfix()}`,
      incomingStaticValue: 'Main Library (KU/CC/DI/M)',
      incomingStaticRecordValue: 'Text',
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
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

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(instanceMatchProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsMatchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfileForCreate.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(holdingsActionProfileForCreate.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(holdingsActionProfileForUpdate.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          instanceMappingProfileForCreate.name,
        );
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          holdingsMappingProfileForCreate.name,
        );
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          holdingsMappingProfileForUpdate.name,
        );
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C11110 Update a holdings via a static value submatch (folijet)',
      { tags: ['criticalPath', 'folijet', 'C11110'] },
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
          `"${instanceMappingProfileForCreate.natureOfContent}"`,
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
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(
          instanceActionProfileForCreate,
          instanceMappingProfileForCreate.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(instanceActionProfileForCreate.name);
        cy.wait(1000);
        SettingsActionProfiles.create(
          holdingsActionProfileForCreate,
          holdingsMappingProfileForCreate.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(holdingsActionProfileForCreate.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfile(instanceActionProfileForCreate);
        NewJobProfile.linkActionProfile(holdingsActionProfileForCreate);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload a marc file for creating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', marcFileNameForCreate);
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
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
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
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
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
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(
            holdingsActionProfileForUpdate,
            holdingsMappingProfileForUpdate.name,
          );
          SettingsActionProfiles.checkActionProfilePresented(holdingsActionProfileForUpdate.name);

          // create match profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(instanceMatchProfile);
          MatchProfiles.checkMatchProfilePresented(instanceMatchProfile.profileName);
          cy.wait(1000);
          MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
          MatchProfiles.checkMatchProfilePresented(holdingsMatchProfile.profileName);

          // create job profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(jobProfileForUpdate);
          NewJobProfile.linkMatchProfile(instanceMatchProfile.profileName);
          NewJobProfile.linkMatchProfileForMatches(holdingsMatchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(holdingsActionProfileForUpdate.name);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

          // upload .mrc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.checkIsLandingPageOpened();
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFileNameForUpdate);
          Logs.checkJobStatus(marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFileNameForUpdate);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.holdings,
          );
          FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          HoldingsRecordView.waitLoading();
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
