import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1464275';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const marcFieldOption = 'MARC bibliographic — MARC';
const marcColumn = (tag) => `MARC ${tag}`;
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
const field008 = { tag: '008', content: QuickMarcEditor.defaultValid008Values };
const rdaContent = '$a text $b txt $2 rdacontent';
const rdaContentValues = ['text', 'txt', 'rdacontent'];
const hamletTitle = `${marcPrefix}_Hamlet`;
const seriesAuthor = `${marcPrefix}_Series author, Bob`;
// "contains" search value: part of the 800 field value (without the "AT_" beginning)
const seriesAuthorSearchValue = seriesAuthor.replace('AT_', '');

const marcInstances = {
  instanceA: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .A1 2026'),
      marcField('050', '$a QA76 $b .A1 2026', ['0', '4']),
      marcField('100', '$a Shakespeare, William $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${hamletTitle} $c William Shakespeare`, ['1', '0']),
      marcField('260', `$a London $b ${marcPrefix}_Press $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix}_General note alpha`),
      marcField('583', `$a ${marcPrefix}_Action note preserved $3 correspondence`),
      marcField('600', '$a Shakespeare, William $d 1564-1616', ['1', '0']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('800', `$a ${seriesAuthor}`, ['1', blank]),
      marcField('856', '$u https://at-marcind.example.org/a $3 full text', ['4', '0']),
    ],
    values245: [hamletTitle, 'William Shakespeare'],
  },
  instanceB: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .B2 2026', [blank, '0']),
      marcField('100', '$a Marlowe, Christopher $d 1564-1593', ['1', blank]),
      marcField(
        '245',
        `$a ${marcPrefix}_The Doctor Faustus $b ${hamletTitle.toUpperCase()} $c Christopher Marlowe`,
        ['1', '4'],
      ),
      marcField('260', `$a Oxford $b ${marcPrefix}_Press $c 2025`),
      marcField('260', `$a Paris $b ${marcPrefix}_Editions $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix}_General note beta`),
      marcField('500', `$a ${marcPrefix}_General note gamma`),
      marcField('600', '$a Marlowe, Christopher $2 local', ['1', '7']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('700', `$a ${marcPrefix}_Translator, Cid`, ['1', '2']),
      marcField('856', '$u https://at-marcind.example.org/b', ['4', '0']),
      marcField('856', '$u ftp://at-marcind.example.org/b-archive', ['1', '8']),
    ],
    values245: [
      `${marcPrefix}_The Doctor Faustus`,
      hamletTitle.toUpperCase(),
      'Christopher Marlowe',
    ],
  },
  instanceC: {
    fields: [
      field008,
      marcField('050', '$a pr2848 $b qa.c3 2026', ['0', '4']),
      marcField('100', '$a SHAKESPEARE, WILLIAM $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${marcPrefix}_SONNETS $c WILLIAM SHAKESPEARE`, ['0', '0']),
      marcField('260', `$a Boston $b ${marcPrefix}_house $c 2024`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix.toLowerCase()}_general note delta`),
      marcField('583', `$a ${marcPrefix}_Action note reviewed $3 email`, ['1', blank]),
      marcField('600', '$a SHAKESPEARE, WILLIAM $d 1564-1616', ['1', '0']),
      marcField('800', `$a ${seriesAuthor}`, ['1', blank]),
      marcField('856', '$u https://at-marcind.example.org/c', ['4', '0']),
    ],
  },
  instanceD: {
    fields: [
      field008,
      marcField('100', '$a Homer', ['0', blank]),
      marcField('245', `$a ${marcPrefix}_Minimal record`, ['1', '0']),
    ],
  },
  instanceE: {
    fields: [
      field008,
      marcField('245', `$a ${marcPrefix}_Electronic occurrence test title`, ['1', '0']),
      marcField('336', rdaContent),
      marcField('856', '$u https://at-marcind.example.org/e1', ['4', '0']),
      marcField('856', '$u https://at-marcind.example.org/e2', ['4', '0']),
    ],
  },
};
const { instanceA, instanceB, instanceC, instanceD, instanceE } = marcInstances;
const allInstances = Object.values(marcInstances);

// The longest common beginning of the given strings
const getCommonPrefix = (values) => {
  return values.reduce((prefix, value) => {
    let index = 0;
    while (index < prefix.length && prefix[index] === value[index]) index += 1;
    return prefix.slice(0, index);
  });
};

let user;
let field005Prefix;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances with MARC bibliographic', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`AT_${testCaseId}`);
        allInstances.forEach((instance) => {
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, instance.fields).then(
            (instanceId) => {
              instance.id = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                instance.hrid = instanceData.hrid;
              });
              // System-populated control fields of the created MARC record (001 = HRID, 005 = date and time)
              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecord) => {
                const marcFields = srsRecord.parsedRecord.content.fields;
                instance.field001 = marcFields.find((field) => field['001'])['001'];
                instance.field005 = marcFields.find((field) => field['005'])['005'];
              });
            },
          );
        });
        cy.then(() => {
          // "starts with" value of the 005 field which narrows the query down to the created records
          field005Prefix = getCommonPrefix(allInstances.map((instance) => instance.field005));
        });

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
        allInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(`*${listName}*`);
      });

      it(
        'C1464275 Query Instances with MARC bibliographic by marc_<tag> (athena)',
        { tags: ['criticalPath', 'athena', 'C1464275'] },
        () => {
          // Precondition: open "Build query" for the "Instances with MARC bibliographic" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select "MARC bibliographic — MARC" in "Select field" dropdown
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.verifyEmptyOperator();
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Enter 245 in "Tag" field, check supported operators
          QueryModal.fillInMarcTag('245');
          QueryModal.verifyMarcTagValue('245');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues();
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 3: Search by marc_245 field using "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(hamletTitle);
          QueryModal.verifyMarcValueTextfield(hamletTitle);
          QueryModal.verifyQueryAreaContent(`(MARC 245 == ${hamletTitle})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('245'));
          QueryModal.verifyResultTableColumnValues(
            instanceA.hrid,
            marcColumn('245'),
            instanceA.values245,
          );
          QueryModal.verifyResultTableColumnValues(
            instanceB.hrid,
            marcColumn('245'),
            instanceB.values245,
          );
          [instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 4: Add the second row with marc_001 field
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn();
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.verifySelectedField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('001', 1);
          QueryModal.verifyMarcTagValue('001', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldAbsent(1);
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS, 1);
          QueryModal.verifyQueryAreaContent(`(MARC 245 == ${hamletTitle})`);

          // Step 5: Search by marc_001 field using "not equal to" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInMarcValueTextfield(instanceB.field001, 1);
          QueryModal.verifyMarcValueTextfield(instanceB.field001, 1);
          QueryModal.verifyQueryAreaContent(
            `(MARC 245 == ${hamletTitle}) AND (MARC 001 != ${instanceB.field001})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('245'));
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('001'));
          QueryModal.verifyResultTableColumnValues(
            instanceA.hrid,
            marcColumn('245'),
            instanceA.values245,
          );
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, marcColumn('001'), [
            instanceA.field001,
          ]);
          [instanceB, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 6: Clear search result, search by marc_800 field using "contains" operator
          QueryModal.clickGarbage(1);
          QueryModal.fillInMarcTag('800');
          QueryModal.verifyMarcTagValue('800');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues();
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(seriesAuthorSearchValue);
          QueryModal.verifyMarcValueTextfield(seriesAuthorSearchValue);
          QueryModal.verifyQueryAreaContent(`(MARC 800 contains ${seriesAuthorSearchValue})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('800'));
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, marcColumn('800'), [
            seriesAuthor,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, marcColumn('800'), [
            seriesAuthor,
          ]);
          [instanceB, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 7: Search by marc_005 field using "starts with" operator
          QueryModal.fillInMarcTag('005');
          QueryModal.verifyMarcTagValue('005');
          QueryModal.verifyMarcIndicatorsAndSubfieldAbsent();
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInMarcValueTextfield(field005Prefix);
          QueryModal.verifyMarcValueTextfield(field005Prefix);
          QueryModal.verifyQueryAreaContent(`(MARC 005 starts with ${field005Prefix})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('005'));
          allInstances.forEach((instance) => {
            QueryModal.verifyResultTableColumnValues(instance.hrid, marcColumn('005'), [
              instance.field005,
            ]);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 8: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.verifyQuery(`MARC 005 starts with ${field005Prefix}`);
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 9: Click "View updated list" link, check the rows and "MARC 005" column
            Lists.viewUpdatedList();
            Lists.verifyResultColumnDisplayed(marcColumn('005'));
            allInstances.forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(
                instance.hrid,
                marcColumn('005'),
                [instance.field005],
                { inBuildQueryForm: false },
              );
            });

            // Step 10: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              marcColumn('005'),
              ...allInstances.map((instance) => instance.hrid),
              ...allInstances.map((instance) => instance.field005),
            ]);

            // Step 11: Click "Actions" menu > "Edit list"
            Lists.openActions();
            Lists.editList();
            Lists.verifyResultColumnDisplayed(marcColumn('005'));
            allInstances.forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(
                instance.hrid,
                marcColumn('005'),
                [instance.field005],
                { inBuildQueryForm: false },
              );
            });

            // Step 12: Click "Edit query" button, check the saved condition is preserved
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('005');
            QueryModal.verifyMarcIndicatorsAndSubfieldAbsent();
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifyMarcValueTextfield(field005Prefix);
            QueryModal.verifyQueryAreaContent(`(MARC 005 starts with ${field005Prefix})`);
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 13: Search by marc_500 field using "is null/empty" operator with "True" value
            QueryModal.fillInMarcTag('500');
            QueryModal.verifyMarcTagValue('500');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues();
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            // Additional condition narrows the result down to the records created in preconditions
            QueryModal.addNewRow();
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('245', 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
            QueryModal.verifyQueryAreaContent(
              `(MARC 500 is null/empty True) AND (MARC 245 contains ${marcPrefix})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('500'));
            QueryModal.verifyResultTableColumnValues(instanceD.hrid, marcColumn('500'), []);
            QueryModal.verifyResultTableColumnValues(instanceE.hrid, marcColumn('500'), []);
            [instanceA, instanceB, instanceC].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 14: Search by marc_336 field using "is null/empty" operator with "False" value
            QueryModal.fillInMarcTag('336');
            QueryModal.verifyMarcTagValue('336');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues();
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(MARC 336 is null/empty False) AND (MARC 245 contains ${marcPrefix})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(4);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('336'));
            [instanceA, instanceB, instanceC, instanceE].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(
                instance.hrid,
                marcColumn('336'),
                rdaContentValues,
              );
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instanceD.hrid);
          });
          cy.screenshot('C1464275-passed');
        },
      );
    });
  });
});
