import permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../support/constants';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
  verifyMarcFieldByFindingSubfield,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
} from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';

let user;
let exportedMRCFile;
let downloadedCQLFile;
const marcFiles = [
  {
    fileName: 'marcAuthFileC805755_shared.mrc',
    fileNameImported: `testMarcFileC805755_shared.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    recordTitle: 'AT_C805755 Lentz Share',
    tenant: Affiliations.Consortia,
  },
  {
    fileName: 'marcAuthFileC805755_local.mrc',
    fileNameImported: `testMarcFileC805755_local.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    recordTitle: 'AT_C805755 Lentz Local',
    tenant: Affiliations.College,
  },
];

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      [Affiliations.College, Affiliations.Consortia].forEach((tenant) => {
        cy.withinTenant(tenant, () => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C805755');
        });
      });

      cy.createTempUser().then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ],
        });

        marcFiles.forEach((marcFile) => {
          cy.setTenant(marcFile.tenant);
          DataImport.uploadFileViaApi(
            marcFile.fileName,
            marcFile.fileNameImported,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              marcFile.authRecordId = record.authority.id;

              cy.getSrsRecordsByAuthorityId(marcFile.authRecordId).then((srsRecord) => {
                marcFile.srsId = srsRecord.id;
              });
            });
          });
        });

        cy.resetTenant();
        cy.login(user.username, user.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthoritiesSearch.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, 'AT_C805755');
        MarcAuthorities.checkResultsListRecordsCount();

        MarcAuthorities.clickActionsButton();
        MarcAuthorities.clickSaveCqlButton();

        FileManager.findDownloadedFilesByMask('SearchAuthorityCQLQuery*').then(
          (downloadedFilePaths) => {
            const lastDownloadedFilePath =
              downloadedFilePaths.sort()[downloadedFilePaths.length - 1];
            downloadedCQLFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);

            ExportFileHelper.moveDownloadedFileToFixtures(downloadedCQLFile);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      marcFiles.forEach((marcFile) => {
        cy.setTenant(marcFile.tenant);
        MarcAuthority.deleteViaAPI(marcFile.authRecordId, true);
      });

      FileManager.deleteFileFromDownloadsByMask(exportedMRCFile);
      FileManager.deleteFileFromDownloadsByMask(downloadedCQLFile);
      FileManager.deleteFile(`cypress/fixtures/${downloadedCQLFile}`);
    });

    it(
      'C805755 ECS | Export shared and local Authorities with CQL query in Member tenant (consortia) (firebird)',
      { tags: ['extendedPathECS', 'firebird', 'C805755'] },
      () => {
        // Step 1: Upload saved CQL query file
        ExportFileHelper.uploadFile(downloadedCQLFile);

        // Step 2: Select "Default authority" job profile
        ExportFileHelper.exportWithDefaultJobProfile(
          downloadedCQLFile,
          'Default authority',
          'Authorities',
          '.cql',
        );
        DataExportLogs.verifyAreYouSureModalAbsent();

        // Step 3: Wait for export to complete and verify job execution
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedMRCFile = `${downloadedCQLFile.replace('.cql', '')}-${jobId}.mrc`;

          // Step 4: Verify export results in Data export logs
          DataExportResults.verifySuccessExportResultCells(
            exportedMRCFile,
            2,
            jobId,
            user.username,
            'Default authority',
          );

          // Step 5: Download exported .mrc file
          DataExportLogs.clickButtonWithText(exportedMRCFile);

          // Step 6: Verify exported .mrc file content
          const commonAssertions = () => [
            (record) => expect(record.leader).to.eq('00632cz  a2200157n  4500'),
            (record) => verify001FieldValue(record, '8709980'),
            (record) => verify005FieldValue(record),
            (record) => verify008FieldValue(record, '110721n| azannaabn          |n aaa      '),
            (record) => {
              verifyMarcFieldByTag(record, '010', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'n2011049161407688'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '035', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', '(OCoLC)oca08921677'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '040', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'DLC'],
                  ['b', 'eng'],
                  ['c', 'DLC'],
                  ['e', 'rda'],
                  ['d', 'DLC'],
                  ['d', 'MvI'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '046', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['f', '1977-10-11'],
                  ['2', 'edtf'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '670', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: "City indians in Spain's American empire, c2012:",
                subfields: [
                  ['a', "City indians in Spain's American empire, c2012:"],
                  ['b', 'ECIP t.p. (Mark Lentz)'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByFindingSubfield(record, '670', {
                ind1: ' ',
                ind2: ' ',
                findBySubfield: 'a',
                findByValue: 'Murder in Mérida, 1792, 2018 :',
                subfields: [
                  ['a', 'Murder in Mérida, 1792, 2018 :'],
                  [
                    'b',
                    'pre-publication galley title page (Mark W. Lentz) data from publisher (b. Oct. 11, 1977)',
                  ],
                ],
              });
            },
          ];

          const recordsToVerify = marcFiles.map((marcFile) => ({
            uuid: marcFile.authRecordId,
            assertions: [
              ...commonAssertions(),
              (record) => {
                verifyMarcFieldByTag(record, '100', {
                  ind1: '1',
                  ind2: ' ',
                  subfields: ['a', marcFile.recordTitle],
                });
              },
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subfields: [
                    ['s', marcFile.srsId],
                    ['i', marcFile.authRecordId],
                  ],
                });
              },
            ],
          }));

          parseMrcFileContentAndVerify(exportedMRCFile, recordsToVerify, 2, false, true);
        });
      },
    );
  });
});
