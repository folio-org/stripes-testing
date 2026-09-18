import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { AUTHORITY_LISTS_COLUMNS } from '../../../../support/constants';
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

const testCaseId = 'C1474747';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const localSourceFileName = `AT_${testCaseId}_LocalSF_${randomPostfix}`;
const localSourceFileCode = `atc${getRandomLetters(6)}`;
const marcFieldOption = 'MARC Authority — MARC';
const naturalIdCsvHeader = AUTHORITY_LISTS_COLUMNS.AUTHORITY_NATURAL_ID.replace('—', '-');
const marcColumn = (tag, ind1, ind2, subfield) => {
  return `MARC ${tag} ind1=${ind1} ind2=${ind2} $${subfield}`;
};
const column999I = marcColumn('999', 'f', 'f', 'i');
const column999S = marcColumn('999', 'f', 'f', 's');
const column670B = marcColumn('670', 'blank', 'blank', 'b');
const column500A = marcColumn('500', '1', 'blank', 'a');
const column035A = marcColumn('035', 'blank', 'blank', 'a');
const column400A = marcColumn('400', '1', 'blank', 'a');
const column010A = marcColumn('010', 'blank', 'blank', 'a');
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
// The 035, 1XX, 4XX and 5XX values of record AA and record AC differ in case only, matching is
// case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const shakspereName = `${marcPrefix}_Shakspere, William`;
const shakspereNameLowerCase = `${marcPrefix.toLowerCase()}_shakspere, william`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const marlowName = `${marcPrefix}_Marlow, Kit`;
const alphabetaName = `${marcPrefix}_Alphabeta, Carla`;
const alphabetaNameUpperCase = `${marcPrefix}_ALPHABETA, CARLA`;
const alphaAnnaName = `${marcPrefix}_Alpha, Anna`;
const betaBrunoName = `${marcPrefix}_Beta, Bruno`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
const sourceCitation = (name) => `${marcPrefix}_Source citation ${name}`;
const infoFound = (name) => `${marcPrefix}_Info found ${name}`;
// The prefix anchors the "contains alpha" condition to the records of this run, so the number of the
// matched records of the step is absolute
const alphaSearchValue = `${marcPrefix}_Alpha`;
const betaSearchValue = 'beta';
// "starts with" is case-insensitive, so the value typed in the UI differs in case from the 035 $a values
const systemControlNumberSearchValue = `(OCOLC)${marcPrefix}`;
// Every record of this run carries the same digits in its 010 $a field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `${column010A} contains ${naturalIdDigits}`;

const authorityRecords = {
  recordAA: {
    naturalId: naturalIds.AA,
    values035A: [`(OCoLC)${marcPrefix}_AA1`],
    values400A: [shakspereName],
    values500A: [alphabetaName],
    values670B: [infoFound('alpha')],
    fields: [
      marcField('010', `$a ${naturalIds.AA}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AA1`),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${shakspereName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${alphabetaName} $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${sourceCitation('alpha')} $b ${infoFound('alpha')}`),
    ],
  },
  recordAB: {
    naturalId: naturalIds.AB,
    values035A: [`(OCoLC)${marcPrefix}_AB1`, `(DE-588)${marcPrefix}_AB2`],
    values400A: [marlowName],
    values500A: [alphaAnnaName, betaBrunoName],
    values670B: [infoFound('beta'), infoFound('gamma')],
    fields: [
      marcField('010', `$a ${naturalIds.AB}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AB1`),
      marcField('035', `$a (DE-588)${marcPrefix}_AB2`),
      marcField('100', `$a ${marloweName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marlowName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Marlowe family`, ['3', blank]),
      marcField('500', `$a ${alphaAnnaName} $d 1901-1981`, ['1', blank]),
      marcField('500', `$a ${betaBrunoName} $d 1902-1982`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Gamma family`, ['3', blank]),
      marcField('670', `$a ${sourceCitation('beta')} $b ${infoFound('beta')}`),
      marcField('670', `$a ${sourceCitation('gamma')} $b ${infoFound('gamma')}`),
    ],
  },
  recordAC: {
    naturalId: naturalIds.AC,
    values035A: [`(ocolc)${marcPrefix.toLowerCase()}_ac1`],
    values400A: [shakspereNameLowerCase],
    values500A: [alphabetaNameUpperCase],
    values670B: [],
    fields: [
      marcField('010', `$a ${naturalIds.AC} $z ${canceledNaturalIdAC}`),
      marcField('035', `$a (ocolc)${marcPrefix.toLowerCase()}_ac1`),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${shakspereNameLowerCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${alphabetaNameUpperCase} $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${marcPrefix.toLowerCase()}_source citation delta`),
    ],
  },
  recordAD: {
    naturalId: naturalIds.AD,
    values035A: [],
    values400A: [],
    values500A: [],
    values670B: [],
    fields: [
      marcField('010', `$a ${naturalIds.AD}`),
      marcField('100', `$a ${marcPrefix}_Minimal, Mary`, ['1', blank]),
    ],
  },
  recordAE: {
    naturalId: naturalIds.AE,
    values035A: [`(OCoLC)${marcPrefix}_AE1`],
    values400A: [],
    values500A: [],
    values670B: [infoFound('epsilon')],
    fields: [
      marcField('010', `$a ${naturalIds.AE}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AE1`),
      marcField('110', `$a ${marcPrefix}_Globe Theatre Company`, ['2', blank]),
      marcField('410', `$a ${marcPrefix}_Globe Players`, ['2', blank]),
      marcField('510', `$a ${marcPrefix}_Rose Theatre Company`, ['2', blank]),
      marcField('670', `$a ${sourceCitation('epsilon')} $b ${infoFound('epsilon')}`),
    ],
  },
  recordAF: {
    naturalId: naturalIds.AF,
    values035A: [`(OCoLC)${marcPrefix}_AF1`],
    // The 1XX, 4XX and 5XX fields of record AF have "0" as the first indicator
    values400A: [],
    values500A: [],
    values670B: [infoFound('zeta')],
    fields: [
      marcField('010', `$a ${naturalIds.AF}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AF1`),
      marcField('100', `$a ${marcPrefix}_Homerus`, ['0', blank]),
      marcField('400', `$a ${marcPrefix}_Homer`, ['0', blank]),
      marcField('500', `$a ${marcPrefix}_Vergilius`, ['0', blank]),
      marcField('670', `$a ${sourceCitation('zeta')} $b ${infoFound('zeta')}`),
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
                // 999 ff $i of the created MARC record holds the Authority UUID, 999 ff $s the SRS record ID
                record.id = authorityId;
                cy.getSrsRecordsByAuthorityId(authorityId).then((srsRecord) => {
                  record.srsId = srsRecord.id;
                });
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
        'C1474747 Query Authorities by marc_<tag>_<indicator1>_<indicator2>_<subfield> (athena)',
        { tags: ['criticalPath', 'athena', 'C1474747'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Search by marc_999_f_f_i field using "equals" operator
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('999');
          QueryModal.fillInMarcIndicator1('f');
          QueryModal.fillInMarcIndicator2('f');
          QueryModal.fillInMarcSubfield('i');
          QueryModal.verifyMarcTagValue('999');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: 'f',
            ind2: 'f',
            subfield: 'i',
          });
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(recordAA.id);
          QueryModal.verifyMarcValueTextfield(recordAA.id);
          QueryModal.verifyQueryAreaContent(`(${column999I} == ${recordAA.id})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(column999I);
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, column999I, [recordAA.id]);
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 2: Search by marc_999_f_f_s field using "equals" operator
          QueryModal.fillInMarcSubfield('s');
          QueryModal.verifyMarcTagValue('999');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: 'f',
            ind2: 'f',
            subfield: 's',
          });
          // Editing the MARC field keeps the selected operator and clears the value
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(recordAA.srsId);
          QueryModal.verifyMarcValueTextfield(recordAA.srsId);
          QueryModal.verifyQueryAreaContent(`(${column999S} == ${recordAA.srsId})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(column999S);
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, column999S, [
            recordAA.srsId,
          ]);
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 3: Search by marc_670_ind1_blank_ind2_blank_b field using "not equal to" operator
          QueryModal.fillInMarcTag('670');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.fillInMarcIndicator2(blank);
          QueryModal.fillInMarcSubfield('b');
          QueryModal.verifyMarcTagValue('670');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: blank,
            ind2: blank,
            subfield: 'b',
          });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(infoFound('beta'));
          QueryModal.verifyMarcValueTextfield(infoFound('beta'));
          // "not equal to" also matches the records without the queried field, so the second condition
          // narrows the result down to the records created in preconditions
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('010', 1);
          QueryModal.fillInMarcIndicator1(blank, 1);
          QueryModal.fillInMarcIndicator2(blank, 1);
          QueryModal.fillInMarcSubfield('a', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column670B} != ${infoFound('beta')}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          QueryModal.verifyResultTableColumnDisplayed(column670B);
          [recordAA, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column670B,
              record.values670B,
            );
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAB.naturalId);

          // Step 4: Search by marc_500_ind1_1_ind2_blank_a field using "contains" operator twice
          QueryModal.fillInMarcTag('500');
          QueryModal.fillInMarcIndicator1('1');
          QueryModal.fillInMarcSubfield('a');
          QueryModal.verifyMarcTagValue('500');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: '1',
            ind2: blank,
            subfield: 'a',
          });
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(alphaSearchValue);
          QueryModal.verifyMarcValueTextfield(alphaSearchValue);
          // The narrowing row added in the previous step becomes the second condition of this step
          QueryModal.fillInMarcTag('500', 1);
          QueryModal.fillInMarcIndicator1('1', 1);
          QueryModal.fillInMarcIndicator2(blank, 1);
          QueryModal.fillInMarcSubfield('a', 1);
          QueryModal.verifyMarcTagValue('500', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldValues(
            { ind1: '1', ind2: blank, subfield: 'a' },
            1,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(betaSearchValue, 1);
          QueryModal.verifyMarcValueTextfield(betaSearchValue, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column500A} contains ${alphaSearchValue}) AND (${column500A} contains ${betaSearchValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyResultTableColumnDisplayed(column500A);
          [recordAA, recordAB, recordAC].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column500A,
              record.values500A,
            );
          });
          [recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 5: Remove the second condition, search by marc_035_ind1_blank_ind2_blank_a field
          QueryModal.clickGarbage(1);
          QueryModal.fillInMarcTag('035');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.verifyMarcTagValue('035');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: blank,
            ind2: blank,
            subfield: 'a',
          });
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInMarcValueTextfield(systemControlNumberSearchValue);
          QueryModal.verifyMarcValueTextfield(systemControlNumberSearchValue);
          QueryModal.verifyQueryAreaContent(
            `(${column035A} starts with ${systemControlNumberSearchValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          QueryModal.verifyResultTableColumnDisplayed(column035A);
          [recordAA, recordAB, recordAC, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column035A,
              record.values035A,
            );
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAD.naturalId);

          // Step 6: Search by marc_670_ind1_blank_ind2_blank_b field using "is null/empty" with "True"
          QueryModal.fillInMarcTag('670');
          QueryModal.fillInMarcSubfield('b');
          QueryModal.verifyMarcTagValue('670');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({
            ind1: blank,
            ind2: blank,
            subfield: 'b',
          });
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.selectValueFromSelect('True');
          QueryModal.verifySelectedValue('True');
          // "is null/empty True" matches every record without the queried field, so the second condition
          // narrows the result down to the records created in preconditions
          QueryModal.addNewRow();
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('010', 1);
          QueryModal.fillInMarcIndicator1(blank, 1);
          QueryModal.fillInMarcIndicator2(blank, 1);
          QueryModal.fillInMarcSubfield('a', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column670B} is null/empty True) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnDisplayed(column670B);
          [recordAC, recordAD].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(record.naturalId, column670B, []);
          });
          [recordAA, recordAB, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 7: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(${column670B} is null/empty True) AND (${narrowingCondition})`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 8: Click "View updated list" link, check the rows and the MARC column
            Lists.viewUpdatedList();
            Lists.verifyResultColumnDisplayed(column670B);
            [recordAC, recordAD].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(record.naturalId, column670B, [], {
                inBuildQueryForm: false,
              });
            });

            // Step 9: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column670B,
              recordAC.naturalId,
              recordAD.naturalId,
            ]);
            ListsFile.verifyCsvFileRowsRecordsNumber(listName, 2);
            [recordAC, recordAD].forEach((record) => {
              ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
                listName,
                naturalIdCsvHeader,
                record.naturalId,
                [{ header: column670B, value: '' }],
              );
            });

            // Step 10: Click "Actions" menu > "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('670');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({
              ind1: blank,
              ind2: blank,
              subfield: 'b',
            });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedValue('True');
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('010', 1);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues(
              { ind1: blank, ind2: blank, subfield: 'a' },
              1,
            );
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.verifyMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column670B} is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 11: Search by marc_400_ind1_1_ind2_blank_a field using "is null/empty" with "False"
            QueryModal.fillInMarcTag('400');
            QueryModal.fillInMarcIndicator1('1');
            QueryModal.fillInMarcSubfield('a');
            QueryModal.verifyMarcTagValue('400');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({
              ind1: '1',
              ind2: blank,
              subfield: 'a',
            });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(${column400A} is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(3);
            QueryModal.verifyResultTableColumnDisplayed(column400A);
            [recordAA, recordAB, recordAC].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column400A,
                record.values400A,
              );
            });
            [recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });
          });
        },
      );
    });
  });
});
