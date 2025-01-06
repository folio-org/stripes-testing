import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  // JOB_STATUS_NAMES,
  // RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
// import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
// import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
// import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
// import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
// import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
// import {
//   ActionProfiles as SettingsActionProfiles,
//   FieldMappingProfiles as SettingsFieldMappingProfiles,
//   JobProfiles as SettingsJobProfiles,
//   MatchProfiles as SettingsMatchProfiles,
// } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
// import Users from '../../../support/fragments/users/users';
// import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      filePathForCreate: 'marcBibFileForC476724.mrc',
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      fileNameForCreate: `C476724 marcFileName${getRandomPostfix()}.mrc`,
      exportedFileName: '',
      // filePathForUpdate: 'marcBibFileForC415266.mrc',
      // editedFileName: `C415266 marcFileName${getRandomPostfix()}.mrc`,
      // fileNameForUpdate: `C415266 marcFileName${getRandomPostfix()}.mrc`,
      // tag005: '005',
      // todayDate: moment(new Date()).format('YYYYMMDD'),
    };
    const mappingProfile = {
      name: `C476724 Update Instance with Instance stat code${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C476724 Update Instance with Instance stat code${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C476724 010$z-to-Instance match${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        subfield: 'z',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.identifierCanceledLCCN,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C476724 010$z to Instance match for update Instance${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        DataImport.uploadFileViaApi(
          testData.filePathForCreate,
          testData.fileNameForCreate,
          testData.jobProfileToRun,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    // after('Delete test data', () => {
    //   // delete created files
    //   FileManager.deleteFile(`cypress/fixtures/${testData.editedFileName}`);
    //   cy.getAdminToken().then(() => {
    //     SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
    //     SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
    //     SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
    //     SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    //     Users.deleteViaApi(testData.user.userId);
    //     cy.getInstance({
    //       limit: 1,
    //       expandAll: true,
    //       query: `"hrid"=="${testData.instanceHrid}"`,
    //     }).then((instance) => {
    //       InventoryInstance.deleteInstanceViaApi(instance.id);
    //     });
    //   });
    // });

    it(
      'C476724 Update of file using marc-to-instance match by 010$z (folijet)',
      { tags: ['criticalPath', 'folijet', 'C476724'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.exportInstanceMarc();
        cy.intercept('/data-export/quick-export').as('getHrid');
        // cy.wait('@getHrid', getLongDelay()).then((req) => {
        // const expectedRecordHrid = req.response.body.jobExecutionHrId;

        // download exported marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        // ExportFile.downloadExportedMarcFileWithRecordHrid(expectedRecordHrid, exportedFileName);
        FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
        // });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        // DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
        // JobProfiles.waitFileIsUploaded();
        // JobProfiles.search(jobProfileUpdate.profileName);
        // JobProfiles.runImportFile();
        // Logs.waitFileIsImported(fileNameForUpdate);
        // Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        // Logs.openFileDetails(fileNameForUpdate);
      },
    );
  });
});
