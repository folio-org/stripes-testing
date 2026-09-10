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

const testCaseId = 'C1464315';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const marcFieldOption = 'MARC bibliographic — MARC';
const marcIndicatorColumn = (tag, indicator, value) => `MARC ${tag} ind${indicator}=${value}`;
const column600Ind1 = marcIndicatorColumn('600', 1, '1');
const column800Ind1 = marcIndicatorColumn('800', 1, '1');
const column245Ind2 = marcIndicatorColumn('245', 2, '0');
const column260Ind2 = marcIndicatorColumn('260', 2, 'blank');
const column100Ind1 = marcIndicatorColumn('100', 1, '1');
const column583Ind1 = marcIndicatorColumn('583', 1, 'blank');
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
const field008 = { tag: '008', content: QuickMarcEditor.defaultValid008Values };
const rdaContent = '$a text $b txt $2 rdacontent';
// The 600 $a value of Instance A and Instance C differs in case only, "equals" is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const shakespeareDates = '1564-1616';
const seriesAuthor = `${marcPrefix}_Series author, Bob`;
const actionNotePreserved = `${marcPrefix}_Action note preserved`;
const londonPlace = `${marcPrefix}_London`;
const oxfordPlace = `${marcPrefix}_Oxford`;
const parisPlace = `${marcPrefix}_Paris`;
const bostonPlace = `${marcPrefix}_Boston`;
const pressName = `${marcPrefix}_Press`;
const editionsName = `${marcPrefix}_Editions`;
// "starts with" is case-insensitive, so the value typed in the UI differs in case from the 260 $a value
const oxfordSearchValue = `${marcPrefix}_OXFORD`;
const hamletTitle = `${marcPrefix}_Hamlet`;
const sonnetsTitle = `${marcPrefix}_SONNETS`;
const minimalRecordTitle = `${marcPrefix}_Minimal record`;
const electronicTitle = `${marcPrefix}_Electronic occurrence test title`;
// Every record of this run has the unique beginning in its 245 field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty True" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `MARC 245 contains ${marcPrefix}`;

const marcInstances = {
  instanceA: {
    fields: [
      field008,
      marcField('050', '$a PR2754 $b .A1 2026'),
      marcField('050', '$a QA76 $b .A1 2026', ['0', '4']),
      marcField('100', '$a Shakespeare, William $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${hamletTitle} $c William Shakespeare`, ['1', '0']),
      marcField('260', `$a ${londonPlace} $b ${pressName} $c 2026`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix}_General note alpha`),
      marcField('583', `$a ${actionNotePreserved} $3 correspondence`),
      marcField('600', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', '0']),
      marcField('700', `$a ${marcPrefix}_Editor, Ann`, ['1', blank]),
      marcField('800', `$a ${seriesAuthor}`, ['1', blank]),
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
      marcField('260', `$a ${oxfordPlace} $b ${pressName} $c 2025`),
      marcField('260', `$a ${parisPlace} $b ${editionsName} $c 2026`),
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
      marcField('100', '$a SHAKESPEARE, WILLIAM $d 1564-1616', ['1', blank]),
      marcField('245', `$a ${sonnetsTitle} $c WILLIAM SHAKESPEARE`, ['0', '0']),
      marcField('260', `$a ${bostonPlace} $b ${marcPrefix}_house $c 2024`),
      marcField('336', rdaContent),
      marcField('500', `$a ${marcPrefix.toLowerCase()}_general note delta`),
      marcField('583', `$a ${marcPrefix}_Action note reviewed $3 email`, ['1', blank]),
      marcField('600', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', '0']),
      marcField('800', `$a ${seriesAuthor}`, ['1', blank]),
      marcField('856', '$u https://at-marcind.example.org/c', ['4', '0']),
    ],
  },
  instanceD: {
    fields: [
      field008,
      marcField('100', '$a Homer', ['0', blank]),
      marcField('245', `$a ${minimalRecordTitle}`, ['1', '0']),
    ],
  },
  instanceE: {
    fields: [
      field008,
      marcField('245', `$a ${electronicTitle}`, ['1', '0']),
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
        'C1464315 Query Instances with MARC bibliographic by marc_<tag>_<indicator> (athena)',
        { tags: ['criticalPath', 'athena', 'C1464315'] },
        () => {
          // Precondition: open "Build query" for the "Instances with MARC bibliographic" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select MARC field, enter 600 in "Tag" and 1 in "Indicator 1", check supported operators
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('600');
          QueryModal.fillInMarcIndicator1('1');
          QueryModal.verifyMarcTagValue('600');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1' });
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Search by marc_600_ind1_1 field using "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(shakespeareName);
          QueryModal.verifyMarcValueTextfield(shakespeareName);
          QueryModal.verifyQueryAreaContent(`(${column600Ind1} == ${shakespeareName})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column600Ind1, [
            shakespeareName,
            shakespeareDates,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, column600Ind1, [
            shakespeareNameUpperCase,
            shakespeareDates,
          ]);
          [instanceB, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 3: Search by marc_800_ind1_1 field using "not equal to" operator
          QueryModal.fillInMarcTag('800');
          QueryModal.verifyMarcTagValue('800');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1' });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(seriesAuthor);
          QueryModal.verifyMarcValueTextfield(seriesAuthor);
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('245', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(marcPrefix, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column800Ind1} != ${seriesAuthor}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          [instanceB, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyResultTableColumnValues(instance.hrid, column800Ind1, []);
          });
          [instanceA, instanceC].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 4: Search by marc_245_ind2_0 field using "contains" operator
          QueryModal.clickGarbage(1);
          QueryModal.fillInMarcTag('245');
          QueryModal.fillInMarcIndicator1('');
          QueryModal.fillInMarcIndicator2('0');
          QueryModal.verifyMarcTagValue('245');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: '0' });
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(marcPrefix);
          QueryModal.verifyMarcValueTextfield(marcPrefix);
          QueryModal.verifyQueryAreaContent(`(${column245Ind2} contains ${marcPrefix})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column245Ind2, [
            hamletTitle,
            'William Shakespeare',
          ]);
          QueryModal.verifyResultTableColumnValues(instanceC.hrid, column245Ind2, [
            sonnetsTitle,
            'WILLIAM SHAKESPEARE',
          ]);
          QueryModal.verifyResultTableColumnValues(instanceD.hrid, column245Ind2, [
            minimalRecordTitle,
          ]);
          QueryModal.verifyResultTableColumnValues(instanceE.hrid, column245Ind2, [
            electronicTitle,
          ]);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instanceB.hrid);

          // Step 5: Search by marc_260_ind2_blank field using "starts with" operator
          QueryModal.fillInMarcTag('260');
          QueryModal.fillInMarcIndicator2(blank);
          QueryModal.verifyMarcTagValue('260');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank });
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInMarcValueTextfield(oxfordSearchValue);
          QueryModal.verifyMarcValueTextfield(oxfordSearchValue);
          QueryModal.verifyQueryAreaContent(`(${column260Ind2} starts with ${oxfordSearchValue})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnValues(instanceB.hrid, column260Ind2, [
            oxfordPlace,
            pressName,
            '2025',
            parisPlace,
            editionsName,
            '2026',
          ]);
          [instanceA, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 6: Search by marc_100_ind1_1 field using "is null/empty" operator with "True" value
          QueryModal.fillInMarcTag('100');
          QueryModal.fillInMarcIndicator1('1');
          QueryModal.fillInMarcIndicator2('');
          QueryModal.verifyMarcTagValue('100');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1' });
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
            `(${column100Ind1} is null/empty True) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          [instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyResultTableColumnValues(instance.hrid, column100Ind1, []);
          });
          [instanceA, instanceB, instanceC].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 7: Search by marc_583_ind1_blank field using "is null/empty" operator with "False" value
          QueryModal.clickGarbage(1);
          QueryModal.fillInMarcTag('583');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.verifyMarcTagValue('583');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank });
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.selectValueFromSelect('False');
          QueryModal.verifySelectedValue('False');
          QueryModal.verifyQueryAreaContent(`(${column583Ind1} is null/empty False)`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column583Ind1, [
            actionNotePreserved,
            'correspondence',
          ]);
          [instanceB, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });

          // Step 8: Add a row and search by the non-MARC "Instance — Source" field
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(instanceFieldValues.instanceSource, 1);
          QueryModal.verifySelectedField(instanceFieldValues.instanceSource, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('MARC', 1);
          QueryModal.verifySelectedValue('MARC', 1);
          QueryModal.verifyQueryAreaContent(
            `(${column583Ind1} is null/empty False) AND (instance.source == MARC)`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyResultTableColumnValues(instanceA.hrid, column583Ind1, [
            actionNotePreserved,
            'correspondence',
          ]);
          QueryModal.verifyResultTableColumnValues(
            instanceA.hrid,
            instanceFieldValues.instanceSource,
            ['MARC'],
          );
          [instanceB, instanceC, instanceD, instanceE].forEach((instance) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(instance.hrid);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 9: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(${column583Ind1} is null/empty False) AND (instance.source == MARC)`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 10: Click "View updated list" link, check the row and the columns of the saved list
            Lists.viewUpdatedList();
            QueryModal.verifyResultTableColumnValues(
              instanceA.hrid,
              column583Ind1,
              [actionNotePreserved, 'correspondence'],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceA.hrid,
              instanceFieldValues.instanceSource,
              ['MARC'],
              { inBuildQueryForm: false },
            );

            // Step 11: Click "Actions" menu > "Export selected columns (CSV)"
            Lists.openActions();
            Lists.exportListVisibleColumns();
            Lists.verifyExportCallouts(listName);
            // Em dashes are replaced with hyphens in the exported file
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column583Ind1,
              instanceFieldValues.instanceSource.replace('—', '-'),
              instanceA.hrid,
              actionNotePreserved,
              'correspondence',
            ]);

            // Step 12: Click "Actions" menu > "Edit list"
            Lists.openActions();
            Lists.editList();
            QueryModal.verifyResultTableColumnValues(
              instanceA.hrid,
              column583Ind1,
              [actionNotePreserved, 'correspondence'],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              instanceA.hrid,
              instanceFieldValues.instanceSource,
              ['MARC'],
              { inBuildQueryForm: false },
            );

            // Step 13: Click "Edit query" button, check the saved conditions are preserved
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('583');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedValue('False');
            QueryModal.verifySelectedField(instanceFieldValues.instanceSource, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.verifySelectedValue('MARC', 1);
            QueryModal.verifyQueryAreaContent(
              `(${column583Ind1} is null/empty False) AND (instance.source == MARC)`,
            );
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();
          });
          cy.screenshot('C1464315-passed');
        },
      );
    });
  });
});
