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
import LinkedToLocalAuthoritiesModal from '../../../../../support/fragments/inventory/modals/linkedToLocalAuthoritiesModal';
import DateTools from '../../../../../support/utils/dateTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ExportManagerSearchPane from '../../../../../support/fragments/exportManager/exportManagerSearchPane';
import FileManager from '../../../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        authorityTitle: 'C916257 Coates, Ta-Nehisi',
        tag100: '100',
        instanceTitle: 'C916257 Instance (from Local to Shared)',
        updated100FieldValue: 'C916257 Coates, Ta-Nehisi UPDATED',
        authoritySearchOption: 'Keyword',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        originalHeading: 'C916257 Coates, Ta-Nehisi',
        newHeading: 'C916257 Coates, Ta-Nehisi UPDATED',
        identifier: 'n1106202514',
        expectedLinkedCount: '0',
      };

      const linkingTagAndValues = {
        authorityHeading: 'C407654 Lentz Local M1',
        rowIndex: 32,
        tag: '100',
        secondBox: '1',
        thirdBox: '\\',
        content: '$a C916257 Coates, Ta-Nehisi, $e author. $0 n1106202514',
        eSubfield: '$e author.',
        zeroSubfield: '$0 http://id.loc.gov/authorities/names/n1106202514',
        seventhBox: '',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileForC916257.mrc',
          fileNameImported: `testMarcFileC916257.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileForC916257.mrc',
          fileNameImported: `testMarcFileC916257.${getRandomPostfix()}.mrc`,
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
            marcFiles.forEach((marcFile) => {
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
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValues.tag,
                linkingTagAndValues.rowIndex,
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
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C916257 Check "MARC authority headings update" report for updated local MARC authority which had link with promoted to shared MARC bib (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C916257'] },
        () => {
          // 1. Share linked Local "MARC bibliographic" record
          cy.wait(3000);
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.waitLoading();
          LinkedToLocalAuthoritiesModal.clickProceed();
          cy.wait(3000);
          InventoryInstance.checkSharedTextInDetailView(true);

          // 2. Go to “MARC authority” app and open detail view of Local "MARC authority" record, which was previously linked with local MARC bibliographic record (promoted to Shared)
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityTitle);
          MarcAuthorities.selectTitle(testData.authorityTitle);

          // 3.Update 1XX field of opened MARC authority record
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updated100FieldValue);
          QuickMarcEditor.checkContent(testData.updated100FieldValue, 9);
          QuickMarcEditor.pressSaveAndClose();

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
