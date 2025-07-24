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
  describe('Importing MARC Bib files', () => {
    let user = null;
    let instanceHrId;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    // unique file names
    const marcFileNameForCreate = `C358998 createAutotestFile${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C358998 updateAutotestFile${getRandomPostfix()}.mrc`;
    const fileNameAfterUpload = `C358998 fileNameAfterUpload${getRandomPostfix()}.mrc`;

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
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.instanceUuid,
    };

    const jobProfile = {
      profileName: `C358998 Update instance via 999$i match and check 001, 003, 035 ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
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

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdate}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrId}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      "C358998 Data Import Updates should add 035 field from 001/003, if it's HRID already exists",
      { tags: ['criticalPath', 'folijet', 'C358998'] },
      () => {
        DataImport.verifyUploadState();
        // upload the first .mrc file
        DataImport.uploadFile('marcBibFileForC358998_1.mrc', marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForCreate);
        Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrId = initialInstanceHrId;

          InstanceRecordView.viewSource();
          // changing the first file
          InventoryViewSource.extructDataFrom999Field().then((uuid) => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcBibFileForC358998_2.mrc',
              marcFileNameForUpdate,
              ['instanceUuid', 'srsUuid', '303845'],
              [uuid[0], uuid[1], instanceHrId],
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

          // upload a marc file for updating already created first instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFileNameForUpdate, fileNameAfterUpload);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(fileNameAfterUpload);
          Logs.checkJobStatus(fileNameAfterUpload, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileNameAfterUpload);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
          FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
          // open the first Instance in the Inventory and check 001, 003, 035 fields
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          InstanceRecordView.viewSource();
          InventoryViewSource.contains('001\t');
          InventoryViewSource.contains(instanceHrId);
          InventoryViewSource.notContains('003\t');
          InventoryViewSource.contains('035\t');
          InventoryViewSource.contains('(LTSCA)303845');
        });
      },
    );
  });
});
