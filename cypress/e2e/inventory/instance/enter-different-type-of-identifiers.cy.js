import { APPLICATION_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    let instanceTitle;
    let instanceId;
    let resourceIdentifier;

    before('Create test data and login', () => {
      instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 });
          cy.getInstanceIdentifierTypes({ limit: 1 });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: instanceTitle,
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
          }).then((specialInstanceId) => {
            instanceId = specialInstanceId;
          });
        });

      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    const searchAndOpenInstance = (parametr, title) => {
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.searchByParameter(parametr, title);
      InventoryInstances.selectInstance();
    };

    [
      {
        identifier: 'ASIN',
        line: 0,
      },
      {
        identifier: 'BNB',
        line: 1,
      },
    ].forEach((element) => {
      it(
        'C609 In Accordion Identifiers --> enter different type of identifiers (folijet)',
        { tags: ['smoke', 'folijet', 'C609', 'shiftLeft'] },
        () => {
          resourceIdentifier = `testResourceIdentifier.${getRandomPostfix()}`;

          searchAndOpenInstance('Title (all)', instanceTitle);
          InventoryInstance.editInstance();
          InstanceRecordEdit.addIdentifier(element.identifier, resourceIdentifier, element.line);
          InventorySearchAndFilter.resetAll();
          searchAndOpenInstance('Identifier (all)', resourceIdentifier);
          InventoryInstance.checkInstanceIdentifier(resourceIdentifier, element.line);
          InventorySearchAndFilter.resetAll();
        },
      );
    });
  });
});
