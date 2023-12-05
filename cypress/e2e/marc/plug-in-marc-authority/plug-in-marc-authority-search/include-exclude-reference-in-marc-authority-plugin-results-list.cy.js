import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import { JOB_STATUS_NAMES, REFERENCES_FILTER_CHECKBOXES } from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('plug-in MARC authority | Search', () => {
  const testData = {
    headingTypes: ['Corporate Name', 'Conference Name'],
    tags: {
      tag711: '711',
    },
    instanceTitle:
      'Clarinet concerto no. 1, op. 73 [sound recording] / Weber. Andante, K. 315 / Stravinsky. Theme & variations / Rossini.',
    authTitles: ['Mostly Stravinsky Festival', 'Mostly Wagner Festival'],
    authRows: {
      wagnerAuth: {
        title: 'Mostly Wagner Festival',
        tag: '111',
      },
      wagnerRef: {
        title: 'Mostly Wagner Festival Orchestra',
        tag: '411',
      },
      wagnerAuthRef: {
        title: 'Mostly Wagner Music',
        tag: '500',
      },
    },
    instanceIDs: [],
    authorityIDs: [],
    authorizedColumnName: 'Authorized/Reference',
    marcFiles: [
      {
        marc: 'marcBib380433.mrc',
        fileName: `testMarcFileBibC380433.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numberOfRecords: 1,
      },
      {
        marc: 'marcAuthC380433.mrc',
        fileName: `testMarcFileAuthC380433.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numberOfRecords: 2,
      },
    ],
  };

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.instanceTitle}"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });
      testData.authTitles.forEach((query) => {
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });
      });
    });
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
      .then(() => {
        testData.marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                testData.instanceIDs.push(link.split('/')[5]);
              } else {
                testData.authorityIDs.push(link.split('/')[5]);
              }
            });
          }
          cy.visit(TopMenu.dataImportPath);
        });
      })
      .then(() => {
        cy.logout();
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstance.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
      });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    testData.instanceIDs.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
    testData.authorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C380433 Include/exclude Reference and Auth/Ref records in MARC authority plug-in results list while searching (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag711);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.searchBy('Keyword', '*');

      MarcAuthoritiesSearch.selectExcludeReferencesFilter(
        REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
      );
      MarcAuthorities.verifyValueDoesntExistInColumn(testData.authorizedColumnName, 'Reference');

      MarcAuthoritiesSearch.selectExcludeReferencesFilter(
        REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
      );
      MarcAuthorities.verifyValueDoesntExistInColumn(testData.authorizedColumnName, 'Reference');
      MarcAuthorities.verifyValueDoesntExistInColumn(testData.authorizedColumnName, 'Auth/Ref');
      MarcAuthorities.verifyEveryRowContainsLinkButton();

      MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
        REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
      );
      MarcAuthorities.verifyColumnValuesOnlyExist(testData.authorizedColumnName, [
        'Authorized',
        'Reference',
      ]);

      MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
        REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
      );
      MarcAuthorities.verifyColumnValuesOnlyExist(testData.authorizedColumnName, [
        'Authorized',
        'Reference',
        'Auth/Ref',
      ]);

      MarcAuthorities.searchBy('Keyword', 'Mostly Wagner');
      MarcAuthorities.selectItem(testData.authRows.wagnerAuth.title, false);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.authRows.wagnerAuth.tag,
        testData.authRows.wagnerAuth.title,
      );
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.wagnerAuth.title);
      MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();

      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.verifySearchResultTabletIsAbsent(false);

      MarcAuthorities.selectItem(testData.authRows.wagnerRef.title, false);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.authRows.wagnerRef.tag,
        testData.authRows.wagnerRef.title,
      );
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.wagnerRef.title);
      MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();

      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.verifySearchResultTabletIsAbsent(false);

      MarcAuthorities.selectItem(testData.authRows.wagnerAuthRef.title, false);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.authRows.wagnerAuthRef.tag,
        testData.authRows.wagnerAuthRef.title,
      );
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.wagnerAuthRef.title);
      MarcAuthorities.verifyLinkButtonExistOnMarcViewPane(false);

      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.verifySearchResultTabletIsAbsent(false);
    },
  );
});
