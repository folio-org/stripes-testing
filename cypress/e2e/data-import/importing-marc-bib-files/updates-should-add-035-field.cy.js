/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('ui-data-import', () => {
  let user = null;
  let instanceHridFromFirstFile;
  const instanceStatusTerm = 'Batch Loaded';
  const statisticalCode = 'ARL (Collection stats): books - Book, print (books)';
  const statisticalCodeUI = 'Book, print (books)';
  const arrayOf999Fields = [];
  const fields035 = {
    firstRecord: { row: 0, content: '(LTSCA)303845' },
    secondRecord: { row: 1, content: '(LTSCA)2300089' },
    thirdRecord: { row: 2, content: '(NhCcYBP)yb1104243' },
    forthRecord: { row: 3, content: '289717' },
    fifthRecord: { row: 4, content: '(OCoLC)1144093654' },
    sixthRecord: { row: 5, content: '(OCoLC)1201684651' },
    seventhRecord: { row: 6, content: '(OCoLC)1195818788' },
    eighthRecord: { row: 7, content: '(OCoLC)ocn991553174' }
  };

  // unique file names
  const firstMarcFileNameForCreate = `C358998 firstCreateAutotestFile.${getRandomPostfix()}.mrc`;
  const secondMarcFileNameForCreate = `C358998 secondCreateAutotestFile.${getRandomPostfix()}.mrc`;
  const firstMarcFileNameForUpdate = `C358998 firstUpdateAutotestFile.${getRandomPostfix()}.mrc`;
  const secondMarcFileNameForUpdate = `C358998 secondUpdateAutotestFile.${getRandomPostfix()}.mrc`;
  const firstFileNameAfterUpload = `C358998 firstFileNameAfterUpload.${getRandomPostfix()}.mrc`;
  const secondFileNameAfterUpload = `C358998 secondFileNameAfterUpload.${getRandomPostfix()}.mrc`;

  // unique profile names
  const mappingProfileName = `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`;
  const actionProfileName = `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`;
  const matchProfileName = `C358998 Match 999$i to Instance UUID ${getRandomPostfix()}`;
  const jobProfileName = `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`;

  const mappingProfile = {
    name: mappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance
  };

  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 'i'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceUuid
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
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      permissions.remoteStorageView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    Users.deleteViaApi(user.userId);
    // delete created files in fixtures
    FileManager.deleteFile(`cypress/fixtures/${firstMarcFileNameForUpdate}`);
    FileManager.deleteFile(`cypress/fixtures/${secondMarcFileNameForUpdate}`);
  });

  it('C358998 Data Import Updates should add 035 field from 001/003, if it is not HRID or already exists (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // upload the first .mrc file
      DataImport.uploadFile('marcFileForC358998ForCreate_1.mrc', firstMarcFileNameForCreate);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(firstMarcFileNameForCreate);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(firstMarcFileNameForCreate);
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc);
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance);
      FileDetails.checkSrsRecordQuantityInSummaryTable('1');
      FileDetails.checkInstanceQuantityInSummaryTable('1');

      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(instanceHrId => {
        instanceHridFromFirstFile = instanceHrId;

        InventoryInstance.viewSource();
        // changing the first file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC358998ForUpdate_1.mrc',
              firstMarcFileNameForUpdate,
              ['srsUuid', 'instanceUuid', '303845'],
              [uuid[0], uuid[1], instanceHridFromFirstFile]
            );
          });

        // upload the second .mrc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile('marcFileForC358998ForCreate_2.mrc', secondMarcFileNameForCreate);
        JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondMarcFileNameForCreate);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.firstRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.firstRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.secondRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.secondRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.thirdRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.thirdRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.forthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.forthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.fifthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.fifthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.sixthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.sixthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.seventhRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.seventhRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.srsMarc, fields035.eighthRecord.row);
        FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance, fields035.eighthRecord.row);
        FileDetails.checkSrsRecordQuantityInSummaryTable('8');
        FileDetails.checkInstanceQuantityInSummaryTable('8');

        FileDetails.openInstanceInInventory('Created', fields035.firstRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.secondRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.thirdRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.forthRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.fifthRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.sixthRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.seventhRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); });

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', fields035.eighthRecord.row);
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => { arrayOf999Fields.push(uuid[0], uuid[1]); })
          .then(() => {
          // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC358998ForUpdate_2.mrc',
              secondMarcFileNameForUpdate,
              ['firstSrsUuid', 'firstInstanceUuid', 'secondSrsUuid', 'secondInstanceUuid',
                'thirdSrsUuid', 'thirdInstanceUuid', 'forthSrsUuid', 'forthInstanceUuid',
                'fifthSrsUuid', 'fifthInstanceUuid', 'sixthSrsUuid', 'sixthInstanceUuid',
                'seventhSrsUuid', 'seventhInstanceUuid', 'eighthSrsUuid', 'eighthInstanceUuid'],
              [...arrayOf999Fields]
            );
          });

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillInstanceStatusTerm(instanceStatusTerm);
        NewFieldMappingProfile.addStatisticalCode(statisticalCode, 8);
        FieldMappingProfiles.saveProfile();
        FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created first instance
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile(firstMarcFileNameForUpdate, firstFileNameAfterUpload);
        JobProfiles.searchJobProfileForImport(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(firstFileNameAfterUpload);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(firstFileNameAfterUpload);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance);
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
        FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
        // open the first Instance in the Inventory and check 001, 003, 035 fields
        FileDetails.openInstanceInInventory('Updated');
        cy.wait(2000);
        InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
        InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(instanceHridFromFirstFile);
        InventoryViewSource.notContains('003\t');
        InventoryViewSource.contains('035\t');
        InventoryViewSource.contains('(LTSCA)303845');
      });

      // upload a marc file for updating already created second instance
      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      DataImport.uploadFile(secondMarcFileNameForUpdate, secondFileNameAfterUpload);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(secondFileNameAfterUpload);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.firstRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.firstRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.secondRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.secondRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.thirdRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.thirdRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.forthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.forthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.fifthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.fifthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.sixthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.sixthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.seventhRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.seventhRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.srsMarc, fields035.eighthRecord.row);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance, fields035.eighthRecord.row);
      FileDetails.checkSrsRecordQuantityInSummaryTable('8', 1);
      FileDetails.checkInstanceQuantityInSummaryTable('8', 1);

      // open the second Instance in the Inventory and check 001, 003, 035 fields
      FileDetails.openInstanceInInventory('Updated', fields035.firstRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.firstRecord.content);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.secondRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.secondRecord.content);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.thirdRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.thirdRecord.content);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.forthRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.forthRecord.content);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.fifthRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.fifthRecord.content);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.sixthRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.sixthRecord.content);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.seventhRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.seventhRow);

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoading();
      Logs.openFileDetails(secondFileNameAfterUpload);
      FileDetails.openInstanceInInventory('Updated', fields035.eighthRecord.row);
      cy.wait(2000);
      InstanceRecordView.verifyInstanceStatusTerm(instanceStatusTerm);
      InstanceRecordView.verifyStatisticalCode(statisticalCodeUI);
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        InventoryInstance.viewSource();
        InventoryViewSource.contains('001\t');
        InventoryViewSource.contains(initialInstanceHrId);
      });
      InventoryViewSource.notContains('003\t');
      InventoryViewSource.contains('035\t');
      InventoryViewSource.contains(fields035.eighthRecord.content);
    });
});
