import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile from '../../../../support/fragments/lists/lists-file';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

const testCaseId = 'C1474744';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const localSourceFileName = `AT_${testCaseId}_LocalSF_${randomPostfix}`;
const localSourceFileCode = `atc${getRandomLetters(6)}`;
const marcFieldOption = 'MARC Authority — MARC';
const marcColumn = (tag, subfield) => `MARC ${tag}$${subfield}`;
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
// The authority file of a record is resolved from the prefix of its natural ID: "n" belongs to LCNAF,
// the code of the local authority file belongs to that file. The digits after the prefix are the same
// for every record of this run
const naturalIdDigits = `${randomNDigitNumber(12)}`;
const naturalIds = {
  AA: `n${naturalIdDigits}1`,
  AB: `n${naturalIdDigits}2`,
  AC: `n${naturalIdDigits}3`,
  AD: `n${naturalIdDigits}4`,
  AE: `${localSourceFileCode}${naturalIdDigits}5`,
  AF: `n${naturalIdDigits}6`,
};
const canceledNaturalIdAC = `n${naturalIdDigits}93`;
// Record AD has no 035 field at all
const systemControlNumbers = {
  AA: [`(OCoLC)${marcPrefix}_AA1`],
  AB: [`(OCoLC)${marcPrefix}_AB1`, `(DE-588)${marcPrefix}_AB2`],
  AC: [`(ocolc)${marcPrefix.toLowerCase()}_ac1`],
  AE: [`(OCoLC)${marcPrefix}_AE1`],
  AF: [`(OCoLC)${marcPrefix}_AF1`],
};
const fields035 = (record) => {
  return systemControlNumbers[record].map((value) => marcField('035', `$a ${value}`));
};
// The 1XX, 4XX and 5XX values of record AA and record AC differ in case only, subfield-level
// matching is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const shakspereName = `${marcPrefix}_Shakspere, William`;
const shakspereNameLowerCase = `${marcPrefix}_shakspere, william`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const marlowName = `${marcPrefix}_Marlow, Kit`;
const marloweFamilyName = `${marcPrefix}_Marlowe family`;
const minimalName = `${marcPrefix}_Minimal, Mary`;
const homerusName = `${marcPrefix}_Homerus`;
const homerName = `${marcPrefix}_Homer`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
// Every record of this run carries the same digits in its 010 $a field. The condition below is added as
// the second row to narrow the queries down to these records (the test case notes allow extra filters)
const narrowingCondition = `MARC 010$a contains ${naturalIdDigits}`;

const authorityRecords = {
  recordAA: {
    naturalId: naturalIds.AA,
    systemControlNumbers: systemControlNumbers.AA,
    fields: [
      marcField('010', `$a ${naturalIds.AA}`),
      ...fields035('AA'),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${shakspereName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Alphabeta, Carla $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${marcPrefix}_Source citation alpha $b ${marcPrefix}_Info found alpha`),
    ],
  },
  recordAB: {
    naturalId: naturalIds.AB,
    systemControlNumbers: systemControlNumbers.AB,
    fields: [
      marcField('010', `$a ${naturalIds.AB}`),
      ...fields035('AB'),
      marcField('100', `$a ${marloweName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marlowName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marloweFamilyName}`, ['3', blank]),
      marcField('500', `$a ${marcPrefix}_Alpha, Anna $d 1901-1981`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Beta, Bruno $d 1902-1982`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Gamma family`, ['3', blank]),
      marcField('670', `$a ${marcPrefix}_Source citation beta $b ${marcPrefix}_Info found beta`),
      marcField('670', `$a ${marcPrefix}_Source citation gamma $b ${marcPrefix}_Info found gamma`),
    ],
  },
  recordAC: {
    naturalId: naturalIds.AC,
    systemControlNumbers: systemControlNumbers.AC,
    fields: [
      marcField('010', `$a ${naturalIds.AC} $z ${canceledNaturalIdAC}`),
      ...fields035('AC'),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${shakspereNameLowerCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_ALPHABETA, CARLA $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${marcPrefix.toLowerCase()}_source citation delta`),
    ],
  },
  recordAD: {
    naturalId: naturalIds.AD,
    fields: [
      marcField('010', `$a ${naturalIds.AD}`),
      marcField('100', `$a ${minimalName}`, ['1', blank]),
    ],
  },
  recordAE: {
    naturalId: naturalIds.AE,
    systemControlNumbers: systemControlNumbers.AE,
    fields: [
      marcField('010', `$a ${naturalIds.AE}`),
      ...fields035('AE'),
      marcField('110', `$a ${marcPrefix}_Globe Theatre Company`, ['2', blank]),
      marcField('410', `$a ${marcPrefix}_Globe Players`, ['2', blank]),
      marcField('510', `$a ${marcPrefix}_Rose Theatre Company`, ['2', blank]),
      marcField(
        '670',
        `$a ${marcPrefix}_Source citation epsilon $b ${marcPrefix}_Info found epsilon`,
      ),
    ],
  },
  recordAF: {
    naturalId: naturalIds.AF,
    systemControlNumbers: systemControlNumbers.AF,
    fields: [
      marcField('010', `$a ${naturalIds.AF}`),
      ...fields035('AF'),
      marcField('100', `$a ${homerusName}`, ['0', blank]),
      marcField('400', `$a ${homerName}`, ['0', blank]),
      marcField('500', `$a ${marcPrefix}_Vergilius`, ['0', blank]),
      marcField('670', `$a ${marcPrefix}_Source citation zeta $b ${marcPrefix}_Info found zeta`),
    ],
  },
};
const { recordAA, recordAB, recordAC, recordAD, recordAE, recordAF } = authorityRecords;
const allRecords = Object.values(authorityRecords);

const capabSetsToAssign = [
  CapabilitySets.moduleListsManage,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
  CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
];

let user;
let localSourceFileId;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`AT_${testCaseId}`);
        cy.getAuthoritySourceFileDataViaAPI(`AT_${testCaseId}_`).then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        // Record AE belongs to this local authority file, the other records belong to LCNAF
        cy.createAuthoritySourceFileViaAPI({
          name: localSourceFileName,
          code: localSourceFileCode,
        }).then((body) => {
          localSourceFileId = body.id;
          cy.wait(70_000); // Wait for the source file to be processed
          cy.getAdminToken();

          allRecords.forEach((record) => {
            MarcAuthorities.createMarcAuthorityViaAPI(record.naturalId, '', record.fields).then(
              (authorityId) => {
                record.id = authorityId;
              },
            );
          });

          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssign);

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
        allRecords.forEach((record) => {
          MarcAuthority.deleteViaAPI(record.id, true);
        });
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localSourceFileName);
        cy.deleteAuthoritySourceFileViaAPI(localSourceFileId, true);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(`*${listName}*`);
      });

      it(
        'C1474744 Query Authorities by marc_<tag>_<subfield> (athena)',
        { tags: ['criticalPath', 'athena', 'C1474744'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Search by marc_100_a field using "equals" operator
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('100');
          QueryModal.fillInMarcSubfield('a');
          QueryModal.verifyMarcTagValue('100');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
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
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, marcColumn('100', 'a'), [
            shakespeareName,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAC.naturalId, marcColumn('100', 'a'), [
            shakespeareNameUpperCase,
          ]);
          [recordAB, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 2: Search by marc_400_a field using "not equal to" operator
          QueryModal.fillInMarcTag('400');
          QueryModal.verifyMarcTagValue('400');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(shakspereName);
          QueryModal.verifyMarcValueTextfield(shakspereName);
          // "not equal to" also matches the records without the queried field, so the second condition
          // narrows the result down to the records created in preconditions
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('010', 1);
          QueryModal.fillInMarcSubfield('a', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
          QueryModal.verifyQueryAreaContent(
            `(MARC 400$a != ${shakspereName}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('400', 'a'));
          QueryModal.verifyResultTableColumnValues(recordAB.naturalId, marcColumn('400', 'a'), [
            marlowName,
            marloweFamilyName,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAD.naturalId, marcColumn('400', 'a'), []);
          QueryModal.verifyResultTableColumnValues(recordAE.naturalId, marcColumn('400', 'a'), []);
          QueryModal.verifyResultTableColumnValues(recordAF.naturalId, marcColumn('400', 'a'), [
            homerName,
          ]);
          [recordAA, recordAC].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 3: Search by marc_100_a AND marc_100_d fields using "contains" operator.
          // The AND row added in step 2 is reused here, so the query has the two conditions of the step
          QueryModal.fillInMarcTag('100');
          QueryModal.verifyMarcTagValue('100');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(`${marcPrefix}_`);
          QueryModal.verifyMarcValueTextfield(`${marcPrefix}_`);
          QueryModal.verifySelectedField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('100', 1);
          QueryModal.fillInMarcSubfield('d', 1);
          QueryModal.verifyMarcTagValue('100', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'd' }, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield('1564', 1);
          QueryModal.verifyMarcValueTextfield('1564', 1);
          QueryModal.verifyQueryAreaContent(
            `(MARC 100$a contains ${marcPrefix}_) AND (MARC 100$d contains 1564)`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'a'));
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'd'));
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, marcColumn('100', 'a'), [
            shakespeareName,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAB.naturalId, marcColumn('100', 'a'), [
            marloweName,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAC.naturalId, marcColumn('100', 'a'), [
            shakespeareNameUpperCase,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, marcColumn('100', 'd'), [
            shakespeareDates,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAB.naturalId, marcColumn('100', 'd'), [
            marloweDates,
          ]);
          QueryModal.verifyResultTableColumnValues(recordAC.naturalId, marcColumn('100', 'd'), [
            shakespeareDates,
          ]);
          [recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 4: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(MARC 100$a contains ${marcPrefix}_) AND (MARC 100$d contains 1564)`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 5: Click "View updated list" link, check the rows and MARC columns of the saved list
            Lists.viewUpdatedList();
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'a'), {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('100', 'd'), {
              inBuildQueryForm: false,
            });
            QueryModal.verifyResultTableColumnValues(
              recordAA.naturalId,
              marcColumn('100', 'a'),
              [shakespeareName],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              recordAB.naturalId,
              marcColumn('100', 'a'),
              [marloweName],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              recordAC.naturalId,
              marcColumn('100', 'a'),
              [shakespeareNameUpperCase],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              recordAA.naturalId,
              marcColumn('100', 'd'),
              [shakespeareDates],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              recordAB.naturalId,
              marcColumn('100', 'd'),
              [marloweDates],
              { inBuildQueryForm: false },
            );
            QueryModal.verifyResultTableColumnValues(
              recordAC.naturalId,
              marcColumn('100', 'd'),
              [shakespeareDates],
              { inBuildQueryForm: false },
            );

            // Step 6: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              marcColumn('100', 'a'),
              marcColumn('100', 'd'),
              recordAA.naturalId,
              recordAB.naturalId,
              recordAC.naturalId,
              shakespeareName,
              marloweName,
              shakespeareNameUpperCase,
              shakespeareDates,
              marloweDates,
            ]);
            ListsFile.verifyCsvFileRowsRecordsNumber(listName, 3);

            // Step 7: Click "Actions" menu > "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('100');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifyMarcValueTextfield(`${marcPrefix}_`);
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('100', 1);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'd' }, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.verifyMarcValueTextfield('1564', 1);
            QueryModal.verifyQueryAreaContent(
              `(MARC 100$a contains ${marcPrefix}_) AND (MARC 100$d contains 1564)`,
            );
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 8: Remove the second condition, search by marc_010_a field using "starts with" operator
            QueryModal.clickGarbage(1);
            QueryModal.fillInMarcTag('010');
            QueryModal.fillInMarcSubfield('a');
            QueryModal.verifyMarcTagValue('010');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(`n${naturalIdDigits}`);
            QueryModal.verifyMarcValueTextfield(`n${naturalIdDigits}`);
            QueryModal.verifyQueryAreaContent(`(MARC 010$a starts with n${naturalIdDigits})`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('010', 'a'));
            [recordAA, recordAB, recordAC, recordAD, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(record.naturalId, marcColumn('010', 'a'), [
                record.naturalId,
              ]);
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAE.naturalId);

            // Step 9: Search by marc_500_a field using "is null/empty" operator with "True" value
            QueryModal.fillInMarcTag('500');
            QueryModal.verifyMarcTagValue('500');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            // "is null/empty" matches every record without the queried field, so the second condition
            // narrows the result down to the records created in preconditions
            QueryModal.addNewRow();
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('010', 1);
            QueryModal.fillInMarcSubfield('a', 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(MARC 500$a is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('500', 'a'));
            QueryModal.verifyResultTableColumnValues(
              recordAD.naturalId,
              marcColumn('500', 'a'),
              [],
            );
            QueryModal.verifyResultTableColumnValues(
              recordAE.naturalId,
              marcColumn('500', 'a'),
              [],
            );
            [recordAA, recordAB, recordAC, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });

            // Step 10: Search by marc_035_a field using "is null/empty" operator with "False" value
            QueryModal.fillInMarcTag('035');
            QueryModal.verifyMarcTagValue('035');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(MARC 035$a is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('035', 'a'));
            [recordAA, recordAB, recordAC, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                marcColumn('035', 'a'),
                record.systemControlNumbers,
              );
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAD.naturalId);

            // Step 11: Add an AND condition with the "Source file — Name" field
            QueryModal.addNewRow(1);
            QueryModal.selectField(AUTHORITY_QUERY_FIELDS.SOURCE_FILE_NAME, 2);
            QueryModal.verifySelectedField(AUTHORITY_QUERY_FIELDS.SOURCE_FILE_NAME, 2);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 2);
            QueryModal.chooseValueSelect(localSourceFileName, 2);
            // Non-MARC conditions are rendered with the name of the field, not with its label
            QueryModal.verifyQueryAreaContent(
              `(MARC 035$a is null/empty False) AND (${narrowingCondition}) AND (source_file.name == ${localSourceFileName})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnValues(
              recordAE.naturalId,
              marcColumn('035', 'a'),
              recordAE.systemControlNumbers,
            );
            QueryModal.verifyResultTableColumnValues(
              recordAE.naturalId,
              AUTHORITY_QUERY_FIELDS.SOURCE_FILE_NAME,
              [localSourceFileName],
            );
            [recordAA, recordAB, recordAC, recordAD, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });
          });
        },
      );
    });
  });
});
