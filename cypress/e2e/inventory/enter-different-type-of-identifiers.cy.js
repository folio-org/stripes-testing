import { DevTeams, TestTypes } from '../../support/dictionary';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InstanceRecordEdit from '../../support/fragments/inventory/instanceRecordEdit';
import Helper from '../../support/fragments/finance/financeHelper';
import TopMenu from '../../support/fragments/topMenu';
import { INSTANCE_SOURCE_NAMES } from '../../support/constants';

describe('inventory', () => {
  describe('Instance', () => {
    let instanceTitle;
    let instanceId;
    let resourceIdentifier;

    beforeEach('navigate to inventory', () => {
      instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
      cy.loginAsAdmin();
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
    });

    afterEach(() => {
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    const searchAndOpenInstance = (parametr, title) => {
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.searchByParameter(parametr, title);
      InventoryInstances.selectInstance();
    };

    ['ASIN', 'BNB'].forEach((identifier) => {
      it(
        'C609 In Accordion Identifiers --> enter different type of identifiers (folijet) (prokopovych)',
        { tags: [TestTypes.smoke, DevTeams.folijet] },
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
