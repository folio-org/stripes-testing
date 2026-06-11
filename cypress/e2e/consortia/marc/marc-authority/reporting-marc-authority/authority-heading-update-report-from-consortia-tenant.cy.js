import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const naturalIdPrefix = `404375${randomNDigitNumber(19)}`;

        const testData = {
          tag100: '100',

          // Shared authority headings (created in Central)
          sharedAuth1Heading: `AT_C404375_MarcAuthority Shared ${randomPostfix}`,
          sharedAuth2Heading: `AT_C404375_MarcAuthority Shared 2 ${randomPostfix}`,
          sharedAuth3Heading: `AT_C404375_MarcAuthority Shared 3 ${randomPostfix}`,
          sharedAuth4Heading: `AT_C404375_MarcAuthority Shared 4 ${randomPostfix}`,
          sharedAuth5Heading: `AT_C404375_MarcAuthority Shared 5 ${randomPostfix}`,

          // Local M1 authority headings (created in College)
          m1LocalAuth1Heading: `AT_C404375_MarcAuthority M1 Local ${randomPostfix}`,
          m1LocalAuth2Heading: `AT_C404375_MarcAuthority M1 Local 2 ${randomPostfix}`,

          // Local M2 authority heading (created in University)
          m2LocalAuthHeading: `AT_C404375_MarcAuthority M2 Local ${randomPostfix}`,

          // Updated headings – User C edits (Central)
          sharedAuth2HeadingUpdated: `AT_C404375_MarcAuthority Shared 2 ${randomPostfix} UPDATED`,
          sharedAuth5HeadingUpdated: `AT_C404375_MarcAuthority Shared 5 ${randomPostfix} UPDATED`,

          // Updated headings – User M1 edits (Member 1)
          m1LocalAuth1HeadingUpdated: `AT_C404375_MarcAuthority M1 Local ${randomPostfix} UPDATED`,
          m1LocalAuth2HeadingUpdated: `AT_C404375_MarcAuthority M1 Local 2 ${randomPostfix} UPDATED`,
          sharedAuth1HeadingUpdated: `AT_C404375_MarcAuthority Shared ${randomPostfix} UPDATED`,
          sharedAuth3HeadingUpdated: `AT_C404375_MarcAuthority Shared 3 ${randomPostfix} UPDATED`,

          // Updated headings – User M2 edits (Member 2)
          sharedAuth2HeadingDoubleUpdated: `AT_C404375_MarcAuthority Shared 2 ${randomPostfix} UPDATED UPDATED`,
          m2LocalAuthHeadingUpdated: `AT_C404375_MarcAuthority M2 Local ${randomPostfix} UPDATED`,
        };

        const expectedCsvHeaders = [
          'Last updated',
          'Original heading',
          'New heading',
          'Identifier',
          'Original 1XX',
          'New 1XX',
          'Authority source file name',
          'Authority record type',
          'Updater',
        ];

        // Report date range covering today's edits
        const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
        const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
        const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
        const fileNameMask = `${downloadedReportDate}*`;

        // Authority IDs
        let sharedAuth1Id;
        let sharedAuth2Id;
        let sharedAuth3Id;
        let sharedAuth4Id;
        let sharedAuth5Id;
        let m1LocalAuth1Id;
        let m1LocalAuth2Id;
        let m2LocalAuthId;

        // Bib IDs
        let centralBibId;
        let m1Bib1Id;
        let m1Bib2Id;
        let m1Bib3Id;
        let m2Bib1Id;
        let m2Bib2Id;

        // Users
        let userC;
        let userM1;
        let userM2;

        const userCPerms = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
        ];

        const userM1MemberPerms = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
        ];

        const userM2MemberPerms = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];

        const centralAuthPerms = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];

        const getMarcBib100Fields = (bibTitle) => [
          { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
          { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
          { tag: '100', content: '$a placeholder', indicators: ['1', '\\'] },
        ];

        before('Create test data via API', () => {
          cy.getAdminToken();

          // Cleanup any leftover records from previous runs
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C404375_');
          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.withinTenant(affiliation, () => {
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C404375_');
            });
          });

          // Step 1: Create shared authorities in Central
          cy.resetTenant();
          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}1`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.sharedAuth1Heading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              sharedAuth1Id = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}2`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.sharedAuth2Heading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              sharedAuth2Id = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}3`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.sharedAuth3Heading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              sharedAuth3Id = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}4`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.sharedAuth4Heading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              sharedAuth4Id = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}5`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.sharedAuth5Heading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              sharedAuth5Id = id;
            });
          })

            // Step 2: Create Central bib and link to Auth Shared 2
            .then(() => {
              cy.resetTenant();
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBib100Fields(`AT_C404375_MarcBibInstance Shared ${randomPostfix}`),
              ).then((id) => {
                centralBibId = id;
              });
            })
            .then(() => {
              cy.resetTenant();
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: centralBibId,
                authorityIds: [sharedAuth2Id],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.sharedAuth2Heading}`],
              });
            })

            // Step 3: Create local M1 authorities in College
            .then(() => {
              cy.setTenant(Affiliations.College);
              MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}6`, [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.m1LocalAuth1Heading}`,
                  indicators: ['1', '\\'],
                },
              ]).then((id) => {
                m1LocalAuth1Id = id;
              });

              MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}7`, [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.m1LocalAuth2Heading}`,
                  indicators: ['1', '\\'],
                },
              ]).then((id) => {
                m1LocalAuth2Id = id;
              });
            })

            // Step 4: Create M1 bibs (Bib M1 Local, Bib M1 Local 2, Bib M1 Local 3)
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBib100Fields(`AT_C404375_MarcBibInstance M1 Local ${randomPostfix}`),
              ).then((id) => {
                m1Bib1Id = id;
              });

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBib100Fields(`AT_C404375_MarcBibInstance M1 Local 2 ${randomPostfix}`),
              ).then((id) => {
                m1Bib2Id = id;
              });

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBib100Fields(`AT_C404375_MarcBibInstance M1 Local 3 ${randomPostfix}`),
              ).then((id) => {
                m1Bib3Id = id;
              });
            })

            // Step 5: Link M1 bibs → authorities
            .then(() => {
              cy.setTenant(Affiliations.College);
              // Bib M1 Local → Auth M1 Local
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: m1Bib1Id,
                authorityIds: [m1LocalAuth1Id],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.m1LocalAuth1Heading}`],
              });

              // Bib M1 Local 2 → Auth Shared (Central auth visible from M1)
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: m1Bib2Id,
                authorityIds: [sharedAuth1Id],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.sharedAuth1Heading}`],
              });

              // Bib M1 Local 3 → Auth Shared 2 (Central auth)
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: m1Bib3Id,
                authorityIds: [sharedAuth2Id],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.sharedAuth2Heading}`],
              });
            })

            // Step 6: Create local M2 authority in University
            .then(() => {
              cy.setTenant(Affiliations.University);
              MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}8`, [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.m2LocalAuthHeading}`,
                  indicators: ['1', '\\'],
                },
              ]).then((id) => {
                m2LocalAuthId = id;
              });
            })

            // Step 7: Create M2 bibs (Bib M2 Local, Bib M2 Local 2)
            .then(() => {
              cy.setTenant(Affiliations.University);
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBib100Fields(`AT_C404375_MarcBibInstance M2 Local ${randomPostfix}`),
              ).then((id) => {
                m2Bib1Id = id;
              });

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBib100Fields(`AT_C404375_MarcBibInstance M2 Local 2 ${randomPostfix}`),
              ).then((id) => {
                m2Bib2Id = id;
              });
            })

            // Step 8: Link M2 bibs → authorities
            .then(() => {
              cy.setTenant(Affiliations.University);
              // Bib M2 Local → Auth M2 Local
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: m2Bib1Id,
                authorityIds: [m2LocalAuthId],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.m2LocalAuthHeading}`],
              });

              // Bib M2 Local 2 → Auth Shared 5 (Central auth visible from M2)
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: m2Bib2Id,
                authorityIds: [sharedAuth5Id],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.sharedAuth5Heading}`],
              });
            })

            // Step 9: Create User C in Central
            .then(() => {
              cy.resetTenant();
              cy.createTempUser(userCPerms).then((props) => {
                userC = props;
              });
            })

            // Step 10: Create User M1 in College with Central auth perms
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser(userM1MemberPerms).then((props) => {
                userM1 = props;
                cy.resetTenant();
                cy.assignPermissionsToExistingUser(userM1.userId, centralAuthPerms);
              });
            })

            // Step 11: Create User M2 in University with Central auth perms
            .then(() => {
              cy.setTenant(Affiliations.University);
              cy.createTempUser(userM2MemberPerms).then((props) => {
                userM2 = props;
                cy.resetTenant();
                cy.assignPermissionsToExistingUser(userM2.userId, centralAuthPerms);
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Delete shared authorities in Central (force=true to handle any remaining links)
          [sharedAuth1Id, sharedAuth2Id, sharedAuth3Id, sharedAuth4Id, sharedAuth5Id].forEach(
            (id) => {
              if (id) MarcAuthority.deleteViaAPI(id, true);
            },
          );
          if (userC) Users.deleteViaApi(userC.userId);
          // Delete Central bib
          if (centralBibId) InventoryInstance.deleteInstanceViaApi(centralBibId);

          // Delete M1 local authorities and bibs
          cy.setTenant(Affiliations.College);
          [m1LocalAuth1Id, m1LocalAuth2Id].forEach((id) => {
            if (id) MarcAuthority.deleteViaAPI(id, true);
          });
          [m1Bib1Id, m1Bib2Id, m1Bib3Id].forEach((id) => {
            if (id) InventoryInstance.deleteInstanceViaApi(id);
          });
          if (userM1) Users.deleteViaApi(userM1.userId);

          // Delete M2 local authority and bibs
          cy.setTenant(Affiliations.University);
          if (m2LocalAuthId) MarcAuthority.deleteViaAPI(m2LocalAuthId, true);
          [m2Bib1Id, m2Bib2Id].forEach((id) => {
            if (id) InventoryInstance.deleteInstanceViaApi(id);
          });
          if (userM2) Users.deleteViaApi(userM2.userId);
          // Clear downloads folder
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        });

        it(
          'C404375 "MARC authority headings updates (CSV)" report contains correct data when triggered from Consortia tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C404375'] },
          () => {
            // === USER C (Central): Edit Auth Shared 2 and Auth Shared 5 ===
            cy.resetTenant();
            cy.login(userC.username, userC.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Edit Auth Shared 2 → add UPDATED (linked to 1 Central bib)
            MarcAuthorities.searchBeats(testData.sharedAuth2Heading);
            MarcAuthorities.selectAuthorityById(sharedAuth2Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth2Heading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.sharedAuth2HeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.sharedAuth2HeadingUpdated}`,
            );
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth2HeadingUpdated);

            // Edit Auth Shared 5 → add UPDATED (no Central bib linked)
            MarcAuthorities.searchBeats(testData.sharedAuth5Heading);
            MarcAuthorities.selectAuthorityById(sharedAuth5Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth5Heading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.sharedAuth5HeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.sharedAuth5HeadingUpdated}`,
            );
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth5HeadingUpdated);

            // === USER M1 (College): Edit Auth M1 Local, Auth Shared, Auth M1 Local 2, Auth Shared 3 ===
            cy.setTenant(Affiliations.College);
            cy.login(userM1.username, userM1.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Edit Auth M1 Local → add UPDATED (linked to 1 M1 bib)
            MarcAuthorities.searchBeats(testData.m1LocalAuth1Heading);
            MarcAuthorities.selectAuthorityById(m1LocalAuth1Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.m1LocalAuth1Heading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.m1LocalAuth1HeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.m1LocalAuth1HeadingUpdated}`,
            );
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.m1LocalAuth1HeadingUpdated);

            // Edit Auth Shared (naturalId 1) → add UPDATED (linked to 1 M1 bib)
            MarcAuthorities.searchBeats(testData.sharedAuth1Heading);
            MarcAuthorities.selectAuthorityById(sharedAuth1Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth1Heading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.sharedAuth1HeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.sharedAuth1HeadingUpdated}`,
            );
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth1HeadingUpdated);

            // Edit Auth M1 Local 2 → add UPDATED (no bibs linked)
            MarcAuthorities.searchBeats(testData.m1LocalAuth2Heading);
            MarcAuthorities.selectAuthorityById(m1LocalAuth2Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.m1LocalAuth2Heading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.m1LocalAuth2HeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.m1LocalAuth2HeadingUpdated}`,
            );
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.m1LocalAuth2HeadingUpdated);

            // Edit Auth Shared 3 → add UPDATED (no bibs linked)
            MarcAuthorities.searchBeats(testData.sharedAuth3Heading);
            MarcAuthorities.selectAuthorityById(sharedAuth3Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth3Heading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.sharedAuth3HeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.sharedAuth3HeadingUpdated}`,
            );
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth3HeadingUpdated);

            // === USER M2 (University): Edit Auth Shared 2 UPDATED → double UPDATED, Auth M2 Local ===
            cy.setTenant(Affiliations.University);
            cy.login(userM2.username, userM2.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

            // Edit Auth Shared 2 UPDATED → add UPDATED again (no M2 bibs linked to it)
            MarcAuthorities.searchBeats(testData.sharedAuth2HeadingUpdated);
            MarcAuthorities.selectAuthorityById(sharedAuth2Id);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth2HeadingUpdated);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.sharedAuth2HeadingDoubleUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.sharedAuth2HeadingDoubleUpdated}`,
            );
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.sharedAuth2HeadingDoubleUpdated);

            // Edit Auth M2 Local → add UPDATED (linked to 1 M2 bib)
            MarcAuthorities.searchBeats(testData.m2LocalAuthHeading);
            MarcAuthorities.selectAuthorityById(m2LocalAuthId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.m2LocalAuthHeading);
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.m2LocalAuthHeadingUpdated}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.m2LocalAuthHeadingUpdated}`,
            );
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.m2LocalAuthHeadingUpdated);

            // === USER M1 (College): Generate report and verify Member 1 CSV ===
            cy.setTenant(Affiliations.College);
            cy.login(userM1.username, userM1.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            MarcAuthorities.clickActionsAndReportsButtons();
            MarcAuthorities.fillReportModal(today, tomorrow);
            MarcAuthorities.clickExportButton();
            cy.intercept('POST', '/data-export-spring/jobs').as('getM1JobId');
            cy.wait('@getM1JobId', { timeout: 10000 }).then((item) => {
              MarcAuthorities.checkCalloutAfterExport(item.response.body.name);

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
              ExportManagerSearchPane.searchByAuthorityControl();
              ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
              cy.wait(1000);

              // Verify Member 1 CSV headers and data rows
              FileManager.verifyFile(
                MarcAuthorities.verifyMARCAuthorityFileName,
                fileNameMask,
                MarcAuthorities.verifyContentOfExportFile,
                [
                  // Headers
                  ...expectedCsvHeaders,
                  // Local M1 records updated by User M1
                  new RegExp(
                    `${testData.m1LocalAuth1Heading},${testData.m1LocalAuth1HeadingUpdated}.*local,"${userM1.lastName}, ${userM1.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.m1LocalAuth2Heading},${testData.m1LocalAuth2HeadingUpdated}.*local,"${userM1.lastName}, ${userM1.firstName}"`,
                  ),
                  // Shared records visible from Member 1
                  new RegExp(
                    `${testData.sharedAuth1Heading},${testData.sharedAuth1HeadingUpdated}.*shared,"${userM1.lastName}, ${userM1.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth2Heading},${testData.sharedAuth2HeadingUpdated}.*shared,"${userC.lastName}, ${userC.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth2HeadingUpdated},${testData.sharedAuth2HeadingDoubleUpdated}.*shared,"${userM2.lastName}, ${userM2.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth3Heading},${testData.sharedAuth3HeadingUpdated}.*shared,"${userM1.lastName}, ${userM1.firstName}"`,
                  ),
                ],
              );
            });

            // Delete Member 1 CSV before downloading Central report
            FileManager.deleteFolder(Cypress.config('downloadsFolder'));

            // === USER C (Central): Generate report and verify Central CSV ===
            cy.resetTenant();
            cy.login(userC.username, userC.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            MarcAuthorities.clickActionsAndReportsButtons();
            MarcAuthorities.fillReportModal(today, tomorrow);
            MarcAuthorities.clickExportButton();
            cy.intercept('POST', '/data-export-spring/jobs').as('getCentralJobId');
            cy.wait('@getCentralJobId', { timeout: 10000 }).then((item) => {
              MarcAuthorities.checkCalloutAfterExport(item.response.body.name);

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
              ExportManagerSearchPane.searchByAuthorityControl();
              ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
              cy.wait(1000);

              // Verify Central CSV headers and data rows (shared records only)
              FileManager.verifyFile(
                MarcAuthorities.verifyMARCAuthorityFileName,
                fileNameMask,
                MarcAuthorities.verifyContentOfExportFile,
                [
                  // Headers
                  ...expectedCsvHeaders,
                  // Shared records updated by various users – Central sees all shared edits
                  new RegExp(
                    `${testData.sharedAuth1Heading},${testData.sharedAuth1HeadingUpdated}.*shared,"${userM1.lastName}, ${userM1.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth2Heading},${testData.sharedAuth2HeadingUpdated}.*shared,"${userC.lastName}, ${userC.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth2HeadingUpdated},${testData.sharedAuth2HeadingDoubleUpdated}.*shared,"${userM2.lastName}, ${userM2.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth3Heading},${testData.sharedAuth3HeadingUpdated}.*shared,"${userM1.lastName}, ${userM1.firstName}"`,
                  ),
                  new RegExp(
                    `${testData.sharedAuth5Heading},${testData.sharedAuth5HeadingUpdated}.*shared,"${userC.lastName}, ${userC.firstName}"`,
                  ),
                ],
              );
            });
          },
        );
      });
    });
  });
});
