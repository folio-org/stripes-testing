import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import DateTools from '../../../../../support/utils/dateTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ExportManagerSearchPane from '../../../../../support/fragments/exportManager/exportManagerSearchPane';
import FileManager from '../../../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        authorityTitle: 'C926159 Marvel comics ComiCon',
        tag1XX: '130',
        updated1XXFieldValue: '$a C926159 Marvel comics UPDATED $t ComiCon $w 630',
        authoritySearchOption: 'Keyword',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        originalHeading: 'C926159 Marvel comics ComiCon',
        newHeading: 'C926159 Marvel comics UPDATED ComiCon',
        identifier: 'fst18141111',
        expectedLinkedCount: '1',
      };

      const linkingTagAndValues = {
        tag: '630',
        content:
          '$a C926159 Marvel comics. $2 fast $0 fst18141111 $v Periodicals. $z United States $w 830',
        zeroSubfield: '$0 http://id.worldcat.org/fast/fst18141111',
      };

      const users = {};

      const sharedMarcFiles = [
        {
          marc: 'marcAuthFileForC926159.mrc',
          fileNameImported: `testMarcFileC926159.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      const localMarcFiles = [
        {
          marc: 'marcBibFileForC926159.mrc',
          fileNameImported: `testMarcFileC926159.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
      ];

      const Dropdowns = {
        HELDBY: 'Held by',
      };

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C926159*');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.exportManagerAll.gui,
              Permissions.consortiaInventoryShareLocalInstance.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            localMarcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
            cy.setTenant(Affiliations.Consortia);
            sharedMarcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventoryInstances.waitContentLoading();
              InventorySearchAndFilter.clearDefaultFilter(Dropdowns.HELDBY);
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagFieldByTag(linkingTagAndValues.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(
                linkingTagAndValues.tag,
                linkingTagAndValues.zeroSubfield,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.Consortia);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C926159 Check "MARC authority headings update" report for updated shared MARC authority, which still has link with promoted to shared MARC bib (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C926159'] },
        () => {
          // 1. Share linked Local "MARC bibliographic" record
          cy.wait(3000);
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          cy.wait(3000);
          InventoryInstance.checkSharedTextInDetailView(true);

          // 2. Go to "MARC authority" app and open detail view of Shared "MARC authority" record, which was previously linked with the local MARC bibliographic record (now promoted to Shared)
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityTitle);
          MarcAuthorities.selectIncludingTitle(testData.authorityTitle);

          // 3.Update 1XX field of opened shared MARC authority record
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(testData.tag1XX, testData.updated1XXFieldValue);
          QuickMarcEditor.checkContentByTag(testData.tag1XX, testData.updated1XXFieldValue);
          cy.wait(2000);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.confirmUpdateLinkedBibs(testData.expectedLinkedCount);

          // 4. Trigger “MARC authority headings updates” report generation
          cy.setTenant(Affiliations.College);
          const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
          const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');

          // 5. Go to “Export manager” app and download generated report
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            cy.wait(1000);
          });

          // 6. Open exported report and check “Number of bibliographic records linked” column for updated local "MARC authority" record
          const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
          const fileNameMask = `${downloadedReportDate}*`;
          FileManager.verifyFile(
            MarcAuthorities.verifyMARCAuthorityFileName,
            fileNameMask,
            MarcAuthorities.verifyContentOfHeadingsUpdateReportParsed,
            [
              1,
              testData.originalHeading,
              testData.newHeading,
              testData.identifier,
              testData.expectedLinkedCount,
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
