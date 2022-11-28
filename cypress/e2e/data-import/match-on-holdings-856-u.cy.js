import getRandomPostfix from '../../support/utils/stringTools';
import DevTeams from '../../support/dictionary/devTeams';
import TestTypes from '../../support/dictionary/testTypes';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';

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
  const instanceTitle = 'Together together 3 : personal relationships in public places / edited by Calvin Morrill, David A. Snow, and Cindy H. White.';

  const instanceCreateMappingProfile = {
    name: createInstanceMappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance
  };
  const eHoldingsCreateMappingProfile = {
    name: createEHoldingsMappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings
  };
  const updateEHoldingsMappingProfile = {
    name: updateEHoldingsMappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings
  };

  const createInstanceActionProfile = {
    name: createInstanceActionProfileName,
    action: 'Create (all record types except MARC Authority or MARC Holdings)',
    typeValue: 'Instance',
  };
  const createEHoldingsActionProfile = {
    name: createEHoldingsActionProfileName,
    action: 'Create (all record types except MARC Authority or MARC Holdings)',
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
    cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` })
      .then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
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

  const createInstanceMappingProfile = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewFieldMappingProfile.fillPermanentLocation('"Online (E)"');
    NewFieldMappingProfile.addElectronicAccess('"Resource"', '856$u', '856$z');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const updateHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewFieldMappingProfile.addSuppressFromDiscovery();
    NewFieldMappingProfile.fillCallNumberType('"Other scheme"');
    NewFieldMappingProfile.fillCallNumber('"ONLINE"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  it('C17025 Match on Holdings 856 $u (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    createInstanceMappingProfile(instanceCreateMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(instanceCreateMappingProfile.name);
    createHoldingsMappingProfile(eHoldingsCreateMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(eHoldingsCreateMappingProfile.name);
    updateHoldingsMappingProfile(updateEHoldingsMappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(updateEHoldingsMappingProfile.name);

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(createInstanceActionProfile, createInstanceMappingProfileName);
    ActionProfiles.createActionProfile(createEHoldingsActionProfile, createEHoldingsMappingProfileName);
    ActionProfiles.createActionProfile(updateEHoldingsActionProfile, updateEHoldingsMappingProfileName);

    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(createInstanceAndEHoldingsJobProfile);
    NewJobProfile.linkActionProfile(createInstanceActionProfile);
    NewJobProfile.linkActionProfile(createEHoldingsActionProfile);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(createInstanceAndEHoldingsJobProfileName);

    JobProfiles.createJobProfile(updateEHoldingsJobProfile);
    NewJobProfile.linkMatchProfile(matchProfileName);
    NewJobProfile.linkActionProfileForMatches(updateEHoldingsActionProfileName);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(updateEHoldingsJobProfileName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFileForC17025.mrc', nameForCreateMarcFile);
    JobProfiles.searchJobProfileForImport(createInstanceAndEHoldingsJobProfileName);
    JobProfiles.runImportFile(nameForCreateMarcFile);

    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHRID = hrId;
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkURIIsNotEmpty();
      });

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFileForC17025.mrc', nameForUpdateCreateMarcFile);
    JobProfiles.searchJobProfileForImport(updateEHoldingsJobProfileName);
    JobProfiles.runImportFile(nameForUpdateCreateMarcFile);
    Logs.checkStatusOfJobProfile();

    InventorySearchAndFilter.getInstanceHRID()
      .then(() => {
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkCallNumber('ONLINE');
      });
  });
});
