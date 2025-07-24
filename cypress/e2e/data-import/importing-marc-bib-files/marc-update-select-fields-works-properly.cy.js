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
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
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
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe.skip('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const quantityOfItems = '1';
    // unique file names
    const marcFileForCreate = `C17019 oneMarcBib${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C17019 editedMarcFile${getRandomPostfix()}.mrc`;
    const fileNameForUpdate = `C17019 marcFileForUpdate${getRandomPostfix()}.mrc`;
    // profiles for updating instance
    const instanceMappingProfile = {
      name: `C17019 autotest instance mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };
    const marcBibMappingProfile = {
      name: `C17019 autotest marc bib mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const instanceActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C17019 autotest instance action profile.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const marcBibActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C17019 autotest marc bib action profile.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C17019 autotest match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17019 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Login', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(marcBibActionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(instanceMappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(marcBibMappingProfile.name);
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    // skip until FAT-5907 will be reviewed
    it(
      'C17019 Check that MARC Update select fields works properly (folijet)',
      { tags: ['criticalPathBroken', 'folijet', 'C17019'] },
      () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          'oneMarcBib.mrc',
          marcFileForCreate,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceHrid = response[0].instance.hrid;

          // change Instance HRID in .mrc file
          DataImport.editMarcFile(
            'oneMarcBib.mrc',
            editedMarcFileName,
            ['ocn962073864'],
            [instanceHrid],
          );
        });

        // create field mapping profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
        NewFieldMappingProfile.addStatisticalCode(instanceMappingProfile.statisticalCode, 8);
        NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfile.statusTerm);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfile.name);
        FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        FieldMappingProfiles.createMappingProfileForUpdatesMarc(marcBibMappingProfile);
        FieldMappingProfileView.checkUpdatesSectionOfMappingProfile(marcBibMappingProfile);
        FieldMappingProfileView.checkOverrideProtectedSection(marcBibMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfile.name);

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

        SettingsActionProfiles.create(marcBibActionProfile, marcBibMappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(marcBibActionProfile.name);

        // create match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndTwoActionProfiles(
          matchProfile.profileName,
          marcBibActionProfile.name,
          instanceActionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

        // check updated instance in Inventory
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyStatisticalCode(instanceMappingProfile.statisticalCodeUI);
        InstanceRecordView.verifyInstanceStatusTerm(instanceMappingProfile.instanceStatus);
        InstanceRecordView.viewSource();
      },
    );
  });
});
