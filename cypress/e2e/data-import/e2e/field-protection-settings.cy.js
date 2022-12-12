import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import: Check that field protection settings work properly during data import', () => {
  const marcFieldProtected = ['507', '920'];
  const marcFieldProtectionId = [];
  let instanceHrid = null;

  // data from .mrc file
  const dataFromField001 = 'ocn894025734';
  const dataForField500 = 'Repeatable unprotected field';
  const dataForField507 = 'Non-repeatable protected field';
  const dataForField920 = 'This field should be protected';

  // data for changing .mrc file
  const updateDataForField500 = 'Repeatable unprotected field Updated';
  const updateDataForField507 = 'Non-repeatable protected field Updated';
  const updateDataForField920 = 'The previous 920 should be retained, since it is protected and repeatable, and this new 920 added.';

  // unique profile names
  const mappingProfileName = `C17017 autotest MappingProf${getRandomPostfix()}`;
  const mappingProfileUpdateName = `C17017 autotest update MappingProf${getRandomPostfix()}`;
  const actionProfileName = `C17017 autotest ActionProf${getRandomPostfix()}`;
  const actionProfileUpdateName = `C17017 autotest update ActionProf${getRandomPostfix()}`;
  const jobProfileName = `C17017 autotest JobProf${getRandomPostfix()}`;
  const jobProfileUpdateName = `C17017 autotest update JobProf${getRandomPostfix()}`;
  const matchProfileUpdateName = `C17017 autotest MatchProf${getRandomPostfix()}`;

  // unique file names
  const nameMarcFileForCreate = `C17017 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C17017 protectedFields.${getRandomPostfix()}.mrc`;
  const fileNameForUpdate = `C17017 updatedProtectedFields.${getRandomPostfix()}.mrc`;

  // profiles for create
  const mappingProfile = { name: mappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance };

  const actionProfile = { name: actionProfileName,
    typeValue : NewActionProfile.folioRecordTypeValue.instance };

  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  // profiles for update
  const mappingProfileUpdate = { name: mappingProfileUpdateName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance };

  const actionProfileUpdate = {
    name: actionProfileUpdateName,
    typeValue : NewActionProfile.folioRecordTypeValue.instance,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
  };

  const matchProfile = {
    profileName: matchProfileUpdateName,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };

  const jobProfileUpdate = {
    profileName: jobProfileUpdateName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        marcFieldProtected.forEach(field => {
          MarcFieldProtection.createMarcFieldProtectionViaApi({
            indicator1: '*',
            indicator2: '*',
            subfield: '*',
            data: '*',
            source: 'USER',
            field
          })
            .then((resp) => {
              const id = resp.id;
              marcFieldProtectionId.push = id;
            });
        });
      });
  });

  afterEach(() => {
    marcFieldProtectionId.forEach(field => MarcFieldProtection.deleteMarcFieldProtectionViaApi(field));
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    JobProfiles.deleteJobProfile(jobProfileUpdateName);
    MatchProfiles.deleteMatchProfile(matchProfileUpdateName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    ActionProfiles.deleteActionProfile(actionProfileUpdateName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileUpdateName);
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${fileNameForUpdate}`);
  });

  const createInstanceMappingProfileForCreate = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createInstanceMappingProfileForUpdate = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewFieldMappingProfile.fillInstanceStatusTerm('"Batch Loaded"');
    NewFieldMappingProfile.addStatisticalCode('"ARL (Collection stats): books - Book, print (books)"', 8);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  it('C17017 Check that field protection settings work properly during data import (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // create mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfileForCreate(mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

    // create action profile
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile.name);
    JobProfiles.checkJobProfilePresented(jobProfileName);

    // upload a marc file for creating of the new instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFileForC17017.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(nameMarcFileForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(nameMarcFileForCreate);
    Logs.verifyInstanceStatus(0, 2, 'Created');
    Logs.verifyInstanceStatus(0, 3, 'Created');
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkInstanceQuantityInSummaryTable('1');
    Logs.clickOnHotLink(0, 3, 'Created');
    InstanceRecordView.viewSource();
    InstanceRecordView.verifySrsMarcRecord();
    InventoryViewSource.verifyFieldInMARCBibSource('500', dataForField500);
    InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[0], dataForField507);
    InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[1], dataForField920);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[0];
        // change file using order number
        DataImport.editMarcFile(
          'marcFileForC17017.mrc',
          editedMarcFileName,
          [dataFromField001, dataForField500, dataForField507, dataForField920],
          [instanceHrid, updateDataForField500, updateDataForField507, updateDataForField920]
        );
      });

    // create mapping profile for update
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfileForUpdate(mappingProfileUpdate);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileUpdate.name);

    // create action profile for update
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(actionProfileUpdate, mappingProfileUpdateName);
    ActionProfiles.checkActionProfilePresented(actionProfileUpdate.name);

    // create match profile for update
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);

    // create job profile for update
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfileUpdate, actionProfileUpdateName, matchProfileUpdateName);
    JobProfiles.checkJobProfilePresented(jobProfileUpdateName);

    // upload a marc file for updating already created instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
    JobProfiles.searchJobProfileForImport(jobProfileUpdateName);
    JobProfiles.runImportFile(fileNameForUpdate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameForUpdate);
    Logs.verifyInstanceStatus(0, 2, 'Created');
    Logs.verifyInstanceStatus(0, 3, 'Updated');
    Logs.clickOnHotLink(0, 3, 'Updated');
    InstanceRecordView.viewSource();

    InstanceRecordView.verifySrsMarcRecord();
    InventoryViewSource.verifyFieldInMARCBibSource('500', dataForField500);
    InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[0], dataForField507);
    InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[1], dataForField920);
    InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[1], updateDataForField920);
  });
});
