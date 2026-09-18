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

const testCaseId = 'C1474746';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const localSourceFileName = `AT_${testCaseId}_LocalSF_${randomPostfix}`;
const localSourceFileCode = `atc${getRandomLetters(6)}`;
const marcFieldOption = 'MARC Authority — MARC';
const marcColumn = (tag, indicator, indicatorValue, subfield) => {
  return `MARC ${tag} ind${indicator}=${indicatorValue} $${subfield}`;
};
const column500Ind1A = marcColumn('500', 1, '1', 'a');
const column100Ind1A = marcColumn('100', 1, '1', 'a');
const column100Ind1D = marcColumn('100', 1, '1', 'd');
const column400Ind1A = marcColumn('400', 1, '1', 'a');
const column010Ind2A = marcColumn('010', 2, 'blank', 'a');
const column010Ind2Z = marcColumn('010', 2, 'blank', 'z');
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
// The 1XX, 4XX and 5XX values of record AA and record AC differ in case only, matching is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const marlowName = `${marcPrefix}_Marlow, Kit`;
const minimalName = `${marcPrefix}_Minimal, Mary`;
const alphaAnnaName = `${marcPrefix}_Alpha, Anna`;
const betaBrunoName = `${marcPrefix}_Beta, Bruno`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
const sourceCitation = (name) => `${marcPrefix}_Source citation ${name}`;
const infoFound = (name) => `${marcPrefix}_Info found ${name}`;
const marlowSearchValue = `${marcPrefix}_Marlow`;
const shakespeareDatesSearchValue = '1616';
// Every record of this run carries the same digits in its 010 $a field. The condition below is added as an
// extra row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `${column010Ind2A} contains ${naturalIdDigits}`;

const authorityRecords = {
  recordAA: {
    naturalId: naturalIds.AA,
    values100Ind1A: [shakespeareName],
    values100Ind1D: [shakespeareDates],
    fields: [
      marcField('010', `$a ${naturalIds.AA}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AA1`),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Shakspere, William $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Alphabeta, Carla $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${sourceCitation('alpha')} $b ${infoFound('alpha')}`),
    ],
  },
  recordAB: {
    naturalId: naturalIds.AB,
    values100Ind1A: [marloweName],
    values100Ind1D: [marloweDates],
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
    values100Ind1A: [shakespeareNameUpperCase],
    values100Ind1D: [shakespeareDates],
    fields: [
      marcField('010', `$a ${naturalIds.AC} $z ${canceledNaturalIdAC}`),
      marcField('035', `$a (ocolc)${marcPrefix.toLowerCase()}_ac1`),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix.toLowerCase()}_shakspere, william $d ${shakespeareDates}`, [
        '1',
        blank,
      ]),
      marcField('500', `$a ${marcPrefix}_ALPHABETA, CARLA $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${marcPrefix.toLowerCase()}_source citation delta`),
    ],
  },
  recordAD: {
    naturalId: naturalIds.AD,
    values100Ind1A: [minimalName],
    values100Ind1D: [],
    fields: [
      marcField('010', `$a ${naturalIds.AD}`),
      marcField('100', `$a ${minimalName}`, ['1', blank]),
    ],
  },
  recordAE: {
    naturalId: naturalIds.AE,
    values100Ind1A: [],
    values100Ind1D: [],
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
    // The 1XX, 4XX and 5XX fields of record AF have "0" as the first indicator
    values100Ind1A: [],
    values100Ind1D: [],
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
        'C1474746 Query Authorities by marc_<tag>_<indicator>_<subfield> (athena)',
        { tags: ['criticalPath', 'athena', 'C1474746'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Search by marc_500_ind1_1_a field using "equals" operator
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('500');
          QueryModal.fillInMarcIndicator1('1');
          QueryModal.fillInMarcSubfield('a');
          QueryModal.verifyMarcTagValue('500');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'a' });
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(alphaAnnaName);
          QueryModal.verifyMarcValueTextfield(alphaAnnaName);
          QueryModal.verifyQueryAreaContent(`(${column500Ind1A} == ${alphaAnnaName})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(column500Ind1A);
          QueryModal.verifyResultTableColumnValues(recordAB.naturalId, column500Ind1A, [
            alphaAnnaName,
            betaBrunoName,
          ]);
          [recordAA, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 2: Search by marc_100_ind1_1_a and marc_100_ind1_1_d fields using "not equal to"
          QueryModal.fillInMarcTag('100');
          QueryModal.verifyMarcTagValue('100');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'a' });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(marloweName);
          QueryModal.verifyMarcValueTextfield(marloweName);
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.verifySelectedField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('100', 1);
          QueryModal.fillInMarcIndicator1('1', 1);
          QueryModal.fillInMarcSubfield('d', 1);
          QueryModal.verifyMarcTagValue('100', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'd' }, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInMarcValueTextfield(marloweDates, 1);
          QueryModal.verifyMarcValueTextfield(marloweDates, 1);
          // "not equal to" also matches the records without the queried field, so the third condition
          // narrows the result down to the records created in preconditions
          QueryModal.addNewRow(1);
          QueryModal.selectField(marcFieldOption, 2);
          QueryModal.fillInMarcTag('010', 2);
          QueryModal.fillInMarcIndicator2(blank, 2);
          QueryModal.fillInMarcSubfield('a', 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 2);
          QueryModal.fillInMarcValueTextfield(naturalIdDigits, 2);
          QueryModal.verifyQueryAreaContent(
            `(${column100Ind1A} != ${marloweName}) AND (${column100Ind1D} != ${marloweDates}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          QueryModal.verifyResultTableColumnDisplayed(column100Ind1A);
          QueryModal.verifyResultTableColumnDisplayed(column100Ind1D);
          [recordAA, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column100Ind1A,
              record.values100Ind1A,
            );
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column100Ind1D,
              record.values100Ind1D,
            );
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAB.naturalId);

          // Step 3: Change both conditions to "contains", the narrowing condition is no longer needed
          QueryModal.clickGarbage(2);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(`${marcPrefix}_`);
          QueryModal.verifyMarcValueTextfield(`${marcPrefix}_`);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(shakespeareDatesSearchValue, 1);
          QueryModal.verifyMarcValueTextfield(shakespeareDatesSearchValue, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column100Ind1A} contains ${marcPrefix}_) AND (${column100Ind1D} contains ${shakespeareDatesSearchValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          [recordAA, recordAC].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column100Ind1A,
              record.values100Ind1A,
            );
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              column100Ind1D,
              record.values100Ind1D,
            );
          });
          [recordAB, recordAD, recordAE, recordAF].forEach((record) => {
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
              `(${column100Ind1A} contains ${marcPrefix}_) AND (${column100Ind1D} contains ${shakespeareDatesSearchValue})`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 5: Click "View updated list" link, check the rows and MARC columns of the saved list
            Lists.viewUpdatedList();
            Lists.verifyResultColumnDisplayed(column100Ind1A);
            Lists.verifyResultColumnDisplayed(column100Ind1D);
            [recordAA, recordAC].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column100Ind1A,
                record.values100Ind1A,
                { inBuildQueryForm: false },
              );
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column100Ind1D,
                record.values100Ind1D,
                { inBuildQueryForm: false },
              );
            });

            // Step 6: Click "Actions" menu > "Export selected columns (CSV)"
            Lists.openActions();
            Lists.exportListVisibleColumns();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column100Ind1A,
              column100Ind1D,
              recordAA.naturalId,
              recordAC.naturalId,
              shakespeareName,
              shakespeareNameUpperCase,
              shakespeareDates,
            ]);
            ListsFile.verifyCsvFileRowsRecordsNumber(listName, 2);

            // Step 7: Click "Actions" menu > "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('100');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'a' });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifyMarcValueTextfield(`${marcPrefix}_`);
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('100', 1);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'd' }, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.verifyMarcValueTextfield(shakespeareDatesSearchValue, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column100Ind1A} contains ${marcPrefix}_) AND (${column100Ind1D} contains ${shakespeareDatesSearchValue})`,
            );

            // Step 8: Remove the second condition, search by marc_400_ind1_1_a field
            QueryModal.clickGarbage(1);
            QueryModal.fillInMarcTag('400');
            QueryModal.verifyMarcTagValue('400');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', subfield: 'a' });
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(marlowSearchValue);
            QueryModal.verifyMarcValueTextfield(marlowSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${column400Ind1A} starts with ${marlowSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnDisplayed(column400Ind1A);
            QueryModal.verifyResultTableColumnValues(recordAB.naturalId, column400Ind1A, [
              marlowName,
            ]);
            [recordAA, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });

            // Step 9: Search by marc_010_ind2_blank_z field using "is null/empty" with "True" value
            QueryModal.fillInMarcTag('010');
            QueryModal.fillInMarcIndicator1('');
            QueryModal.fillInMarcIndicator2(blank);
            QueryModal.fillInMarcSubfield('z');
            QueryModal.verifyMarcTagValue('010');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank, subfield: 'z' });
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
            QueryModal.fillInMarcSubfield('a', 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column010Ind2Z} is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(column010Ind2Z);
            [recordAA, recordAB, recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(record.naturalId, column010Ind2Z, []);
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAC.naturalId);

            // Step 10: Repeat the search of the previous step with the "False" value
            QueryModal.verifyMarcTagValue('010');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind2: blank, subfield: 'z' });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            QueryModal.verifyQueryAreaContent(
              `(${column010Ind2Z} is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnDisplayed(column010Ind2Z);
            QueryModal.verifyResultTableColumnValues(recordAC.naturalId, column010Ind2Z, [
              canceledNaturalIdAC,
            ]);
            [recordAA, recordAB, recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });
          });
        },
      );
    });
  });
});
