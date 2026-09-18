import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
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

const testCaseId = 'C1474745';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const localSourceFileName = `AT_${testCaseId}_LocalSF_${randomPostfix}`;
const localSourceFileCode = `atc${getRandomLetters(6)}`;
const marcFieldOption = 'MARC Authority — MARC';
const marcColumn = (tag, indicator, indicatorValue) => {
  return `MARC ${tag} ind${indicator}=${indicatorValue}`;
};
const column035Ind1 = marcColumn('035', 1, 'blank');
const column500Ind1 = marcColumn('500', 1, '1');
const column010Ind2 = marcColumn('010', 2, 'blank');
const column100Ind1 = marcColumn('100', 1, '1');
const column670Ind1 = marcColumn('670', 1, 'blank');
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
// The 035, 100 and 500 values of record AA and record AC differ in case only, matching is case-insensitive
const systemControlNumberAA = `(OCoLC)${marcPrefix}_AA1`;
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const minimalName = `${marcPrefix}_Minimal, Mary`;
const alphaAnnaName = `${marcPrefix}_Alpha, Anna`;
const betaBrunoName = `${marcPrefix}_Beta, Bruno`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
const alphabetaDates = '1900-1980';
const sourceCitation = (name) => `${marcPrefix}_Source citation ${name}`;
const infoFound = (name) => `${marcPrefix}_Info found ${name}`;
const sourceCitationDelta = `${marcPrefix.toLowerCase()}_source citation delta`;
const shakespeareSearchValue = `${marcPrefix}_Shak`;
// "contains" is case-insensitive, so the same set of records is returned for both spellings
const naturalIdSearchValueUpperCase = `N${naturalIdDigits}`;
const naturalIdSearchValue = `n${naturalIdDigits}`;
// Every record of this run carries the same digits in its 010 field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `${column010Ind2} contains ${naturalIdDigits}`;

const authorityRecords = {
  recordAA: {
    naturalId: naturalIds.AA,
    values035Ind1: [systemControlNumberAA],
    values010Ind2: [naturalIds.AA],
    values100Ind1: [shakespeareName, shakespeareDates],
    values500Ind1: [`${marcPrefix}_Alphabeta, Carla`, alphabetaDates],
    values670Ind1: [sourceCitation('alpha'), infoFound('alpha')],
    fields: [
      marcField('010', `$a ${naturalIds.AA}`),
      marcField('035', `$a ${systemControlNumberAA}`),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Shakspere, William $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Alphabeta, Carla $d ${alphabetaDates}`, ['1', blank]),
      marcField('670', `$a ${sourceCitation('alpha')} $b ${infoFound('alpha')}`),
    ],
  },
  recordAB: {
    naturalId: naturalIds.AB,
    values035Ind1: [`(OCoLC)${marcPrefix}_AB1`, `(DE-588)${marcPrefix}_AB2`],
    values010Ind2: [naturalIds.AB],
    values100Ind1: [marloweName, marloweDates],
    values500Ind1: [alphaAnnaName, '1901-1981', betaBrunoName, '1902-1982'],
    values670Ind1: [
      sourceCitation('beta'),
      infoFound('beta'),
      sourceCitation('gamma'),
      infoFound('gamma'),
    ],
    fields: [
      marcField('010', `$a ${naturalIds.AB}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AB1`),
      marcField('035', `$a (DE-588)${marcPrefix}_AB2`),
      marcField('100', `$a ${marloweName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Marlow, Kit $d ${marloweDates}`, ['1', blank]),
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
    values035Ind1: [`(ocolc)${marcPrefix.toLowerCase()}_ac1`],
    values010Ind2: [naturalIds.AC, canceledNaturalIdAC],
    values100Ind1: [shakespeareNameUpperCase, shakespeareDates],
    values500Ind1: [`${marcPrefix}_ALPHABETA, CARLA`, alphabetaDates],
    values670Ind1: [sourceCitationDelta],
    fields: [
      marcField('010', `$a ${naturalIds.AC} $z ${canceledNaturalIdAC}`),
      marcField('035', `$a (ocolc)${marcPrefix.toLowerCase()}_ac1`),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix.toLowerCase()}_shakspere, william $d ${shakespeareDates}`, [
        '1',
        blank,
      ]),
      marcField('500', `$a ${marcPrefix}_ALPHABETA, CARLA $d ${alphabetaDates}`, ['1', blank]),
      marcField('670', `$a ${sourceCitationDelta}`),
    ],
  },
  recordAD: {
    naturalId: naturalIds.AD,
    values035Ind1: [],
    values010Ind2: [naturalIds.AD],
    values100Ind1: [minimalName],
    values500Ind1: [],
    values670Ind1: [],
    fields: [
      marcField('010', `$a ${naturalIds.AD}`),
      marcField('100', `$a ${minimalName}`, ['1', blank]),
    ],
  },
  recordAE: {
    naturalId: naturalIds.AE,
    values035Ind1: [`(OCoLC)${marcPrefix}_AE1`],
    values010Ind2: [naturalIds.AE],
    values100Ind1: [],
    values500Ind1: [],
    values670Ind1: [sourceCitation('epsilon'), infoFound('epsilon')],
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
    values035Ind1: [`(OCoLC)${marcPrefix}_AF1`],
    values010Ind2: [naturalIds.AF],
    // The 1XX, 4XX and 5XX fields of record AF have "0" as the first indicator
    values100Ind1: [],
    values500Ind1: [],
    values670Ind1: [sourceCitation('zeta'), infoFound('zeta')],
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
        'C1474745 Query Authorities by marc_<tag>_<indicator> (athena)',
        { tags: ['criticalPath', 'athena', 'C1474745'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Search by marc_035_ind1_blank field using "equals" operator
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('035');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.verifyMarcTagValue('035');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank });
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(systemControlNumberAA);
          QueryModal.verifyMarcValueTextfield(systemControlNumberAA);
          QueryModal.verifyQueryAreaContent(`(${column035Ind1} == ${systemControlNumberAA})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(column035Ind1);
          QueryModal.verifyResultTableColumnValues(
            recordAA.naturalId,
            column035Ind1,
            recordAA.values035Ind1,
          );
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 2: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.verifyQuery(`${column035Ind1} == ${systemControlNumberAA}`);
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 3: Click "View updated list" link, check the row and the MARC column
            Lists.viewUpdatedList();
            Lists.verifyResultColumnDisplayed(column035Ind1);
            QueryModal.verifyResultTableColumnValues(
              recordAA.naturalId,
              column035Ind1,
              recordAA.values035Ind1,
              { inBuildQueryForm: false },
            );

            // Step 4: Click "Actions" menu > "Export selected columns (CSV)"
            Lists.openActions();
            Lists.exportListVisibleColumns();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column035Ind1,
              recordAA.naturalId,
              systemControlNumberAA,
            ]);
            ListsFile.verifyCsvFileRowsRecordsNumber(listName, 1);

            // Step 5: Click "Actions" menu > "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('035');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.verifyMarcValueTextfield(systemControlNumberAA);
            QueryModal.verifyQueryAreaContent(`(${column035Ind1} == ${systemControlNumberAA})`);

            // Step 6: Search by marc_500_ind1_1 field using "not equal to" operator
            QueryModal.fillInMarcTag('500');
            QueryModal.fillInMarcIndicator1('1');
            QueryModal.verifyMarcTagValue('500');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1' });
            QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
            QueryModal.fillInMarcValueTextfield(alphabetaDates);
            QueryModal.verifyMarcValueTextfield(alphabetaDates);
            // "not equal to" also matches the records without the queried field, so the second condition
            // narrows the result down to the records created in preconditions
            QueryModal.addNewRow();
            QueryModal.verifyBooleanColumn(1);
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('010', 1);
            QueryModal.fillInMarcIndicator2(blank, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column500Ind1} != ${alphabetaDates}) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(4);
            QueryModal.verifyResultTableColumnDisplayed(column500Ind1);
            [recordAB, recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column500Ind1,
                record.values500Ind1,
              );
            });
            [recordAA, recordAC].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });

            // Step 7: Search by marc_010_ind2_blank field using "contains" operator, uppercase value
            QueryModal.clickGarbage(1);
            QueryModal.fillInMarcTag('010');
            QueryModal.fillInMarcIndicator1('');
            QueryModal.fillInMarcIndicator2(blank);
            QueryModal.verifyMarcTagValue('010');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank });
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield(naturalIdSearchValueUpperCase);
            QueryModal.verifyMarcValueTextfield(naturalIdSearchValueUpperCase);
            QueryModal.verifyQueryAreaContent(
              `(${column010Ind2} contains ${naturalIdSearchValueUpperCase})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(column010Ind2);
            [recordAA, recordAB, recordAC, recordAD, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column010Ind2,
                record.values010Ind2,
              );
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAE.naturalId);

            // Step 8: Repeat the search of the previous step with the lowercase value
            QueryModal.verifyMarcTagValue('010');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield(naturalIdSearchValue);
            QueryModal.verifyMarcValueTextfield(naturalIdSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${column010Ind2} contains ${naturalIdSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(column010Ind2);
            [recordAA, recordAB, recordAC, recordAD, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column010Ind2,
                record.values010Ind2,
              );
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAE.naturalId);

            // Step 9: Search by marc_100_ind1_1 field using "starts with" operator
            QueryModal.fillInMarcTag('100');
            QueryModal.fillInMarcIndicator1('1');
            QueryModal.fillInMarcIndicator2('');
            QueryModal.verifyMarcTagValue('100');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1' });
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(shakespeareSearchValue);
            QueryModal.verifyMarcValueTextfield(shakespeareSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${column100Ind1} starts with ${shakespeareSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnDisplayed(column100Ind1);
            [recordAA, recordAC].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column100Ind1,
                record.values100Ind1,
              );
            });
            [recordAB, recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });

            // Step 10: Search by marc_100_ind1_1 field using "is null/empty" operator with "True" value
            QueryModal.verifyMarcTagValue('100');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            // "is null/empty True" matches every record without the queried field, so the second
            // condition narrows the result down to the records created in preconditions
            QueryModal.addNewRow();
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('010', 1);
            QueryModal.fillInMarcIndicator2(blank, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column100Ind1} is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(2);
            QueryModal.verifyResultTableColumnDisplayed(column100Ind1);
            [recordAE, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(record.naturalId, column100Ind1, []);
            });
            [recordAA, recordAB, recordAC, recordAD].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });

            // Step 11: Search by marc_670_ind1_blank field using "is null/empty" operator with "False"
            QueryModal.fillInMarcTag('670');
            QueryModal.fillInMarcIndicator1(blank);
            QueryModal.verifyMarcTagValue('670');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(${column670Ind1} is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(column670Ind1);
            [recordAA, recordAB, recordAC, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column670Ind1,
                record.values670Ind1,
              );
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAD.naturalId);
          });
        },
      );
    });
  });
});
