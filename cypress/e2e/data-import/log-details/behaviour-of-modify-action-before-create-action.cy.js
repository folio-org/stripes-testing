import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
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
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceHRID;
    const filePathToUpload = 'marcAuthFileC446171.mrc';
    const fileName = `C446171 autotestFile${getRandomPostfix()}.mrc`;
    const mappingProfileFieldsForModify = {
      name: `C446171 Modify before create action${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      modifications: {
        action: 'Add',
        field: '500',
        ind1: '',
        ind2: '',
        subfield: 'a',
        data: `test modify.${getRandomPostfix()}`,
      },
    };
    const instanceMappingProfile = {
      name: `C446171 Create instance after modify${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      adminNotes: `test note${getRandomPostfix()}`,
    };
    const actionProfileForModify = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C446171 Modify before create action${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.MODIFY,
    };
    const instanceActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C446171 Create instance after modify${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C446171 Modify first create second profile${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileForModify.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          mappingProfileFieldsForModify.name,
        );
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(instanceMappingProfile.name);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (initialInstance) => {
            InventoryInstance.deleteInstanceViaApi(initialInstance.id);
          },
        );
      });
    });

    it(
      'C446171 Verify the behaviour of modify action before create action (folijet)',
      { tags: ['criticalPath', 'folijet', 'C446171'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileFieldsForModify);
        NewFieldMappingProfile.addFieldMappingsForMarc();
        NewFieldMappingProfile.fillModificationSectionWithAdd(
          mappingProfileFieldsForModify.modifications,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfileFieldsForModify.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileFieldsForModify.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
        NewFieldMappingProfile.addAdministrativeNote(instanceMappingProfile.adminNotes, 9);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfileForModify, mappingProfileFieldsForModify.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfileForModify.name);
        SettingsActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfileForModify);
        NewJobProfile.linkActionProfile(instanceActionProfile);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((column) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, column);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);

        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
        InstanceRecordView.verifyInstanceIsOpened('Herpetological conservation and biology.');
        InstanceRecordView.verifyInstanceAdministrativeNote(instanceMappingProfile.adminNotes);
        InstanceRecordView.verifyInstanceNote(mappingProfileFieldsForModify.modifications.data);
      },
    );
  });
});
