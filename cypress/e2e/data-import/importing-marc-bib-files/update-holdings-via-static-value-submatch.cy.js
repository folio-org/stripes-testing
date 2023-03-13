import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
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

describe('ui-data-import', () => {
  let instanceHrid;
  const quantityOfItems = '1';
  const instanceMappingProfileNameForCreate = `C11110 autotest instance mapping profile.${getRandomPostfix()}`;
  const holdingsMappingProfileNameForCreate = `C11110 autotest holdings mapping profile.${getRandomPostfix()}`;
  const holdingsMappingProfileNameForUpdate = `C11110 autotest holdings mapping profile.${getRandomPostfix()}`;
  const instanceActionProfileNameForCreate = `C11110 autotest instance action profile.${getRandomPostfix()}`;
  const holdingsActionProfileNameForCreate = `C11110 autotest holdings action profile.${getRandomPostfix()}`;
  const holdingsActionProfileNameForUpdate = `C11110 autotest holdings action profile.${getRandomPostfix()}`;
  const instanceMatchProfileName = `C11110 autotest instance match profile.${getRandomPostfix()}`;
  const holdingsMatchProfileName = `C11110 autotest holdings match profile.${getRandomPostfix()}`;
  const jobProfileNameForCreate = `C11110 autotest job profile.${getRandomPostfix()}`;
  const jobProfileNameForUpdate = `C11110 autotest job profile.${getRandomPostfix()}`;

  const marcFileNameForCreate = `C11110 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C11110 editedMarcFile.${getRandomPostfix()}.mrc`;
  const marcFileNameForUpdate = `C11110 autotestFile.${getRandomPostfix()}.mrc`;

  const instanceMappingProfileForCreate = {
    name: instanceMappingProfileNameForCreate,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
    actionForSuppress: 'Mark for all affected records',
    catalogedDate: '"2021-02-24"',
    catalogedDateUI: '2021-02-24',
    instanceStatus: 'Batch Loaded',
    statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
    statisticalCodeUI: 'Book, print (books)',
    natureOfContent: 'bibliography'
  };
  const holdingsMappingProfileForCreate = {
    name: holdingsMappingProfileNameForCreate,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
    formerHoldingsId: `autotestFormerHoldingsId.${getRandomPostfix()}`,
    holdingsType: 'Monograph',
    statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
    statisticalCodeUI: 'Book, print (books)',
    adminNote: `autotestAdminNote.${getRandomPostfix()}`,
    permanentLocation: '"Main Library (KU/CC/DI/M)"',
    permanentLocationUI:'Main Library',
    temporaryLocation: '"Online (E)"',
    temporaryLocationUI: 'Online',
    shelvingTitle: `autotestShelvingTitle.${getRandomPostfix()}`,
    callNumberType: 'National Library of Medicine classification',
    callNumber: Helper.getRandomBarcode(),
    holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
    illPolicy: 'Unknown lending policy',
    noteType: '"Binding"',
    holdingsNote: `autotestHoldingsNote.${getRandomPostfix()}`,
    staffOnly: 'Mark for all affected records'
  };
  const holdingsMappingProfileForUpdate = {
    name: holdingsMappingProfileNameForUpdate,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
    formerHoldingsId: `autotestFormerHoldingsId.${getRandomPostfix()}`,
    holdingsType: 'Physical',
    statisticalCode: 'ARL (Collection stats): emusic - Music scores, electronic',
    statisticalCodeUI: 'Music scores, electronic',
    adminNote: `autotestAdminNote.${getRandomPostfix()}`,
    shelvingTitle: `autotestShelvingTitle.${getRandomPostfix()}`,
    callNumberType: 'Other scheme',
    callNumber: Helper.getRandomBarcode(),
    holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
    illPolicy: 'Will lend'
  };
  const instanceActionProfileForCreate = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: instanceActionProfileNameForCreate,
    action: 'Create (all record types except MARC Authority or MARC Holdings)'
  };
  const holdingsActionProfileForCreate = {
    typeValue: NewActionProfile.folioRecordTypeValue.holdings,
    name: holdingsActionProfileNameForCreate,
    action: 'Create (all record types except MARC Authority or MARC Holdings)'
  };
  const holdingsActionProfileForUpdate = {
    typeValue: NewActionProfile.folioRecordTypeValue.holdings,
    name: holdingsActionProfileNameForUpdate,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const instanceMatchProfile = {
    profileName: instanceMatchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };
  const holdingsMatchProfile = {
    profileName: holdingsMatchProfileName,
    incomingStaticValue: 'Main Library (KU/CC/DI/M)',
    matchCriterion: 'Exactly matches',
    existingRecordType: 'HOLDINGS',
    itemOption: NewMatchProfile.optionsList.holdingsPermLoc
  };
  const jobProfileForCreate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForCreate
  };
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForUpdate
  };

  before('create test data', () => {
    cy.loginAsAdmin({ path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
    cy.getAdminToken();
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfileNameForCreate);
    JobProfiles.deleteJobProfile(jobProfileNameForUpdate);
    MatchProfiles.deleteMatchProfile(instanceMatchProfileName);
    MatchProfiles.deleteMatchProfile(holdingsMatchProfileName);
    ActionProfiles.deleteActionProfile(instanceActionProfileNameForCreate);
    ActionProfiles.deleteActionProfile(holdingsActionProfileNameForCreate);
    ActionProfiles.deleteActionProfile(holdingsActionProfileNameForUpdate);
    FieldMappingProfiles.deleteFieldMappingProfile(instanceMappingProfileNameForCreate);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileNameForCreate);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileNameForUpdate);
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C11110 Update a holdings via a static value submatch (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // create mapping profiles
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfileForCreate);
    NewFieldMappingProfile.addStaffSuppress(instanceMappingProfileForCreate.actionForSuppress);
    NewFieldMappingProfile.addSuppressFromDiscovery(instanceMappingProfileForCreate.actionForSuppress);
    NewFieldMappingProfile.addPreviouslyHeld(instanceMappingProfileForCreate.actionForSuppress);
    NewFieldMappingProfile.fillCatalogedDate(instanceMappingProfileForCreate.catalogedDate);
    NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfileForCreate.statusTerm);
    NewFieldMappingProfile.addStatisticalCode(instanceMappingProfileForCreate.statisticalCode, 8);
    NewFieldMappingProfile.addNatureOfContentTerms(instanceMappingProfileForCreate.natureOfContent);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfileNameForCreate);
    FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileNameForCreate);

    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForCreate);
    NewFieldMappingProfile.addFormerHoldings(holdingsMappingProfileForCreate.formerHoldingsId);
    NewFieldMappingProfile.fillHoldingsType(holdingsMappingProfileForCreate.holdingsType);
    NewFieldMappingProfile.addStatisticalCode(holdingsMappingProfileForCreate.statisticalCode, 4);
    NewFieldMappingProfile.addAdministrativeNote(holdingsMappingProfileForCreate.adminNote, 5);
    NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfileForCreate.permanentLocation);
    NewFieldMappingProfile.fillTemporaryLocation(holdingsMappingProfileForCreate.temporaryLocation);
    NewFieldMappingProfile.fillCallNumberType(holdingsMappingProfileForCreate.callNumberType);
    NewFieldMappingProfile.fillCallNumber(`"${holdingsMappingProfileForCreate.callNumber}"`);
    NewFieldMappingProfile.addHoldingsStatements(holdingsMappingProfileForCreate.holdingsStatements);
    NewFieldMappingProfile.fillIllPolicy(holdingsMappingProfileForCreate.illPolicy);
    NewFieldMappingProfile.addHoldingsNotes(holdingsMappingProfileForCreate.noteType, holdingsMappingProfileForCreate.holdingsNote, holdingsMappingProfileForCreate.staffOnly);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForCreate);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileNameForCreate);

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(instanceActionProfileForCreate, instanceMappingProfileNameForCreate);
    ActionProfiles.checkActionProfilePresented(instanceActionProfileNameForCreate);
    ActionProfiles.create(holdingsActionProfileForCreate, holdingsMappingProfileNameForCreate);
    ActionProfiles.checkActionProfilePresented(holdingsActionProfileNameForCreate);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfileForCreate);
    NewJobProfile.linkActionProfile(instanceActionProfileForCreate);
    NewJobProfile.linkActionProfile(holdingsActionProfileForCreate);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileNameForCreate);

    // upload a marc file for creating
    cy.visit(TopMenu.dataImportPath);
    // TODO delete code after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.clickDataImportNavButton();
    DataImport.uploadFile('oneMarcBib.mrc', marcFileNameForCreate);
    JobProfiles.searchJobProfileForImport(jobProfileNameForCreate);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(marcFileNameForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(marcFileNameForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
      FileDetails.columnName.holdings
    ].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
    FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
    FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[0];

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkFormerHoldingsId(holdingsMappingProfileForCreate.formerHoldingsId);
        HoldingsRecordView.checkHoldingsType(holdingsMappingProfileForCreate.holdingsType);
        HoldingsRecordView.checkStatisticalCode(holdingsMappingProfileForCreate.statisticalCodeUI);
        HoldingsRecordView.checkAdministrativeNote(holdingsMappingProfileForCreate.adminNote);
        HoldingsRecordView.checkPermanentLocation(holdingsMappingProfileForCreate.permanentLocationUI);
        HoldingsRecordView.checkTemporaryLocation(holdingsMappingProfileForCreate.temporaryLocationUI);
        HoldingsRecordView.checkCallNumberType(holdingsMappingProfileForCreate.callNumberType);
        HoldingsRecordView.checkCallNumber(holdingsMappingProfileForCreate.callNumber);
        HoldingsRecordView.checkHoldingsStatement(holdingsMappingProfileForCreate.holdingsStatements);
        HoldingsRecordView.checkIllPolicy(holdingsMappingProfileForCreate.illPolicy);
        HoldingsRecordView.checkHoldingsNote(holdingsMappingProfileForCreate.holdingsNote);

        DataImport.editMarcFile('oneMarcBib.mrc', editedMarcFileName, ['ocn962073864'], [instanceHrid]);

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForUpdate);
        NewFieldMappingProfile.addFormerHoldings(holdingsMappingProfileForUpdate.formerHoldingsId, NewFieldMappingProfile.actions.deleteAllExistingAndAddThese);
        NewFieldMappingProfile.fillHoldingsType(holdingsMappingProfileForUpdate.holdingsType);
        NewFieldMappingProfile.addStatisticalCode(holdingsMappingProfileForUpdate.statisticalCode, 4, NewFieldMappingProfile.actions.deleteAllExistingAndAddThese);
        NewFieldMappingProfile.addAdministrativeNote(holdingsMappingProfileForUpdate.adminNote, 5, NewFieldMappingProfile.actions.deleteAllExistingAndAddThese);
        NewFieldMappingProfile.fillCallNumberType(holdingsMappingProfileForUpdate.callNumberType);
        NewFieldMappingProfile.fillCallNumber(`"${holdingsMappingProfileForUpdate.callNumber}"`);
        NewFieldMappingProfile.addHoldingsStatements(holdingsMappingProfileForUpdate.holdingsStatements, NewFieldMappingProfile.actions.deleteAllExistingAndAddThese);
        NewFieldMappingProfile.fillIllPolicy(holdingsMappingProfileForUpdate.illPolicy);
        FieldMappingProfiles.saveProfile();
        FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForUpdate);
        FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileNameForUpdate);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(holdingsActionProfileForUpdate, holdingsMappingProfileNameForUpdate);
        ActionProfiles.checkActionProfilePresented(holdingsActionProfileNameForUpdate);

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(instanceMatchProfile);
        MatchProfiles.checkMatchProfilePresented(instanceMatchProfileName);
        MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
        MatchProfiles.checkMatchProfilePresented(holdingsMatchProfileName);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfile(instanceMatchProfileName);
        NewJobProfile.linkMatchProfileForMatches(holdingsMatchProfileName);
        NewJobProfile.linkActionProfileForMatches(holdingsActionProfileNameForUpdate);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate);

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.checkIsLandingPageOpened();
        // TODO delete code after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.clickDataImportNavButton();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.holdings);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkFormerHoldingsId(holdingsMappingProfileForUpdate.formerHoldingsId);
        HoldingsRecordView.checkHoldingsType(holdingsMappingProfileForUpdate.holdingsType);
        HoldingsRecordView.checkStatisticalCode(holdingsMappingProfileForUpdate.statisticalCodeUI);
        HoldingsRecordView.checkAdministrativeNote(holdingsMappingProfileForUpdate.adminNote);
        HoldingsRecordView.checkCallNumberType(holdingsMappingProfileForUpdate.callNumberType);
        HoldingsRecordView.checkCallNumber(holdingsMappingProfileForUpdate.callNumber);
        HoldingsRecordView.checkHoldingsStatement(holdingsMappingProfileForUpdate.holdingsStatements);
        HoldingsRecordView.checkIllPolicy(holdingsMappingProfileForUpdate.illPolicy);
      });
  });
});
