import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C494021_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag010: '010',
        tag245: '245',
        originalLccnNumber: 'n494021000',
        tag010InDerive: {
          rowIndex: 4,
          ind1: '\\',
          ind2: '\\',
          content: '$a',
        },
        newLccnNumber: `n494021${randomFourDigitNumber()}${randomFourDigitNumber()}`,
      };

      const marcInstanceFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag010,
          content: `$a ${testData.originalLccnNumber}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}}`,
          indicators: ['1', '1'],
        },
      ];

      let testInstanceId;

      before(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C494021_MarcBibInstance');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              testInstanceId = instanceId;
            });
          }).then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C494021 Run search for "Instance" records by "010" field values from "Derive a new MARC bib record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C494021'] },
        () => {
          InventoryInstances.searchByTitle(testInstanceId);
          InventoryInstances.selectInstanceById(testInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();

          QuickMarcEditor.verifyTagField(
            testData.tag010InDerive.rowIndex,
            testData.tag010,
            testData.tag010InDerive.ind1,
            testData.tag010InDerive.ind2,
            testData.tag010InDerive.content,
            '',
          );

          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag010, `$a ${testData.newLccnNumber}`);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.waitLoading();

          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.newLccnNumber);
          InventoryViewSource.notContains(testData.originalLccnNumber);
        },
      );
    });
  });
});
