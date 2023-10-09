import getRandomPostfix from '../../../support/utils/stringTools';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const quantityOfItems = '1';
    const marcFileForCreate = `C11103 autotestFile.${getRandomPostfix()}.mrc`;
    const mappingProfile = {
      name: `C11103 autotest mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      actionForSuppress: 'Mark for all affected records',
      catalogedDate: '"2021-02-24"',
      catalogedDateUI: '2021-02-24',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
      natureOfContent: 'bibliography',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C11103 autotest action profile.${getRandomPostfix()}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };
    const jobProfile = {
      profileName: `C11103 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.getAdminToken();
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C11103 Action and field mapping: Create an instance (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // create mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addStaffSuppress(mappingProfile.actionForSuppress);
        NewFieldMappingProfile.addSuppressFromDiscovery(mappingProfile.actionForSuppress);
        NewFieldMappingProfile.addPreviouslyHeld(mappingProfile.actionForSuppress);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
        NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
        NewFieldMappingProfile.addNatureOfContentTerms(mappingProfile.natureOfContent);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName(actionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', marcFileForCreate);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
          InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
          InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
          InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          InstanceRecordView.verifyNatureOfContent(mappingProfile.natureOfContent);
        });
      },
    );
  });
});
