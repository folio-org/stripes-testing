import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        user: {},
        marcTitle: `AT_C451565_MarcBibInstance_${getRandomPostfix()}`,
        tag014: '014',
        tag852: '852',
        tag866: '866',
        tag868: '868',
        callNumberPrefix: `C451565${randomFourDigitNumber()}${randomFourDigitNumber()}`,
      };

      let fieldValues;
      let sourceValues;
      let savedValuesInView;
      let createdInstanceId;
      let locationCode;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
            createdInstanceId = instanceId;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            locationCode = res.code;

            fieldValues = [
              {
                tag: testData.tag852,
                content: `$b ${locationCode} $h ${testData.callNumberPrefix} {dollar}{dollar}{dollar} {dollar}10`,
              },
              { tag: testData.tag014, content: '$a AB{dollar}P6388({dollar} sign test)' },
              { tag: testData.tag866, content: '$a Cost 50{dollar}, field for test' },
              { tag: testData.tag868, content: '$a US dollars ({dollar}) - field for test' },
              { tag: testData.tag868, content: '$A upper case first code test' },
              { tag: testData.tag868, content: '$a upper case $B not First $C Code $d TEST' },
              { tag: testData.tag868, content: '$B A$AP $bp' },
            ];

            sourceValues = [
              fieldValues[0].content.replace(/{dollar}/g, '$'),
              fieldValues[1].content.replace(/{dollar}/g, '$'),
              fieldValues[2].content.replace(/{dollar}/g, '$'),
              fieldValues[3].content.replace(/{dollar}/g, '$'),
              '$a upper case first code test',
              '$a upper case $b not First $c Code $d TEST',
              '$b A $a P $b p',
            ];

            savedValuesInView = {
              callNumber: `${testData.callNumberPrefix} $$$ $10`,
              holdingsStatement: 'Cost 50$, field for test',
              holdingsStatementForIndexes1: 'US dollars ($) - field for test',
              holdingsStatementForIndexes2: 'upper case first code test',
              holdingsStatementForIndexes3: 'upper case',
              holdingsStatementForIndexes4: 'P',
            };
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      });

      it(
        'C451565 Fields without tag and subfield values are deleted during saving (create MARC bibliographic) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451565'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(testData.tag852, fieldValues[0].content);
          QuickMarcEditor.checkContentByTag(testData.tag852, fieldValues[0].content);

          fieldValues.slice(1).forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, 5 + index);
            QuickMarcEditor.verifyTagField(6 + index, field.tag, '\\', '\\', field.content, '');
          });

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.checkCallNumber(savedValuesInView.callNumber);
          HoldingsRecordView.checkHoldingsStatement(savedValuesInView.holdingsStatement);
          HoldingsRecordView.checkHoldingsStatementForIndexes(
            savedValuesInView.holdingsStatementForIndexes1,
          );
          HoldingsRecordView.checkHoldingsStatementForIndexes(
            savedValuesInView.holdingsStatementForIndexes2,
          );
          HoldingsRecordView.checkHoldingsStatementForIndexes(
            savedValuesInView.holdingsStatementForIndexes3,
          );
          HoldingsRecordView.checkHoldingsStatementForIndexes(
            savedValuesInView.holdingsStatementForIndexes4,
          );

          HoldingsRecordView.viewSource();
          sourceValues.forEach((sourceValue) => {
            InventoryViewSource.contains(sourceValue);
          });
        },
      );
    });
  });
});
