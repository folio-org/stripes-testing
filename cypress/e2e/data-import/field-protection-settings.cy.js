import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../support/fragments/settingsMenu';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';

describe('ui-data-import: Check that field protection overrides work properly during data import', () => {
  const marcFieldProtected = '920';
  let marcFieldProtectionId = null;

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
  const editedMarcFileName = `C17017 protected920Field.${getRandomPostfix()}.mrc`;

  // profiles for create
  const mappingProfile = { name: mappingProfileName,
    typeValue: NewMappingProfile.folioRecordTypeValue.instance };

  const actionProfile = { name: actionProfileName,
    typeValue : NewActionProfile.folioRecordTypeValue.instance };

  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  // profiles for update
  const mappingProfileUpdate = { name: mappingProfileUpdateName,
    typeValue: NewMappingProfile.folioRecordTypeValue.instance };

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
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: marcFieldProtected
        })
          .then((resp) => {
            marcFieldProtectionId = resp.id;
          });
      });
  });

  afterEach(() => {
    MarcFieldProtection.deleteMarcFieldProtectionViaApi(marcFieldProtectionId);
  });

  const createInstanceMappingProfileForCreate = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createInstanceMappingProfileForUpdate = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewMappingProfile.fillInstanceStatusTerm('"Batch Loaded"');
    NewMappingProfile.addStatisticalCode('"ARL (Collection stats): books - Book, print (books)"');
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
    ActionProfiles.createActionProfile(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile);
    JobProfiles.checkJobProfilePresented(jobProfileName);

    // upload a marc file for creating of the new instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('920protectedField.mrc', nameMarcFileForCreate);
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
    InstanceRecordView.verifyImportedFieldExists(marcFieldProtected);

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(hrId => {
        // change file using order number
        DataImport.editMarcFile('920protectedField.mrc', editedMarcFileName, 'ocn894025734', hrId[0]);
      });

    // create mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfileForUpdate(mappingProfileUpdate);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileUpdate.name);

    // create action profile
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfileUpdate, mappingProfileUpdateName);
    ActionProfiles.checkActionProfilePresented(actionProfileUpdate.name);

    // create match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    cy.visit(SettingsMenu.jobProfilePath);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfileUpdate, actionProfileUpdateName, matchProfileUpdateName);
    JobProfiles.checkJobProfilePresented(jobProfileUpdateName);

    // upload a marc file for updating already created instance
    // cy.visit(TopMenu.dataImportPath);
    // DataImport.uploadFile(filePathForUploadFileUpdate, fileNameForUploadFileUpdate);
    // JobProfiles.searchJobProfileForImport(jobProfileUpdateName);
    // JobProfiles.runImportFile(fileNameForUploadFileUpdate);
    // Logs.checkStatusOfJobProfile('Completed');
    // Logs.openFileDetails(fileNameForUploadFileUpdate);
    // Logs.verifyInstanceStatus(0, 2, 'Created');
    // Logs.verifyInstanceStatus(0, 3, 'Updated');
    // Logs.clickOnHotLink(0, 3, 'Updated');
    // InstanceRecordView.viewSource();

    // InstanceRecordView.verifySrsMarcRecord();
    // InstanceRecordView.verifyImportedFieldExists(marcFieldProtection.field);
  });
});
