import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  let firstFieldId = null;
  let secondFieldId = null;
  let instanceHrid = null;

  // unique profile names
  const matchProfileName = `C356830 001 to Instance HRID ${getRandomPostfix()}`;
  const mappingProfileName = `C356830 Update instance and check field protections ${getRandomPostfix()}`;
  const actionProfileName = `C356830 Update instance and check field protections ${getRandomPostfix()}`;
  const jobProfileName = `C356830 Update instance and check field protections ${getRandomPostfix()}`;
  // unique file names
  const nameMarcFileForCreate = `C356830 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C356830 marcFileForMatch.${getRandomPostfix()}.mrc`;

  const protectedFields = {
    firstField: '*',
    secondField: '920'
  };
  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };
  const mappingProfile = {
    name: mappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
    catalogedDate: '###TODAY###',
    instanceStatus: 'Batch Loaded'
  };
  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.dataExportEnableApp.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    Users.deleteViaApi(user.userId);
    MarcFieldProtection.deleteMarcFieldProtectionViaApi(firstFieldId);
    MarcFieldProtection.deleteMarcFieldProtectionViaApi(secondFieldId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C356830 Test field protections when importing to update instance, after editing the MARC Bib outside of FOLIO (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: '5',
        data: 'amb',
        source: 'USER',
        field: protectedFields.firstField
      })
        .then((resp) => {
          firstFieldId = resp.id;
        });
      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: '*',
        data: '*',
        source: 'USER',
        field: protectedFields.secondField
      })
        .then((resp) => {
          secondFieldId = resp.id;
        });

      // create match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

      // create mapping profile
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
      NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfileName);
      ActionProfiles.checkActionProfilePresented(actionProfileName);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchAndActionProfilesForInstance(actionProfileName, matchProfileName);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileName);

      // upload a marc file for creating of the new instance
      cy.visit(TopMenu.dataImportPath);
      DataImport.uploadFile('marcFileForC356830.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
      Logs.openFileDetails(nameMarcFileForCreate);
      [FileDetails.columnName.srsMarc, FileDetails.columnName.instance].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable('1', 0);
      FileDetails.checkInstanceQuantityInSummaryTable('1', 0);

      // get Instance HRID through API
      InventorySearchAndFilter.getInstanceHRID()
        .then(hrId => {
          instanceHrid = hrId[0];

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InventoryInstance.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('650\t', 'Drawing, Dutch ‡y 21st century ‡v Exhibitions. ‡5 amb');
          InventoryViewSource.verifyFieldInMARCBibSource('920\t', 'This field should be protected');

          DataImport.editMarcFile('marcFileForC356830_rev.mrc', editedMarcFileName, ['in0000000022'], [instanceHrid]);
        });

      // upload .mrc file
      cy.visit(TopMenu.dataImportPath);
      DataImport.checkIsLandingPageOpened();
      DataImport.uploadFile(editedMarcFileName);
      JobProfiles.searchJobProfileForImport(jobProfileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(editedMarcFileName);
      Logs.checkStatusOfJobProfile();
      Logs.openFileDetails(editedMarcFileName);
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
      FileDetails.checkSrsRecordQuantityInSummaryTable('1', 0);
      FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

      FileDetails.openInstanceInInventory('Updated');
      InventoryInstance.viewSource();
      InventoryViewSource.verifyFieldInMARCBibSource('650\t', 'Drawing, Dutch ‡y 21st century ‡v Exhibitions. ‡5 amb');
      InventoryViewSource.verifyFieldInMARCBibSource('920\t', 'This field should be protected');
    });
});
