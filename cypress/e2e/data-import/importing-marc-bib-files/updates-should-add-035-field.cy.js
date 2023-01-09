import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';


// import Helper from '../../../support/fragments/finance/financeHelper';
// import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
// import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
// import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
// import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
// import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
// import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
// import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
// import SettingsMenu from '../../../support/fragments/settingsMenu';
// import TopMenu from '../../../support/fragments/topMenu';
// import DataImport from '../../../support/fragments/data_import/dataImport';
// import Logs from '../../../support/fragments/data_import/logs/logs';
// import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
// import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
// import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
// import Users from '../../../support/fragments/users/users';
// import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('ui-data-import: Data Import Updates should add 035 field from 001/003, if it is not HRID or already exists', () => {
  let user = null;

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
  });

  //   after(() => {
  //     Users.deleteViaApi(user.userId);
  //   });

  it('C358998 Data Import Updates should add 035 field from 001/003, if it is not HRID or already exists (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {

  });
});
