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
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
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
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
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
  describe('Settings', () => {
    let user;
    let instanceHrid = null;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const quantityOfItems = '1';
    // unique file names
    const nameMarcFileForCreate = `C356830 autotestFile${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C356830 marcFileForMatch${getRandomPostfix()}.mrc`;
    const firstProtectedFieldsData = {
      indicator1: '*',
      indicator2: '*',
      subfield: '5',
      data: 'amb',
      source: 'USER',
      field: '*',
    };
    const secondProtectedFieldData = {
      indicator1: '*',
      indicator2: '*',
      subfield: '*',
      data: '*',
      source: 'USER',
      field: '920',
    };
    const matchProfile = {
      profileName: `C356830 001 to Instance HRID ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const mappingProfile = {
      name: `C356830 Update instance and check field protections ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      catalogedDate: '###TODAY###',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C356830 Update instance and check field protections ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const jobProfile = {
      profileName: `C356830 Update instance and check field protections ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        Users.deleteViaApi(user.userId);
        MarcFieldProtection.getListViaApi({
          query: `"data"=="${firstProtectedFieldsData.data}"`,
        }).then((field) => {
          MarcFieldProtection.deleteViaApi(field[0].id);
        });
        MarcFieldProtection.getListViaApi({
          query: `"field"=="${secondProtectedFieldData.field}"`,
        }).then((field) => {
          MarcFieldProtection.deleteViaApi(field[0].id);
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C356830 Test field protections when importing to update instance, after editing the MARC Bib outside of FOLIO (folijet)',
      { tags: ['criticalPath', 'folijet', 'C356830'] },
      () => {
        MarcFieldProtection.createViaApi(firstProtectedFieldsData);
        MarcFieldProtection.createViaApi(secondProtectedFieldData);

        // create mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndActionProfiles(matchProfile.profileName, actionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC356830.mrc', nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForCreate);
        Logs.openFileDetails(nameMarcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 0);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 0);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);

        // in cypress we can't delete fields in the file that's why using already created file
        // need to get instance hrid and uuids for 999 field for changing file
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InstanceRecordView.viewSource();
          InventoryViewSource.extructDataFrom999Field().then((uuid) => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC356830_rev.mrc',
              editedMarcFileName,
              ['instanceHrid', 'instanceUuid', 'srsUuid'],
              [instanceHrid, uuid[0], uuid[1]],
            );
          });
        });

        // upload .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedMarcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        cy.wait(1500);
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '650\t',
          'Drawing, Dutch $y 21st century $v Exhibitions. $5 amb',
        );
        InventoryViewSource.verifyFieldInMARCBibSource('920\t', 'This field should be protected');
      },
    );
  });
});
