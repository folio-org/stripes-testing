import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
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
        title: `AT_C569556_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag245: '245',
          tag010: '010',
        },
        userProperties: {},
        valid245indicatorValue: '1',
        lccnSubfieldAContent: `2${randomNDigitNumber(9)}`,
        lccnSubfieldZContent: `6${randomNDigitNumber(7)}`,
      };
      const fields = [
        { tag: testData.tags.tag245, content: `$a ${testData.title}`, indicators: ['1', '1'] },
        {
          tag: testData.tags.tag010,
          content: `$a ${testData.lccnSubfieldAContent} $z ${testData.lccnSubfieldZContent}`,
          indicators: ['\\', '\\'],
        },
      ];

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          // default value - setting just in case it was changed by someone
          InventoryInstances.toggleMarcBibLccnValidationRule({ enable: false });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.title);
      });

      it(
        'C569556 Create a new MARC bib record with invalid LCCN when "LCCN structure validation" is disabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C569556'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(fields[0].tag, fields[0].content);
          QuickMarcEditor.updateIndicatorValue(fields[0].tag, fields[0].indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(fields[0].tag, fields[0].indicators[1], 1);

          QuickMarcEditor.addNewField(fields[1].tag, fields[1].content, 4);
          QuickMarcEditor.verifyTagValue(5, fields[1].tag);
          QuickMarcEditor.updateIndicatorValue(fields[1].tag, fields[1].indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(fields[1].tag, fields[1].indicators[1], 1);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.title);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagField(
            5,
            fields[1].tag,
            fields[1].indicators[0],
            fields[1].indicators[1],
            `$a   ${testData.lccnSubfieldAContent} $z    ${testData.lccnSubfieldZContent} `,
            '',
          );
        },
      );
    });
  });
});
