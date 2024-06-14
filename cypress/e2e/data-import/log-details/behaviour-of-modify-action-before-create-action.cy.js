import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
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
      { tags: ['criticalPath', 'folijet'] },
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

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfileForModify, mappingProfileFieldsForModify.name);
        ActionProfiles.checkActionProfilePresented(actionProfileForModify.name);
        ActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
        ActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfileForModify);
        NewJobProfile.linkActionProfile(instanceActionProfile);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
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
        InstanceRecordView.verifyIsInstanceOpened('Herpetological conservation and biology.');
        InstanceRecordView.verifyInstanceAdministrativeNote(instanceMappingProfile.adminNotes);
        InstanceRecordView.verifyInstanceNote(mappingProfileFieldsForModify.modifications.data);
      },
    );
  });
});
