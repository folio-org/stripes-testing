import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';

describe('ui-data-import: Matching on newly-created 035 does not work (regression)', () => {
  let user = null;
  const resourceIdentifier = { type: 'System control number', value: '(NhFolYBP)2304396' };
  const note = 'This instance was updated, plus a new subject heading was added';

  // unique file names
  const fileForCreateName = `C358138autotestFile.${Helper.getRandomBarcode()}.mrc`;
  const nameFileNameAfterUpload = `C17039 uploadedFile.${Helper.getRandomBarcode()}.mrc`;

  // unique profile names
  const matchProfileName = `C358138 Match on newly-created 035 ${Helper.getRandomBarcode()}`;
  const mappingProfileName = `C358138 Update instance via 035 ${Helper.getRandomBarcode()}`;
  const actionProfileName = `C358138 Update instance via 035 ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C358138 Update instance via 035 ${Helper.getRandomBarcode()}`;

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '035',
      in1: '*',
      in2: '*',
      subfield: 'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.systemControlNumber
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
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  //   after(() => {
  // delete profiles
  //   JobProfiles.deleteJobProfile(jobProfileName);
  //   MatchProfiles.deleteMatchProfile(matchProfileName);
  //   ActionProfiles.deleteActionProfile(actionProfileName);
  //   FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);

  //   cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
  //     .then((instance) => {
  //       InventoryInstance.deleteInstanceViaApi(instance.id);
  //     });
  //   });

  it('C358138 Matching on newly-created 035 does not work (regression) (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // upload a marc file for creating of the new instance
    DataImport.uploadFile('marcFileForC358138.mrc', fileForCreateName);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile(fileForCreateName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileForCreateName);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkInstanceQuantityInSummaryTable('1');

    FileDetails.openInstanceInInventory('Created');
    InventoryInstance.verifyResourceIdentifier(resourceIdentifier.type, resourceIdentifier.value, 6);
    InventoryInstance.viewSource();
    InventoryViewSource.contains('035\t');
    InventoryViewSource.contains('$a (NhFolYBP)2304396');

    // create match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfileWithMatchingBy999Field(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // create mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    NewFieldMappingProfile.addAdministrativeNote(note, 5);
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
    DataImport.uploadFile('marcFileForC358138_rev', nameFileNameAfterUpload);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(nameFileNameAfterUpload);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(nameFileNameAfterUpload);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.srsMarc);
    FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
    FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
    FileDetails.checkInstanceQuantityInSummaryTable('1', '1');

    FileDetails.openInstanceInInventory('Updated');
    // step 13
    InventoryInstance.viewSource();
    InventoryViewSource.contains('035\t');
    InventoryViewSource.contains('$a (NhFolYBP)2304396');
    InventoryViewSource.contains('650\t');
    // step 14-15
    // InventoryViewSource.contains('');
  });
});
