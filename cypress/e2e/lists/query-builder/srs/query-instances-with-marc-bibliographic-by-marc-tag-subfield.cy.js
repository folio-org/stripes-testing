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

const testCaseId = 'C1464311';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const marcFieldOption = 'MARC bibliographic — MARC';
const marcColumn = (tag, subfield) => `MARC ${tag}$${subfield}`;
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
const field008 = { tag: '008', content: QuickMarcEditor.defaultValid008Values };
const rdaContent = '$a text $b txt $2 rdacontent';
// The 100 $a value of Instance A and Instance C differs in case only, "equals" is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const homerName = `${marcPrefix}_Homer`;
const seriesAuthor = `${marcPrefix}_Series author, Bob`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
// Every record of this run has the unique beginning in its 245 $a field. The condition below is added as
// the second row to narrow the queries down to these records (the test case notes allow extra filters)
const narrowingCondition = `MARC 245$a starts with ${marcPrefix}`;

const marcInstances = {
  instanceA: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .A1 2026'),
      marcField('050', '$a QA76 $b .A1 2026', ['0', '4']),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('245', `$a ${marcPrefix}_Hamlet $c William Shakespeare`, ['1', '0']),
      marcField('260', `$a London $b ${marcPrefix}_Press $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix}_General note alpha`),
      marcField('583', `$a ${marcPrefix}_Action note preserved $3 correspondence`),
      marcField('600', '$a Shakespeare, William $d 1564-1616', ['1', '0']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('800', `$a ${seriesAuthor}`, ['1', blank]),
      marcField('856', '$u https://at-marcind.example.org/a $3 full text', ['4', '0']),
    ],
  },
  instanceB: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .B2 2026', [blank, '0']),
      marcField('100', `$a ${marloweName} $d ${marloweDates}`, ['1', blank]),
      marcField(
        '245',
        `$a ${marcPrefix}_The Doctor Faustus $b ${marcPrefix}_HAMLET $c Christopher Marlowe`,
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
  },
  instanceC: {
    fields: [
      field008,
      marcField('050', '$a pr2848 $b qa.c3 2026', ['0', '4']),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
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
      marcField('100', `$a ${homerName}`, ['0', blank]),
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

let user;

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
            },
          );
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
        'C1464311 Query Instances with MARC bibliographic by marc_<tag>_<subfield> (athena)',
        { tags: ['criticalPath', 'athena', 'C1464311'] },
        () => {
          // Precondition: open "Build query" for the "Instances with MARC bibliographic" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select MARC field, enter 100 in "Tag" and a in "Subfield", check supported operators
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('100');
          QueryModal.fillInMarcSubfield('a');
          QueryModal.verifyMarcTagValue('100');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Search by marc_100_a field using "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(shakespeareName);
          QueryModal.verifyMarcValueTextfield(shakespeareName);
          QueryModal.verifyQueryAreaContent(`(MARC 100$a == ${shakespeareName})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'a'));
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, marcColumn('100', 'a'), [
            shakespeareName,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, marcColumn('100', 'a'), [
            shakespeareNameUpperCase,
          ]);
          [instanceB, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 3: Search by marc_100_d field using "not equal to" operator
          QueryModal.fillInMarcSubfield('d');
          QueryModal.verifyMarcTagValue('100');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'd' });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(shakespeareDates);
          QueryModal.verifyMarcValueTextfield(shakespeareDates);
          // "not equal to" also matches the records without the queried field, so the second condition
          // narrows the result down to the records created in preconditions
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('245', 1);
          QueryModal.fillInMarcSubfield('a', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(MARC 100$d != ${shakespeareDates}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'd'));
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, marcColumn('100', 'd'), [
            marloweDates,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceD.hrid, marcColumn('100', 'd'), []);
          QueryModal.verifyResultTableColumnValues(instanceE.hrid, marcColumn('100', 'd'), []);
          [instanceA, instanceC].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 4: Add a row and search by marc_100_a field using "is null/empty" operator
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(2);
          QueryModal.selectField(marcFieldOption, 2);
          QueryModal.verifySelectedField(marcFieldOption, 2);
          QueryModal.fillInMarcTag('100', 2);
          QueryModal.fillInMarcSubfield('a', 2);
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' }, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 2);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 2);
          QueryModal.selectValueFromSelect('False', 2);
          QueryModal.verifySelectedValue('False', 2);
          QueryModal.verifyQueryAreaContent(
            `(MARC 100$d != ${shakespeareDates}) AND (${narrowingCondition}) AND (MARC 100$a is null/empty False)`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'd'));
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'a'));
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, marcColumn('100', 'd'), [
            marloweDates,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, marcColumn('100', 'a'), [
            marloweName,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceD.hrid, marcColumn('100', 'd'), []);
          QueryModal.verifyResultTableColumnValues(instanceD.hrid, marcColumn('100', 'a'), [
            homerName,
          ]);
          [instanceA, instanceC, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 5: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(MARC 100$d != ${shakespeareDates}) AND (${narrowingCondition}) AND (MARC 100$a is null/empty False)`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 6: Click "View updated list" link, check the rows and MARC columns of the saved list
            Lists.viewUpdatedList();
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'd'), {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'a'), {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnValues(
              instanceB.hrid,
              marcColumn('100', 'd'),
              [marloweDates],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceB.hrid,
              marcColumn('100', 'a'),
              [marloweName],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(instanceD.hrid, marcColumn('100', 'd'), [], {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnValues(
              instanceD.hrid,
              marcColumn('100', 'a'),
              [homerName],
              { inBuildQueryForm: false },
            );

            // Step 7: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              marcColumn('100', 'd'),
              marcColumn('100', 'a'),
              instanceB.hrid,
              instanceD.hrid,
              marloweDates,
              marloweName,
              homerName,
            ]);

            // Step 8: Click "Actions" menu > "Edit list"
            Lists.openActions();
            Lists.editList();
            QueryModal.verifyResultTableColumnValues(
              instanceB.hrid,
              marcColumn('100', 'a'),
              [marloweName],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceD.hrid,
              marcColumn('100', 'a'),
              [homerName],
              { inBuildQueryForm: false },
            );

            // Step 9: Click "Edit query" button, check the saved conditions are preserved
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('100');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'd' });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
            QueryModal.verifyMarcValueTextfield(shakespeareDates);
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('245', 1);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' }, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH, 1);
            QueryModal.verifyMarcValueTextfield(marcPrefix, 1);
            QueryModal.verifySelectedField(marcFieldOption, 2);
            QueryModal.verifyMarcTagValue('100', 2);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' }, 2);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 2);
            QueryModal.verifySelectedValue('False', 2);
            QueryModal.verifyQueryAreaContent(
              `(MARC 100$d != ${shakespeareDates}) AND (${narrowingCondition}) AND (MARC 100$a is null/empty False)`,
            );
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 10: Clear search result, search by marc_336_a field using "contains" operator
            QueryModal.clickGarbage(2);
            QueryModal.fillInMarcTag('336');
            QueryModal.fillInMarcSubfield('a');
            QueryModal.verifyMarcTagValue('336');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield('text');
            QueryModal.verifyMarcValueTextfield('text');
            QueryModal.verifyQueryAreaContent(
              `(MARC 336$a contains text) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(4);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('336', 'a'));
            [instanceA, instanceB, instanceC, instanceE].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, marcColumn('336', 'a'), [
                'text',
              ]);
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instanceD.hrid);

            // Step 11: Search by marc_800_a field using "starts with" operator
            QueryModal.fillInMarcTag('800');
            QueryModal.verifyMarcTagValue('800');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(marcPrefix);
            QueryModal.verifyMarcValueTextfield(marcPrefix);
            QueryModal.verifyQueryAreaContent(
              `(MARC 800$a starts with ${marcPrefix}) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('800', 'a'));
            [instanceA, instanceC].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, marcColumn('800', 'a'), [
                seriesAuthor,
              ]);
            });
            [instanceB, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 12: Search by marc_260_b field using "is null/empty" operator
            QueryModal.fillInMarcTag('260');
            QueryModal.fillInMarcSubfield('b');
            QueryModal.verifyMarcTagValue('260');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'b' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            QueryModal.verifyQueryAreaContent(
              `(MARC 260$b is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('260', 'b'));
            QueryModal.verifyResultTableColumnValues(instanceD.hrid, marcColumn('260', 'b'), []);
            QueryModal.verifyResultTableColumnValues(instanceE.hrid, marcColumn('260', 'b'), []);
            [instanceA, instanceB, instanceC].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });
          });
          cy.screenshot('C1464311-passed');
        },
      );
    });
  });
});
