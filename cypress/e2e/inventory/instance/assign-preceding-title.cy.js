import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const instanceIds = [];
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    const instanceTitle2 = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
    const isbnValue = `ISBN test value ${getRandomPostfix()}`;
    const issnValue = `ISSN test value ${getRandomPostfix()}`;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 });
          cy.getInstanceIdentifierTypes({ limit: 1 });
        })
        .then(() => {
          cy.wrap([
            {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: instanceTitle,
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
            {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: instanceTitle2,
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
          ]).each((instance, i) => cy.createInstance({ instance }).then((specialInstanceId) => {
            instanceIds[i] = specialInstanceId;
          }));
        });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstanceById(instanceIds[0])
          .then((body) => {
            const requestBody = body;
            requestBody.precedingTitles = [];

            // reset precedingTitles to get hrid of tables dependencies and be able to delete the instances
            cy.updateInstance(requestBody);
          })
          .then(() => {
            instanceIds.forEach((instanceId) => InventoryInstance.deleteInstanceViaApi(instanceId));
          });
      });
    });

    it(
      'C9215 In Accordion Title --> Test assigning a Preceding title (folijet)',
      { tags: ['smoke', 'folijet', 'shiftLeft', 'C9215'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.editInstance();
        InstanceRecordEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.checkPrecedingTitle(precedingTitleValue, isbnValue, issnValue);
        InventoryInstance.editInstance();
        InstanceRecordEdit.addExistingPrecedingTitle(instanceTitle2);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.checkPrecedingTitle(instanceTitle2, 'No value set-', 'No value set-');
      },
    );
  });
});
