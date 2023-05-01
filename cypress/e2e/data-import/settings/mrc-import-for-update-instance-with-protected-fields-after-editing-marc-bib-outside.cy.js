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
  let instanceHrid = null;
  const marcFieldProtectionId = [];
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const quantityOfItems = '1';
  // unique file names
  const nameMarcFileForCreate = `C356830 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C356830 marcFileForMatch.${getRandomPostfix()}.mrc`;

  const protectedFields = {
    firstField: '*',
    secondField: '920'
  };
  const matchProfile = {
    profileName: `C356830 001 to Instance HRID ${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };
  const mappingProfile = {
    name: `C356830 Update instance and check field protections ${getRandomPostfix()}`,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
    catalogedDate: '###TODAY###',
    instanceStatus: 'Batch Loaded'
  };
  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: `C356830 Update instance and check field protections ${getRandomPostfix()}`,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const jobProfile = {
    profileName: `C356830 Update instance and check field protections ${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create test user', () => {
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
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    Users.deleteViaApi(user.userId);
    marcFieldProtectionId.forEach(field => MarcFieldProtection.deleteMarcFieldProtectionViaApi(field));
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
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
          const id = resp.id;
          marcFieldProtectionId.push = id;
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
          const id = resp.id;
          marcFieldProtectionId.push = id;
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
      FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchAndActionProfilesForInstance(actionProfile.name, matchProfile.profileName);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file for creating of the new instance
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('marcFileForC356830.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
      Logs.openFileDetails(nameMarcFileForCreate);
      [FileDetails.columnName.srsMarc, FileDetails.columnName.instance].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 0);
      FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 0);

      // get Instance HRID through API
      InventorySearchAndFilter.getInstanceHRID()
        .then(hrId => {
          instanceHrid = hrId[0];

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InventoryInstance.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('650\t', 'Drawing, Dutch ‡y 21st century ‡v Exhibitions. ‡5 amb');
          InventoryViewSource.verifyFieldInMARCBibSource('920\t', 'This field should be protected');

          DataImport.editMarcFile(
            'marcFileForC356830_rev.mrc',
            editedMarcFileName,
            ['in00000000022'],
            [instanceHrid]
          );
        });

      // upload .mrc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.checkIsLandingPageOpened();
      DataImport.uploadFile(editedMarcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(editedMarcFileName);
      Logs.checkStatusOfJobProfile();
      Logs.openFileDetails(editedMarcFileName);
      [FileDetails.columnName.srsMarc, FileDetails.columnName.instance].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
      FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

      FileDetails.openInstanceInInventory('Updated');
      InventoryInstance.viewSource();
      InventoryViewSource.verifyFieldInMARCBibSource('650\t', 'Drawing, Dutch ‡y 21st century ‡v Exhibitions. ‡5 amb');
      InventoryViewSource.verifyFieldInMARCBibSource('920\t', 'This field should be protected');
    });
});
