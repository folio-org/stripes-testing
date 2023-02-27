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
    permanentLocation: 'Main Library (KU/CC/DI/M)',
    temporaryLocation: 'Online (E)',
    shelvingTitle: `autotestShelvingTitle.${getRandomPostfix()}`,
    callNumberType: 'National Library of Medicine classification',
    callNumber: '050$a " " 050$b',
    holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
    illPolicy: 'Unknown lending policy',
    noteType: 'Binding',
    holdingsNote: `autotestHoldingsNote.${getRandomPostfix()}`,
    staffOnly: 'Mark for all affected records',
    relationship: 'Resource'
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
    callNumber: '050$a " " 050$b',
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

  before(() => {
    cy.loginAsAdmin({ path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
    cy.getAdminToken();
  });

  it('C11110 Update an instance and holdings via a static value submatch (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
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
    NewFieldMappingProfile.addSuppressFromDiscovery();
    NewFieldMappingProfile.addFormerHoldings(holdingsMappingProfileForCreate.formerHoldingsId);
    NewFieldMappingProfile.fillHoldingsType(holdingsMappingProfileForCreate.holdingsType);
    NewFieldMappingProfile.addStatisticalCode(holdingsMappingProfileForCreate.statisticalCode, 4);
    NewFieldMappingProfile.addAdministrativeNote(holdingsMappingProfileForCreate.adminNote, 5);
    NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfileForCreate.permanentLocation);
    NewFieldMappingProfile.fillTemporaryLocation(holdingsMappingProfileForCreate.temporaryLocation);
    NewFieldMappingProfile.fillCallNumberType(holdingsMappingProfileForCreate.callNumberType);
    NewFieldMappingProfile.fillCallNumber(holdingsMappingProfileForCreate.callNumber);
    NewFieldMappingProfile.addHoldingsStatements(holdingsMappingProfileForCreate.holdingsStatements);
    NewFieldMappingProfile.fillIllPolicy(holdingsMappingProfileForCreate.illPolicy);
    NewFieldMappingProfile.addHoldingsNotes(holdingsMappingProfileForCreate.noteType, holdingsMappingProfileForCreate.holdingsNote, holdingsMappingProfileForCreate.staffOnly);
    NewFieldMappingProfile.addElectronicAccess(holdingsMappingProfileForCreate.relationship, '');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForCreate);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileNameForCreate);

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(instanceActionProfileForCreate, instanceMappingProfileNameForCreate);
    ActionProfiles.checkActionProfilePresented(instanceActionProfileNameForCreate);
    ActionProfiles.create(holdingsActionProfileForCreate, holdingsMappingProfileNameForCreate);
    ActionProfiles.checkActionProfilePresented(holdingsActionProfileNameForCreate);

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfileForCreate);
    NewJobProfile.linkActionProfile(instanceActionProfileForCreate);
    NewJobProfile.linkActionProfile(holdingsActionProfileForCreate);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileNameForCreate);

    // upload a marc file for creating of the new instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', marcFileNameForCreate);
    JobProfiles.searchJobProfileForImport(jobProfileNameForCreate);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(marcFileNameForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(marcFileNameForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
    ].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
    FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[0];

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        // InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
        // InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        // InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        // InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
        // InstanceRecordView.verifyNatureOfContent(mappingProfile.natureOfContent);

        DataImport.editMarcFile('oneMarcBib.mrc', editedMarcFileName, ['ocn962073864'], [instanceHrid]);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForUpdate);
        NewFieldMappingProfile.addFormerHoldings(holdingsMappingProfileForUpdate.formerHoldingsId);
        NewFieldMappingProfile.fillHoldingsType(holdingsMappingProfileForUpdate.holdingsType);
        NewFieldMappingProfile.addStatisticalCode(holdingsMappingProfileForUpdate.statisticalCode, 4);
        NewFieldMappingProfile.addAdministrativeNote(holdingsMappingProfileForUpdate.adminNote, 5);
        NewFieldMappingProfile.fillCallNumberType(holdingsMappingProfileForUpdate.callNumberType);
        NewFieldMappingProfile.fillCallNumber(holdingsMappingProfileForUpdate.callNumber);
        NewFieldMappingProfile.addHoldingsStatements(holdingsMappingProfileForUpdate.holdingsStatements);
        NewFieldMappingProfile.fillIllPolicy(holdingsMappingProfileForUpdate.illPolicy);
        FieldMappingProfiles.saveProfile();
        FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForUpdate);
        FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileNameForUpdate);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(holdingsActionProfileForUpdate, holdingsMappingProfileNameForUpdate);
        ActionProfiles.checkActionProfilePresented(holdingsActionProfileNameForUpdate);

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(instanceMatchProfile);
        MatchProfiles.checkMatchProfilePresented(instanceMatchProfileName);
        MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
        MatchProfiles.checkMatchProfilePresented(holdingsMatchProfileName);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfileForMatches();
        NewJobProfile.linkMatchProfileForMatches();
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileNameForUpdate);

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.searchJobProfileForImport(jobProfileNameForUpdate);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.holdings);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        // InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
        // InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        // InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        // InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
        // InstanceRecordView.verifyNatureOfContent(mappingProfile.natureOfContent);
      });
  });
});
