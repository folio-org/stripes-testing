import Permissions from '../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const bibTitle = `C503115 MARC Bib for Holdings ${getRandomPostfix()}`;
    const tag852 = '852';
    const tag004 = '004';
    const field004Content = '$a test';
    const multiple004ErrorText = 'Record cannot be saved. Can only have one MARC 004.';
    let user;
    let instanceId;
    let locationCode;

    before('Create user, bib record', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUser) => {
        user = createdUser;

        cy.createSimpleMarcBibViaAPI(bibTitle).then((id) => {
          instanceId = id;

          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then(
            (location) => {
              locationCode = location.code;
            },
          );

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
        });
      });
    });

    after('Delete user, bib record', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C503115 Add multiple MARC 004s when creating MARC Holdings record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C503115'] },
      () => {
        // Add MARC holdings
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();

        // Fill 852 $b with location code
        QuickMarcEditor.updateExistingField(tag852, `$b ${locationCode}`);
        QuickMarcEditor.checkContent(`$b ${locationCode}`, 5);

        // Add new field, fill it, then set tag to 004
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.checkEmptyFieldAdded(6);
        QuickMarcEditor.updateExistingFieldContent(6, field004Content);
        QuickMarcEditor.checkContent(field004Content, 6);
        QuickMarcEditor.updateTagNameToLockedTag(6, tag004);
        QuickMarcEditor.verifyTagValue(6, tag004);
        QuickMarcEditor.verifyAllBoxesInARowAreDisabled(6, true, false);

        // Save and check for error
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkErrorMessage(3, multiple004ErrorText);
        QuickMarcEditor.checkErrorMessage(6, multiple004ErrorText);
        QuickMarcEditor.verifyValidationCallout(0, 2);
      },
    );
  });
});
