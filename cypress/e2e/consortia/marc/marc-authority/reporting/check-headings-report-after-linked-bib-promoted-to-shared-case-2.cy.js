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
        authorityTitle: 'C926158 Beatles',
        tag1XX: '110',
        updated1XXFieldValue: '$a C926158 Beatles UPDATED',
        authoritySearchOption: 'Keyword',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        originalHeading: 'C926158 Beatles',
        newHeading: 'C926158 Beatles UPDATED',
        identifier: 'n11112025',
        expectedLinkedCount: '1',
      };

      const linkingTagAndValues = {
        firstInstance: {
          tag: '110',
          content: '$a C926158 Beatles. $0 n11112025 $4 prf',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n11112025',
        },
        secondInstance: {
          tag: '710',
          content: '$a C926158 Beatles. $0 n11112025',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n11112025',
        },
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileForC926158.mrc',
          fileNameImported: `testMarcFileC926158.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileForC926158.mrc',
          fileNameImported: `testMarcFileC926158.${getRandomPostfix()}.mrc`,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C926158*');
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

              // link first Instance:
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagFieldByTag(linkingTagAndValues.firstInstance.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(
                linkingTagAndValues.firstInstance.tag,
                linkingTagAndValues.firstInstance.zeroSubfield,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();

              // link second Instance:
              InventoryInstances.searchByTitle(createdRecordIDs[1]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagFieldByTag(linkingTagAndValues.secondInstance.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(
                linkingTagAndValues.secondInstance.tag,
                linkingTagAndValues.secondInstance.zeroSubfield,
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
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[2]);
      });

      it(
        'C926158 Check "MARC authority headings update" report when local MARC authority is linked to multiple local MARC bibs and one is promoted to shared (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C926158'] },
        () => {
          // 1. Share one of the linked Local "MARC bibliographic" records
          cy.wait(3000);
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          LinkedToLocalAuthoritiesModal.waitLoading();
          LinkedToLocalAuthoritiesModal.clickProceed();
          cy.wait(3000);
          InventoryInstance.checkSharedTextInDetailView(true);

          // 2. Go to "MARC authority" app and open detail view of Local "MARC authority" record, which was previously linked with both local MARC bibliographic records (one now promoted to Shared)
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityTitle);
          MarcAuthorities.selectTitle(testData.authorityTitle);

          // 3.Update 1XX field of opened MARC authority record
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
