/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';

let user;
let exportedInMemberTenantMRCFile;
let localMarcAuthId;
const marcFile = {
  fileName: 'marcAuthFileC410769.mrc',
  fileNameImported: `testMarcFileC410769.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
};
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410769*');
      cy.resetTenant();
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            permissions.inventoryAll.gui,
            permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            permissions.moduleDataImportEnabled.gui,
          ],
        });
        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: user.userId,
          permissions: [
            permissions.inventoryAll.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ],
        });

        cy.setTenant(Affiliations.College);
        DataImport.uploadFileViaApi(
          marcFile.fileName,
          marcFile.fileNameImported,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            localMarcAuthId = record.authority.id;
          });
        });
        cy.resetTenant();
        cy.login(user.username, user.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBeats('AT_C410769');
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.College);
      MarcAuthority.deleteViaAPI(localMarcAuthId, true);
      FileManager.deleteFileFromDownloadsByMask(
        exportedInMemberTenantMRCFile,
        'QuickAuthorityExport*',
      );
    });

    it(
      'C410769 Consortia | Verify Data export local MARC authority records from Member tenant (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C410769'] },
      () => {
        // Step 1: Check checkboxes next to MARC Authority records
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record found1 record selected');

        // Step 2: Click Actions > Export selected records
        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.exportSelected();
        MarcAuthorities.verifyToastNotificationAfterExportAuthority();
        cy.wait('@getHrid', getLongDelay()).then((resp) => {
          const expectedRecordHrid = resp.response.body.jobExecutionHrId;
          exportedInMemberTenantMRCFile = `quick-export-${expectedRecordHrid}.mrc`;

          // Step 3: Verify exported .csv file
          FileManager.verifyFile(
            MarcAuthorities.verifyAuthorityFileName,
            'QuickAuthorityExport*',
            InventoryActions.verifyInstancesMARC,
            [[localMarcAuthId]],
          );

          // Step 4: Go to Data export app and verify logs
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Step 5: Download exported .mrc file
          DataExportLogs.clickButtonWithText(exportedInMemberTenantMRCFile);

          // Step 6: Verify exported .mrc file content
          const assertionsOnMarcFileContent = [
            {
              uuid: localMarcAuthId,
              assertions: [
                (record) => {
                  expect(record.leader).to.eq('00632cz  a2200157n  4500');
                },
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', '8709980']);
                },
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                (record) => {
                  expect(record.fields[2]).to.deep.eq([
                    '008',
                    '110721n| azannaabn          |n aaa      ',
                  ]);
                },
                (record) => {
                  expect(record.fields[3]).to.deep.eq(['010', '  ', 'a', 'n2011049161407688']);
                },
                (record) => {
                  expect(record.fields[4]).to.deep.eq(['035', '  ', 'a', '(OCoLC)oca08921677']);
                },
                (record) => {
                  expect(record.fields[5]).to.deep.eq([
                    '040',
                    '  ',
                    'a',
                    'DLC',
                    'b',
                    'eng',
                    'c',
                    'DLC',
                    'e',
                    'rda',
                    'd',
                    'DLC',
                    'd',
                    'MvI',
                  ]);
                },
                (record) => {
                  expect(record.fields[6]).to.deep.eq([
                    '046',
                    '  ',
                    'f',
                    '1977-10-11',
                    '2',
                    'edtf',
                  ]);
                },
                (record) => {
                  expect(record.fields[7]).to.deep.eq(['100', '1 ', 'a', 'AT_C410769 Lentz Local']);
                },
                (record) => {
                  expect(record.fields[8]).to.deep.eq([
                    '670',
                    '  ',
                    'a',
                    "City indians in Spain's American empire, c2012:",
                    'b',
                    'ECIP t.p. (Mark Lentz)',
                  ]);
                },
                (record) => {
                  expect(record.fields[9]).to.deep.eq([
                    '670',
                    '  ',
                    'a',
                    'Murder in Mérida, 1792, 2018 :',
                    'b',
                    'pre-publication galley title page (Mark W. Lentz) data from publisher (b. Oct. 11, 1977)',
                  ]);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
                (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(localMarcAuthId),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedInMemberTenantMRCFile,
            assertionsOnMarcFileContent,
            1,
            false,
            true,
          );
        });
      },
    );
  });
});
