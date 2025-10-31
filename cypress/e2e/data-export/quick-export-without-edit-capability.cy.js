import Permissions from '../../support/dictionary/permissions';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
let instanceTypeId;
const instance = { title: `AT_C423452_FolioInstance_${getRandomPostfix()}` };
const marcInstance = { title: `AT_C423452_MarcInstance_${getRandomPostfix()}` };

describe('Data Export', () => {
  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        cy.createTempUser([
          Permissions.dataExportViewOnly.gui,
          Permissions.dataExportSettingsViewOnly.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: instance.title,
            instanceTypeId,
          },
        }).then((instanceData) => {
          instance.id = instanceData.instanceId;
        });

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;
        });
      })
      .then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    InventoryInstance.deleteInstanceViaApi(instance.id);
    InventoryInstance.deleteInstanceViaApi(marcInstance.id);
  });

  it(
    'C423452 "Inventory" app - User is NOT able to do quick export without "data - UI-Data-Export - edit" capability set (firebird)',
    { tags: ['extendedPath', 'firebird', 'C423452'] },
    () => {
      // Step 1: Go to "Inventory" app
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.verifySearchAndFilterPane();

      // Step 2: Verify the "Instance" toggle from the "Search & filter" pane is selected
      InventorySearchAndFilter.instanceTabIsDefault();

      // Step 3: Find the instance created in precondition by searching by title
      InventorySearchAndFilter.searchInstanceByTitle(instance.title);

      // Step 4: Select any instance by checking checkbox next to it and click on "Actions" button
      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventoryInstances.exportInstanceMarcButtonAbsent();

      // Step 5: Click on any instance from "Inventory" pane
      InventorySearchAndFilter.selectSearchResultItem(0);
      InventoryInstance.waitLoading();
      InstanceRecordView.verifyInstanceRecordViewOpened();

      // Step 6: Click on "Actions" button from 3rd "Instance • <instance name>" pane
      InstanceRecordView.validateOptionInActionsMenu(
        actionsMenuOptions.setRecordForDeletion,
        false,
      );
      InventorySearchAndFilter.resetAll();

      // Step 7: From any MARC instance detailed view click "Actions" > "View source"
      InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
      InventorySearchAndFilter.selectSearchResultItem();
      InventoryInstance.waitLoading();
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.viewSource();
      InventoryViewSource.waitLoading();

      // Step 8: Click "Actions" on MARC bibliographic record page
      InventoryViewSource.validateOptionsInActionsMenu({
        edit: true,
        print: true,
        quickExport: false,
      });
    },
  );
});
