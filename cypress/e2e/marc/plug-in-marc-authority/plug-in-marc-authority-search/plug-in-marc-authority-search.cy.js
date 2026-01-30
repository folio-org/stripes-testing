import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {};
      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359015.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['C380565*'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380565 MARC Authority plug-in | Search for MARC authority records when the user clicks on the "Link" icon (spitfire)',
        { tags: ['smoke', 'spitfire', 'C380565'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchAndFilterDisplay();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.fillInAndSearchResults('C380565 Starr, Lisa');
          InventoryInstance.checkResultsListPaneHeader();
          InventoryInstance.checkSearchResultsTable();
          InventoryInstance.selectRecord();
          InventoryInstance.checkRecordDetailPage('C380565 Starr, Lisa');
          MarcAuthorities.checkFieldAndContentExistence('100', '$a C380565 Starr, Lisa');
          InventoryInstance.closeDetailsView();
          InventoryInstance.closeFindAuthorityModal();
        },
      );
    });
  });
});

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC359206: {
          lcControlNumberA: 'n  00000913',
          lcControlNumberB: 'n  79125031',
          searchOption: 'Identifier (all)',
          valueA: 'C359206 Erbil, H. Yıldırım',
          valueB: 'C359206 Twain, Mark,',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359206.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['C359206*'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C359206 MARC Authority plug-in | Search using "Identifier (all)" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C359206'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchBy(
            testData.forC359206.searchOption,
            testData.forC359206.lcControlNumberA,
          );
          MarcAuthorities.checkFieldAndContentExistence(
            '010',
            testData.forC359206.lcControlNumberA,
          );
          InventoryInstance.checkRecordDetailPage(testData.forC359206.valueA);
          MarcAuthorities.searchBy(
            testData.forC359206.searchOption,
            testData.forC359206.lcControlNumberB,
          );
          MarcAuthorities.checkFieldAndContentExistence(
            '010',
            testData.forC359206.lcControlNumberB,
          );
          InventoryInstance.checkRecordDetailPage(testData.forC359206.valueB);
          MarcAuthorities.clickResetAndCheck();
        },
      );
    });
  });
});

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC380567: {
          searchOption: 'Corporate/Conference name',
        },
        forC359228: {
          type: 'Authorized',
          typeOfHeadingA: 'Corporate Name',
          typeOfHeadingB: 'Conference Name',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359228.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 5,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['UXPROD-4394C380567*'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380567 MARC Authority plug-in | Search using "Corporate/Conference name" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380567'] },
        () => {
          const validSearchResults = [
            'UXPROD-4394C380567 Corporate name 110',
            'UXPROD-4394C380567 Corporate name 410',
            'UXPROD-4394C380567 Corporate name 510',
            'UXPROD-4394C380567 Conference Name 111',
            'UXPROD-4394C380567 Conference Name 411',
            'UXPROD-4394C380567 Conference Name 511',
          ];
          const unvalidSearchResults = [
            'UXPROD-4394C380567 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subk subv subx suby subz',
            'UXPROD-4394C380567 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subk subv subx suby subz',
            'UXPROD-4394C380567 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn subk subv subx suby subz',
            'UXPROD-4394C380567 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
            'UXPROD-4394C380567 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
            'UXPROD-4394C380567 Conference Name 511 Western Region Agricultural Education Research Seminar (1983- ) subc subd subn subq subk subv subx suby subz subg',
          ];
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchByParameter(testData.forC380567.searchOption, 'UXPROD-4394C380567');
          // wait for the results to be loaded.
          cy.wait(1000);
          validSearchResults.forEach((result) => {
            MarcAuthorities.checkRowByContent(result);
          });
          MarcAuthorities.checkAfterSearchHeadingType(
            testData.forC359228.type,
            testData.forC359228.typeOfHeadingA,
            testData.forC359228.typeOfHeadingB,
          );
          MarcAuthorities.selectIncludingTitle(validSearchResults[0]);
          // see UIMARCAUTH-451 comments
          // MarcAuthorities.checkRecordDetailPageMarkedValue(
          //   'UXPROD-4394C380567 Corporate name 110 Apple & Honey Productions',
          // );
          MarcAuthorities.closeMarcViewPane();
          validSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.forC380567.searchOption, result);
            MarcAuthorities.verifyViewPaneContent(result);
          });
          unvalidSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.forC380567.searchOption, result);
            MarcAuthoritiesDelete.checkEmptySearchResults(result);
          });
        },
      );
    });
  });
});

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC359229: {
          searchOptionA: 'Geographic name',
          searchOptionB: 'Keyword',
          valueA: 'C380568 Gulf Stream',
          valueB: 'C380568 North',
          type: 'Authorized',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359229.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        ['C380568'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380568 MARC Authority plug-in | Search using "Geographic name" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380568'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchBy(testData.forC359229.searchOptionA, testData.forC359229.valueA);
          MarcAuthorities.checkFieldAndContentExistence('151', testData.forC359229.valueA);
          InventoryInstance.checkRecordDetailPage(testData.forC359229.valueA);
          MarcAuthorities.searchBy(testData.forC359229.searchOptionB, testData.forC359229.valueB);
          MarcAuthorities.checkResultsExistance(testData.forC359229.type);
        },
      );
    });
  });
});

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC359230: {
          searchOptionA: 'Name-title',
          searchOptionB: 'Personal name',
          typeOfHeadingA: 'Personal Name',
          typeOfHeadingB: 'Corporate Name',
          typeOfHeadingC: 'Conference Name',
          value: 'C380569 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          valurMarked: 'C380569 Twain, Mark,',
          type: 'Authorized',
        },
      };

      const marcFileForC380569 = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359230_2.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcFileForC359230_3.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcFileForC359230_twain.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['C380569'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFileForC380569.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380569 MARC Authority plug-in | Search using "Name-title" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380569'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          cy.intercept('search/authorities?*').as('searchAuthorities');

          MarcAuthorities.searchByParameter(testData.forC359230.searchOptionA, '*');
          cy.wait('@searchAuthorities').then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            MarcAuthorities.checkHeadingType(
              testData.forC359230.type,
              testData.forC359230.typeOfHeadingA,
              testData.forC359230.typeOfHeadingB,
              testData.forC359230.typeOfHeadingC,
            );
            const title = interception.response.body.authorities[0].headingRef;
            MarcAuthorities.selectTitle(title);
            MarcAuthorities.verifyViewPaneContentExists();
            MarcAuthorities.searchBy(testData.forC359230.searchOptionB, '*');
            MarcAuthorities.checkSingleHeadingType(
              testData.forC359230.type,
              testData.forC359230.typeOfHeadingA,
            );
          });
        },
      );
    });
  });
});

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC380566: {
          searchOption: 'Personal name',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC380566.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['UXPROD-4394C380566*'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        if (testData.userProperties && testData.userProperties.userId) {
          Users.deleteViaApi(testData.userProperties.userId);
        }
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380566 MARC Authority plug-in | Search using "Personal name" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380566'] },
        () => {
          cy.then(() => {
            const validSearchResults = [
              'UXPROD-4394C380566 Personal name 100 Elizabeth',
              'UXPROD-4394C380566 Personal name 400 Elizabeth,',
              'UXPROD-4394C380566 Personal name 500 Windsor',
            ];
            const unvalidSearchResults = [
              'UXPROD-4394C380566 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq subk Musical settings Literary style Stage history 1950- England',
              'UXPROD-4394C380566 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subk subv subx suby subz',
              'Family UXPROD-4394C380566 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq subv subx suby subz',
            ];
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon('700');
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.searchByParameter(
              testData.forC380566.searchOption,
              'UXPROD-4394C380566',
            );
            validSearchResults.forEach((result) => {
              MarcAuthorities.checkRowByContent(result);
            });
            MarcAuthorities.selectIncludingTitle(validSearchResults[0]);
            // see UIMARCAUTH-451 comments
            // MarcAuthorities.checkRecordDetailPageMarkedValue(
            //   'UXPROD-4394C380566 Personal name 100 Elizabeth',
            // );
            MarcAuthorities.closeMarcViewPane();
            validSearchResults.forEach((result) => {
              MarcAuthorities.searchByParameter(testData.forC380566.searchOption, result);
              MarcAuthorities.verifyViewPaneContent(result);
            });
            unvalidSearchResults.forEach((result) => {
              MarcAuthorities.searchByParameter(testData.forC380566.searchOption, result);
              MarcAuthoritiesDelete.checkEmptySearchResults(result);
            });
          });
        },
      );
    });
  });
});

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC359231: {
          searchOption: 'Uniform title',
          value: 'C380570 Marvel comics',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359231.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['C380570*'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380570 MARC Authority plug-in | Search using "Uniform title" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380570'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.clickReset();
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchByParameter(
            testData.forC359231.searchOption,
            testData.forC359231.value,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.forC359231.value);
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkDefaultBrowseOptions(testData.forC359231.value);
        },
      );
    });
  });
});
