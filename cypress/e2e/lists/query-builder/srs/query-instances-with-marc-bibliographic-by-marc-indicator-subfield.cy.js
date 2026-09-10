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

const testCaseId = 'C1464316';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const marcFieldOption = 'MARC bibliographic — MARC';
const marcColumn = (tag, indicator, indicatorValue, subfield) => {
  return `MARC ${tag} ind${indicator}=${indicatorValue} $${subfield}`;
};
const column856Ind1U = marcColumn('856', 1, '4', 'u');
const column260Ind1C = marcColumn('260', 1, 'blank', 'c');
const column100Ind2A = marcColumn('100', 2, 'blank', 'a');
const column583Ind2A = marcColumn('583', 2, 'blank', 'a');
const column600Ind1D = marcColumn('600', 1, '1', 'd');
const column245Ind1B = marcColumn('245', 1, '1', 'b');
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
const field008 = { tag: '008', content: QuickMarcEditor.defaultValid008Values };
const rdaContent = '$a text $b txt $2 rdacontent';
const marcUrl = (suffix) => `https://at-marcind.example.org/${marcPrefix}/${suffix}`;
const urlA = marcUrl('a');
const urlB = marcUrl('b');
const urlC = marcUrl('c');
const urlBArchive = `ftp://at-marcind.example.org/${marcPrefix}/b-archive`;
const urlE1 = marcUrl('e1');
const urlE2 = marcUrl('e2');
// The 100 $a value of Instance A and Instance C differs in case only, "contains" is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const shakespeareSearchValue = `${marcPrefix}_SHAKE`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const homerName = `${marcPrefix}_Homer`;
// "starts with" is case-insensitive, so the value typed in the UI differs in case from the 583 $a values
const actionNotePreserved = `${marcPrefix}_Action note preserved`;
const actionNoteReviewed = `${marcPrefix}_Action note reviewed`;
const actionNoteSearchValue = `${marcPrefix}_ACTION`;
const hamletSubtitle = `${marcPrefix}_HAMLET`;
// Every record of this run has the unique beginning in its 245 field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `MARC 245 contains ${marcPrefix}`;

const marcInstances = {
  instanceA: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .A1 2026'),
      marcField('050', '$a QA76 $b .A1 2026', ['0', '4']),
      marcField('100', `$a ${shakespeareName} $d 1564-1616`, ['1', blank]),
      marcField('245', `$a ${marcPrefix}_Hamlet $c William Shakespeare`, ['1', '0']),
      marcField('260', `$a London $b ${marcPrefix}_Press $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix}_General note alpha`),
      marcField('583', `$a ${actionNotePreserved} $3 correspondence`),
      marcField('600', '$a Shakespeare, William $d 1564-1616', ['1', '0']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('800', `$a ${marcPrefix}_Series author, Bob`, ['1', blank]),
      marcField('856', `$u ${urlA} $3 full text`, ['4', '0']),
    ],
  },
  instanceB: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .B2 2026', [blank, '0']),
      marcField('100', `$a ${marloweName} $d 1564-1593`, ['1', blank]),
      marcField(
        '245',
        `$a ${marcPrefix}_The Doctor Faustus $b ${hamletSubtitle} $c Christopher Marlowe`,
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
      marcField('856', `$u ${urlB}`, ['4', '0']),
      marcField('856', `$u ${urlBArchive}`, ['1', '8']),
    ],
  },
  instanceC: {
    fields: [
      field008,
      marcField('050', '$a pr2848 $b qa.c3 2026', ['0', '4']),
      marcField('100', `$a ${shakespeareNameUpperCase} $d 1564-1616`, ['1', blank]),
      marcField('245', `$a ${marcPrefix}_SONNETS $c WILLIAM SHAKESPEARE`, ['0', '0']),
      marcField('260', `$a Boston $b ${marcPrefix}_house $c 2024`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix.toLowerCase()}_general note delta`),
      marcField('583', `$a ${actionNoteReviewed} $3 email`, ['1', blank]),
      marcField('600', '$a SHAKESPEARE, WILLIAM $d 1564-1616', ['1', '0']),
      marcField('800', `$a ${marcPrefix}_Series author, Bob`, ['1', blank]),
      marcField('856', `$u ${urlC}`, ['4', '0']),
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
      marcField('856', `$u ${urlE1}`, ['4', '0']),
      marcField('856', `$u ${urlE2}`, ['4', '0']),
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
        'C1464316 Query Instances with MARC bibliographic by marc_<tag>_<indicator>_<subfield> (athena)',
        { tags: ['criticalPath', 'athena', 'C1464316'] },
        () => {
          // Precondition: open "Build query" for the "Instances with MARC bibliographic" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select MARC field, enter 856 in "Tag", 4 in "Indicator 1" and u in "Subfield"
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('856');
          QueryModal.fillInMarcIndicator1('4');
          QueryModal.fillInMarcSubfield('u');
          QueryModal.verifyMarcTagValue('856');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '4', subfield: 'u' });
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Search by marc_856_ind1_4_u field using "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(urlA);
          QueryModal.verifyMarcValueTextfield(urlA);
          QueryModal.verifyQueryAreaContent(`(${column856Ind1U} == ${urlA})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column856Ind1U, [urlA]);
          [instanceB, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 3: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.verifyQuery(`${column856Ind1U} == ${urlA}`);
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 4: Click "View updated list" link, check the row and the column of the saved list
            Lists.viewUpdatedList();
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column856Ind1U, [urlA], {
              inBuildQueryForm: false,
            });

            // Step 5: Click "Actions" menu > "Export selected columns (CSV)"
            Lists.openActions();
            Lists.exportListVisibleColumns();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column856Ind1U,
              instanceA.hrid,
              urlA,
            ]);

            // Step 6: Click "Actions" menu > "Edit list"
            Lists.openActions();
            Lists.editList();
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column856Ind1U, [urlA], {
              inBuildQueryForm: false,
            });

            // Step 7: Click "Edit query" button, check the saved condition is preserved
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('856');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '4', subfield: 'u' });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.verifyMarcValueTextfield(urlA);
            QueryModal.verifyQueryAreaContent(`(${column856Ind1U} == ${urlA})`);
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 8: Search by marc_260_ind1_blank_c field using "not equal to" operator
            QueryModal.fillInMarcTag('260');
            QueryModal.fillInMarcIndicator1(blank);
            QueryModal.fillInMarcSubfield('c');
            QueryModal.verifyMarcTagValue('260');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, subfield: 'c' });
            QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
            QueryModal.fillInMarcValueTextfield('2025');
            QueryModal.verifyMarcValueTextfield('2025');
            QueryModal.addNewRow();
            QueryModal.verifyBooleanColumn(1);
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('245', 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column260Ind1C} != 2025) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(4);
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column260Ind1C, ['2026']);
            QueryModal.verifyResultTableColumnValues(instanceC.hrid, column260Ind1C, ['2024']);
            QueryModal.verifyResultTableColumnValues(instanceD.hrid, column260Ind1C, []);
            QueryModal.verifyResultTableColumnValues(instanceE.hrid, column260Ind1C, []);
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instanceB.hrid);

            // Step 9: Search by marc_100_ind2_blank_a field using "contains" operator
            QueryModal.clickGarbage(1);
            QueryModal.fillInMarcTag('100');
            QueryModal.fillInMarcIndicator1('');
            QueryModal.fillInMarcIndicator2(blank);
            QueryModal.fillInMarcSubfield('a');
            QueryModal.verifyMarcTagValue('100');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank, subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield(shakespeareSearchValue);
            QueryModal.verifyMarcValueTextfield(shakespeareSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${column100Ind2A} contains ${shakespeareSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column100Ind2A, [
              shakespeareName,
            ]);
            QueryModal.verifyResultTableColumnValues(instanceC.hrid, column100Ind2A, [
              shakespeareNameUpperCase,
            ]);
            [instanceB, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 10: Search by marc_583_ind2_blank_a field using "starts with" operator
            QueryModal.fillInMarcTag('583');
            QueryModal.verifyMarcTagValue('583');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank, subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(actionNoteSearchValue);
            QueryModal.verifyMarcValueTextfield(actionNoteSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${column583Ind2A} starts with ${actionNoteSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnValues(instanceA.hrid, column583Ind2A, [
              actionNotePreserved,
            ]);
            QueryModal.verifyResultTableColumnValues(instanceC.hrid, column583Ind2A, [
              actionNoteReviewed,
            ]);
            [instanceB, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 11: Search by marc_600_ind1_1_d field using "is null/empty" operator with "True"
            QueryModal.fillInMarcTag('600');
            QueryModal.fillInMarcIndicator1('1');
            QueryModal.fillInMarcIndicator2('');
            QueryModal.fillInMarcSubfield('d');
            QueryModal.verifyMarcTagValue('600');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'd' });
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
              `(${column600Ind1D} is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(3);
            [instanceB, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, column600Ind1D, []);
            });
            [instanceA, instanceC].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });

            // Step 12: Search by marc_245_ind1_1_b field using "is null/empty" operator with "False"
            QueryModal.fillInMarcTag('245');
            QueryModal.fillInMarcSubfield('b');
            QueryModal.verifyMarcTagValue('245');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'b' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(${column245Ind1B} is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnValues(instanceB.hrid, column245Ind1B, [
              hamletSubtitle,
            ]);
            [instanceA, instanceC, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });
          });
          cy.screenshot('C1464316-passed');
        },
      );
    });
  });
});
