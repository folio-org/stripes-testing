import DevTeams from '../../support/dictionary/devTeams';
import TestTypes from '../../support/dictionary/testTypes';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: Match on Holdings 856 $u', () => {
  const matchProfileName = `autotestMatchProf${getRandomPostfix()}`;
  const nameForCreateMarcFile = `createFile${getRandomPostfix()}.mrc`;
  const nameForUpdateCreateMarcFile = `updateFile${getRandomPostfix()}.mrc`;
  const createInstanceMappingProfileName = `createInstanceMappingProf${getRandomPostfix()}`;
  const createEHoldingsMappingProfileName = `createEHoldingsMappingProf${getRandomPostfix()}`;
  const updateEHoldingsMappingProfileName = `updateEHoldingsMappingProf${getRandomPostfix()}`;
  const createInstanceActionProfileName = `createInstanceActionProf${getRandomPostfix()}`;
  const createEHoldingsActionProfileName = `createEHoldingsActionProf${getRandomPostfix()}`;
  const updateEHoldingsActionProfileName = `updateEHoldingsActionProf${getRandomPostfix()}`;
  const createInstanceAndEHoldingsJobProfileName = `createInstanceAndEHoldingsJobProf${getRandomPostfix()}`;
  const updateEHoldingsJobProfileName = `updateEHoldingsJobProf${getRandomPostfix()}`;
  let instanceHRID = null;

  const createInstanceMappingProfile = {
    name: createInstanceMappingProfileName,
    typeValue: NewMappingProfile.folioRecordTypeValue.instance,
  };
  const createEHoldingsMappingProfile = {
    name: createEHoldingsMappingProfileName,
    typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
    permanentLocation: '"Online (E)"',
    electronicAccess: {
      action: 'Add these to existing',
      relationship: '"Resource"',
      uri: '856$u',
      linkText: '856$z',
    },
  };
  const updateEHoldingsMappingProfile = {
    name: updateEHoldingsMappingProfileName,
    typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
    discoverySuppress: 'Mark for all affected records',
    callNumberType: '"Other scheme"',
    callNumber: '"ONLINE"',
  };

  const createInstanceActionProfile = {
    name: createInstanceActionProfileName,
    action: 'Create (all record types)',
    typeValue: 'Instance',
  };
  const createEHoldingsActionProfile = {
    name: createEHoldingsActionProfileName,
    action: 'Create (all record types)',
    typeValue: 'Holdings',
  };
  const updateEHoldingsActionProfile = {
    name: updateEHoldingsActionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    typeValue: 'Holdings',
  };

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '856',
      in1: '4',
      in2: '0',
      subfield: 'u'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'HOLDINGS',
    holdingsOption: NewMatchProfile.optionsList.uri,
  };

  const createInstanceAndEHoldingsJobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: createInstanceAndEHoldingsJobProfileName,
  };
  const updateEHoldingsJobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: updateEHoldingsJobProfileName,
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    cy.visit(SettingsMenu.mappingProfilePath);
  });

  after(() => {
    HoldingsRecordView.getId().then((id) => {
      cy.deleteHoldingRecordViaApi(id);
    });
    InventoryInstance.getId().then(id => {
      InventoryInstance.deleteInstanceViaApi(id);
    });

    JobProfiles.deleteJobProfile(createInstanceAndEHoldingsJobProfileName);
    JobProfiles.deleteJobProfile(updateEHoldingsJobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(createInstanceActionProfileName);
    ActionProfiles.deleteActionProfile(createEHoldingsActionProfileName);
    ActionProfiles.deleteActionProfile(updateEHoldingsActionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(createInstanceMappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(createEHoldingsMappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(updateEHoldingsMappingProfileName);
  });

  it('C17025 Match on Holdings 856 $u (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    FieldMappingProfiles.createMappingProfile(createInstanceMappingProfile);
    FieldMappingProfiles.createMappingProfile(createEHoldingsMappingProfile);
    FieldMappingProfiles.createMappingProfile(updateEHoldingsMappingProfile);

    cy.visit(SettingsMenu.actionProfilePath);

    ActionProfiles.createActionProfile(createInstanceActionProfile, createInstanceMappingProfileName);
    ActionProfiles.closeActionProfile(createInstanceActionProfileName);

    ActionProfiles.createActionProfile(createEHoldingsActionProfile, createEHoldingsMappingProfileName);
    ActionProfiles.closeActionProfile(createEHoldingsActionProfileName);

    ActionProfiles.createActionProfile(updateEHoldingsActionProfile, updateEHoldingsMappingProfileName);
    ActionProfiles.closeActionProfile(updateEHoldingsActionProfileName);

    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    cy.visit(SettingsMenu.jobProfilePath);

    JobProfiles.createJobProfile(createInstanceAndEHoldingsJobProfile);
    NewJobProfile.linkActionProfile(createInstanceActionProfile);
    NewJobProfile.linkActionProfile(createEHoldingsActionProfile);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(createInstanceAndEHoldingsJobProfileName);
    JobProfiles.closeJobProfile(createInstanceAndEHoldingsJobProfileName);

    JobProfiles.createJobProfile(updateEHoldingsJobProfile);
    NewJobProfile.linkMatchProfile(matchProfileName);
    NewJobProfile.linkActionProfileForMatches(updateEHoldingsActionProfileName);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(updateEHoldingsJobProfileName);
    JobProfiles.closeJobProfile(updateEHoldingsJobProfileName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('MatchOnURL.mrc', nameForCreateMarcFile);
    JobProfiles.searchJobProfileForImport(createInstanceAndEHoldingsJobProfileName);
    JobProfiles.runImportFile(nameForCreateMarcFile);

    SearchInventory.getInstanceHRID()
      .then(hrId => {
        instanceHRID = hrId[0];
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(instanceHRID);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkURIIsNotEmpty();
      });

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('MatchOnURL.mrc', nameForUpdateCreateMarcFile);
    JobProfiles.searchJobProfileForImport(updateEHoldingsJobProfileName);
    JobProfiles.runImportFile(nameForUpdateCreateMarcFile);

    SearchInventory.getInstanceHRID()
      .then(() => {
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(instanceHRID);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkCallNumber('ONLINE');
      });
  });
});
