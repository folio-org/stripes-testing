import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('ui-data-import: Match on location', () => {
  // unique name for profiles
  const instanceHridMatchProfileName = `C17027 match profile Instance HRID or UUID.${getRandomPostfix()}`;
  const holdingsPermLocationMatchProfileName = `C17027 match profile Holdings Permanent location.${getRandomPostfix()}`;
  const itemPermLocationMatchProfileName = `C17027 match profile Item Permanent location.${getRandomPostfix()}`;
  const holdingsMappingProfile = `C17027 mapping profile update holdings.${getRandomPostfix()}`;
  const itemMappingProfile = `C17027 mapping profile update item.${getRandomPostfix()}`;
  const holdingsActionProfile = `C17027 action profile update holdings.${getRandomPostfix()}`;
  const itemActionProfile = `C17027 action profile update item.${getRandomPostfix()}`;
  const jobProfile = `C17027 job profile.${getRandomPostfix()}`;

  // notes for mapping profiles
  const noteForHoldingsMappingProfile = '"This note for holdings mapping profile"';
  const noteForItemMappingProfile = '"This note for item mapping profile"';

  const collectionOfMatchProfiles = [
    {
      matchProfile: { profileName: instanceHridMatchProfileName,
        incomingRecordFields: {
          field: '980',
          subfield: 'd'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'INSTANCE',
        holdingsOption: NewMatchProfile.optionsList.instanceHrid }
    },
    {
      matchProfile: { profileName: holdingsPermLocationMatchProfileName,
        incomingRecordFields: {
          field: '980',
          subfield: 'd'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.holdingsPermLoc }
    },
    {
      matchProfile: { profileName: itemPermLocationMatchProfileName,
        incomingRecordFields: {
          field: '980',
          subfield: 'd'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        holdingsOption: NewMatchProfile.optionsList.itemPermLoc }
    },
  ];

  const holdingsUpdateMappingProfile = {
    name: holdingsMappingProfile,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings
  };

  const itemUpdateMappingProfile = {
    name: itemMappingProfile,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.item
  };

  const holdingsUpdatesActionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.holdings,
    name: holdingsActionProfile,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };

  const itemUpdatesActionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.item,
    name: itemActionProfile,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };

  const updateJobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfile,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  after(() => {

  });


  it('C17027 Match on location (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create Field mapping profiles
    FieldMappingProfiles.createMappingProfileWithNotes(holdingsUpdateMappingProfile, noteForHoldingsMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(holdingsUpdateMappingProfile.name);

    FieldMappingProfiles.createMappingProfileWithNotes(itemUpdateMappingProfile, noteForItemMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(itemUpdateMappingProfile.name);

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(holdingsUpdatesActionProfile, holdingsUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(holdingsUpdatesActionProfile.name);

    ActionProfiles.createActionProfile(itemUpdatesActionProfile, itemUpdateMappingProfile.name);
    ActionProfiles.checkActionProfilePresented(itemUpdatesActionProfile.name);

    // create Job profiles
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(updateJobProfile);
    NewJobProfile.linkMatchProfile(instanceHridMatchProfileName);

    // NewJobProfile.saveAndClose();
    // JobProfiles.checkJobProfilePresented(updateJobProfile.profileName);

    // // upload a marc file
    // cy.visit(TopMenu.dataImportPath);
    // DataImport.uploadFile(editedFileNameRev1, fileNameForProtect);
    // JobProfiles.searchJobProfileForImport(updateJobProfile.profileName);
    // JobProfiles.runImportFile(fileNameForProtect);
    // Logs.checkStatusOfJobProfile('Completed');
    // Logs.openFileDetails(fileNameForProtect);
  });
});
