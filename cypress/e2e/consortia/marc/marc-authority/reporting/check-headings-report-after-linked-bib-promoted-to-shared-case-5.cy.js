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
          authorityTitle: 'C926161 Lee, Stan, 1922-2018',
          tag1XX: '100',
          updated1XXFieldValue: '$a C926161 Lee, Stan, 1922-2018 UPDATED',
          originalHeading: 'C926161 Lee, Stan, 1922-2018',
          newHeading: 'C926161 Lee, Stan, 1922-2018 UPDATED',
          identifier: 'n92616111',
          expectedLinkedCount: '0',
        },
        secondAuthority: {
          authorityTitle: 'C926161 Kirby, Jack',
          tag1XX: '100',
          updated1XXFieldValue: '$a C926161 Kirby, Jack UPDATED',
          originalHeading: 'C926161 Kirby, Jack',
          newHeading: 'C926161 Kirby, Jack UPDATED',
          identifier: 'n92616112',
          expectedLinkedCount: '0',
        },
      };

      const linkingTagAndValues = [
        {
          index: 74,
          tag: '700',
          content: '$a C926161 Lee, Stan, $d 1922-2018, $e creator. $0 n92616111',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n92616111',
        },
        {
          index: 75,
          tag: '700',
          content: '$a C926161 Kirby, Jack, $e creator. $0 n92616112',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n92616112',
        },
      ];

      const users = {};

      const localMarcFiles = [
        {
          marc: 'marcBibFileForC926161.mrc',
          fileNameImported: `testMarcFileC926161.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileForC926161.mrc',
          fileNameImported: `testMarcFileC926161.${getRandomPostfix()}.mrc`,
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
        cy.setTenant(Affiliations.College);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C926161*');
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

              // link 700 fields:
              linkingTagAndValues.forEach((field) => {
                QuickMarcEditor.clickLinkIconInTagField(field.index);
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                  field.tag,
                  field.index,
                  field.zeroSubfield,
                );
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
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[2]);
      });

      it(
        'C926161 Check "MARC authority headings update" report when 2 local MARC authority are linked to same local MARC bib which is promoted to shared (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C926161'] },
        () => {
          // 1. Share linked Local "MARC bibliographic" record
          cy.wait(3000);
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.waitLoading();
          LinkedToLocalAuthoritiesModal.clickProceed();
          cy.wait(3000);
          InventoryInstance.checkSharedTextInDetailView(true);

          // 2. Go to "MARC authority" app and open detail view of the first Local "MARC authority" record, which was previously linked with the local MARC bibliographic record (now promoted to Shared)
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(
            testData.authoritySearchOption,
            testData.firstAuthority.authorityTitle,
          );
          MarcAuthorities.selectIncludingTitle(testData.firstAuthority.authorityTitle);

          // 3. Update 1XX field of opened first local MARC authority record
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

          // 4. Go to "MARC authority" app and open detail view of the second Local "MARC authority" record, which was previously linked with the local MARC bibliographic record (now promoted to Shared)
          MarcAuthorities.searchBy(
            testData.authoritySearchOption,
            testData.secondAuthority.authorityTitle,
          );
          MarcAuthorities.selectIncludingTitle(testData.secondAuthority.authorityTitle);

          // 5. Update 1XX field of opened second local MARC authority record:
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(
            testData.secondAuthority.tag1XX,
            testData.secondAuthority.updated1XXFieldValue,
          );
          QuickMarcEditor.checkContentByTag(
            testData.secondAuthority.tag1XX,
            testData.secondAuthority.updated1XXFieldValue,
          );
          QuickMarcEditor.pressSaveAndClose();

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

          // 8. Open exported report and check "Number of bibliographic records linked" column for both updated local MARC authority records
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
