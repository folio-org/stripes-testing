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

const testCaseId = 'C1464318';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const marcFieldOption = 'MARC bibliographic — MARC';
const marcColumn = (tag, ind1, ind2, subfield) => {
  return `MARC ${tag} ind1=${ind1} ind2=${ind2} $${subfield}`;
};
const column500 = marcColumn('500', 'blank', 'blank', 'a');
// The test case shows "ind2=2" in the expected query of step 3, but both the entered indicator and the
// expected records of that step correspond to a blank second indicator
const column700 = marcColumn('700', '1', 'blank', 'a');
const column600 = marcColumn('600', '1', '0', 'a');
const column856U = marcColumn('856', '4', '0', 'u');
const column856Sub3 = marcColumn('856', '4', '0', '3');
const column050 = marcColumn('050', 'blank', '0', 'a');
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
const field008 = { tag: '008', content: QuickMarcEditor.defaultValid008Values };
const rdaContent = '$a text $b txt $2 rdacontent';
const marcUrl = (suffix) => `https://at-marcind.example.org/${marcPrefix}/${suffix}`;
const urlA = marcUrl('a');
const urlB = marcUrl('b');
const urlC = marcUrl('c');
const urlE1 = marcUrl('e1');
const urlE2 = marcUrl('e2');
const urlBArchive = `ftp://at-marcind.example.org/${marcPrefix}/b-archive`;
const urlSearchValue = `https://at-marcind.example.org/${marcPrefix}`;
const generalNoteAlpha = `${marcPrefix}_General note alpha`;
const generalNoteBeta = `${marcPrefix}_General note beta`;
const generalNoteGamma = `${marcPrefix}_General note gamma`;
const generalNoteDelta = `${marcPrefix.toLowerCase()}_general note delta`;
const editorAnn = `${marcPrefix}_Editor, Ann`;
const translatorCid = `${marcPrefix}_Translator, Cid`;
// The 600 $a value of Instance A and Instance C differs in case only, "contains" is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const shakespeareSearchValue = `${marcPrefix}_shakespeare`;
const callNumberB = 'PR2754';
// Every record of this run has the unique beginning in its 245 field. The condition below is added as the
// second row for the "not equal to" operator, which also matches the records without the queried field and
// therefore most of the records of the tenant (the test case notes allow extra filters)
const narrowingCondition = `MARC 245 contains ${marcPrefix}`;

const marcInstances = {
  instanceA: {
    fields: [
      field008,
      marcField('050', `$a ${callNumberB} $b .A1 2026`),
      marcField('050', '$a QA76 $b .A1 2026', ['0', '4']),
      marcField('100', '$a Shakespeare, William $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${marcPrefix}_Hamlet $c William Shakespeare`, ['1', '0']),
      marcField('260', `$a London $b ${marcPrefix}_Press $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${generalNoteAlpha}`),
      marcField('583', `$a ${marcPrefix}_Action note preserved $3 correspondence`),
      marcField('600', `$a ${shakespeareName} $d 1564-1616`, ['1', '0']),
      marcField('700', `$a ${editorAnn}`, ['1', blank]),
      marcField('800', `$a ${marcPrefix}_Series author, Bob`, ['1', blank]),
      marcField('856', `$u ${urlA} $3 full text`, ['4', '0']),
    ],
  },
  instanceB: {
    fields: [
      field008,
      marcField('050', `$a ${callNumberB} $b .B2 2026`, [blank, '0']),
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
      marcField('600', '$a Marlowe, Christopher $2 local', ['1', '7']),
      marcField('700', `$a ${editorAnn}`, ['1', blank]),
      marcField('700', `$a ${translatorCid}`, ['1', '2']),
      marcField('856', `$u ${urlB}`, ['4', '0']),
      marcField('856', `$u ${urlBArchive}`, ['1', '8']),
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
      marcField('500', `$a ${generalNoteDelta}`),
      marcField('583', `$a ${marcPrefix}_Action note reviewed $3 email`, ['1', blank]),
      marcField('600', `$a ${shakespeareNameUpperCase} $d 1564-1616`, ['1', '0']),
      marcField('800', `$a ${marcPrefix}_Series author, Bob`, ['1', blank]),
      marcField('856', `$u ${urlC}`, ['4', '0']),
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
      marcField('856', `$u ${urlE1}`, ['4', '0']),
      marcField('856', `$u ${urlE2}`, ['4', '0']),
    ],
  },
};
const { instanceA, instanceB, instanceC, instanceD, instanceE } = marcInstances;
const allInstances = Object.values(marcInstances);
const savedListInstances = [instanceB, instanceC, instanceE];

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
        'C1464318 Query Instances with MARC bibliographic by marc_<tag>_<indicator1>_<indicator2>_<subfield> (athena)',
        { tags: ['criticalPath', 'athena', 'C1464318'] },
        () => {
          // Precondition: open "Build query" for the "Instances with MARC bibliographic" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select MARC field, enter 500 in "Tag", \ in both indicators and a in "Subfield"
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('500');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.fillInMarcIndicator2(blank);
          QueryModal.fillInMarcSubfield('a');
          QueryModal.verifyMarcTagValue('500');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: blank,
            ind2: blank,
            subfield: 'a',
          });
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Search by marc_500_ind1_blank_ind2_blank_a field using "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(generalNoteAlpha);
          QueryModal.verifyMarcValueTextfield(generalNoteAlpha);
          QueryModal.verifyQueryAreaContent(`(${column500} == ${generalNoteAlpha})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column500, [generalNoteAlpha]);
          [instanceB, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 3: Search by marc_700_ind1_1_ind2_blank_a field using "not equal to" operator
          QueryModal.fillInMarcTag('700');
          QueryModal.fillInMarcIndicator1('1');
          QueryModal.verifyMarcTagValue('700');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: '1',
            ind2: blank,
            subfield: 'a',
          });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(editorAnn);
          QueryModal.verifyMarcValueTextfield(editorAnn);
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('245', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column700} != ${editorAnn}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          [instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyResultTableColumnValues(instance.hrid, column700, []);
          });
          [instanceA, instanceB].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 4: Search by marc_600_ind1_1_ind2_0_a field using "contains" operator
          QueryModal.clickGarbage(1);
          QueryModal.fillInMarcTag('600');
          QueryModal.fillInMarcIndicator2('0');
          QueryModal.verifyMarcTagValue('600');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', ind2: '0', subfield: 'a' });
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(shakespeareSearchValue);
          QueryModal.verifyMarcValueTextfield(shakespeareSearchValue);
          QueryModal.verifyQueryAreaContent(`(${column600} contains ${shakespeareSearchValue})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column600, [shakespeareName]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, column600, [
            shakespeareNameUpperCase,
          ]);
          [instanceB, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 5: Search by marc_856_ind1_4_ind2_0_u field using "starts with" operator
          QueryModal.fillInMarcTag('856');
          QueryModal.fillInMarcIndicator1('4');
          QueryModal.fillInMarcSubfield('u');
          QueryModal.verifyMarcTagValue('856');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '4', ind2: '0', subfield: 'u' });
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInMarcValueTextfield(urlSearchValue);
          QueryModal.verifyMarcValueTextfield(urlSearchValue);
          QueryModal.verifyQueryAreaContent(`(${column856U} starts with ${urlSearchValue})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column856U, [urlA]);
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, column856U, [urlB]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, column856U, [urlC]);
          QueryModal.verifyResultTableColumnValues(instanceE.hrid, column856U, [urlE1, urlE2]);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instanceD.hrid);

          // Step 6: Add a row and search by marc_856_ind1_4_ind2_0_3 field using "is null/empty"
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.verifySelectedField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('856', 1);
          QueryModal.fillInMarcIndicator1('4', 1);
          QueryModal.fillInMarcIndicator2('0', 1);
          QueryModal.fillInMarcSubfield('3', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldValues(
            { ind1: '4', ind2: '0', subfield: '3' },
            1,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.verifySelectedValue('True', 1);
          QueryModal.verifyQueryAreaContent(
            `(${column856U} starts with ${urlSearchValue}) AND (${column856Sub3} is null/empty True)`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, column856U, [urlB]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, column856U, [urlC]);
          QueryModal.verifyResultTableColumnValues(instanceE.hrid, column856U, [urlE1, urlE2]);
          savedListInstances.forEach((instance) => {
            QueryModal.verifyResultTableColumnValues(instance.hrid, column856Sub3, []);
          });
          [instanceA, instanceD].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 7: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(${column856U} starts with ${urlSearchValue}) AND (${column856Sub3} is null/empty True)`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 8: Click "View updated list" link, check the rows and the columns of the saved list
            Lists.viewUpdatedList();
            savedListInstances.forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, column856Sub3, [], {
                inBuildQueryForm: false,
              });
            });
            QueryModal.verifyResultTableColumnValues(instanceB.hrid, column856U, [urlB], {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnValues(instanceC.hrid, column856U, [urlC], {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnValues(instanceE.hrid, column856U, [urlE1, urlE2], {
              inBuildQueryForm: false,
            });

            // Step 9: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column856U,
              column856Sub3,
              ...savedListInstances.map((instance) => instance.hrid),
              urlB,
              urlC,
              urlE1,
              urlE2,
            ]);

            // Step 10: Click "Actions" menu > "Edit list"
            Lists.openActions();
            Lists.editList();
            savedListInstances.forEach((instance) => {
              QueryModal.verifyResultTableColumnValues(instance.hrid, column856Sub3, [], {
                inBuildQueryForm: false,
              });
            });
            QueryModal.verifyResultTableColumnValues(instanceB.hrid, column856U, [urlB], {
              inBuildQueryForm: false,
            });

            // Step 11: Click "Edit query" button, check the saved conditions are preserved
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('856');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({
              ind1: '4',
              ind2: '0',
              subfield: 'u',
            });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifyMarcValueTextfield(urlSearchValue);
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('856', 1);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues(
              { ind1: '4', ind2: '0', subfield: '3' },
              1,
            );
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 1);
            QueryModal.verifySelectedValue('True', 1);
            QueryModal.verifyQueryAreaContent(
              `(${column856U} starts with ${urlSearchValue}) AND (${column856Sub3} is null/empty True)`,
            );
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 12: Remove the first row, the remaining row keeps its own MARC values
            QueryModal.clickGarbage(0);
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('856');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({
              ind1: '4',
              ind2: '0',
              subfield: '3',
            });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedValue('True');
            QueryModal.verifyQueryAreaContent(`(${column856Sub3} is null/empty True)`);
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 13: Search by marc_050_ind1_blank_ind2_0_a field using "is null/empty" operator
            QueryModal.fillInMarcTag('050');
            QueryModal.fillInMarcIndicator1(blank);
            QueryModal.fillInMarcSubfield('a');
            QueryModal.verifyMarcTagValue('050');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({
              ind1: blank,
              ind2: '0',
              subfield: 'a',
            });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(`(${column050} is null/empty False)`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyResultTableColumnValues(instanceB.hrid, column050, [callNumberB]);
            [instanceA, instanceC, instanceD, instanceE].forEach((instance) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
            });
          });
          cy.screenshot('C1464318-passed');
        },
      );
    });
  });
});
