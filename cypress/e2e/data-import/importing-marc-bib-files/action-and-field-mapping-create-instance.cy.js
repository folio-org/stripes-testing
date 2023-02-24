import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';



import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';

describe('ui-data-import:', () => {
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
    statisticalCodeUI: 'Book, print (books)'
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

  //   after(() => {
  //     JobProfiles.deleteJobProfile(jobProfileName);
  //     MatchProfiles.deleteMatchProfile(matchProfileName);
  //     ActionProfiles.deleteActionProfile(actionProfileName);
  //     FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  //     cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
  //       .then((instance) => {
  //         InventoryInstance.deleteInstanceViaApi(instance.id);
  //       });
  //     cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHridForReimport}"` })
  //       .then((instance) => {
  //         InventoryInstance.deleteInstanceViaApi(instance.id);
  //       });
  //     // delete downloads folder and created files in fixtures
  //     FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  //     FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
  //     FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
  //   });

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
    NewFieldMappingProfile.addNatureOfContentTerms();
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
    DataImport.uploadFile('***', nameMarcFileForCreate);
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
      });
  });
});
