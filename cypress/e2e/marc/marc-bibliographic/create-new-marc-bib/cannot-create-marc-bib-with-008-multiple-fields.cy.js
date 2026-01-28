import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag245: '245',
        tag008: '008',
        content245: '$a C499625 Multiple 008 test',
        errorMessage: 'Field is non-repeatable.',
      };
      const dropdownOptions = {
        DtSt: 'e',
        Conf: '0',
        Fest: '0',
        Indx: '0',
        LitF: '1',
      };
      let user;

      before('Create user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C499625 Cannot create "MARC bib" record with multiple "008" fields ("system", not repeatable) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C499625'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.selectOptionsIn008FieldRelfDropdowns();

          QuickMarcEditor.updateExistingField(testData.tag245, testData.content245);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);

          QuickMarcEditor.addNewField(testData.tag008, '', 4);
          MarcAuthority.select008DropdownsIfOptionsExist(dropdownOptions, 5);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMessage);
        },
      );
    });
  });
});
