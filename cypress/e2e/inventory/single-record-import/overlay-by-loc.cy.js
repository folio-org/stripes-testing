import { Permissions } from '../../../support/dictionary';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Single record import', () => {
    const testData = {
      locNumber: '99053205',
      originalInstanceTitle: 'AT_C490903_MarcBibInstance',
      newInstanceTitle:
        'Kerouac, the word and the way : prose artist as spiritual quester / Ben Giamo.',
      expectedFields: [
        { tag: '020', position: 5, content: '$a 0809323214 (alk. paper)' },
        { tag: '035', position: 6, content: '$a 11809685' },
        { tag: '040', position: 7, content: '$a DLC $c DLC $d DLC' },
      ],
    };
    let createdInstaceId;
    let user = {};

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.createSimpleMarcBibViaAPI(testData.originalInstanceTitle).then((instanceId) => {
          createdInstaceId = instanceId;
          cy.toggleLocSingleImportProfileViaAPI();
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(createdInstaceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C490903 Generated "035" field displays in ascending fields order in overlaid via single record import "MARC bibliographic" record which doesn\'t have existing "035" field (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C490903'] },
      () => {
        InventoryInstances.searchByTitle(createdInstaceId);
        InventoryInstance.waitLoading();
        InventoryActions.overlayLoc(testData.locNumber, true);
        InventoryInstance.checkInstanceTitle(testData.newInstanceTitle);
        InventoryInstance.editMarcBibliographicRecord();
        testData.expectedFields.forEach((field) => {
          QuickMarcEditor.verifyTagValue(field.position, field.tag);
          QuickMarcEditor.checkContent(field.content, field.position);
        });
      },
    );
  });
});
