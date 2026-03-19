import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { HOLDINGS_SOURCE_NAMES } from '../../../support/constants';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag004: '004',
        tag008: '008',
        tag347: '347',
        tag361: '361',
        tag506: '506',
        tag538: '538',
        tag100: '100',
        tag866: '866',
        tag841: '841',
        tag842: '842',
        tag843: '843',
        tag844: '844',
        tag852: '852',
        marcBibTitle: `AT_C350724_MarcBibInstance_${randomPostfix}`,
        tag852Index: 5,
      };
      const existingFields = [
        {
          content: 'Field841',
          indicators: ['\\', '\\'],
          tag: testData.tag841,
        },
        {
          content: 'Field842',
          indicators: ['\\', '\\'],
          tag: testData.tag842,
        },
        {
          content: 'Field843',
          indicators: ['\\', '\\'],
          tag: testData.tag843,
        },
        {
          content: 'Field844',
          indicators: ['\\', '\\'],
          tag: testData.tag844,
        },
        {
          content: 'Field347',
          indicators: ['\\', '\\'],
          tag: testData.tag347,
        },
        {
          content: 'Field361',
          indicators: ['\\', '\\'],
          tag: testData.tag361,
        },
        {
          content: 'Field506',
          indicators: ['\\', '\\'],
          tag: testData.tag506,
        },
        {
          content: 'Field538',
          indicators: ['\\', '\\'],
          tag: testData.tag538,
        },
      ];
      const addedFieldsData = [
        { rowIndex: testData.tag852Index + 1, tag: testData.tag100, content: '$a Added Field100' },
        {
          rowIndex: testData.tag852Index + 2,
          tag: testData.tag866,
          content: '$a Added Field866_1',
        },
        {
          rowIndex: testData.tag852Index + 3,
          tag: testData.tag866,
          content: '$z Added Field866_2',
        },
        {
          rowIndex: testData.tag852Index + 4,
          tag: testData.tag866,
          content: '$a Added Field866_3 $z Added Field866_3',
        },
      ];
      const deletedFieldsTags = [
        testData.tag347,
        testData.tag361,
        testData.tag506,
        testData.tag538,
      ];
      const updatedFieldsData = [
        { tag: testData.tag841, content: '$a Updated Field841' },
        { tag: testData.tag842, content: '$a Updated Field842' },
        { tag: testData.tag843, content: '$a Updated Field843' },
        { tag: testData.tag844, content: '$a Updated Field844' },
      ];

      let recordId;
      let user;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({
            limit: 1,
            query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
          }).then((location) => {
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createMarcHoldingsViaAPI(recordId, [
                  {
                    content: instanceData.hrid,
                    tag: testData.tag004,
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: testData.tag008,
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag852,
                  },
                  ...existingFields,
                ]);
              });
            });
          });
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C350724 Edit the created MARC holdings record via quickmarc multiple times (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350724'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkSource(HOLDINGS_SOURCE_NAMES.MARC);

          addedFieldsData.forEach((addedField, index) => {
            HoldingsRecordView.editInQuickMarc();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.addNewField(
              addedField.tag,
              addedField.content,
              addedField.rowIndex - 1,
            );
            QuickMarcEditor.verifyTagValue(addedField.rowIndex, addedField.tag);
            QuickMarcEditor.checkContent(addedField.content, addedField.rowIndex);

            cy.wait(1000);
            QuickMarcEditor.deleteFieldByTagAndCheck(deletedFieldsTags[index]);
            QuickMarcEditor.afterDeleteNotification(deletedFieldsTags[index]);

            QuickMarcEditor.updateExistingField(
              updatedFieldsData[index].tag,
              updatedFieldsData[index].content,
            );
            QuickMarcEditor.checkContentByTag(
              updatedFieldsData[index].tag,
              updatedFieldsData[index].content,
            );

            QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.waitLoading();

            HoldingsRecordView.viewSource();
            InventoryViewSource.checkRowExistsWithTagAndValue(addedField.tag, addedField.content);
            InventoryViewSource.checkRowExistsWithTagAndValue(
              updatedFieldsData[index].tag,
              updatedFieldsData[index].content,
            );
            InventoryViewSource.notContains(`${deletedFieldsTags[index]}\t`);
          });

          InventoryViewSource.checkRowExistsWithTagAndValue(
            addedFieldsData[0].tag,
            addedFieldsData[0].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            addedFieldsData[1].tag,
            addedFieldsData[1].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            addedFieldsData[2].tag,
            addedFieldsData[2].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedFieldsData[0].tag,
            updatedFieldsData[0].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedFieldsData[1].tag,
            updatedFieldsData[1].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedFieldsData[2].tag,
            updatedFieldsData[2].content,
          );
          InventoryViewSource.notContains(`${deletedFieldsTags[0]}\t`);
          InventoryViewSource.notContains(`${deletedFieldsTags[1]}\t`);
          InventoryViewSource.notContains(`${deletedFieldsTags[2]}\t`);
        },
      );
    });
  });
});
