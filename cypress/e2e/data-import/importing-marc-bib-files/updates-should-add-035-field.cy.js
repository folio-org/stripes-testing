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

describe('ui-data-import: Data Import Updates should add 035 field from 001/003, if it is not HRID or already exists', () => {
  let user = null;
  let firstInstanceHrid;
  const secondInstancesHrid = [];
  const instanceStatusTerm = '"Batch Loaded"';
  const statisticalCode = '"ARL (Collection stats): books - Book, print (books)"';
  const rowNumbers = [0, 1, 2, 3, 4, 5, 6, 7];
  const arrayOf999Fields = [];

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

  before(() => {
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

  // after(() => {
  //   // delete profiles
  //   JobProfiles.deleteJobProfile(jobProfileName);
  //   MatchProfiles.deleteMatchProfile(matchProfileName);
  //   ActionProfiles.deleteActionProfile(actionProfileName);
  //   FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);

  //   cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${firstInstanceHrid}"` })
  //     .then((instance) => {
  //       InventoryInstance.deleteInstanceViaApi(instance.id);
  //     });
  //   cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${secondInstanceHrid}"` })
  //     .then((instance) => {
  //       InventoryInstance.deleteInstanceViaApi(instance.id);
  //     });
  //   Users.deleteViaApi(user.userId);
  // });

  it('C358998 Data Import Updates should add 035 field from 001/003, if it is not HRID or already exists (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // // upload te first .mrc file
    // DataImport.uploadFile('marcFileForC358998ForCreate_1.mrc', firstMarcFileNameForCreate);
    // JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    // JobProfiles.runImportFile();
    // JobProfiles.waitFileIsImported(firstMarcFileNameForCreate);
    // Logs.checkStatusOfJobProfile('Completed');
    // Logs.openFileDetails(firstMarcFileNameForCreate);
    // [FileDetails.columnName.srsMarc,
    //   FileDetails.columnName.instance].forEach(columnName => {
    //   FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    // });
    // FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    // FileDetails.checkInstanceQuantityInSummaryTable('1');

    // FileDetails.openInstanceInInventory('Created');
    // InventoryInstance.getAssignedHRID().then(initialInstanceHrId => { firstInstanceHrid = initialInstanceHrId; });
    // InventoryInstance.viewSource();
    // // changing the first file
    // InventoryViewSource.extructDataFrom999Field()
    //   .then(uuid => {
    //     // change file using uuid for 999 field
    //     DataImport.editMarcFile(
    //       'marcFileForC358998ForUpdate_1.mrc',
    //       firstMarcFileNameForUpdate,
    //       ['srsUuid', 'instanceUuid', '303845'],
    //       [uuid[0], uuid[1], firstInstanceHrid]
    //     );
    //   });
    // upload the second .mrc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFileForC358998ForCreate_2.mrc', secondMarcFileNameForCreate);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(secondMarcFileNameForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(secondMarcFileNameForCreate);
    rowNumbers.forEach(rowNumber => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc, rowNumber);
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.instance, rowNumber);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable('8');
    FileDetails.checkInstanceQuantityInSummaryTable('8');
    cy.wrap(
      rowNumbers.forEach(rowNumber => {
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        FileDetails.openInstanceInInventory('Created', rowNumber);
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => { secondInstancesHrid.push(initialInstanceHrId); });
        InventoryInstance.viewSource();
        // changing the second file
        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => {
            arrayOf999Fields.push(uuid[0], uuid[1]);
          });
      })
    ).then(() => {
      console.log(arrayOf999Fields);
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

    // create mapping profiles
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

    // // upload a marc file for updating already created first instance
    // cy.visit(TopMenu.dataImportPath);
    // DataImport.uploadFile(firstMarcFileNameForUpdate, firstFileNameAfterUpload);
    // JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    // JobProfiles.runImportFile();
    // JobProfiles.waitFileIsImported(firstFileNameAfterUpload);
    // Logs.checkStatusOfJobProfile('Completed');
    // Logs.openFileDetails(firstFileNameAfterUpload);
    // FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.srsMarc);
    // FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
    // FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
    // FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
    // // open Instance in the Inventory
    // FileDetails.openInstanceInInventory('Updated');
    // InstanceRecordView.verifyInstanceStatusTerm('Batch Loaded');
    // InstanceRecordView.verifyStatisticalCode('ARL (Collection stats)');
    // InventoryInstance.viewSource();
    // InventoryViewSource.contains('001\t');
    // InventoryViewSource.contains(firstInstanceHrid);
    // InventoryViewSource.notContains('003\t');
    // InventoryViewSource.contains('035\t');
    // InventoryViewSource.contains('(LTSCA)303845');

    // upload a marc file for updating already created second instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(secondMarcFileNameForUpdate, secondFileNameAfterUpload);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(secondFileNameAfterUpload);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(secondFileNameAfterUpload);
    rowNumbers.forEach(rowNumber => {
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.srsMarc, rowNumber);
      FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance, rowNumber);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable('8', 1);
    FileDetails.checkInstanceQuantityInSummaryTable('8', 1);

    // open Instance in the Inventory
    FileDetails.openInstanceInInventory('Updated');
    InstanceRecordView.verifyInstanceStatusTerm('Batch Loaded');
    InstanceRecordView.verifyStatisticalCode('ARL (Collection stats)');
  });
});
