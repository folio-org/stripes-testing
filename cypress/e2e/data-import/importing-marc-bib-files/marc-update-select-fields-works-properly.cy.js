import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

describe('ui-data-import', () => {
  const instanceMappingProfileName = `C17019 autotest instance mapping profile.${Helper.getRandomBarcode()}`;
  const marcBibMappingProfileName = `C17019 autotest marc bib mapping profile.${Helper.getRandomBarcode()}`;
  const instanceActionProfileName = `C17019 autotest instance action profile.${Helper.getRandomBarcode()}`;
  const marcBibActionProfileName = `C17019 autotest marc bib action profile.${Helper.getRandomBarcode()}`;
  const matchProfileName = `C17019 autotest match profile.${Helper.getRandomBarcode()}`;
  const jobProfileName = `C17019 autotest job profile.${Helper.getRandomBarcode()}`;

  const instanceMappingProfile = {
    name: instanceMappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
    statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
    instanceStatus: 'Batch Loaded'
  };
  const marcBibMappingProfile = {
    name: marcBibMappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib
  };
  const instanceActionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: instanceActionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const marcBibActionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
    name: marcBibActionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    existingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'MARC_BIBLIOGRAPHIC'
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('login', () => {
    cy.loginAsAdmin({ path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
    cy.getAdminToken();
  });

  it('C17019 Check that MARC Update select fields works properly (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // create field mapping profiles
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewFieldMappingProfile.addStatisticalCode(instanceMappingProfile.statisticalCode, 8);
    NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfile.statusTerm);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileName);

    FieldMappingProfiles.createMappingProfileForUpdatesMarc(marcBibMappingProfile);
    FieldMappingProfiles.closeViewModeForMappingProfile(marcBibMappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfileName);

    // step 4-6

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

    ActionProfiles.create(marcBibActionProfile, marcBibMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(marcBibActionProfile.name);

    // create match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // create job profiles
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkMatchAndTwoActionProfiles(matchProfile.profileName, marcBibActionProfile.name, instanceActionProfile.name);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileName);

    // step 11-13
  });
});
