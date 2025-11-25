import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const lccnPrefix = `569558${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        instanceTitle: `AT_C569558_MarcBibInstance_${getRandomPostfix()}`,
        tag008: '008',
        tag010: '010',
        tag245: '245',
        initial010Content: '$a n1234567',
        invalidLccnContent: `$a h${lccnPrefix}1 $z ac${lccnPrefix}2`,
        tag010Index: 4,
      };
      const tag010BoxesAfterSave = {
        tag: testData.tag010,
        ind1: '\\',
        ind2: '\\',
        content: testData.invalidLccnContent,
      };
      const marcRecordFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag010,
          content: testData.initial010Content,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];
      const user = {};
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        // default value - setting just in case it was changed by someone
        InventoryInstances.toggleMarcBibLccnValidationRule({ enable: false });
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcRecordFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(user.userProperties.username, user.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C569558 Edit MARC bib with invalid LCCN when "LCCN structure validation" is disabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C569558'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(testData.tag010, testData.invalidLccnContent);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.waitLoading();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagField(
            testData.tag010Index,
            tag010BoxesAfterSave.tag,
            tag010BoxesAfterSave.ind1,
            tag010BoxesAfterSave.ind2,
            tag010BoxesAfterSave.content,
            '',
          );
        },
      );
    });
  });
});
