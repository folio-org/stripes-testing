import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Helper from '../../support/fragments/finance/financeHelper';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Users from '../../support/fragments/users/users';

describe('ui-data-import: MARC field protections apply to MARC modifications of incoming records when they should not: Scenario 1', () => {
  let user = null;
  const fieldsForDelete = ['977', '978', '979'];
  const fieldsForDeleteIds = [];
  let instanceHrid = null;

  // unique profile names
  const jobProfileName = `C350678 Create bib and instance, but remove some MARC fields first ${Helper.getRandomBarcode()}`;
  const actionProfileName = `C350678 Remove extraneous MARC fields ${Helper.getRandomBarcode()}`;
  const mappingProfileName = `C350678 Remove extraneous MARC fields ${Helper.getRandomBarcode()}`;

  // unique file name to upload
  const fileName = `C350678autotestFileProtection.${Helper.getRandomBarcode()}.mrc`;

  before(() => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
  });

  after(() => {
    fieldsForDeleteIds.forEach(fieldId => MarcFieldProtection.deleteMarcFieldProtectionViaApi(fieldId));
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(user.userId);
  });

  it('C350678 MARC field protections apply to MARC modifications of incoming records when they should not: Scenario 1 (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    const mappingProfile = { name: mappingProfileName,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib };

    const actionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
      name: actionProfileName,
      action: 'Modify (MARC Bibliographic record type only)'
    };

    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };

    // create protection fields
    MarcFieldProtection.createMarcFieldProtectionViaApi({
      field: '*',
      indicator1: '*',
      indicator2: '*',
      subfield: '5',
      data: 'NcD',
      source: 'USER',
    })
      .then(resp => {
        const id = resp.id;
        fieldsForDeleteIds.push(id);
      });
    MarcFieldProtection.createMarcFieldProtectionViaApi({
      field: fieldsForDelete[2],
      indicator1: '*',
      indicator2: '*',
      subfield: '*',
      data: '*',
      source: 'USER',
    }).then(resp => {
      const id = resp.id;
      fieldsForDeleteIds.push(id);
    });

    // create mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    NewFieldMappingProfile.addFieldMappingsForMarc();
    NewFieldMappingProfile.fillModificationSectionWithDelete('Delete', fieldsForDelete[0], 0);
    NewFieldMappingProfile.addNewFieldInModificationSection();
    NewFieldMappingProfile.fillModificationSectionWithDelete('Delete', fieldsForDelete[1], 1);
    NewFieldMappingProfile.addNewFieldInModificationSection();
    NewFieldMappingProfile.fillModificationSectionWithDelete('Delete', fieldsForDelete[2], 2);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create action profile
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkActionProfileByName(actionProfileName);
    NewJobProfile.linkActionProfileByName('Default - Create instance');
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFileForProtectionModification.mrc', fileName);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(fileName);
    Logs.openFileDetails(fileName);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkItemsQuantityInSummaryTable(0, '1');

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[1];
        // check fields are absent in the view source
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(instanceHrid);
        // verify table data in marc bibliographic source
        InventoryInstance.viewSource();
        fieldsForDelete.forEach(fieldNumber => {
          InventoryViewSource.notContains(`${fieldNumber}\t`);
        });
      });
  });
});
