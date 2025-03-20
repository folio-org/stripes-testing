import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
  oclc: '1007797324',
  OCLCAuthentication: '100481406/PAOLF',
};

describe('Inventory', () => {
  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C193952 Create Instance by import of single MARC Bib record from OCLC (folijet)',
      { tags: ['smoke', 'folijet', 'C193952'] },
      () => {
        InventoryInstances.importWithOclc(testData.oclc);
        InventoryInstance.waitLoading();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
        InventoryInstance.viewSource();
        InventoryViewSource.contains('999\tf f\t$i');
        InventoryViewSource.contains('$s');
      },
    );
  });
});
