import SettingsMenu from '../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';

describe('ui-data-import: Check that field protection settings work properly during data import', () => {
  const filePathForUploadFile = 'marcFieldProtection - Create.mrc';
  const filePathForUploadFileUpdate = 'marcFieldProtection - Update.mrc';
  const fileNameForUploadFile = `C347828autotestFile.${getRandomPostfix()}.mrc`;
  const fileNameForUploadFileUpdate = `C347828autotestFile.${getRandomPostfix()}.mrc`;
  const marcFieldProtection = {
    field: '981',
    indicator1: '*',
    indicator2: '*',
    subfield: '*',
    data: '*',
  };
  const mappingProfileName = `autotestMappingProf${getRandomPostfix()}`;
  const mappingProfileUpdateName = `autotestMappingProf${getRandomPostfix()}`;
  const actionProfileName = `autotestActionProf${getRandomPostfix()}`;
  const actionProfileUpdateName = `autotestActionProf${getRandomPostfix()}`;
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const jobProfileUpdateName = `autotestJobProf${getRandomPostfix()}`;
  const matchProfileUpdateName = `autotestMatchProf${getRandomPostfix()}`;
  const mappingProfile = {
    name: mappingProfileName,
    incomingRecordType: 'MARC Bibliographic',
    typeValue: 'Instance',
  };
  const mappingProfileUpdate = {
    name: mappingProfileUpdateName,
    incomingRecordType: 'MARC Bibliographic',
    typeValue: 'Instance',
    catalogedDate: '"2021-12-01"',
    catalogedDateUI: '2021-12-01',
    instanceStatus: '"Batch Loaded"',
    instanceStatusUI: 'Batch Loaded',
  };
  const actionProfile = {
    name: actionProfileName,
    typeValue : NewActionProfile.folioRecordTypeValue.instance,
    action: 'Create (all record types except MARC Authority or MARC Holdings)',
  };
  const actionProfileUpdate = {
    name: actionProfileUpdateName,
    typeValue : NewActionProfile.folioRecordTypeValue.instance,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
  };
  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };
  const jobProfileUpdate = {
    profileName: jobProfileUpdateName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };
  const matchProfile = {
    profileName: matchProfileUpdateName,
    incomingRecordFields: {
      field: '001',
      in1: '',
      in2: '',
      subfield: ''
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: 'Admin data: Instance HRID',
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      cy.createFieldProtection(marcFieldProtection);

      cy.visit(SettingsMenu.dataImportSettingsPath);
    });
  });

  after(() => {
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    JobProfiles.deleteJobProfile(jobProfileUpdateName);
    ActionProfiles.deleteActionProfile(actionProfileUpdateName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileUpdateName);
    MatchProfiles.deleteMatchProfile(matchProfileUpdateName);
  });

  it('C17017 Check that field protection settings work properly during data import (folijet)', () => {
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createMappingProfile(mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile);
    JobProfiles.checkJobProfilePresented(jobProfileName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(filePathForUploadFile, fileNameForUploadFile);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(fileNameForUploadFile);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameForUploadFile);
    Logs.verifyInstanceStatus(0, 2, 'Created');
    Logs.verifyInstanceStatus(0, 3, 'Created');
    Logs.clickOnHotLink(0, 3, 'Created');
    InstanceRecordView.viewSource();
    InstanceRecordView.verifySrsMarcRecord();
    InstanceRecordView.verifyImportedFieldExists(marcFieldProtection.field);

    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfileUpdateName);

    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createMappingProfile(mappingProfileUpdate);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileUpdateName);

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfileUpdate, mappingProfileUpdateName);
    ActionProfiles.checkActionProfilePresented(actionProfileUpdateName);

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfileUpdate, actionProfileUpdateName, matchProfileUpdateName);
    JobProfiles.checkJobProfilePresented(jobProfileUpdateName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(filePathForUploadFileUpdate, fileNameForUploadFileUpdate);
    JobProfiles.searchJobProfileForImport(jobProfileUpdateName);
    JobProfiles.runImportFile(fileNameForUploadFileUpdate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameForUploadFileUpdate);
    Logs.verifyInstanceStatus(0, 2, 'Created');
    Logs.verifyInstanceStatus(0, 3, 'Updated');
    Logs.clickOnHotLink(0, 3, 'Updated');
    InstanceRecordView.viewSource();
    InstanceRecordView.verifySrsMarcRecord();
    InstanceRecordView.verifyImportedFieldExists(marcFieldProtection.field);
  });
});
