import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

describe('ui-data-import: Match on Instance identifier match meets both the Identifier type and Data requirements (Scenario 2)', () => {
  let userId;
  const filePathForCreateInstance = 'marcFileForMatchOnIdentifierForCreate.mrc';
  const filePathForUpdateInstance = 'marcFileForMatchOnIdentifierForUpdate_2.mrc';
  const fileNameForCreateInstance = `C358137autotestFile.${getRandomPostfix()}.mrc`;
  const fileNameForUpdateInstance = `C358137autotestFile.${getRandomPostfix()}.mrc`;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const matchProfileName = `autotestMatchProf${getRandomPostfix()}`;
  const mappingProfileName = `autotestMappingProf${getRandomPostfix()}`;
  const actionProfileName = `autotestActionProf${getRandomPostfix()}`;
  const jobProfileName = `autotestActionProf${getRandomPostfix()}`;
  const instanceGeneralNote = 'IDENTIFIER UPDATE 2';
  const resourceIdentifiers = [
    { type: 'UPC', value: 'ORD32671387-4' },
    { type: 'OCLC', value: '(OCoLC)84714376518561876438' },
    { type: 'Invalid UPC', value: 'ORD32671387-4' },
    { type: 'System control number', value: '(AMB)84714376518561876438' },
  ];
  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '024',
      in1: '1',
      subfield: 'z'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: 'Identifier: Invalid UPC',
  };
  const mappingProfile = {
    name: mappingProfileName,
    incomingRecordType: 'MARC Bibliographic',
    folioRecordType: 'Instance',
    staffSuppress: 'Mark for all affected records',
    catalogedDate: '"2021-12-02"',
    catalogedDateUI: '2021-12-02',
    instanceStatus: '"Cataloged"',
    instanceStatusUI: 'Cataloged',
  };
  const actionProfile = {
    typeValue : NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  beforeEach(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.dataImportDeleteLogs.gui,
      permissions.inventoryAll.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.assignAcqUnitsToNewInvoice.gui,
      permissions.invoiceSettingsAll.gui,
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
      });
    cy.getAdminToken();

    InventorySearch.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value)
      .then(instances => {
        instances.forEach(({ id }) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
  });

  after(() => {
    Users.deleteViaApi(userId);
  });

  it('C347829 Match on Instance identifier match meets both the Identifier type and Data requirements (Folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(filePathForCreateInstance, fileNameForCreateInstance);
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile(fileNameForCreateInstance);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameForCreateInstance);
    Logs.clickOnHotLink(0, 3, 'Created');
    InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[0].type, resourceIdentifiers[0].value, 6);
    InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[1].type, resourceIdentifiers[1].value, 4);
    cy.go('back');
    Logs.clickOnHotLink(1, 3, 'Created');
    InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[2].type, resourceIdentifiers[2].value, 0);
    InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[3].type, resourceIdentifiers[3].value, 3);

    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);

    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createMappingProfileForMatchOnInstanceIdentifier(mappingProfile);

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
    JobProfiles.checkJobProfilePresented(jobProfileName);

    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(filePathForUpdateInstance, fileNameForUpdateInstance);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(fileNameForUpdateInstance);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileNameForUpdateInstance);
    Logs.verifyInstanceStatus(0, 3, 'Discarded');
    Logs.verifyInstanceStatus(1, 3, 'Updated');
    Logs.clickOnHotLink(1, 3, 'Updated');
    InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatusUI);
    InstanceRecordView.verifyMarkAsSuppressed();
    InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
    InstanceRecordView.verifyGeneralNoteContent(instanceGeneralNote);
  });
});

