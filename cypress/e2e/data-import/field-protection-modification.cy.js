import getRandomPostfix from '../../support/utils/stringTools';
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

// import TopMenu from '../../support/fragments/topMenu';
// import Orders from '../../support/fragments/orders/orders';
// import SettingsMenu from '../../support/fragments/settingsMenu';
// import DataImport from '../../support/fragments/data_import/dataImport';
// import Logs from '../../support/fragments/data_import/logs/logs';
// import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
// import NewOrder from '../../support/fragments/orders/newOrder';
// import OrderLines from '../../support/fragments/orders/orderLines';
// import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
// import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
// import Users from '../../support/fragments/users/users';
// import FileManager from '../../support/utils/fileManager';

describe('ui-data-import: MARC field protections apply to MARC modifications of incoming records when they should not: Scenario 1', () => {
  let user = null;

  // unique profile names
  const jobProfileName = `C350678 Create bib and instance, but remove some MARC fields first ${getRandomPostfix()}`;
  const actionProfileName = `C350678 Remove extraneous MARC fields ${Helper.getRandomBarcode()}`;
  const mappingProfileName = `C350678 Remove extraneous MARC fields ${Helper.getRandomBarcode()}`;

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

  //   after(() => {

  //   });

  it('C350678 MARC field protections apply to MARC modifications of incoming records when they should not: Scenario 1 (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    const mappingProfile = {
      name: mappingProfileName,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.marcBib
    };

    const marcBibActionProfile = {
      typeValue: NewActionProfile.folioRecordTypeValue.marcBib,
      name: actionProfileName,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
    };

    const jobProfileForUpdate = {
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
    });
    MarcFieldProtection.createMarcFieldProtectionViaApi({
      field: '979',
      indicator1: '*',
      indicator2: '*',
      subfield: '*',
      data: '*',
      source: 'USER',
    });

    // create mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfile(collectionOfProfiles[0].mappingProfile);
  });
});
