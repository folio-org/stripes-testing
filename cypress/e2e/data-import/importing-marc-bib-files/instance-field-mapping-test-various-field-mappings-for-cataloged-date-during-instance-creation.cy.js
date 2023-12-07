import getRandomPostfix from '../../../support/utils/stringTools';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import DateTools from '../../../support/utils/dateTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const firstMarcFileName = `C11089 autotestFile_${getRandomPostfix()}.mrc`;
    const secondMarcFileName = `C11089 autotestFile_${getRandomPostfix()}.mrc`;
    const thirdMarcFileName = `C11089 autotestFile_${getRandomPostfix()}.mrc`;
    const forthMarcFileName = `C11089 autotestFile_${getRandomPostfix()}.mrc`;

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

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, firstMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(firstMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-09-10');
          cy.go('back');
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory('Created', 1);
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, secondMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(secondMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(DateTools.getFormattedDate({ date: new Date() }));
          cy.go('back');
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory('Created', 1);
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, thirdMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(thirdMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(thirdMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-06-01');
          cy.go('back');
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory('Created', 1);
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, forthMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(forthMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(forthMarcFileName);
        // check the first instance with Cataloged date
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-09-10');
          cy.go('back');
        });
        // check the second instance without Cataloged date
        FileDetails.openInstanceInInventory('Created', 1);
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
