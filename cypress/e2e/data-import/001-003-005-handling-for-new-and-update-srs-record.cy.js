import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import Helper from '../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';



// import MappingProfileDetails from '../../support/fragments/data_import/mapping_profiles/mappingProfileDetails';
// import FileManager from '../../support/utils/fileManager';
// import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
// import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

describe('ui-data-import: Test 001/003/035 handling for New and Updated SRS records', () => {
  let instanceHrid = null;
  // resource identifiers
  const resourceIdentifiers = [
    { type: 'ISBN', value: '0866985522' },
    { type: 'ISBN', value: '9782617632537' },
    { type: 'ISBN', value: '4934691323219 (paperback)' }
  ];
  const statisticalCode = '"ARL (Collection stats): books - Book, print (books)"';
  const catalogedDate = '###TODAY###';

  // unique file names
  const nameMarcFileForCreate = `C17039 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C17017 protectedFields.${getRandomPostfix()}.mrc`;
  const fileNameForUpdate = `C17017 updatedProtectedFields.${getRandomPostfix()}.mrc`;

  // unique profile names
  const matchProfileName = `C17039 match profile ${Helper.getRandomBarcode()}`;
  const mappingProfileName = `C17039 mapping profile ${Helper.getRandomBarcode()}`;
  const actionProfileName = `C17039 action profile ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C17039 job profile ${Helper.getRandomBarcode()}`;

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceUuid
  };

  const mappingProfile = {
    name: mappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance
  };

  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };

  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken();
  });

  after(() => {

  });

  it('C17039 Test 001/003/035 handling for New and Updated SRS records (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // // upload a marc file
    // DataImport.uploadFile('oneMarcBib-BeforeOverride.mrc', nameMarcFileForCreate);
    // JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    // JobProfiles.runImportFile(nameMarcFileForCreate);
    // Logs.checkStatusOfJobProfile('Completed');
    // Logs.openFileDetails(nameMarcFileForCreate);
    // [FileDetails.columnName.srsMarc,
    //   FileDetails.columnName.instance].forEach(columnName => {
    //   FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    // });
    // FileDetails.checkItemsQuantityInSummaryTable(0, '1');

    // // get Instance HRID through API
    // SearchInventory
    //   .getInstanceHRID()
    //   .then(hrId => {
    //     instanceHrid = hrId[1];
    //     // check fields are absent in the view source
    //     cy.visit(TopMenu.inventoryPath);
    //     SearchInventory.searchInstanceByHRID(instanceHrid);
    //     InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[0].type, resourceIdentifiers[0].value, 0);
    //   });

    // // create match profile
    // cy.visit(SettingsMenu.matchProfilePath);
    // MatchProfiles.createMatchProfile(matchProfile);
    // MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // create mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    NewFieldMappingProfile.addStatisticalCode(statisticalCode);
    NewFieldMappingProfile.fillCatalogedDate(catalogedDate);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

    // create action profile
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfile, mappingProfile.name);
    ActionProfiles.checkActionProfilePresented(actionProfile.name);

    // create job profile for update
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
    JobProfiles.checkJobProfilePresented(jobProfile.profileName);

    // upload a marc file for updating already created instance
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(jobProfile.profileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(jobProfile.profileName);
  });
});
