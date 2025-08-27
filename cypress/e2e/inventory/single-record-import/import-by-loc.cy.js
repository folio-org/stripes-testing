import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;
const locC490900 = '01012052';
const locC490902 = '68073904';
const instanceTitlePartC490900 = 'The history of New England from 1630 to 1649';
const instanceTitlePartC490902 = 'Vanity Fair; introduction and notes by Gilbert Phelps.';
const expectedFieldsC490900 = [
  { tag: '035', position: 4, content: '$a 10065352' },
  { tag: '035', position: 8, content: '$9 (DLC)   01012052' },
  { tag: '035', position: 9, content: '$a (OCoLC)2628488' },
];
const expectedFieldsC490902 = [
  { tag: '035', position: 4, content: '$a 1233775' },
  { tag: '035', position: 9, content: '$9 (DLC)   68073904' },
];
const createdInstaceIds = [];

describe('Inventory', () => {
  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.toggleLocSingleImportProfileViaAPI();
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: `(title="${instanceTitlePartC490900}" or title="${instanceTitlePartC490902}")`,
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
      cy.reload();
      cy.wait('@/authn/refresh', { timeout: 20000 });
      InventoryInstances.waitContentLoading();
      cy.wait(3000);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.toggleLocSingleImportProfileViaAPI(false);
      createdInstaceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C490900 Generated "035" field displays in ascending fields order in imported via single record import "MARC bibliographic" record which has multiple existing "035" fields (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C490900'] },
      () => {
        InventoryActions.importLoc(locC490900);
        InstanceRecordView.waitLoading();
        InventoryInstance.getId().then((id) => createdInstaceIds.push(id));
        InventoryInstance.editMarcBibliographicRecord();
        expectedFieldsC490900.forEach((field) => {
          QuickMarcEditor.verifyTagValue(field.position, field.tag);
          if (field.content) QuickMarcEditor.checkContent(field.content, field.position);
        });
      },
    );

    it(
      'C490902 Generated "035" field displays in ascending fields order in imported via single record import "MARC bibliographic" record which has one existing "035" field (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C490902'] },
      () => {
        InventoryActions.importLoc(locC490902);
        InventoryInstance.checkInstanceTitle(instanceTitlePartC490902);
        InstanceRecordView.waitLoading();
        InventoryInstance.getId().then((id) => createdInstaceIds.push(id));
        InventoryInstance.editMarcBibliographicRecord();
        expectedFieldsC490902.forEach((field) => {
          QuickMarcEditor.verifyTagValue(field.position, field.tag);
          if (field.content) QuickMarcEditor.checkContent(field.content, field.position);
        });
      },
    );
  });
});
