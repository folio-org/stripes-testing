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
import LinkedToLocalAuthoritiesModal from '../../../../../support/fragments/inventory/modals/linkedToLocalAuthoritiesModal';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import DateTools from '../../../../../support/utils/dateTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ExportManagerSearchPane from '../../../../../support/fragments/exportManager/exportManagerSearchPane';
import FileManager from '../../../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        authoritySearchOption: 'Keyword',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        firstAuthority: {
          authorityTitle: 'C926160 Coates, Ta-Nehisi',
          tag1XX: '100',
          updated1XXFieldValue: '$a C926160 Coates, Ta-Nehisi UPDATED',
          originalHeading: 'C926160 Coates, Ta-Nehisi',
          newHeading: 'C926160 Coates, Ta-Nehisi UPDATED',
          identifier: 'n9261606241',
          expectedLinkedCount: '0',
        },
        secondAuthority: {
          authorityTitle: 'C926160 Stelfreeze, Brian',
          tag1XX: '100',
          updated1XXFieldValue: '$a C926160 Stelfreeze, Brian UPDATED',
          originalHeading: 'C926160 Stelfreeze, Brian',
          newHeading: 'C926160 Stelfreeze, Brian UPDATED',
          identifier: 'n92616027',
          expectedLinkedCount: '1',
        },
      };

      const linkingTagAndValues = [
        {
          tag: '100',
          content: '$a C926160 Coates, Ta-Nehisi, $e author. $0 n9261606241',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n9261606241',
        },
        {
          tag: '700',
          content: '$a C926160 Stelfreeze, Brian, $e artist. $0 n92616027 ',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n92616027',
        },
      ];

      const users = {};

      const sharedMarcFiles = [
        {
          marc: 'marcAuthFileSharedForC926160.mrc',
          fileNameImported: `testMarcFileC926160.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      const localMarcFiles = [
        {
          marc: 'marcBibFileForC926160.mrc',
          fileNameImported: `testMarcFileC926160.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileLocalForC926160.mrc',
          fileNameImported: `testMarcFileC926160.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      const Dropdowns = {
        HELDBY: 'Held by',
      };

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C926160*');
        cy.setTenant(Affiliations.College);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C926160*');
        cy.resetTenant();

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

              // link 100 and 700 fields:
              linkingTagAndValues.forEach((field) => {
                QuickMarcEditor.clickLinkIconInTagFieldByTag(field.tag);
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingAuthority(field.tag, field.zeroSubfield);
              });
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
        MarcAuthority.deleteViaAPI(createdRecordIDs[2]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C926160 Check "MARC authority headings update" report for updated local and shared MARC authority, after local MARC bib is promoted to shared (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C926160'] },
        () => {
          // 1. Share linked Local "MARC bibliographic" record
          cy.wait(3000);
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.waitLoading();
          LinkedToLocalAuthoritiesModal.clickProceed();
          cy.wait(3000);
          InventoryInstance.checkSharedTextInDetailView(true);

          // 2. Go to "MARC authority" app and open detail view of Local "MARC authority" record, which was previously linked with the local MARC bibliographic record (now promoted to Shared)
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(
            testData.authoritySearchOption,
            testData.firstAuthority.authorityTitle,
          );
          MarcAuthorities.selectIncludingTitle(testData.firstAuthority.authorityTitle);

          // 3. Update 1XX field of opened local MARC authority record
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(
            testData.firstAuthority.tag1XX,
            testData.firstAuthority.updated1XXFieldValue,
          );
          QuickMarcEditor.checkContentByTag(
            testData.firstAuthority.tag1XX,
            testData.firstAuthority.updated1XXFieldValue,
          );
          QuickMarcEditor.pressSaveAndClose();

          // 4. Go to "MARC authority" app and open detail view of Shared "MARC authority" record, which was previously linked with the local MARC bibliographic record (now promoted to Shared)
          MarcAuthorities.searchBy(
            testData.authoritySearchOption,
            testData.secondAuthority.authorityTitle,
          );
          MarcAuthorities.selectIncludingTitle(testData.secondAuthority.authorityTitle);

          // 5. Update 1XX field of opened shared MARC authority record
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(
            testData.secondAuthority.tag1XX,
            testData.secondAuthority.updated1XXFieldValue,
          );
          QuickMarcEditor.checkContentByTag(
            testData.secondAuthority.tag1XX,
            testData.secondAuthority.updated1XXFieldValue,
          );
          cy.wait(2000);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.confirmUpdateLinkedBibs(testData.secondAuthority.expectedLinkedCount);

          // 6. Trigger “MARC authority headings updates” report generation
          cy.setTenant(Affiliations.College);
          const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
          const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');

          // 7. Go to “Export manager” app and download generated report
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            cy.wait(1000);
          });

          // 8. Open exported report and check "Number of bibliographic records linked" column for both updated MARC authority records
          const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
          const fileNameMask = `${downloadedReportDate}*`;
          FileManager.verifyFile(
            MarcAuthorities.verifyMARCAuthorityFileName,
            fileNameMask,
            MarcAuthorities.verifyContentOfHeadingsUpdateReportParsed,
            [
              1,
              testData.secondAuthority.originalHeading,
              testData.secondAuthority.newHeading,
              testData.secondAuthority.identifier,
              testData.secondAuthority.expectedLinkedCount,
            ],
          );
          FileManager.verifyFile(
            MarcAuthorities.verifyMARCAuthorityFileName,
            fileNameMask,
            MarcAuthorities.verifyContentOfHeadingsUpdateReportParsed,
            [
              2,
              testData.firstAuthority.originalHeading,
              testData.firstAuthority.newHeading,
              testData.firstAuthority.identifier,
              testData.firstAuthority.expectedLinkedCount,
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
