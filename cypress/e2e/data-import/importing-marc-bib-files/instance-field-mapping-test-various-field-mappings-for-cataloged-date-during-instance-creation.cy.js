import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
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
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
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
    const title = "101 things I wish I'd known when I started using hypnosis";
    const mappingProfile = {
      name: `C11089 autotestMappingProfile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      catalogedDate: '901$a',
      catalogedDateUI: '-',
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
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C11089 Instance field mapping: Test various field mappings for the "Cataloged date" during Instance creation (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
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
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(firstMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstMarcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          const instanceHrid = hrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);

          // delete created Instance
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
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
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(secondMarcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          const instanceHrid = hrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(DateTools.getFormattedDate({ date: new Date() }));

          // delete created Instance
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
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
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(thirdMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(thirdMarcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          const instanceHrid = hrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate('2020-06-01');

          // delete created Instance
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
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
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(forthMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(forthMarcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          const instanceHrid = hrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(DateTools.getFormattedDate({ date: new Date() }));

          // delete created Instance
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      },
    );
  });
});
