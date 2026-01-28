import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C543798_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag245: '245',
        },
        userProperties: {},
      };
      const newTitle = `${testData.title} UPD`;

      let createdInstanceId;

      before('Create test data and login', () => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createSimpleMarcBibViaAPI(testData.title).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C543798 Edit "MARC bibliographic" record from "View source" pane in "Inventory" app (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C543798'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.viewSource();

          InventoryViewSource.validateOptionsInActionsMenu({
            edit: true,
            print: true,
            quickExport: false,
          });

          InventoryViewSource.editMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${newTitle}`);
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(newTitle);

          InventoryInstance.viewSource();
          InventoryViewSource.editMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.pressCancel();
          InventoryInstance.checkInstanceTitle(newTitle);
        },
      );
    });
  });
});
