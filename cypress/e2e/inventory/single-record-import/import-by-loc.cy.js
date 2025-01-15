import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;
const loc = '01012052';
const instanceTitlePart = 'The history of New England from 1630 to 1649';
const expectedFields = [
  { tag: '035', position: 4, content: undefined },
  { tag: '035', position: 6, content: '$9 (DLC)   01012052' },
  { tag: '035', position: 8, content: '$a (OCoLC)2628488' },
];

describe('Inventory', () => {
  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.toggleLocSingleImportProfileViaAPI();
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: `title="${instanceTitlePart}"`,
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.toggleLocSingleImportProfileViaAPI(false);
      cy.getInstance({ limit: 1, expandAll: true, query: `"lccn"=="${loc}"` }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C490900 Generated "035" field displays in ascending fields order in imported via single record import "MARC bibliographic" record which has multiple existing "035" fields (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C490900'] },
      () => {
        InventoryActions.importLoc(loc);
        InstanceRecordView.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();
        expectedFields.forEach((field) => {
          QuickMarcEditor.verifyTagValue(field.position, field.tag);
          if (field.content) QuickMarcEditor.checkContent(field.content, field.position);
        });
      },
    );
  });
});
