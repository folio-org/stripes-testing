import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InstanceRecordEdit from '../../support/fragments/inventory/instanceRecordEdit';
import Helper from '../../support/fragments/finance/financeHelper';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Assign a Preceding title for an instance', () => {
  const instanceIds = [];
  const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
  const instanceTitle2 = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
  const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
  const isbnValue = `ISBN test value ${getRandomPostfix()}`;
  const issnValue = `ISSN test value ${getRandomPostfix()}`;

  before('navigate to Inventory', () => {
    cy.loginAsAdmin();
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
            source: 'FOLIO',
          }, {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle2,
            source: 'FOLIO',
          }
        ]).each((instance, i) => cy.createInstance({ instance }).then(specialInstanceId => { instanceIds[i] = specialInstanceId; }));
      });

    cy.visit(TopMenu.inventoryPath);
  });

  after(() => {
    cy.getInstanceById(instanceIds[0])
      .then(body => {
        const requestBody = body;
        requestBody.precedingTitles = [];

        // reset precedingTitles to get rid of tables dependencies and be able to delete the instances
        cy.updateInstance(requestBody);
      })
      .then(() => {
        instanceIds.forEach(instanceId => InventoryInstance.deleteInstanceViaApi(instanceId));
      });
  });

  it('C9215 In Accordion Title --> Test assigning a Preceding title (folijet) (prokopovych)', { tags:  [TestTypes.smoke, DevTeams.folijet] }, () => {
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.editInstance();
    InstanceRecordEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InstanceRecordEdit.saveAndClose();
    InventoryInstance.checkPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryInstance.editInstance();
    InstanceRecordEdit.addExistingPrecedingTitle(instanceTitle2);
    InstanceRecordEdit.saveAndClose();
    InventoryInstance.checkPrecedingTitle(0, instanceTitle2, '', '');
  });
});
