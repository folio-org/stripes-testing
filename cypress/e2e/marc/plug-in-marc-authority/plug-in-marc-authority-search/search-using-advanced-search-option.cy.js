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
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('plug-in MARC authority | Search', () => {
  const testData = {
    tags: {
      tag700: '700',
    },
    instanceTitle: 'C380573',
    authTitles: [
      'Ouyang, Hui',
      'Dunning, Mike',
      'Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
      'Interborough Rapid Transit Company Powerhouse (New York, N.Y.)',
    ],
    advancesSearchQuery:
      'identifiers.value exactPhrase n  80094057 or personalNameTitle exactPhrase Dunning, Mike or corporateNameTitle exactPhrase Interborough Rapid Transit Company Powerhouse (New York, N.Y.) or nameTitle exactPhrase Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
    partialAdvancesSearchQuery:
      'personalNameTitle exactPhrase Dunning, Mike or corporateNameTitle exactPhrase Interborough Rapid Transit Company Powerhouse (New York, N.Y.) or nameTitle exactPhrase Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
    authRows: {
      interboroughAuth: {
        title: 'Interborough Rapid Transit Company Powerhouse (New York, N.Y.)',
        tag: '110',
      },
    },
    instanceIDs: [],
    authorityIDs: [],
    marcFiles: [
      {
        marc: 'marcBibC380573.mrc',
        fileName: `testMarcFileBibC380573.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numberOfRecords: 1,
      },
      {
        marc: 'marcAuthC380573.mrc',
        fileName: `testMarcFileAuthC380573.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numberOfRecords: 4,
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
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
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
    'C380573 MARC Authority plug-in | Search using "Advanced search" option (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy('Advanced search', testData.advancesSearchQuery, true);
      MarcAuthorities.checkRowsCount(4);
      MarcAuthorities.selectItem(testData.authRows.interboroughAuth.title, false);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.authRows.interboroughAuth.tag,
        testData.authRows.interboroughAuth.title,
      );
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.interboroughAuth.title);

      MarcAuthorities.searchBy('Advanced search', testData.partialAdvancesSearchQuery, true);
      MarcAuthorities.verifyMarcViewPaneIsOpened(false);
      MarcAuthorities.checkRowsCount(3);
    },
  );
});
