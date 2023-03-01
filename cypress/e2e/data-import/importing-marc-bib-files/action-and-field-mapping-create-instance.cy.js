import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import', () => {
  let instanceHrid;
  const quantityOfItems = '1';
  const nameMarcFileForCreate = `C11103 autotestFile.${getRandomPostfix()}.mrc`;
  const mappingProfileName = `C11103 autotest mapping profile.${getRandomPostfix()}.mrc`;
  const actionProfileName = `C11103 autotest action profile.${getRandomPostfix()}.mrc`;
  const jobProfileName = `C11103 autotest job profile.${getRandomPostfix()}.mrc`;

  const mappingProfile = {
    name: mappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
    actionForSuppress: 'Mark for all affected records',
    catalogedDate: '"2021-02-24"',
    catalogedDateUI: '2021-02-24',
    instanceStatus: 'Batch Loaded',
    statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
    statisticalCodeUI: 'Book, print (books)',
    natureOfContent: 'bibliography'
  };

  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Create (all record types except MARC Authority or MARC Holdings)'
  };

  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before(() => {
    cy.loginAsAdmin({ path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
    cy.getAdminToken();
  });

  after(() => {
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C11103 Action and field mapping: Create an instance (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
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
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create action profile
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(actionProfile, mappingProfile.name);
    ActionProfiles.checkActionProfilePresented(actionProfile.name);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkActionProfileByName(actionProfileName);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileName);

    // upload a marc file for creating of the new instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameMarcFileForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(nameMarcFileForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
    ].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
    FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[0];

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
        InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
        InstanceRecordView.verifyNatureOfContent(mappingProfile.natureOfContent);
      });
  });
});
