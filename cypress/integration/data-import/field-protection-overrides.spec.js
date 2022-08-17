import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import SettingsMenu from '../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import MappingProfileDetails from '../../support/fragments/data_import/mapping_profiles/mappingProfileDetails';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';

describe('ui-data-import: Check that field protection overrides work properly during data import', () => {
  // unique name for profiles
  const mappingProfileName = `C17018autoTestMappingProf.${getRandomPostfix()}`;
  const mappingProfileName2 = `C17018autoTestMappingProf.${getRandomPostfix()}`;
  const actionProfileName = `C17018autoTestActionProfile_${getRandomPostfix()}`;
  const actionProfileName2 = `C17018autoTestActionProfile_${getRandomPostfix()}`;
  const matchProfileName = `C17018autoTestMatchProfile_${getRandomPostfix()}`;
  const jobProfileName = `C17018autoTestJobProfile_${getRandomPostfix()}`;

  // unique file name to upload
  const fileName = `C17018autotestFile.${getRandomPostfix()}.mrc`;

  const protectedFields = {
    firstField: '020',
    secondField: '035'
  };

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.firstField
        });
        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField
        });
      });

    cy.loginAsAdmin();
  });

  afterEach(() => {

  });

  it('C17018 Check that field protection overrides work properly during data import (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // create Field mapping profile
    const mappingProfile = {
      name: mappingProfileName,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance
    };

    const anotherMappingProfile = {
      name: mappingProfileName2,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib,

    };

    const actionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.instance,
      name: actionProfileName,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const anotherActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
      name: actionProfileName2,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const matchProfile = { profileName: matchProfileName,
      incomingRecordFields: {
        field: '001'
      },
      existingRecordFields: {
        field: '001'
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: 'MARC_BIBLIOGRAPHIC' };

    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    // create Field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createMappingProfile(mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

    FieldMappingProfiles.createMappingProfileForUpdatesMarc(anotherMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(anotherMappingProfile.name);
    MappingProfileDetails.checkCreatedMappingProfile(protectedFields.firstField, protectedFields.secondField);

    MappingProfileDetails.editMappingProfile();
    MappingProfileDetails.markFieldForProtection(anotherMappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(anotherMappingProfile.name);
    MappingProfileDetails.checkCreatedMappingProfile(protectedFields.firstField, protectedFields.secondField);

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfile, mappingProfile.name);
    ActionProfiles.checkActionProfilePresented(actionProfile.name);

    ActionProfiles.createActionProfile(anotherActionProfile, anotherMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(anotherActionProfile.name);

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // create Job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkMatchAndTwoActionProfiles(matchProfile.profileName, actionProfile.name, anotherActionProfile.name);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfile.profileName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', fileName);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(fileName);

    FileDetails.openInstanceInInventory();
  });
});

