import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        title: `AT_C514992_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag245: '245',
          tag988: '988',
        },
        undefinedFieldContent: '$a Not defined field',
        expectedWarning: 'Warn: Field is undefined.',
        userProperties: {},
        valid245indicatorValue: '1',
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
        'C514992 Create MARC bib record with field which is not defined in validation rules (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514992'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.title}`);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.valid245indicatorValue,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.valid245indicatorValue,
            1,
          );

          QuickMarcEditor.addNewField(testData.tags.tag988, testData.undefinedFieldContent, 4);
          QuickMarcEditor.verifyTagValue(5, testData.tags.tag988);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(5, testData.expectedWarning);
          QuickMarcEditor.verifyValidationCallout(1, 0);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.title);
        },
      );
    });
  });
});
