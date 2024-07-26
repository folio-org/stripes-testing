import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEdit';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const firstMarcFileName = `C11089 autotestFile${getRandomPostfix()}.mrc`;
    const secondMarcFileName = `C11089 autotestFile${getRandomPostfix()}.mrc`;
    const thirdMarcFileName = `C11089 autotestFile${getRandomPostfix()}.mrc`;
    const forthMarcFileName = `C11089 autotestFile${getRandomPostfix()}.mrc`;

    const filePathToUpload = 'marcBibFileForC11089.mrc';
    const instanceHrids = [];
    const mappingProfile = {
      name: `C11089 autotestMappingProfile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      catalogedDate: '901$a',
    };
    const actionProfile = {
      name: `C11089 autotestActionProfile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const jobProfile = {
      profileName: `C11089 autotestJobProfile_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
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
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.wrap(instanceHrids).each((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C11089 Instance field mapping: Test various field mappings for the "Cataloged date" during Instance creation (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, firstMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(firstMarcFileName);
        Logs.checkJobStatus(firstMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-09-10');
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(firstMarcFileName);
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, 1);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('-');
        });

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillCatalogedDate('###TODAY###');
        FieldMappingProfileEdit.save();

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, secondMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(secondMarcFileName);
        Logs.checkJobStatus(secondMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(secondMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(DateTools.getFormattedDate({ date: new Date() }));
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(secondMarcFileName);
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, 1);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(DateTools.getFormattedDate({ date: new Date() }));
        });

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillCatalogedDate('"2020-06-01"');
        FieldMappingProfileEdit.save();

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, thirdMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(thirdMarcFileName);
        Logs.checkJobStatus(thirdMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(thirdMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-06-01');
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(thirdMarcFileName);
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, 1);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-06-01');
        });

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillCatalogedDate('901$a; else ###TODAY###');
        FieldMappingProfileEdit.save();

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, forthMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(forthMarcFileName);
        Logs.checkJobStatus(forthMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(forthMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-09-10');
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(forthMarcFileName);
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, 1);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(DateTools.getFormattedDate({ date: new Date() }));
        });
      },
    );
  });
});
