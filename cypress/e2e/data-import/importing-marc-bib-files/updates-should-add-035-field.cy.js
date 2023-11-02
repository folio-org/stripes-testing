import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
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
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    // unique file names
    const firstMarcFileNameForCreate = `C358998 firstCreateAutotestFile.${getRandomPostfix()}.mrc`;
    const firstMarcFileNameForUpdate = `C358998 firstUpdateAutotestFile.${getRandomPostfix()}.mrc`;
    const firstFileNameAfterUpload = `C358998 firstFileNameAfterUpload.${getRandomPostfix()}.mrc`;
    const secondMarcFileNameForCreate = `C358998 secondCreateAutotestFile.${getRandomPostfix()}.mrc`;
    const secondMarcFileNameForUpdate = `C358998 secondUpdateAutotestFile.${getRandomPostfix()}.mrc`;
    const secondFileNameAfterUpload = `C358998 secondFileNameAfterUpload.${getRandomPostfix()}.mrc`;

    const mappingProfile = {
      name: `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };

    const matchProfile = {
      profileName: `C358998 Match 999$i to Instance UUID ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 'i',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.instanceUuid,
    };

    const jobProfile = {
      profileName: `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    beforeEach('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.remoteStorageView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    it(
      'C358998 Data Import Updates should add 035 field from 001/003, if HRID already exists (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        // upload the first .mrc file
        DataImport.uploadFile('marcFileForC358998ForCreate_1.mrc', firstMarcFileNameForCreate);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(firstMarcFileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstMarcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrId = initialInstanceHrId;

          InstanceRecordView.viewSource();
          // changing the first file
          InventoryViewSource.extructDataFrom999Field().then((uuid) => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC358998ForUpdate_1.mrc',
              firstMarcFileNameForUpdate,
              ['srsUuid', 'instanceUuid', '303845'],
              [uuid[0], uuid[1], instanceHrId],
            );
          });
          // create mapping profile
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.instanceStatusTerm);
          NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
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
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload a marc file for updating already created first instance
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile(firstMarcFileNameForUpdate, firstFileNameAfterUpload);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(firstFileNameAfterUpload);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(firstFileNameAfterUpload);
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
          FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
          // open the first Instance in the Inventory and check 001, 003, 035 fields
          FileDetails.openInstanceInInventory('Updated');
          InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          InstanceRecordView.viewSource();
          InventoryViewSource.contains('001\t');
          InventoryViewSource.contains(instanceHrId);
          InventoryViewSource.notContains('003\t');
          InventoryViewSource.contains('035\t');
          InventoryViewSource.contains('(LTSCA)303845');

          JobProfiles.deleteJobProfile(jobProfile.profileName);
          MatchProfiles.deleteMatchProfile(matchProfile.profileName);
          ActionProfiles.deleteActionProfile(actionProfile.name);
          FieldMappingProfileView.deleteViaApi(mappingProfile.name);
          Users.deleteViaApi(user.userId);
          // delete downloads folder and created files in fixtures
          FileManager.deleteFile(`cypress/fixtures/${firstMarcFileNameForUpdate}`);
          FileManager.deleteFile(`cypress/fixtures/${secondMarcFileNameForUpdate}`);
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrId}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      },
    );

    it(
      'C358998 Data Import Updates should add 035 field from 001/003, if it is not HRID (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        const itemQuantity = '8';
        const arrayOf999Fields = [];
        const fieldsContent = [
          { rowNumber: 0, content: '(LTSCA)303845' },
          { rowNumber: 1, content: '(LTSCA)2300089' },
          { rowNumber: 2, content: '(NhCcYBP)yb1104243' },
          { rowNumber: 3, content: '289717' },
          { rowNumber: 4, content: '(OCoLC)1144093654' },
          { rowNumber: 5, content: '(OCoLC)1201684651' },
          { rowNumber: 6, content: '(OCoLC)1195818788' },
          { rowNumber: 7, content: '(OCoLC)ocn991553174' },
        ];

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile('marcFileForC358998ForCreate_2.mrc', secondMarcFileNameForCreate);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondMarcFileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(secondMarcFileNameForCreate);
        cy.wrap(fieldsContent).each((row) => {
          cy.wait(8000);
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.srsMarc,
            row.rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.instance,
            row.rowNumber,
          );
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(itemQuantity);
        FileDetails.checkInstanceQuantityInSummaryTable(itemQuantity);
        cy.wrap(fieldsContent)
          .each((row) => {
            // need to wait until page will be opened in loop
            cy.wait(8000);
            cy.visit(TopMenu.dataImportPath);
            DataImport.waitLoading();
            Logs.openFileDetails(secondMarcFileNameForCreate);
            FileDetails.openInstanceInInventory('Created', row.rowNumber);
            cy.wait(8000);
            InventoryInstance.viewSource();
            // changing the second file
            InventoryViewSource.extructDataFrom999Field().then((uuid) => {
              arrayOf999Fields.push(uuid[0], uuid[1]);
            });
          })
          .then(() => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC358998ForUpdate_2.mrc',
              secondMarcFileNameForUpdate,
              [
                'firstSrsUuid',
                'firstInstanceUuid',
                'secondSrsUuid',
                'secondInstanceUuid',
                'thirdSrsUuid',
                'thirdInstanceUuid',
                'forthSrsUuid',
                'forthInstanceUuid',
                'fifthSrsUuid',
                'fifthInstanceUuid',
                'sixthSrsUuid',
                'sixthInstanceUuid',
                'seventhSrsUuid',
                'seventhInstanceUuid',
                'eighthSrsUuid',
                'eighthInstanceUuid',
              ],
              [...arrayOf999Fields],
            );
          });

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.instanceStatusTerm);
        NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
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
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created instances
        cy.visit(TopMenu.dataImportPath);
        DataImport.waitLoading();
        DataImport.uploadFile(secondMarcFileNameForUpdate, secondFileNameAfterUpload);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondFileNameAfterUpload);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(secondFileNameAfterUpload);
        cy.wrap(fieldsContent).each((row) => {
          cy.wait(8000);
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.srsMarc,
            row.rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.instance,
            row.rowNumber,
          );
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(itemQuantity, 1);
        FileDetails.checkInstanceQuantityInSummaryTable(itemQuantity, 1);

        // open the instances in the Inventory and check 001, 003, 035 fields
        cy.wrap(fieldsContent).each((element) => {
          // need to wait until page will be opened in loop
          cy.wait(8000);
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(secondFileNameAfterUpload);
          FileDetails.openInstanceInInventory('Updated', element.rowNumber);
          cy.wait(8000);
          InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            const instanceHrid = initialInstanceHrId;

            InstanceRecordView.viewSource();
            InventoryViewSource.contains('001\t');
            InventoryViewSource.contains(instanceHrid);
            InventoryViewSource.notContains('003\t');
            InventoryViewSource.contains('035\t');
            InventoryViewSource.contains(element.content);
          });
          cy.wait(8000);
        });

        JobProfiles.deleteJobProfile(jobProfile.profileName);
        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
        // delete downloads folder and created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${firstMarcFileNameForUpdate}`);
        FileManager.deleteFile(`cypress/fixtures/${secondMarcFileNameForUpdate}`);
      },
    );
  });
});
