import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('inventory', () => {
  describe('Instance', () => {
    let instanceTitle;
    let instanceId;
    let resourceIdentifier;

    beforeEach('navigate to inventory', () => {
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
    });

    afterEach(() => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    const searchAndOpenInstance = (parametr, title) => {
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchByParameter(parametr, title);
      InventoryInstances.selectInstance();
    };

    ['ASIN', 'BNB'].forEach((identifier) => {
      it(
        'C609 In Accordion Identifiers --> enter different type of identifiers (folijet)',
        { tags: ['smoke', 'folijet'] },
        () => {
          resourceIdentifier = `testResourceIdentifier.${getRandomPostfix()}`;

          searchAndOpenInstance('Title (all)', instanceTitle);
          InventoryInstance.editInstance();
          InstanceRecordEdit.addIdentifier(identifier, resourceIdentifier);
          searchAndOpenInstance(
            'Keyword (title, contributor, identifier, HRID, UUID)',
            resourceIdentifier,
          );
          InventoryInstance.checkInstanceIdentifier(resourceIdentifier);
        },
      );
    });
  });
});
