import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C466066_FolioInstance_${randomPostfix}`,
    };
    const initialVersion = 1;
    let instanceId;
    let location;
    let materialType;
    let loanType;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466066_');

      cy.then(() => {
        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            instanceId = instanceData.instanceId;
          },
        );
      })
        .then(() => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialType = res;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            loanType = loanTypes[0];
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C466066 Verify that version of "Instance" record (source=FOLIO) was not updated after creation of "Holdings" and "Item" record (promin)',
      { tags: ['extendedPath', 'promin', 'C466066'] },
      () => {
        const locationString = `${location.name} (${location.code}) `;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Note _version from GET inventory/instances response when opening Edit Instance
        cy.intercept('GET', `/inventory/instances/${instanceId}`).as('getInstance');
        InventoryInstance.editInstance();
        cy.wait('@getInstance').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });

        // Step 2: Close the "Edit Instance" pane
        InstanceRecordEdit.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Add a new Holdings record via UI
        InventoryInstance.createHoldingsRecord(locationString);

        // Step 4: Add a new Item record to the created Holdings via UI
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.clickAddItemByHoldingName({
          holdingName: location.name,
          instanceTitle: testData.instanceTitle,
        });
        ItemRecordNew.fillItemRecordFields({
          loanType: loanType.name,
          materialType: materialType.name,
        });
        ItemRecordNew.saveAndClose({ itemSaved: true });

        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 5: Verify _version did not change after Holdings and Item creation
        cy.intercept('GET', `/inventory/instances/${instanceId}`).as('getInstanceAfter');
        InventoryInstance.editInstance();
        cy.wait('@getInstanceAfter').then(({ response }) => {
          expect(response.body._version).to.eq(initialVersion);
        });
      },
    );
  });
});
