import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
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
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'Importing MARC Bib files',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user = null;
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
      // unique file names
      const marcFileNameForCreate = `C543840 createAutotestFile${getRandomPostfix()}.mrc`;
      const marcFileNameForUpdate = `C543840 updateAutotestFile${getRandomPostfix()}.mrc`;
      const fileNameAfterUpload = `C543840 fileNameAfterUpload${getRandomPostfix()}.mrc`;
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
        { rowNumber: 7, content: '(OCoLC)991553174' },
      ];

      const mappingProfile = {
        name: `C543840 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
        statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)',
      };

      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C543840 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };

      const matchProfile = {
        profileName: `C543840 Match 999$i to Instance UUID ${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '999',
          in1: 'f',
          in2: 'f',
          subfield: 'i',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        existingRecordOption: NewMatchProfile.optionsList.instanceUuid,
      };

      const jobProfile = {
        profileName: `C543840 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      beforeEach('Create test user', () => {
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

      afterEach('Delete user', () => {
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdate}`);
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        });
      });

      it(
        "C543840 Data Import Updates should add 035 field from 001/003, if it's not HRID (folijet)",
        { tags: ['criticalPath', 'folijet', 'C543840'] },
        () => {
          // upload .mrc file
          DataImport.uploadFile('marcBibFileForC543840_1.mrc', marcFileNameForCreate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFileNameForCreate);
          Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFileNameForCreate);
          cy.wrap(fieldsContent).each((row) => {
            cy.wait(1000);
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.CREATED,
              FileDetails.columnNameInResultList.srsMarc,
              row.rowNumber,
            );
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.CREATED,
              FileDetails.columnNameInResultList.instance,
              row.rowNumber,
            );
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable(itemQuantity);
          FileDetails.checkInstanceQuantityInSummaryTable(itemQuantity);

          cy.wrap(fieldsContent)
            .each((row) => {
              FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, row.rowNumber);
              cy.wait(8000);
              InventoryInstance.viewSource();
              // changing the second file
              InventoryViewSource.extructDataFrom999Field().then((uuid) => {
                arrayOf999Fields.push(uuid[0], uuid[1]);
              });
              // need to wait until page will be opened in loop
              cy.wait(8000);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
              FileDetails.close();
              DataImport.waitLoading();
              Logs.openFileDetails(marcFileNameForCreate);
            })
            .then(() => {
              // change file using uuid for 999 field
              DataImport.editMarcFile(
                'marcBibFileForC543840_2.mrc',
                marcFileNameForUpdate,
                [
                  'firstInstanceUuid',
                  'firstSrsUuid',
                  'secondInstanceUuid',
                  'secondSrsUuid',
                  'thirdInstanceUuid',
                  'thirdSrsUuid',
                  'forthInstanceUuid',
                  'forthSrsUuid',
                  'fifthInstanceUuid',
                  'fifthSrsUuid',
                  'sixthInstanceUuid',
                  'sixthSrsUuid',
                  'seventhInstanceUuid',
                  'seventhSrsUuid',
                  'eighthInstanceUuid',
                  'eighthSrsUuid',
                ],
                [...arrayOf999Fields],
              );
            });

          // create mapping profile
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.instanceStatusTerm);
          NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          // create action profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          // create match profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

          // create job profile for update
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload a marc file for updating already created instances
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.waitLoading();
          DataImport.uploadFile(marcFileNameForUpdate, fileNameAfterUpload);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(fileNameAfterUpload);
          Logs.checkJobStatus(fileNameAfterUpload, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileNameAfterUpload);
          cy.wrap(fieldsContent).each((row) => {
            cy.wait(1000);
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.UPDATED,
              FileDetails.columnNameInResultList.srsMarc,
              row.rowNumber,
            );
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.UPDATED,
              FileDetails.columnNameInResultList.instance,
              row.rowNumber,
            );
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable(itemQuantity, 1);
          FileDetails.checkInstanceQuantityInSummaryTable(itemQuantity, 1);

          // open the instances in the Inventory and check 001, 003, 035 fields
          cy.wrap(fieldsContent).each((element) => {
            FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED, element.rowNumber);
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
              // need to wait until page will be opened in loop
              cy.wait(8000);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
              FileDetails.close();
              Logs.openFileDetails(fileNameAfterUpload);
            });
          });
        },
      );
    },
  );
});
