import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
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

const testCaseId = 'C1464325';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const marcFieldOption = 'MARC bibliographic — MARC';
const marcColumn = (tag, ind1, ind2) => {
  return `MARC ${tag} ind1=${ind1} ind2=${ind2}`;
};
const column999 = marcColumn('999', 'f', 'f');
const column600 = marcColumn('600', '1', '7');
const column500 = marcColumn('500', 'blank', 'blank');
const column050 = marcColumn('050', '0', '4');
const column336 = marcColumn('336', 'blank', 'blank');
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
const field008 = { tag: '008', content: QuickMarcEditor.defaultValid008Values };
const rdaContent = '$a text $b txt $2 rdacontent';
const generalNoteAlpha = `${marcPrefix}_General note alpha`;
const generalNoteBeta = `${marcPrefix}_General note beta`;
const generalNoteGamma = `${marcPrefix}_General note gamma`;
// The 500 $a value of Instance C is in lower case, "contains" is case-insensitive
const generalNoteDelta = `${marcPrefix.toLowerCase()}_general note delta`;
const generalNoteSearchValue = `${marcPrefix}_General note`;
const localSubjectSource = 'local';
const callNumberA = 'QA76';
const callNumberPartA = '.A1 2026';
const callNumberC = 'pr2848';
const callNumberPartC = 'qa.c3 2026';
const callNumberSearchValue = 'QA';
// The "Instance — Source" value list is built from the instances of the tenant, where LINKED_DATA of the
// test case does not occur, so the second value of the "not in" condition is the other available source
const instanceSourceValues = ['MARC', 'FOLIO'];
// Every record of this run has the unique beginning in its 245 field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty True" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `MARC 245 contains ${marcPrefix}`;

const marcInstances = {
  instanceA: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .A1 2026'),
      marcField('050', `$a ${callNumberA} $b ${callNumberPartA}`, ['0', '4']),
      marcField('100', '$a Shakespeare, William $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${marcPrefix}_Hamlet $c William Shakespeare`, ['1', '0']),
      marcField('260', `$a London $b ${marcPrefix}_Press $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${generalNoteAlpha}`),
      marcField('583', `$a ${marcPrefix}_Action note preserved $3 correspondence`),
      marcField('600', '$a Shakespeare, William $d 1564-1616', ['1', '0']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('800', `$a ${marcPrefix}_Series author, Bob`, ['1', blank]),
      marcField('856', '$u https://at-marcind.example.org/a $3 full text', ['4', '0']),
    ],
  },
  instanceB: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .B2 2026', [blank, '0']),
      marcField('100', '$a Marlowe, Christopher $d 1564-1593', ['1', blank]),
      marcField(
        '245',
        `$a ${marcPrefix}_The Doctor Faustus $b ${marcPrefix}_HAMLET $c Christopher Marlowe`,
        ['1', '4'],
      ),
      marcField('260', `$a Oxford $b ${marcPrefix}_Press $c 2025`),
      marcField('260', `$a Paris $b ${marcPrefix}_Editions $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${generalNoteBeta}`),
      marcField('500', `$a ${generalNoteGamma}`),
      marcField('600', `$a Marlowe, Christopher $2 ${localSubjectSource}`, ['1', '7']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('700', `$a ${marcPrefix}_Translator, Cid`, ['1', '2']),
      marcField('856', '$u https://at-marcind.example.org/b', ['4', '0']),
      marcField('856', '$u ftp://at-marcind.example.org/b-archive', ['1', '8']),
    ],
  },
  instanceC: {
    fields: [
      field008,
      marcField('050', `$a ${callNumberC} $b ${callNumberPartC}`, ['0', '4']),
      marcField('100', '$a SHAKESPEARE, WILLIAM $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${marcPrefix}_SONNETS $c WILLIAM SHAKESPEARE`, ['0', '0']),
      marcField('260', `$a Boston $b ${marcPrefix}_house $c 2024`),
      marcField('336', rdaContent),
      marcField('500', `$a ${generalNoteDelta}`),
      marcField('583', `$a ${marcPrefix}_Action note reviewed $3 email`, ['1', blank]),
      marcField('600', '$a SHAKESPEARE, WILLIAM $d 1564-1616', ['1', '0']),
      marcField('800', `$a ${marcPrefix}_Series author, Bob`, ['1', blank]),
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
const savedListInstances = [instanceA, instanceB, instanceC];

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
              // The 999 ff field is populated by quickMARC: $i is the Instance UUID, $s is the SRS record ID
              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecord) => {
                const field999 = srsRecord.parsedRecord.content.fields.find(
                  (field) => field['999'],
                )['999'];

                instance.instanceUuid = field999.subfields.find((subfield) => subfield.i).i;
                instance.srsId = field999.subfields.find((subfield) => subfield.s).s;
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
        'C1464325 Query Instances with MARC bibliographic by marc_<tag>_<indicator1>_<indicator2> (athena)',
        { tags: ['criticalPath', 'athena', 'C1464325'] },
        () => {
          // Precondition: open "Build query" for the "Instances with MARC bibliographic" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select MARC field, enter 999 in "Tag" and f in both indicators
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('999');
          QueryModal.fillInMarcIndicator1('f');
          QueryModal.fillInMarcIndicator2('f');
          QueryModal.verifyMarcTagValue('999');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: 'f', ind2: 'f' });
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Search by marc_999_ind1_f_ind2_f field using "equals" operator
          cy.then(() => {
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInMarcValueTextfield(instanceA.srsId);
            QueryModal.verifyMarcValueTextfield(instanceA.srsId);
            QueryModal.verifyQueryAreaContent(`(${column999} == ${instanceA.srsId})`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column999, [
              instanceA.instanceUuid,
              instanceA.srsId,
            ]);
            [instanceB, instanceC, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });
          });

          // Step 3: Search by marc_600_ind1_1_ind2_7 field using "not equal to" operator
          QueryModal.fillInMarcTag('600');
          QueryModal.fillInMarcIndicator1('1');
          QueryModal.fillInMarcIndicator2('7');
          QueryModal.verifyMarcTagValue('600');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', ind2: '7' });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(localSubjectSource);
          QueryModal.verifyMarcValueTextfield(localSubjectSource);
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('245', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column600} != ${localSubjectSource}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          [instanceA, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyResultTableColumnValues(instance.hrid, column600, []);
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instanceB.hrid);

          // Step 4: Search by marc_500_ind1_blank_ind2_blank field using "contains" operator
          QueryModal.clickGarbage(1);
          QueryModal.fillInMarcTag('500');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.fillInMarcIndicator2(blank);
          QueryModal.verifyMarcTagValue('500');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(generalNoteSearchValue);
          QueryModal.verifyMarcValueTextfield(generalNoteSearchValue);
          QueryModal.verifyQueryAreaContent(`(${column500} contains ${generalNoteSearchValue})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column500, [generalNoteAlpha]);
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, column500, [
            generalNoteBeta,
            generalNoteGamma,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, column500, [generalNoteDelta]);
          [instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 5: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.verifyQuery(`${column500} contains ${generalNoteSearchValue}`);
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 6: Click "View updated list" link, check the rows and the column of the saved list
            Lists.viewUpdatedList();
            QueryModal.verifyResultTableColumnValues(
              instanceA.hrid,
              column500,
              [generalNoteAlpha],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceB.hrid,
              column500,
              [generalNoteBeta, generalNoteGamma],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceC.hrid,
              column500,
              [generalNoteDelta],
              { inBuildQueryForm: false },
            );

            // Step 7: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column500,
              ...savedListInstances.map((instance) => instance.hrid),
              generalNoteAlpha,
              generalNoteBeta,
              generalNoteGamma,
              generalNoteDelta,
            ]);

            // Step 8: Click "Actions" menu > "Edit list"
            Lists.openActions();
            Lists.editList();
            QueryModal.verifyResultTableColumnValues(
              instanceA.hrid,
              column500,
              [generalNoteAlpha],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceB.hrid,
              column500,
              [generalNoteBeta, generalNoteGamma],
              { inBuildQueryForm: false },
            );

            // Step 9: Click "Edit query" button, check the saved condition is preserved
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('500');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifyMarcValueTextfield(generalNoteSearchValue);
            QueryModal.verifyQueryAreaContent(`(${column500} contains ${generalNoteSearchValue})`);
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 10: Search by marc_050_ind1_0_ind2_4 field using "starts with" operator
            QueryModal.fillInMarcTag('050');
            QueryModal.fillInMarcIndicator1('0');
            QueryModal.fillInMarcIndicator2('4');
            QueryModal.verifyMarcTagValue('050');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '0', ind2: '4' });
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(callNumberSearchValue);
            QueryModal.verifyMarcValueTextfield(callNumberSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${column050} starts with ${callNumberSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column050, [
              callNumberA,
              callNumberPartA,
            ]);
            QueryModal.verifyResultTableColumnValues(instanceC.hrid, column050, [
              callNumberC,
              callNumberPartC,
            ]);
            [instanceB, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 11: Search by marc_336_ind1_blank_ind2_blank field using "is null/empty" True
            QueryModal.fillInMarcTag('336');
            QueryModal.fillInMarcIndicator1(blank);
            QueryModal.fillInMarcIndicator2(blank);
            QueryModal.verifyMarcTagValue('336');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            QueryModal.addNewRow();
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('245', 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column336} is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnValues(instanceD.hrid, column336, []);
            [instanceA, instanceB, instanceC, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 12: Search by marc_999_ind1_f_ind2_f field using "is null/empty" False
            QueryModal.fillInMarcTag('999');
            QueryModal.fillInMarcIndicator1('f');
            QueryModal.fillInMarcIndicator2('f');
            QueryModal.verifyMarcTagValue('999');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: 'f', ind2: 'f' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(${column999} is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            allInstances.forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, column999, [
                instance.instanceUuid,
                instance.srsId,
              ]);
            });

            // Step 13: Replace the second row with a non-MARC condition returning no records
            QueryModal.clickGarbage(1);
            QueryModal.addNewRow();
            QueryModal.verifyBooleanColumn(1);
            QueryModal.selectField(instanceFieldValues.instanceSource, 1);
            QueryModal.verifySelectedField(instanceFieldValues.instanceSource, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_IN, 1);
            instanceSourceValues.forEach((sourceValue) => {
              QueryModal.chooseFromValueMultiselect(sourceValue, 1, { exactMatch: true });
            });
            QueryModal.verifyQueryAreaContent(
              `(${column999} is null/empty False) AND (instance.source not in [${instanceSourceValues.join(', ')}])`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyQueryReturnsNoResults();
            QueryModal.runQueryAndSaveDisabled(false);

            // Step 14: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(${column999} is null/empty False) AND (instance.source not in [${instanceSourceValues.join(', ')}])`,
            );
            Lists.verifyRefreshCompleteCallout(0);

            // Step 15: Click "View updated list" link, no records are displayed
            Lists.viewUpdatedList();
            Lists.verifyNoRecordsInListDetails();
          });
          cy.screenshot('C1464325-passed');
        },
      );
    });
  });
});
