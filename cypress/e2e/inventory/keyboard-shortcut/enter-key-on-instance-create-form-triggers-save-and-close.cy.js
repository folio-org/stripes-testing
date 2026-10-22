import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = 'AT_C1464272_';
    const testData = {
      instanceTitle: `${titlePrefix}FolioInstance_${randomPostfix}`,
      resourceType: 'text',
      identifierType: 'ISBN',
      identifierValue: `AT_C1464272_Identifier_${randomPostfix}`,
    };

    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(titlePrefix);

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiInventory]);

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceByTitleViaApi(titlePrefix);
    });

    it(
      'C1464272 Enter key in textbox on Instance create form triggers "Save & close" (promin)',
      { tags: ['extendedPath', 'promin', 'C1464272'] },
      () => {
        // Step 1: Actions > New opens the New Instance form, Title/Resource type required
        InventoryInstances.addNewInventory();
        InventoryNewInstance.verifySaveButtonDisabled();

        // Steps 2-3: select Resource type, fill Title, add an identifier and fill its value
        InventoryNewInstance.fillInstanceFields({
          title: testData.instanceTitle,
          resourceType: testData.resourceType,
          instanceIdentifier: [{ type: testData.identifierType, value: testData.identifierValue }],
        });

        // Step 4: Enter in the Identifier field (cursor stays there after filling it in
        // Step 3) - instance is saved and closed, Instance detail pane opens showing the
        // newly created record
        InventoryNewInstance.pressEnterInIdentifierField();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.verifyResourceTitle(testData.instanceTitle);
      },
    );
  });
});
