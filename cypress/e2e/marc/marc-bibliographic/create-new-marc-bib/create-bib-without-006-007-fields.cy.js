import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        title: `AT_C496227_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag006: '006',
          tag007: '007',
          tag008: '008',
          tag245: '245',
        },
        userProperties: {},
      };

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.title);
      });

      it(
        'C496227 Create "MARC bib" record without "006" and "007" fields (which are "system" and not required) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496227'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.title}`);

          QuickMarcEditor.checkFieldAbsense(testData.tags.tag006);
          QuickMarcEditor.checkFieldAbsense(testData.tags.tag007);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.title);
        },
      );
    });
  });
});
