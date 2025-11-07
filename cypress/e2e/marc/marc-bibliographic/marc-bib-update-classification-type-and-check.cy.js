import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const testData = {
      titlePrefix: `AT_C10980_MarcBibInstance_${randomPostfix}`,
      classificationNumber: `AT_C10980_${randomDigits}${randomDigits}`,
      originalType: 'LC',
      newType: 'NLM',
      tags: {
        tag008: '008',
        tag050: '050',
        tag060: '060',
        tag245: '245',
      },
      userProperties: {},
    };

    const marcInstanceAFields = [
      {
        tag: testData.tags.tag008,
        content: QuickMarcEditor.valid008ValuesInstance,
      },
      {
        tag: testData.tags.tag050,
        content: `$a ${testData.classificationNumber}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: testData.tags.tag245,
        content: `$a ${testData.titlePrefix} A`,
        indicators: ['1', '1'],
      },
    ];

    const marcInstanceBFields = [
      {
        tag: testData.tags.tag008,
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: testData.tags.tag245,
        content: `$a ${testData.titlePrefix} B`,
        indicators: ['1', '1'],
      },
    ];

    const createdInstanceIds = [];

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.then(() => {
          [marcInstanceAFields, marcInstanceBFields].forEach((fields) => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, fields).then(
              (instanceId) => {
                createdInstanceIds.push(instanceId);
              },
            );
          });
        }).then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C10980 Change the classification field in quickMARC and verify change in the instance record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C10980'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceIds[0]);
        InventoryInstances.selectInstanceById(createdInstanceIds[0]);
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.verifyClassificationValueInView(
          testData.originalType,
          testData.classificationNumber,
        );

        InventoryInstance.editMarcBibliographicRecord();

        QuickMarcEditor.updateExistingTagName(testData.tags.tag050, testData.tags.tag060);
        QuickMarcEditor.checkContentByTag(
          testData.tags.tag060,
          `$a ${testData.classificationNumber}`,
        );

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        InventoryInstance.verifyClassificationValueInView(
          testData.originalType,
          testData.classificationNumber,
          false,
        );
        InventoryInstance.verifyClassificationValueInView(
          testData.newType,
          testData.classificationNumber,
        );
      },
    );
  });
});
